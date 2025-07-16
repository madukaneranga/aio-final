import express from "express";
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

const PAYHERE_MERCHANT_ID = "1231188";
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";


// POST /api/subscriptions/create-subscription
router.post("/create-subscription", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔍 Find the store owned by the user
    const store = await Store.findOne({ ownerId: userId });
    if (!store) return res.status(404).json({ error: "Store not found for this user" });

    // 📦 Get or create subscription
    let subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      subscription = new Subscription({
        userId,
        storeId: store._id,
        plan: "monthly",
        amount: 1000,
        currency: "LKR",
        status: "pending",
        startDate: now,
        endDate,
        paymentHistory: [],
      });

      await subscription.save();
    }

    const orderId = `SUB_${subscription._id}`;
    const itemName = `Monthly Subscription for ${store.name}`;
    const amount = subscription.amount;
    const currency = subscription.currency;

    const hash = generatePayHereHash({
      merchantId: PAYHERE_MERCHANT_ID,
      orderId,
      amount,
      currency,
      merchantSecret: PAYHERE_SECRET,
    });

    // ✅ Use address, email, phone from user model
    const firstName = req.user.name?.split(" ")[0] || "Customer";
    const lastName = req.user.name?.split(" ")[1] || "Name";
    const email = req.user.email || "no-reply@aiocart.lk";
    const phone = req.user.phone || "0771234567";
    const address = req.user.address?.street || "Unknown Address";
    const city = req.user.address?.city || "Unknown City";

    const paymentParams = {
      sandbox: true,
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: "https://aiocart.lk/dashboard",
      cancel_url: "https://aiocart.lk/dashboard",
      notify_url: "https://aio-backend-x770.onrender.com/api/subscriptions/ipn",
      order_id: orderId,
      items: itemName,
      currency,
      amount: parseFloat(amount).toFixed(2),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      country: "Sri Lanka",
      recurrence: "1 Month",
      duration: "Forever",
      hash,
    };

    console.log("PayHere Params:", paymentParams);

    return res.json({
      success: true,
      paymentParams,
      subscriptionId: subscription._id,
    });
  } catch (error) {
    console.error("Error in create-subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


function generatePayHereHash({
  merchantId,
  orderId,
  amount,
  currency,
  merchantSecret,
}) {
  // Coerce merchantSecret to string
  const secretStr = String(merchantSecret);

  const hashedSecret = crypto
    .createHash("md5")
    .update(secretStr)
    .digest("hex")
    .toUpperCase();

  const amountFormatted = parseFloat(amount).toFixed(2);

  // Coerce all inputs to string to avoid type issues
  const hashString =
    String(merchantId) +
    String(orderId) +
    amountFormatted +
    String(currency) +
    hashedSecret;

  const hash = crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();

  return hash;
}


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
