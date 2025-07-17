import express from "express";
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// =================== 🔐 PAYHERE CONFIG ===================
const PAYHERE_BASE_URL = "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = "1231188"; // Replace with live merchant ID when needed
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy"; // Replace with live merchant secret

const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL =
  "https://aio-backend-x770.onrender.com/api/subscriptions/ipn";

// =================== 🔧 UTIL FUNCTIONS ===================
function generatePayHereHash({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}) {
  const hashedSecret = crypto
    .createHash("md5")
    .update(String(merchantSecret))
    .digest("hex")
    .toUpperCase();
  const amountFormatted = parseFloat(amount).toFixed(2);
  const hashString =
    String(merchantId) +
    String(orderId) +
    amountFormatted +
    String(currency) +
    hashedSecret;
  return crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
}

async function getPayHereAccessToken() {
  const base64Auth = Buffer.from(
    `${process.env.PAYHERE_APP_ID}:${process.env.PAYHERE_APP_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYHERE_BASE_URL}/merchant/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64Auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token)
    throw new Error("Access token not received from PayHere");
  return data.access_token;
}

// =================== 📦 ROUTES ===================

// POST /api/subscriptions/create-subscription
router.post("/create-subscription", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const store = await Store.findOne({ ownerId: userId });
    if (!store)
      return res.status(404).json({ error: "Store not found for this user" });

    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      subscription = new Subscription({
        userId,
        storeId: store._id,
        plan: "monthly",
        amount: 1500,
        currency: "LKR",
        status: "pending",
        startDate: now,
        endDate,
        paymentHistory: [],
        package:"basic"
      });
      await subscription.save();
    }

    const orderId = `SUB_${subscription._id}`;
    const hash = generatePayHereHash({
      merchantId: PAYHERE_MERCHANT_ID,
      orderId,
      amount: subscription.amount,
      currency: subscription.currency,
      merchantSecret: PAYHERE_SECRET,
    });

    const paymentParams = {
      sandbox: true,
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: `Monthly Subscription for ${store.name}`,
      currency: subscription.currency,
      amount: parseFloat(subscription.amount).toFixed(2),
      first_name: req.user.name?.split(" ")[0] || "Customer",
      last_name: req.user.name?.split(" ")[1] || "Name",
      email: req.user.email || "no-reply@aiocart.lk",
      phone: req.user.phone || "0771234567",
      address: req.user.address?.street || "Unknown Address",
      city: req.user.address?.city || "Unknown City",
      country: "Sri Lanka",
      recurrence: "1 Month",
      duration: "Forever",
      hash,
    };

    res.json({
      success: true,
      paymentParams,
      subscriptionId: subscription._id,
    });
  } catch (error) {
    console.error("❌ Error in create-subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/subscriptions/ipn
router.post("/ipn", async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      subscription_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    const localMd5Sig = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto
            .createHash("md5")
            .update(PAYHERE_SECRET)
            .digest("hex")
            .toUpperCase()
      )
      .digest("hex")
      .toUpperCase();

    if (localMd5Sig !== md5sig) {
      return res.status(400).send("Invalid signature");
    }

    const subscriptionId = order_id.replace("SUB_", "");
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).send("Subscription not found");

    if (status_code === "2") {
      subscription.status = "active";
      subscription.recurrenceId = subscription_id;
      subscription.paymentHistory.push({
        paymentId: payment_id,
        amount: payhere_amount,
        currency: payhere_currency,
        paidAt: new Date(),
      });
      await subscription.save();

      const user = await User.findById(subscription.userId);
      const store = await Store.findById(subscription.storeId);

      user.subscriptionStatus = "active";
      await user.save();

      store.isActive = "true";
      await user.save();
    }

    res.send("OK");
  } catch (err) {
    console.error("❌ Error in IPN:", err);
    res.status(500).send("IPN Error");
  }
});

// POST /api/subscriptions/cancel
router.post("/cancel", authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });
    if (subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    if (!subscription.recurrenceId) {
      subscription.status = "cancelled";
      await subscription.save();
      return res.json({ message: "Subscription cancelled locally" });
    }

    const accessToken = await getPayHereAccessToken();

    const cancelRes = await fetch(
      `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription_id: subscription.recurrenceId }),
      }
    );

    const cancelData = await cancelRes.json();

    if (cancelData.status !== 1) {
      return res
        .status(500)
        .json({ error: cancelData.msg || "Failed to cancel on PayHere" });
    }

    subscription.status = "cancelled";
    await subscription.save();

    const user = await User.findById(subscription.userId);
    const store = await Store.findById(subscription.storeId);

    user.subscriptionStatus = "inactive";
    await user.save();

    store.isActive = "false";
    await user.save();

    res.json({ message: "Subscription cancelled successfully" });
  } catch (err) {
    console.error("❌ Error cancelling subscription:", err);
    res.status(500).json({ error: "Server error cancelling subscription" });
  }
});

// POST /api/subscriptions/retry
router.post("/retry", authenticate, async (req, res) => {
  try {
    const { recurrenceId } = req.body;
    const accessToken = await getPayHereAccessToken();

    const retryRes = await fetch(
      `${PAYHERE_BASE_URL}/merchant/v1/subscription/retry`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription_id: recurrenceId }),
      }
    );

    const retryData = await retryRes.json();

    if (retryData.status !== 1) {
      return res.status(400).json({ error: retryData.msg || "Retry failed" });
    }

    res.json({ message: "Retry successful" });
  } catch (err) {
    console.error("❌ Retry error:", err);
    res.status(500).json({ error: "Retry error" });
  }
});

// GET /api/subscriptions/my-subscription
router.get(
  "/my-subscription",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
      }).populate("storeId", "name");

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/subscriptions/admin/all
router.get("/admin/all", authenticate, async (req, res) => {
  try {
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
