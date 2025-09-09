import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import PendingSubscription from "../models/PendingSubscription.js";
import Package from "../models/Package.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const PAYHERE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://sandbox.payhere.lk"
    : "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "1231188";
const PAYHERE_SECRET =
  process.env.PAYHERE_SECRET ||
  "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";

const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL =
  "https://aio-backend-x770.onrender.com/api/subscriptions/ipn";

/**
 * SubscriptionService - Pure business logic for subscription management
 * No HTTP concerns, returns data or throws business exceptions
 */
class SubscriptionService {
  async checkPayHereAPIStatus() {
    try {
      const response = await fetch(
        `${PAYHERE_BASE_URL}/merchant/v1/oauth/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        }
      );

      console.log("🎯 PayHere API status check:", response.status);
      return response.status !== 0; // Any response means API is reachable
    } catch (error) {
      console.error("❌ PayHere API unreachable:", error.message);
      return false;
    }
  }

  generatePayHereHash({
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

  async getPayHereAccessToken() {
    const appId = process.env.PAYHERE_APP_ID;
    const appSecret = process.env.PAYHERE_APP_SECRET;

    console.log("🔑 Getting PayHere access token...");
    console.log("🎯 PayHere Base URL:", PAYHERE_BASE_URL);
    console.log("🔐 App ID exists:", !!appId);
    console.log("🔐 App Secret exists:", !!appSecret);

    if (!appId || !appSecret) {
      throw new Error(
        "PayHere APP_ID and APP_SECRET are required in environment variables"
      );
    }

    const base64Auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
    console.log(
      "🔐 Auth header (first 20 chars):",
      base64Auth.substring(0, 20) + "..."
    );

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
        throw new Error(
          `PayHere OAuth failed: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const data = await res.json();
      console.log(
        "✅ OAuth response received, token exists:",
        !!data.access_token
      );

      if (!data.access_token) {
        throw new Error(
          "Access token not received from PayHere: " + JSON.stringify(data)
        );
      }
      return data.access_token;
    } catch (error) {
      console.error("💥 PayHere access token error:", error.message);
      throw error;
    }
  }

  /**
   * Get active subscription for a user
   * @param {string} userId - User ID
   * @returns {Object|null} Active subscription or null if none exists
   */
  async getActiveSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: "active",
      });

      return subscription;
    } catch (error) {
      logger.error("Error fetching active subscription", {
        userId,
        error: error.message,
      });
      throw new Error("Failed to fetch subscription");
    }
  }

  /**
   * Create pending subscription for payment processing
   * @param {string} userId - User ID
   * @param {string} packageName - Package name (basic, standard, premium)
   * @returns {Object} Pending subscription and payment parameters
   * @throws {Error} If user already has subscription or package invalid
   */
  async createSubscription(userId, packageName) {
    try {
      // Validate package exists
      const packageData = await this.validatePackageExists(packageName);

      // Check user exists and has store
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      const store = await Store.findOne({ ownerId: userId });
      if (!store) {
        throw new Error("User must have a store to create subscription");
      }

      // Check no active subscription exists
      const existingSubscription = await this.getActiveSubscription(userId);
      if (existingSubscription) {
        throw new Error("User already has active subscription");
      }

      // Check if there's already an active pending subscription
      const existingPending = await PendingSubscription.findOne({ 
        userId, 
        isActive: true 
      });
      
      if (existingPending) {
        // If same package, return existing pending subscription
        if (existingPending.packageName === packageName) {
          logger.info("Returning existing pending subscription for same package", {
            existingPendingId: existingPending._id,
            userId,
            packageName,
          });
          
          return {
            pendingSubscription: existingPending,
            paymentParams: existingPending.paymentParams,
          };
        }
        
        // Different package - soft delete existing and create new one
        logger.info("Soft deleting existing pending subscription for package change", {
          existingPendingId: existingPending._id,
          oldPackage: existingPending.packageName,
          newPackage: packageName,
          userId,
        });
        
        existingPending.isActive = false;
        await existingPending.save();
      }

      // Generate unique order ID
      const timestamp = Date.now();
      const orderId = `PSUB_${timestamp}_${userId}`;

      // Create PayHere payment parameters
      const hash = this.generatePayHereHash({
        merchantId: PAYHERE_MERCHANT_ID,
        orderId,
        amount: packageData.amount,
        currency: "LKR",
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
        currency: "LKR",
        amount: parseFloat(packageData.amount).toFixed(2),
        first_name: user.name?.split(" ")[0] || "Customer",
        last_name: user.name?.split(" ")[1] || "Name",
        email: user.email || "no-reply@aiocart.lk",
        phone: user.phone || "0771234567",
        address: user.address?.street || "Unknown Address",
        city: user.address?.city || "Unknown City",
        country: "Sri Lanka",
        recurrence: "1 Month",
        duration: "Forever",
        hash,
      };

      // Save pending subscription data
      const pendingSubscription = new PendingSubscription({
        userId,
        storeId: store._id,
        packageName,
        amount: packageData.amount,
        currency: "LKR",
        orderId,
        paymentParams,
        userInfo: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
        },
        storeName: store.name,
      });

      const savedPendingSubscription = await pendingSubscription.save();

      logger.info("Pending subscription created for payment processing", {
        pendingSubscriptionId: savedPendingSubscription._id,
        userId,
        packageName,
        amount: packageData.amount,
        orderId,
      });

      return {
        pendingSubscription: savedPendingSubscription,
        paymentParams,
      };
    } catch (error) {
      logger.error("Error creating pending subscription", {
        userId,
        packageName,
        error: error.message,
      });
      throw error;
    }
  }

  processIPN = async ({
    order_id,
    payment_id,
    subscription_id,
    payhere_amount,
    payhere_currency,
    status_code,
  }) => {
    console.log("🎯 Processing IPN for order_id:", order_id);

    // Check if this is a new subscription (PSUB_) or existing subscription operation
    if (order_id.startsWith("PSUB_")) {
      // New subscription payment - find pending subscription
      console.log("🆕 New subscription payment detected");
      
      const pendingSubscription = await PendingSubscription.findOne({ 
        orderId: order_id,
        isActive: true 
      });
      
      if (!pendingSubscription) {
        throw new Error("Active pending subscription not found for order: " + order_id);
      }

      if (status_code === "2") {
        console.log("✅ PayHere payment successful, creating actual subscription...");

        // Create actual subscription record
        const startDate = new Date();
        const endDate = this.calculateEndDate(startDate);

        const actualSubscription = new Subscription({
          userId: pendingSubscription.userId,
          storeId: pendingSubscription.storeId,
          package: pendingSubscription.packageName,
          amount: pendingSubscription.amount,
          currency: pendingSubscription.currency,
          status: "active",
          plan: "monthly",
          startDate,
          endDate,
          recurrenceId: subscription_id,
          paymentHistory: [{
            localPaymentId: payment_id,
            amount: payhere_amount,
            currency: payhere_currency,
            paidAt: new Date(),
            status: "completed",
            paymentMethod: "payhere",
          }],
        });

        await actualSubscription.save();

        // Update user and store status
        const user = await User.findById(pendingSubscription.userId);
        const store = await Store.findById(pendingSubscription.storeId);

        if (user) {
          user.subscriptionStatus = "active";
          await user.save();
        }
        if (store) {
          store.isActive = true;
          await store.save();
        }

        // Soft delete the pending subscription after successful processing
        pendingSubscription.isActive = false;
        await pendingSubscription.save();

        logger.info("✅ Subscription created successfully from pending", {
          subscriptionId: actualSubscription._id,
          userId: pendingSubscription.userId,
          packageName: pendingSubscription.packageName,
          amount: pendingSubscription.amount,
          orderId: order_id,
          pendingSubscriptionDeactivated: true,
        });

        console.log("✅ New subscription created and activated, pending subscription soft deleted");
      } else {
        console.log("❌ PayHere payment failed with status:", status_code);
        logger.error("Payment failed for pending subscription", {
          orderId: order_id,
          statusCode: status_code,
          pendingSubscriptionId: pendingSubscription._id,
        });
      }
      return;
    }

    // Handle existing subscription operations (upgrades, etc.)
    let subscriptionId;
    if (order_id.includes("_UPG_")) {
      subscriptionId = order_id.split("_UPG_")[0].replace("SUB_", "");
      console.log("🔄 Detected upgrade payment for subscription:", subscriptionId);
    } else {
      subscriptionId = order_id.replace("SUB_", "");
      console.log("🏠 Regular subscription payment for:", subscriptionId);
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (status_code === "2") {
      console.log(
        "✅ PayHere payment successful, processing subscription update..."
      );

      // Upgrade flow
      if (subscription.status === "pending_upgrade") {
        console.log("🔄 Completing upgrade process...");

        // Cancel old PayHere subscription
        if (subscription.originalSubscriptionData?.recurrenceId) {
          try {
            const token = await this.getPayHereAccessToken();
            const cancelRes = await fetch(
              `${process.env.PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  subscription_id:
                    subscription.originalSubscriptionData.recurrenceId,
                }),
              }
            );

            if (cancelRes.ok) {
              const cancelData = await cancelRes.json();
              console.log("✅ Old PayHere subscription cancelled:", cancelData);
            } else {
              console.log("⚠️ Failed to cancel old subscription");
            }
          } catch (err) {
            console.error("❌ Error cancelling old subscription:", err.message);
          }
        }

        subscription.recurrenceId = subscription_id;
        subscription.completeUpgrade();
      } else {
        // Normal subscription
        subscription.status = "active";
        subscription.recurrenceId = subscription_id;
        subscription.lastUpgradeAt = new Date();
      }

      // Add payment history
      subscription.paymentHistory.push({
        localPaymentId: payment_id,
        amount: payhere_amount,
        currency: payhere_currency,
        paidAt: new Date(),
        status: "completed",
        paymentMethod: "payhere",
      });

      await subscription.save();

      // Update user & store
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

      console.log("✅ Subscription and user/store updated");
    } else {
      console.log("❌ PayHere payment failed with status:", status_code);

      if (subscription.status === "pending_upgrade") {
        console.log("🔙 Rolling back upgrade...");
        subscription.rollbackUpgrade();
        await subscription.save();
      }
    }
  };
  /**
   * Upgrade/downgrade existing subscription
   * @param {string} userId - User ID
   * @param {string} packageName - New package name
   * @returns {Object} Updated subscription
   * @throws {Error} If no subscription, invalid package, or cooldown violation
   */
  async upgradeSubscription(user, packageName) {
    try {
      // Get current subscription
      const subscription = await this.getActiveSubscription(user._id);
      if (!subscription) {
        throw new Error("No active subscription found");
      }

      // Check if trying to change to same package
      if (subscription.package === packageName) {
        throw new Error("You are already on this package");
      }

      // Validate and get package data
      const currentPackage = await this.validatePackageExists(subscription.package);
      const selectedPackage = await this.validatePackageExists(packageName);
      
      const isDowngrade = selectedPackage.amount < currentPackage.amount;
      console.log("🔽 Package change:", isDowngrade ? "DOWNGRADE" : "UPGRADE");

      // Downgrade cooldown (2 months)
      if (isDowngrade && subscription.lastUpgradeAt) {
        const nextAllowedDowngrade = new Date(subscription.lastUpgradeAt);
        nextAllowedDowngrade.setMonth(nextAllowedDowngrade.getMonth() + 2);

        if (new Date() < nextAllowedDowngrade) {
          return {
            message:
              "You can downgrade only after 2 months from your last package change.",
            nextAvailableDowngradeDate: nextAllowedDowngrade,
          };
        }
      }

      // Generate upgrade attempt ID
      const upgradeAttemptId = `UPG_${Date.now()}_${user._id}`;
      console.log("🎯 Generated upgrade attempt ID:", upgradeAttemptId);

      // Safe upgrade step 1
      subscription.initiateUpgrade(selectedPackage, upgradeAttemptId);
      await subscription.save();
      console.log(
        "✅ Upgrade initiated safely. Original subscription backed up."
      );

      // Build PayHere payment params
      const store = await Store.findById(subscription.storeId);
      const orderId = `SUB_${subscription._id}_${upgradeAttemptId}`;

      const hash = this.generatePayHereHash({
        merchantId: process.env.PAYHERE_MERCHANT_ID,
        orderId,
        amount: selectedPackage.amount,
        currency: subscription.currency,
        merchantSecret: process.env.PAYHERE_SECRET,
      });

      const paymentParams = {
        sandbox: true,
        merchant_id: process.env.PAYHERE_MERCHANT_ID,
        return_url: process.env.PAYHERE_RETURN_URL,
        cancel_url: process.env.PAYHERE_CANCEL_URL,
        notify_url: process.env.PAYHERE_NOTIFY_URL,
        order_id: orderId,
        items: `Subscription Upgrade to ${selectedPackage.name} for ${store.name}`,
        currency: subscription.currency,
        amount: parseFloat(selectedPackage.amount).toFixed(2),
        first_name: user.name?.split(" ")[0] || "Customer",
        last_name: user.name?.split(" ")[1] || "Name",
        email: user.email || "no-reply@aiocart.lk",
        phone: user.phone || "0771234567",
        address: user.address?.street || "Unknown Address",
        city: user.address?.city || "Unknown City",
        country: "Sri Lanka",
        recurrence: "1 Month",
        duration: "Forever",
        hash,
      };

      return {
        success: true,
        message: `Subscription ${
          isDowngrade ? "downgrade" : "upgrade"
        } initiated safely. Your current subscription remains active until payment is confirmed.`,
        subscriptionId: subscription._id,
        upgradeAttemptId,
        paymentParams,
        paymentRequired: true,
        safeUpgrade: true,
      };
    } catch (error) {
      logger.error("Error upgrading subscription", {
        userId,
        packageName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cancel user subscription
   * @param {string} userId - User ID
   * @returns {Object} Cancelled subscription with validUntil date
   * @throws {Error} If no active subscription found
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) {
        throw new Error("No active subscription found");
      }

      try {
        const accessToken = await this.getPayHereAccessToken();
        console.log(
          "🔑 Using access token for cancellation:",
          accessToken?.substring(0, 20) + "..."
        );
        console.log(
          "🎯 Cancelling PayHere subscription ID:",
          subscription.recurrenceId
        );

        const cancelRes = await fetch(
          `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscription_id: subscription.recurrenceId,
            }),
          }
        );

        console.log("📡 PayHere cancel response status:", cancelRes.status);

        if (!cancelRes.ok) {
          const errorText = await cancelRes.text();
          console.error("❌ PayHere cancel error response:", errorText);

          // If it's a 401, try to get a fresh token and retry once
          if (cancelRes.status === 401) {
            console.log("🔄 Retrying with fresh token...");
            const freshToken = await this.getPayHereAccessToken();

            const retryRes = await fetch(
              `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${freshToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  subscription_id: subscription.recurrenceId,
                }),
              }
            );

            if (!retryRes.ok) {
              throw new Error(
                `PayHere cancel API failed after retry: ${retryRes.status} ${retryRes.statusText}`
              );
            }

            const retryData = await retryRes.json();
            if (retryData.status !== 1) {
              throw new Error(
                retryData.msg || "Failed to cancel on PayHere after retry"
              );
            }
          } else {
            throw new Error(
              `PayHere cancel API failed: ${cancelRes.status} ${cancelRes.statusText}`
            );
          }
        } else {
          const cancelData = await cancelRes.json();
          console.log("✅ PayHere cancel response:", cancelData);

          if (cancelData.status !== 1) {
            throw new Error(cancelData.msg || "Failed to cancel on PayHere");
          }
        }
      } catch (payhereError) {
        console.error("💥 PayHere cancellation error:", payhereError.message);
        console.error("📊 Full error:", payhereError);

        // For now, continue with local cancellation even if PayHere fails
        console.log(
          "⚠️ Proceeding with local cancellation despite PayHere error"
        );
      }

      // Update subscription status locally
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      await subscription.save();

      // Update user and store status
      const store = await Store.findById(subscription.storeId);

      if (store) {
        store.isActive = false;
        await store.save();
      }

      return {
        subscription,
        validUntil: subscription.endDate,
      };
    } catch (error) {
      logger.error("Error cancelling subscription", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Rollback failed upgrade
   * @param {string} userId - User ID
   * @returns {Object} Rollback result
   * @throws {Error} If no pending upgrade found
   */
  async rollbackUpgrade(userId) {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: "pending_upgrade",
      });

      if (!subscription) {
        throw new Error("No pending upgrade found to rollback");
      }

      // Check if upgrade has expired
      if (subscription.isUpgradeExpired(30)) { // 30 minutes timeout
        logger.info("Upgrade expired, performing rollback", {
          subscriptionId: subscription._id,
          userId,
        });
      }

      // Perform rollback
      subscription.rollbackUpgrade();
      await subscription.save();

      logger.info("Upgrade rolled back successfully", {
        subscriptionId: subscription._id,
        userId,
        restoredPackage: subscription.package,
      });

      return {
        subscription,
        message: "Upgrade rolled back successfully",
        restoredPackage: subscription.package,
      };
    } catch (error) {
      logger.error("Error rolling back upgrade", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get subscription by store ID
   * @param {string} storeId - Store ID
   * @returns {Object|null} Active subscription for store or null
   */
  async getSubscriptionByStore(storeId) {
    try {
      const subscription = await Subscription.findOne({
        storeId,
        status: "active",
      });

      return subscription;
    } catch (error) {
      logger.error("Error fetching subscription by store", {
        storeId,
        error: error.message,
      });
      throw new Error("Failed to fetch store subscription");
    }
  }

  // ============ VALIDATION METHODS ============

  /**
   * Validate package exists in database
   * @param {string} packageName - Package name to validate
   * @returns {Object} Package data
   * @throws {Error} If package not found
   */
  async validatePackageExists(packageName) {
    const packageData = await Package.findOne({ name: packageName });

    if (!packageData) {
      throw new Error(`Package '${packageName}' not found`);
    }

    if (!packageData.amount || packageData.amount <= 0) {
      throw new Error(`Package '${packageName}' has invalid amount`);
    }

    return packageData;
  }

  /**
   * Validate package upgrade/downgrade rules
   * @param {Object} currentPackage - Current package data
   * @param {Object} newPackage - Target package data
   * @param {Date} lastUpgradeAt - Last upgrade date
   * @throws {Error} If upgrade/downgrade not allowed
   */
  async validatePackageUpgrade(currentPackage, newPackage, lastUpgradeAt) {
    const isDowngrade = newPackage.amount < currentPackage.amount;

    if (isDowngrade) {
      await this.checkDowngradeCooldown(lastUpgradeAt);
    }

    // Add any other business rules for upgrades/downgrades here
    logger.info("Package change validated", {
      fromPackage: currentPackage.name,
      toPackage: newPackage.name,
      changeType: isDowngrade ? "DOWNGRADE" : "UPGRADE",
    });
  }

  /**
   * Check if downgrade is allowed (2-month cooldown)
   * @param {Date} lastUpgradeAt - Last upgrade date
   * @throws {Error} If downgrade not allowed due to cooldown
   */
  async checkDowngradeCooldown(lastUpgradeAt) {
    if (!lastUpgradeAt) {
      return; // No previous upgrade, downgrade allowed
    }

    const now = new Date();
    const cooldownEndDate = new Date(lastUpgradeAt);
    cooldownEndDate.setMonth(cooldownEndDate.getMonth() + 2);

    if (now < cooldownEndDate) {
      const daysRemaining = Math.ceil(
        (cooldownEndDate - now) / (1000 * 60 * 60 * 24)
      );
      throw new Error(
        `You can downgrade only after 2 months from your last package change. ${daysRemaining} days remaining.`
      );
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Calculate end date (1 month from start date)
   * @param {Date} startDate - Subscription start date
   * @returns {Date} End date (1 month later)
   */
  calculateEndDate(startDate) {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  /**
   * Check if package change is valid
   * @param {string} fromPackage - Current package name
   * @param {string} toPackage - Target package name
   * @returns {boolean} True if change is valid
   */
  isValidPackageChange(fromPackage, toPackage) {
    return fromPackage !== toPackage;
  }

  /**
   * Find subscription by user (helper method)
   * @param {string} userId - User ID
   * @returns {Object|null} Subscription or null
   */
  async findSubscriptionByUser(userId) {
    return await Subscription.findOne({ userId });
  }

  // ============ ADMIN METHODS ============

  /**
   * Get all subscriptions (admin use)
   * @param {Object} filters - Query filters
   * @returns {Array} List of subscriptions
   */
  async getAllSubscriptions(filters = {}) {
    try {
      let query = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.package) {
        query.package = filters.package;
      }

      const subscriptions = await Subscription.find(query)
        .populate("userId", "name email")
        .populate("storeId", "name")
        .sort({ createdAt: -1 });

      return subscriptions;
    } catch (error) {
      logger.error("Error fetching all subscriptions", {
        error: error.message,
      });
      throw new Error("Failed to fetch subscriptions");
    }
  }

  /**
   * Get subscription statistics (admin use)
   * @returns {Object} Subscription stats
   */
  async getSubscriptionStats() {
    try {
      const stats = await Subscription.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);

      const packageStats = await Subscription.aggregate([
        {
          $match: { status: "active" },
        },
        {
          $group: {
            _id: "$package",
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
      ]);

      return {
        byStatus: stats,
        byPackage: packageStats,
        totalActive: stats.find((s) => s._id === "active")?.count || 0,
      };
    } catch (error) {
      logger.error("Error fetching subscription stats", {
        error: error.message,
      });
      throw new Error("Failed to fetch subscription statistics");
    }
  }
}

export default SubscriptionService;
