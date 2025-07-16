import express from "express";
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

const PAYHERE_MERCHANT_ID = "1231188";
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";
const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL = "https://aio-final-api.vercel.app/api/subscription/ipn";
const PAYHERE_CANCEL_API = "https://sandbox.payhere.lk/merchant/v1/subscription/cancel";
const PAYHERE_OAUTH_URL = "https://sandbox.payhere.lk/merchant/v1/oauth/token";
const PAYHERE_APP_ID = process.env.PAYHERE_APP_ID || "4OVxzVJAbSK4JFnJjJNzoH3TV";
const PAYHERE_APP_SECRET = process.env.PAYHERE_APP_SECRET || "8cJlAdroxID8n0No30NAwT8m22kmMKNW98cJlqgSYpMa";

// Helper: Generate PayHere Hash
function generatePayHereHash({ orderId, amount, currency }) {
  const secret = crypto.createHash("md5").update(PAYHERE_SECRET).digest("hex").toUpperCase();
  const formattedAmount = parseFloat(amount).toFixed(2);
  const raw = PAYHERE_MERCHANT_ID + orderId + formattedAmount + currency + secret;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

// Helper: Get Access Token
async function getAccessToken() {
  const response = await fetch(PAYHERE_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${PAYHERE_APP_ID}:${PAYHERE_APP_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!data.access_token) throw new Error("No access token received");
  return data.access_token;
}

// Get current subscription
router.get("/my-subscription", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id }).populate("storeId", "name");
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new subscription
router.post("/create", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const { storeId } = req.body;

    const existing = await Subscription.findOne({ userId: req.user._id, storeId, status: "active" });
    if (existing) return res.status(400).json({ error: "Active subscription exists" });

    const amount = 1000;
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = new Subscription({
      userId: req.user._id,
      storeId,
      amount,
      currency: "LKR",
      status: "pending",
      startDate: now,
      endDate,
    });
    await subscription.save();

    const hash = generatePayHereHash({
      orderId: subscription._id.toString(),
      amount,
      currency: "LKR",
    });

    const payHereData = {
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: subscription._id.toString(),
      items: "Monthly Subscription",
      amount: amount.toFixed(2),
      currency: "LKR",
      first_name: req.user.firstName || "",
      last_name: req.user.lastName || "",
      email: req.user.email || "",
      phone: req.user.phone || "0770000000",
      address: "N/A",
      city: "Colombo",
      country: "Sri Lanka",
      hash,
    };

    res.json({ payHereURL: "https://sandbox.payhere.lk/pay/checkout", data: payHereData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IPN Handler
router.post("/ipn", express.urlencoded({ extended: true }), async (req, res) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
    payment_id,
    payment_method,
    recurrence_id,
  } = req.body;

  try {
    const hash = generatePayHereHash({
      orderId: order_id,
      amount: parseFloat(payhere_amount).toFixed(2),
      currency: payhere_currency,
    });

    if (md5sig !== hash) return res.status(400).send("Invalid IPN Signature");

    const subscription = await Subscription.findById(order_id);
    if (!subscription) return res.status(404).send("Subscription not found");

    if (status_code === "2") {
      subscription.status = "active";
      subscription.localPaymentId = payment_id;
      if (recurrence_id) subscription.recurrenceId = recurrence_id;
      subscription.paymentHistory.push({
        amount: parseFloat(payhere_amount),
        currency: payhere_currency,
        paidAt: new Date(),
        localPaymentId: payment_id,
        status: "paid",
        paymentMethod: payment_method,
      });
      await subscription.save();

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: "active",
        subscriptionId: subscription._id,
      });
    }

    res.send("OK");
  } catch (error) {
    console.error("IPN Error:", error);
    res.status(500).send("Error");
  }
});

// Cancel subscription
router.post("/cancel", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
      status: "active",
    });

    if (!subscription) return res.status(404).json({ error: "Active subscription not found" });

    if (subscription.recurrenceId) {
      const token = await getAccessToken();
      const body = new URLSearchParams({
        merchant_id: PAYHERE_MERCHANT_ID,
        recurrence_id: subscription.recurrenceId,
      });

      const response = await fetch(PAYHERE_CANCEL_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const data = await response.json();
      if (data.status !== 1) return res.status(500).json({ error: "PayHere cancellation failed", details: data });
    }

    subscription.status = "cancelled";
    subscription.endDate = new Date();
    await subscription.save();

    res.json({ message: "Subscription cancelled" });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message });
  }
});

// RENEW Subscription
router.post("/renew", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const orderId = `${subscription._id.toString()}-renew-${Date.now()}`;
    const amount = parseFloat(subscription.amount).toFixed(2);
    const currency = subscription.currency;

    const hash = generatePayHereHash({
      orderId,
      amount,
      currency,
    });

    const payHereData = {
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: "Subscription Renewal",
      amount,
      currency,
      first_name: req.user.firstName || "",
      last_name: req.user.lastName || "",
      email: req.user.email || "",
      phone: req.user.phone || "0770000000",
      address: "N/A",
      city: "Colombo",
      country: "Sri Lanka",
      hash,
    };

    res.json({
      payHereURL: "https://sandbox.payhere.lk/pay/checkout",
      data: payHereData,
    });
  } catch (err) {
    console.error("Renew error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Admin: Get all subscriptions
router.get("/admin/all", authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== "admin@aio.com") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const subscriptions = await Subscription.find()
      .populate("userId", "name email")
      .populate("storeId", "name type")
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
