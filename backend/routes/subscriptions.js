import express from "express";
const router = express.Router();
import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";
import User from "../models/User.js";
import Package from "../models/Package.js";

// =================== 🔐 PAYHERE CONFIG ===================
const PAYHERE_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://www.payhere.lk" 
  : "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "1231188";
const PAYHERE_SECRET = process.env.PAYHERE_SECRET || "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";

const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL =
  "https://aio-backend-x770.onrender.com/api/subscriptions/ipn";

// =================== 🔧 UTIL FUNCTIONS ===================

// Check if PayHere API is accessible
async function checkPayHereAPIStatus() {
  try {
    const response = await fetch(`${PAYHERE_BASE_URL}/merchant/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    
    console.log("🎯 PayHere API status check:", response.status);
    return response.status !== 0; // Any response means API is reachable
  } catch (error) {
    console.error("❌ PayHere API unreachable:", error.message);
    return false;
  }
}
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
  const appId = process.env.PAYHERE_APP_ID;
  const appSecret = process.env.PAYHERE_APP_SECRET;
  
  console.log("🔑 Getting PayHere access token...");
  console.log("🎯 PayHere Base URL:", PAYHERE_BASE_URL);
  console.log("🔐 App ID exists:", !!appId);
  console.log("🔐 App Secret exists:", !!appSecret);
  
  if (!appId || !appSecret) {
    throw new Error("PayHere APP_ID and APP_SECRET are required in environment variables");
  }
  
  const base64Auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  console.log("🔐 Auth header (first 20 chars):", base64Auth.substring(0, 20) + "...");

  try {
    const oauthUrl = `${PAYHERE_BASE_URL}/merchant/v1/oauth/token`;
    console.log("🎯 Making request to:", oauthUrl);
    
    const res = await fetch(oauthUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    console.log("📡 OAuth response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ OAuth error response:", errorText);
      throw new Error(`PayHere OAuth failed: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    console.log("✅ OAuth response received, token exists:", !!data.access_token);
    
    if (!data.access_token) {
      throw new Error("Access token not received from PayHere: " + JSON.stringify(data));
    }
    return data.access_token;
  } catch (error) {
    console.error("💥 PayHere access token error:", error.message);
    throw error;
  }
}

// POST /api/subscriptions/create-subscription
router.post("/create-subscription", authenticate, async (req, res) => {
  try {
    const { packageName } = req.body;
    console.log(packageName);
    const userId = req.user._id;
    const store = await Store.findOne({ ownerId: userId });
    if (!store)
      return res.status(404).json({ error: "Store not found for this user" });

    if (!packageName)
      return res.status(400).json({ error: "Package name is required" });

    const selectedPackage = await Package.findOne({ name: packageName });

    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      subscription = new Subscription({
        userId,
        storeId: store._id,
        plan: "monthly",
        amount: selectedPackage.amount,
        currency: "LKR",
        status: "pending",
        startDate: now,
        endDate,
        paymentHistory: [],
        package: packageName,
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
      sandbox: process.env.NODE_ENV !== 'production',
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

    // Parse subscription ID from order_id (handle upgrade attempt IDs)
    let subscriptionId;
    if (order_id.includes("_UPG_")) {
      // Format: SUB_{subscriptionId}_UPG_{timestamp}_{userId}
      subscriptionId = order_id.split("_UPG_")[0].replace("SUB_", "");
      console.log("🔄 Detected upgrade payment for subscription:", subscriptionId);
    } else {
      // Regular format: SUB_{subscriptionId}
      subscriptionId = order_id.replace("SUB_", "");
      console.log("🏠 Regular subscription payment for:", subscriptionId);
    }
    
    const subscription = await Subscription.findById(subscriptionId);
    console.log("📄 Found subscription with status:", subscription?.status);
    if (!subscription) return res.status(404).send("Subscription not found");

    if (status_code === "2") {
      console.log("✅ PayHere payment successful, processing subscription update...");
      
      // Check if this is an upgrade completion
      if (subscription.status === "pending_upgrade") {
        console.log("🔄 Completing upgrade process...");
        
        // **SAFE UPGRADE STEP 2: Complete upgrade on payment success**
        
        // First, cancel old PayHere subscription if it exists
        if (subscription.originalSubscriptionData?.recurrenceId) {
          try {
            console.log("🚫 Cancelling old PayHere subscription:", subscription.originalSubscriptionData.recurrenceId);
            const token = await getPayHereAccessToken();
            
            const cancelRes = await fetch(
              `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ subscription_id: subscription.originalSubscriptionData.recurrenceId }),
              }
            );
            
            if (cancelRes.ok) {
              const cancelData = await cancelRes.json();
              console.log("✅ Old PayHere subscription cancelled:", cancelData);
            } else {
              console.log("⚠️ Failed to cancel old PayHere subscription, but continuing...");
            }
          } catch (cancelError) {
            console.error("❌ Error cancelling old subscription:", cancelError.message);
            // Continue anyway - new subscription will work
          }
        }
        
        // Complete the upgrade
        subscription.recurrenceId = subscription_id;
        subscription.completeUpgrade();
        console.log("✅ Upgrade completed successfully");
      } else {
        // Regular subscription activation
        subscription.status = "active";
        subscription.recurrenceId = subscription_id;
        subscription.lastUpgradeAt = new Date();
      }
      
      // Add payment to history
      subscription.paymentHistory.push({
        localPaymentId: payment_id,
        amount: payhere_amount,
        currency: payhere_currency,
        paidAt: new Date(),
        status: "completed",
        paymentMethod: "payhere"
      });
      
      await subscription.save();

      // Update user and store status
      const user = await User.findById(subscription.userId);
      const store = await Store.findById(subscription.storeId);

      if (user) {
        user.subscriptionStatus = "active";
        await user.save();
      }

      if (store) {
        store.isActive = true;
        await store.save();
      }
      
      console.log("✅ Subscription and user/store status updated successfully");
    } else {
      console.log("❌ PayHere payment failed with status:", status_code);
      
      // Handle failed payment for upgrades
      if (subscription.status === "pending_upgrade") {
        console.log("🔙 Rolling back upgrade due to payment failure...");
        
        // **SAFE UPGRADE STEP 3: Rollback on payment failure**
        subscription.rollbackUpgrade();
        await subscription.save();
        
        console.log("✅ Upgrade rolled back successfully. Original subscription restored.");
      }
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
    console.log("🚫 Starting subscription cancellation process...");
    console.log("👤 User ID:", req.user._id);
    
    const { subscriptionId } = req.body;
    console.log("🎯 Subscription ID from request:", subscriptionId);
    
    // Find subscription by subscriptionId or by userId if subscriptionId not provided
    let subscription;
    if (subscriptionId) {
      subscription = await Subscription.findById(subscriptionId);
    } else {
      subscription = await Subscription.findOne({ 
        userId: req.user._id, 
        status: { $in: ['active', 'pending'] }
      });
    }
    
    console.log("📄 Found subscription:", {
      id: subscription?._id,
      status: subscription?.status,
      recurrenceId: subscription?.recurrenceId,
      hasRecurrenceId: !!subscription?.recurrenceId
    });

    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    if (subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // Check if 1 month has passed since last upgrade / change
    if (subscription.lastUpgradeAt) {
      const nextAllowedCancelDate = new Date(subscription.lastUpgradeAt);
      nextAllowedCancelDate.setMonth(nextAllowedCancelDate.getMonth() + 1);

      if (new Date() < nextAllowedCancelDate) {
        return res.status(403).json({
          error:
            "You can cancel subscription only after 1 month from your last package change.",
          nextAvailableCancelDate: nextAllowedCancelDate,
        });
      }
    }

    // If no PayHere subscription recurrence ID, just cancel locally
    if (!subscription.recurrenceId) {
      console.log("🏠 No PayHere recurrence ID, cancelling locally only...");
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      await subscription.save();
      
      // Update user and store status
      const user = await User.findById(subscription.userId);
      const store = await Store.findById(subscription.storeId);
      
      if (user) {
        user.subscriptionStatus = "inactive";
        await user.save();
      }
      
      if (store) {
        store.isActive = false;
        await store.save();
      }
      
      return res.json({ message: "Subscription cancelled successfully (local only)" });
    }

    // Cancel subscription on PayHere
    try {
      const accessToken = await getPayHereAccessToken();
      console.log("🔑 Using access token for cancellation:", accessToken?.substring(0, 20) + "...");
      console.log("🎯 Cancelling PayHere subscription ID:", subscription.recurrenceId);

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

      console.log("📡 PayHere cancel response status:", cancelRes.status);
      
      if (!cancelRes.ok) {
        const errorText = await cancelRes.text();
        console.error("❌ PayHere cancel error response:", errorText);
        
        // If it's a 401, try to get a fresh token and retry once
        if (cancelRes.status === 401) {
          console.log("🔄 Retrying with fresh token...");
          const freshToken = await getPayHereAccessToken();
          
          const retryRes = await fetch(
            `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${freshToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ subscription_id: subscription.recurrenceId }),
            }
          );
          
          if (!retryRes.ok) {
            throw new Error(`PayHere cancel API failed after retry: ${retryRes.status} ${retryRes.statusText}`);
          }
          
          const retryData = await retryRes.json();
          if (retryData.status !== 1) {
            throw new Error(retryData.msg || "Failed to cancel on PayHere after retry");
          }
        } else {
          throw new Error(`PayHere cancel API failed: ${cancelRes.status} ${cancelRes.statusText}`);
        }
      } else {
        const cancelData = await cancelRes.json();
        console.log("✅ PayHere cancel response:", cancelData);

        if (cancelData.status !== 1) {
          return res
            .status(500)
            .json({ error: cancelData.msg || "Failed to cancel on PayHere" });
        }
      }
    } catch (payhereError) {
      console.error("💥 PayHere cancellation error:", payhereError.message);
      console.error("📊 Full error:", payhereError);
      
      // For now, continue with local cancellation even if PayHere fails
      console.log("⚠️ Proceeding with local cancellation despite PayHere error");
    }

    // Update subscription status locally
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    await subscription.save();

    // Update user and store status
    const user = await User.findById(subscription.userId);
    const store = await Store.findById(subscription.storeId);

    if (user) {
      user.subscriptionStatus = "inactive";
      await user.save();
    }

    if (store) {
      store.isActive = false;
      await store.save();
    }

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

      if (!subscription) {
        return res.status(404).json({ error: "Active subscription not found" });
      }

      const pkg = await Package.findOne({ name: subscription.package });

      const response = {
        subscription,
        package: pkg,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/subscriptions/upgrade - Safe upgrade with rollback
router.put("/upgrade", authenticate, async (req, res) => {
  const { packageName } = req.body;
  const userId = req.user._id;

  try {
    console.log("🔄 Starting safe subscription upgrade process...");
    console.log("👤 User ID:", userId, "Package:", packageName);

    // Find current subscription
    const subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    console.log("📄 Current subscription status:", subscription.status);

    // Block if upgrade already in progress
    if (subscription.status === "pending_upgrade") {
      return res.status(409).json({
        message: "Upgrade already in progress. Please complete current upgrade or wait for timeout.",
        upgradeAttemptId: subscription.upgradeAttemptId,
        upgradeInitiatedAt: subscription.upgradeInitiatedAt
      });
    }

    // Validate package selection
    if (subscription.package === packageName) {
      return res.status(400).json({ message: "You are already on this package." });
    }

    const currentPackage = await Package.findOne({ name: subscription.package });
    const selectedPackage = await Package.findOne({ name: packageName });

    if (!selectedPackage || !currentPackage) {
      return res.status(400).json({ message: "Invalid package selection." });
    }

    const isDowngrade = selectedPackage.amount < currentPackage.amount;
    console.log("🔽 Package change:", isDowngrade ? "DOWNGRADE" : "UPGRADE");

    // Downgrade cooldown check (2 months)
    if (isDowngrade && subscription.lastUpgradeAt) {
      const nextAllowedDowngrade = new Date(subscription.lastUpgradeAt);
      nextAllowedDowngrade.setMonth(nextAllowedDowngrade.getMonth() + 2);

      if (new Date() < nextAllowedDowngrade) {
        return res.status(403).json({
          message: "You can downgrade only after 2 months from your last package change.",
          nextAvailableDowngradeDate: nextAllowedDowngrade,
        });
      }
    }

    // Generate unique upgrade attempt ID
    const upgradeAttemptId = `UPG_${Date.now()}_${userId}`;
    console.log("🎯 Generated upgrade attempt ID:", upgradeAttemptId);

    // **SAFE UPGRADE STEP 1: Initiate upgrade (keep original active)**
    subscription.initiateUpgrade(selectedPackage, upgradeAttemptId);
    await subscription.save();
    
    console.log("✅ Upgrade initiated safely. Original subscription backed up.");

    // Generate payment parameters
    const store = await Store.findById(subscription.storeId);
    const orderId = `SUB_${subscription._id}_${upgradeAttemptId}`;
    
    const hash = generatePayHereHash({
      merchantId: PAYHERE_MERCHANT_ID,
      orderId,
      amount: selectedPackage.amount,
      currency: subscription.currency,
      merchantSecret: PAYHERE_SECRET,
    });

    const paymentParams = {
      sandbox: process.env.NODE_ENV !== 'production',
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: `Subscription Upgrade to ${selectedPackage.name} for ${store.name}`,
      currency: subscription.currency,
      amount: parseFloat(selectedPackage.amount).toFixed(2),
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

    console.log("✅ Payment parameters generated for safe upgrade");

    return res.json({
      success: true,
      message: `Subscription ${isDowngrade ? "downgrade" : "upgrade"} initiated safely. Your current subscription remains active until payment is confirmed.`,
      subscriptionId: subscription._id,
      upgradeAttemptId: upgradeAttemptId,
      paymentParams,
      paymentRequired: true,
      safeUpgrade: true, // Flag for frontend to handle appropriately
    });
  } catch (error) {
    console.error("💥 Safe subscription upgrade error:", error);
    
    // Rollback on error
    try {
      const subscription = await Subscription.findOne({ userId });
      if (subscription && subscription.status === "pending_upgrade") {
        subscription.rollbackUpgrade();
        await subscription.save();
        console.log("✅ Rolled back upgrade due to error");
      }
    } catch (rollbackError) {
      console.error("❌ Rollback failed:", rollbackError);
    }

    return res.status(500).json({
      message: "Server error during subscription change. Your original subscription is safe."
    });
  }
});

// POST /api/subscriptions/rollback-upgrade - Manual rollback for failed upgrades
router.post("/rollback-upgrade", authenticate, async (req, res) => {
  try {
    const { upgradeAttemptId } = req.body;
    const userId = req.user._id;
    
    console.log("🔙 Manual upgrade rollback requested:", upgradeAttemptId);
    
    const subscription = await Subscription.findOne({ 
      userId, 
      status: "pending_upgrade",
      upgradeAttemptId: upgradeAttemptId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        error: "No pending upgrade found to rollback"
      });
    }
    
    // Perform rollback
    subscription.rollbackUpgrade();
    await subscription.save();
    
    console.log("✅ Manual upgrade rollback completed");
    
    res.json({
      success: true,
      message: "Upgrade cancelled successfully. Your original subscription has been restored."
    });
    
  } catch (error) {
    console.error("❌ Manual rollback error:", error);
    res.status(500).json({ error: "Failed to rollback upgrade" });
  }
});

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

// Cleanup expired upgrades (timeout protection)
router.post("/cleanup-expired-upgrades", authenticate, async (req, res) => {
  try {
    // Only allow admin or system calls
    if (req.user.email !== "admin@aio.com" && !req.headers['x-system-call']) {
      return res.status(403).json({ error: "Admin access required" });
    }

    console.log("🧺 Starting cleanup of expired upgrades...");
    
    const expiredUpgrades = await Subscription.findExpiredUpgrades(30); // 30 minutes timeout
    let cleanedUp = 0;
    
    for (const subscription of expiredUpgrades) {
      try {
        console.log("🔙 Rolling back expired upgrade:", subscription._id, subscription.upgradeAttemptId);
        
        subscription.rollbackUpgrade();
        await subscription.save();
        
        cleanedUp++;
        
        // TODO: Send email notification to user about timeout
        console.log("✅ Rolled back expired upgrade for user:", subscription.userId);
      } catch (error) {
        console.error("❌ Failed to rollback upgrade for:", subscription._id, error.message);
      }
    }
    
    console.log("🧺 Cleanup completed. Rolled back", cleanedUp, "expired upgrades");
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedUp} expired upgrades`,
      expiredCount: expiredUpgrades.length,
      cleanedUpCount: cleanedUp
    });
    
  } catch (error) {
    console.error("❌ Cleanup job error:", error);
    res.status(500).json({ error: "Cleanup job failed" });
  }
});

// Debug endpoint for PayHere API testing (remove in production)
router.get("/debug/payhere-status", authenticate, async (req, res) => {
  if (req.user.email !== "admin@aio.com") {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const status = {
      baseUrl: PAYHERE_BASE_URL,
      merchantId: PAYHERE_MERCHANT_ID,
      hasAppId: !!process.env.PAYHERE_APP_ID,
      hasAppSecret: !!process.env.PAYHERE_APP_SECRET,
      environment: process.env.NODE_ENV || 'development'
    };

    // Test API availability
    const apiAvailable = await checkPayHereAPIStatus();
    status.apiAvailable = apiAvailable;

    // Test token generation
    try {
      const token = await getPayHereAccessToken();
      status.tokenGeneration = "success";
      status.tokenPreview = token?.substring(0, 20) + "...";
    } catch (error) {
      status.tokenGeneration = "failed";
      status.tokenError = error.message;
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
