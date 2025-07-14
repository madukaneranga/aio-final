import express from "express";
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// PayHere Sandbox config
const PAYHERE_MERCHANT_ID = "1231188"; // Sandbox Merchant ID
const PAYHERE_SECRET = "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy"; // Sandbox Secret
const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL = "https://aio-final-api.vercel.app/api/subscription/ipn";

// Get user's active subscription
router.get(
  "/my-subscription",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const subscription = await Subscription.findOne({
        userId: req.user._id,
      }).populate("storeId", "name");

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// CREATE subscription and send PayHere payment data
router.post(
  "/create",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { storeId } = req.body;

      const existingSubscription = await Subscription.findOne({
        userId: req.user._id,
        storeId,
        status: "active",
      });
      if (existingSubscription) {
        return res
          .status(400)
          .json({ error: "Active subscription already exists" });
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const subscription = new Subscription({
        userId: req.user._id,
        storeId,
        amount: 1000,
        currency: "LKR",
        status: "pending",
        startDate: now,
        endDate,
      });

      await subscription.save();

      const payHereData = {
        merchant_id: PAYHERE_MERCHANT_ID,
        return_url: PAYHERE_RETURN_URL,
        cancel_url: PAYHERE_CANCEL_URL,
        notify_url: PAYHERE_NOTIFY_URL,
        order_id: subscription._id.toString(),
        items: "Monthly Subscription",
        amount: subscription.amount,
        currency: subscription.currency,
        first_name: req.user.firstName || "",
        last_name: req.user.lastName || "",
        email: req.user.email || "",
        phone: req.user.phone || "0770000000",
        address: "N/A",
        city: "Colombo",
        country: "Sri Lanka",
      };

      res.json({
        payHereURL: "https://sandbox.payhere.lk/pay/checkout",
        data: payHereData,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


// PayHere IPN handler
router.post(
  "/ipn",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig,
        payment_id,
        payment_method,
        recurrence_id // ✅ NEW
      } = req.body;

      // Validate MD5 signature
      const localMd5 = crypto
        .createHash("md5")
        .update(
          merchant_id +
            order_id +
            payhere_amount +
            status_code +
            crypto.createHash("md5").update(PAYHERE_SECRET).digest("hex")
        )
        .digest("hex")
        .toUpperCase();

      if (md5sig !== localMd5) {
        return res.status(400).send("Invalid signature");
      }

      const subscription = await Subscription.findById(order_id);
      if (!subscription) {
        return res.status(404).send("Subscription not found");
      }

      if (status_code === "2") {
        subscription.status = "active";
        subscription.localPaymentId = payment_id;

        // ✅ Store recurrenceId
        if (recurrence_id) {
          subscription.recurrenceId = recurrence_id;
        }

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
      } else {
        subscription.status = "inactive";
        await subscription.save();
      }

      res.send("OK");
    } catch (error) {
      console.error("IPN error:", error);
      res.status(500).send("Error");
    }
  }
);

// RENEW subscription
router.post(
  "/renew",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
      });

      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      const payHereData = {
        merchant_id: PAYHERE_MERCHANT_ID,
        return_url: PAYHERE_RETURN_URL,
        cancel_url: PAYHERE_CANCEL_URL,
        notify_url: PAYHERE_NOTIFY_URL,
        order_id: subscription._id.toString() + "-renewal-" + Date.now(),
        items: "Monthly Subscription Renewal",
        amount: subscription.amount,
        currency: subscription.currency,
        first_name: req.user.firstName || "",
        last_name: req.user.lastName || "",
        email: req.user.email || "",
        phone: req.user.phone || "0770000000",
        address: "N/A",
        city: "Colombo",
        country: "Sri Lanka",
      };

      res.json({
        payHereURL: "https://sandbox.payhere.lk/pay/checkout",
        data: payHereData,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// CANCEL subscription locally
router.post(
  "/cancel",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { subscriptionId } = req.body;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: req.user._id,
        status: "active",
      });

      if (!subscription) {
        return res.status(404).json({ error: "Active subscription not found" });
      }

      // ✅ Cancel from PayHere if recurrenceId exists
      if (subscription.recurrenceId) {
        const body = new URLSearchParams({
          merchant_id: PAYHERE_MERCHANT_ID,
          recurrence_id: subscription.recurrenceId,
        });

        const response = await fetch("https://sandbox.payhere.lk/merchant/v1/subscription/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        });

        const data = await response.json();

        if (data.status !== 1) {
          return res.status(500).json({ error: "PayHere cancellation failed", details: data });
        }
      }

      // ✅ Update local DB
      subscription.status = "cancelled";
      subscription.endDate = new Date();
      await subscription.save();

      res.json({ message: "Subscription cancelled from both system and PayHere" });
    } catch (error) {
      console.error("Cancel Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  "/update-plan",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { storeId, newPlanId } = req.body;  // newPlanId to identify the plan user wants
      // Fetch the new plan details from DB or config
      const newPlan = await Plan.findById(newPlanId);
      if (!newPlan) return res.status(400).json({ error: "Invalid plan selected" });

      // Find existing active subscription
      const currentSubscription = await Subscription.findOne({
        userId: req.user._id,
        storeId,
        status: "active",
      });

      if (currentSubscription) {
        // Mark current subscription as canceled or expired
        currentSubscription.status = "canceled";
        await currentSubscription.save();
      }

      // Create new subscription for the new plan
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // Or use newPlan.durationMonths

      const newSubscription = new Subscription({
        userId: req.user._id,
        storeId,
        amount: newPlan.amount,
        currency: newPlan.currency,
        status: "pending",
        startDate: now,
        endDate,
        planId: newPlan._id,
      });

      await newSubscription.save();

      // Prepare PayHere data for payment
      const payHereData = {
        merchant_id: PAYHERE_MERCHANT_ID,
        return_url: PAYHERE_RETURN_URL,
        cancel_url: PAYHERE_CANCEL_URL,
        notify_url: PAYHERE_NOTIFY_URL,
        order_id: newSubscription._id.toString(),
        items: newPlan.name || "Subscription Plan Update",
        amount: newSubscription.amount,
        currency: newSubscription.currency,
        first_name: req.user.firstName || "",
        last_name: req.user.lastName || "",
        email: req.user.email || "",
        phone: req.user.phone || "0770000000",
        address: "N/A",
        city: "Colombo",
        country: "Sri Lanka",
      };

      res.json({
        payHereURL: "https://sandbox.payhere.lk/pay/checkout",
        data: payHereData,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


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
