import crypto from "crypto";
import Subscription from "../models/Subscription.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import Package from "../models/Package.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";

// PayHere configuration
const PAYHERE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://www.payhere.lk"
    : "https://sandbox.payhere.lk";
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || "1231188";
const PAYHERE_SECRET =
  process.env.PAYHERE_SECRET ||
  "MTIyNzk3NjY4MTc4NjQ0ODM3NTQxOTczNzI2NjMzOTQwNTgwNjcy";

const PAYHERE_RETURN_URL = "https://aiocart.lk/dashboard";
const PAYHERE_CANCEL_URL = "https://aiocart.lk/dashboard";
const PAYHERE_NOTIFY_URL =
  "https://aio-backend-x770.onrender.com/api/subscriptions/ipn";

class SubscriptionController {
  // Utility function to check PayHere API status
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

      logger.info("PayHere API status check", { status: response.status });
      return response.status !== 0; // Any response means API is reachable
    } catch (error) {
      logger.error("PayHere API unreachable", error);
      return false;
    }
  }

  // Generate PayHere hash
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

  // Get PayHere access token
  async getPayHereAccessToken() {
    const appId = process.env.PAYHERE_APP_ID;
    const appSecret = process.env.PAYHERE_APP_SECRET;

    logger.info("Getting PayHere access token", {
      baseUrl: PAYHERE_BASE_URL,
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
    });

    if (!appId || !appSecret) {
      throw new Error(
        "PayHere APP_ID and APP_SECRET are required in environment variables"
      );
    }

    const base64Auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

    try {
      const oauthUrl = `${PAYHERE_BASE_URL}/merchant/v1/oauth/token`;
      logger.info("Making request to OAuth URL", { url: oauthUrl });

      const res = await fetch(oauthUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      logger.info("OAuth response received", { status: res.status });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error("OAuth error response", {
          status: res.status,
          error: errorText,
        });
        throw new Error(
          `PayHere OAuth failed: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const data = await res.json();
      logger.info("OAuth token received", { hasToken: !!data.access_token });

      if (!data.access_token) {
        throw new Error(
          "Access token not received from PayHere: " + JSON.stringify(data)
        );
      }
      return data.access_token;
    } catch (error) {
      logger.error("PayHere access token error", error);
      throw error;
    }
  }

  // Create subscription
  createSubscription = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { packageName } = req.body;
      logger.info("Creating subscription", { packageName });

      const userId = req.user._id;
      const store = await Store.findOne({ ownerId: userId });

      if (!store) {
        return res
          .status(404)
          .json(errorResponse("Store not found for this user", 404));
      }

      if (!packageName) {
        return res
          .status(400)
          .json(errorResponse("Package name is required", 400));
      }

      console.log(`🔍 Looking for package: "${packageName}"`);
      const selectedPackage = await Package.findOne({ name: packageName });
      
      console.log("📦 Package lookup result:", {
        packageName,
        found: !!selectedPackage,
        packageData: selectedPackage
      });

      if (!selectedPackage) {
        console.log(`❌ Package not found: "${packageName}"`);
        return res.status(404).json(errorResponse("Package not found", 404));
      }

      console.log(`💰 Package amount: ${selectedPackage.amount}`);

      if (!selectedPackage.amount || selectedPackage.amount <= 0) {
        console.error(`❌ Invalid package amount:`, {
          packageName,
          amount: selectedPackage.amount,
          fullPackage: selectedPackage
        });
        return res.status(400).json(
          errorResponse(`Invalid package amount: ${selectedPackage.amount}`, 400)
        );
      }

      let subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);

        console.log(`💳 Creating new subscription with amount: ${selectedPackage.amount}`);
        
        const subscriptionData = {
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
        };
        
        console.log(`🔧 Subscription data before creation:`, {
          amount: subscriptionData.amount,
          package: subscriptionData.package,
          userId: subscriptionData.userId.toString()
        });
        
        subscription = new Subscription(subscriptionData);
        
        await subscription.save();
        console.log(`✅ Subscription created with ID: ${subscription._id}, Amount: ${subscription.amount}`);
      }


      const orderId = `SUB_${subscription._id}`;
      console.log(`🔢 Preparing payment with subscription amount: ${subscription.amount}`);
      
      const hash = this.generatePayHereHash({
        merchantId: PAYHERE_MERCHANT_ID,
        orderId,
        amount: subscription.amount,
        currency: subscription.currency,
        merchantSecret: PAYHERE_SECRET,
      });

      console.log(`🔐 Generated hash for amount: ${subscription.amount}`);

      const paymentParams = {
        sandbox: process.env.NODE_ENV !== "production",
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

      console.log(`💰 Final payment amount being sent to PayHere: ${paymentParams.amount}`);
      console.log(`📋 Payment summary:`, {
        subscriptionId: subscription._id,
        packageName,
        originalAmount: selectedPackage.amount,
        subscriptionAmount: subscription.amount,
        paymentAmount: paymentParams.amount
      });

      res.json(
        successResponse({
          paymentParams,
          subscriptionId: subscription._id,
        })
      );
    } catch (error) {
      logger.error("Error in create-subscription", error);
      res.status(500).json(errorResponse("Internal server error"));
    }
  };

  // Handle PayHere IPN
  handlePayHereIPN = async (req, res) => {
    logger.route(req.method, req.originalUrl);

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

      // Parse subscription ID from order_id
      let subscriptionId;
      if (order_id.includes("_UPG_")) {
        subscriptionId = order_id.split("_UPG_")[0].replace("SUB_", "");
        logger.info("Detected upgrade payment", { subscriptionId });
      } else {
        subscriptionId = order_id.replace("SUB_", "");
        logger.info("Regular subscription payment", { subscriptionId });
      }

      const subscription = await Subscription.findById(subscriptionId);
      logger.info("Found subscription", { status: subscription?.status });

      if (!subscription) {
        return res.status(404).send("Subscription not found");
      }

      if (status_code === "2") {
        logger.info(
          "PayHere payment successful, processing subscription update"
        );

        // Check if this is an upgrade completion
        if (subscription.status === "pending_upgrade") {
          logger.info("Completing upgrade process");

          // Cancel old PayHere subscription if it exists
          if (subscription.originalSubscriptionData?.recurrenceId) {
            try {
              logger.info("Cancelling old PayHere subscription", {
                recurrenceId:
                  subscription.originalSubscriptionData.recurrenceId,
              });

              const token = await this.getPayHereAccessToken();

              const cancelRes = await fetch(
                `${PAYHERE_BASE_URL}/merchant/v1/subscription/cancel`,
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
                logger.info("Old PayHere subscription cancelled", {
                  data: cancelData,
                });
              } else {
                logger.info(
                  "Failed to cancel old PayHere subscription, but continuing"
                );
              }
            } catch (cancelError) {
              logger.error("Error cancelling old subscription", cancelError);
            }
          }

          subscription.recurrenceId = subscription_id;
          subscription.completeUpgrade();
          logger.info("Upgrade completed successfully");
        } else {
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
          paymentMethod: "payhere",
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

        logger.info("Subscription and user/store status updated successfully");
      } else {
        logger.info("PayHere payment failed", { statusCode: status_code });

        if (subscription.status === "pending_upgrade") {
          logger.info("Rolling back upgrade due to payment failure");
          subscription.rollbackUpgrade();
          await subscription.save();
          logger.info("Upgrade rolled back successfully");
        }
      }

      res.send("OK");
    } catch (err) {
      logger.error("Error in IPN", err);
      res.status(500).send("IPN Error");
    }
  };

  // Cancel subscription
  cancelSubscription = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      logger.info("Starting subscription cancellation process", {
        userId: req.user._id,
      });

      const { subscriptionId } = req.body;

      let subscription;
      if (subscriptionId) {
        subscription = await Subscription.findById(subscriptionId);
      } else {
        subscription = await Subscription.findOne({
          userId: req.user._id,
          status: { $in: ["active", "pending"] },
        });
      }

      logger.info("Found subscription", {
        id: subscription?._id,
        status: subscription?.status,
        recurrenceId: subscription?.recurrenceId,
        hasRecurrenceId: !!subscription?.recurrenceId,
      });

      if (!subscription) {
        return res
          .status(404)
          .json(errorResponse("Subscription not found", 404));
      }

      if (subscription.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Unauthorized access", 403));
      }

      // Check if 1 month has passed since last upgrade/change
      if (subscription.lastUpgradeAt) {
        const nextAllowedCancelDate = new Date(subscription.lastUpgradeAt);
        nextAllowedCancelDate.setMonth(nextAllowedCancelDate.getMonth() + 1);

        if (new Date() < nextAllowedCancelDate) {
          return res
            .status(403)
            .json(
              errorResponse(
                "You can cancel subscription only after 1 month from your last package change.",
                403,
                { nextAvailableCancelDate: nextAllowedCancelDate }
              )
            );
        }
      }

      // If no PayHere subscription recurrence ID, just cancel locally
      if (!subscription.recurrenceId) {
        logger.info("No PayHere recurrence ID, cancelling locally only");
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

        return res.json(
          successResponse({
            message: "Subscription cancelled successfully (local only)",
          })
        );
      }

      // Cancel subscription on PayHere
      try {
        const accessToken = await this.getPayHereAccessToken();
        logger.info("Using access token for cancellation", {
          tokenPreview: accessToken?.substring(0, 20) + "...",
          recurrenceId: subscription.recurrenceId,
        });

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

        logger.info("PayHere cancel response", { status: cancelRes.status });

        if (!cancelRes.ok) {
          const errorText = await cancelRes.text();
          logger.error("PayHere cancel error", {
            status: cancelRes.status,
            error: errorText,
          });

          // If it's a 401, try to get a fresh token and retry once
          if (cancelRes.status === 401) {
            logger.info("Retrying with fresh token");
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
          logger.info("PayHere cancel response", { data: cancelData });

          if (cancelData.status !== 1) {
            return res
              .status(500)
              .json(
                errorResponse(cancelData.msg || "Failed to cancel on PayHere")
              );
          }
        }
      } catch (payhereError) {
        logger.error("PayHere cancellation error", payhereError);
        logger.info("Proceeding with local cancellation despite PayHere error");
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

      res.json(
        successResponse({ message: "Subscription cancelled successfully" })
      );
    } catch (err) {
      logger.error("Error cancelling subscription", err);
      res
        .status(500)
        .json(errorResponse("Server error cancelling subscription"));
    }
  };

  // Retry subscription payment
  retryPayment = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { recurrenceId } = req.body;
      const accessToken = await this.getPayHereAccessToken();

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
        return res
          .status(400)
          .json(errorResponse(retryData.msg || "Retry failed", 400));
      }

      res.json(successResponse({ message: "Retry successful" }));
    } catch (err) {
      logger.error("Retry error", err);
      res.status(500).json(errorResponse("Retry error"));
    }
  };

  // Get user's subscription
  async getMySubscription(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
      }).populate("storeId", "name");

      if (!subscription) {
        // Return success response with null subscription instead of 404 error
        return res.json(
          successResponse({
            subscription: null,
            package: null,
            message: "No active subscription found",
          })
        );
      }

      const pkg = await Package.findOne({ name: subscription.package });

      res.json(
        successResponse({
          subscription,
          package: pkg,
        })
      );
    } catch (error) {
      logger.error("Error getting user subscription", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  // Upgrade subscription
  upgradeSubscription = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { packageName } = req.body;
      const userId = req.user._id;

      logger.info("Starting safe subscription upgrade process", {
        userId,
        packageName,
      });

      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        return res
          .status(404)
          .json(errorResponse("Subscription not found", 404));
      }

      logger.info("Current subscription status", {
        status: subscription.status,
      });

      if (subscription.status === "pending_upgrade") {
        return res.status(409).json(
          errorResponse(
            "Upgrade already in progress. Please complete current upgrade or wait for timeout.",
            409,
            {
              upgradeAttemptId: subscription.upgradeAttemptId,
              upgradeInitiatedAt: subscription.upgradeInitiatedAt,
            }
          )
        );
      }

      if (subscription.package === packageName) {
        return res
          .status(400)
          .json(errorResponse("You are already on this package.", 400));
      }

      const currentPackage = await Package.findOne({
        name: subscription.package,
      });
      console.log(`🔍 [UPGRADE] Looking for package: "${packageName}"`);
      const selectedPackage = await Package.findOne({ name: packageName });
      
      console.log("📦 [UPGRADE] Package lookup result:", {
        currentPackage: currentPackage?.name,
        currentAmount: currentPackage?.amount,
        selectedPackage: selectedPackage?.name,
        selectedAmount: selectedPackage?.amount
      });

      if (!selectedPackage || !currentPackage) {
        return res
          .status(400)
          .json(errorResponse("Invalid package selection.", 400));
      }

      const isDowngrade = selectedPackage.amount < currentPackage.amount;
      logger.info("Package change type", {
        type: isDowngrade ? "DOWNGRADE" : "UPGRADE",
      });

      // Downgrade cooldown check (2 months)
      if (isDowngrade && subscription.lastUpgradeAt) {
        const nextAllowedDowngrade = new Date(subscription.lastUpgradeAt);
        nextAllowedDowngrade.setMonth(nextAllowedDowngrade.getMonth() + 2);

        if (new Date() < nextAllowedDowngrade) {
          return res
            .status(403)
            .json(
              errorResponse(
                "You can downgrade only after 2 months from your last package change.",
                403,
                { nextAvailableDowngradeDate: nextAllowedDowngrade }
              )
            );
        }
      }

      const upgradeAttemptId = `UPG_${Date.now()}_${userId}`;
      logger.info("Generated upgrade attempt ID", { upgradeAttemptId });

      subscription.initiateUpgrade(selectedPackage, upgradeAttemptId);
      await subscription.save();

      logger.info("Upgrade initiated safely. Original subscription backed up.");

      const store = await Store.findById(subscription.storeId);
      const orderId = `SUB_${subscription._id}_${upgradeAttemptId}`;

      const hash = this.generatePayHereHash({
        merchantId: PAYHERE_MERCHANT_ID,
        orderId,
        amount: selectedPackage.amount,
        currency: subscription.currency,
        merchantSecret: PAYHERE_SECRET,
      });

      const paymentParams = {
        sandbox: process.env.NODE_ENV !== "production",
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

      logger.info("Payment parameters generated for safe upgrade");

      return res.json(
        successResponse({
          message: `Subscription ${
            isDowngrade ? "downgrade" : "upgrade"
          } initiated safely. Your current subscription remains active until payment is confirmed.`,
          subscriptionId: subscription._id,
          upgradeAttemptId: upgradeAttemptId,
          paymentParams,
          paymentRequired: true,
          safeUpgrade: true,
        })
      );
    } catch (error) {
      logger.error("Safe subscription upgrade error", error);

      try {
        const subscription = await Subscription.findOne({
          userId: req.user._id,
        });
        if (subscription && subscription.status === "pending_upgrade") {
          subscription.rollbackUpgrade();
          await subscription.save();
          logger.info("Rolled back upgrade due to error");
        }
      } catch (rollbackError) {
        logger.error("Rollback failed", rollbackError);
      }

      return res
        .status(500)
        .json(
          errorResponse(
            "Server error during subscription change. Your original subscription is safe."
          )
        );
    }
  };

  // Rollback upgrade manually
  async rollbackUpgrade(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { upgradeAttemptId } = req.body;
      const userId = req.user._id;

      logger.info("Manual upgrade rollback requested", { upgradeAttemptId });

      const subscription = await Subscription.findOne({
        userId,
        status: "pending_upgrade",
        upgradeAttemptId: upgradeAttemptId,
      });

      if (!subscription) {
        return res
          .status(404)
          .json(errorResponse("No pending upgrade found to rollback", 404));
      }

      subscription.rollbackUpgrade();
      await subscription.save();

      logger.info("Manual upgrade rollback completed");

      res.json(
        successResponse({
          message:
            "Upgrade cancelled successfully. Your original subscription has been restored.",
        })
      );
    } catch (error) {
      logger.error("Manual rollback error", error);
      res.status(500).json(errorResponse("Failed to rollback upgrade"));
    }
  }

  // Get all subscriptions (admin only)
  async getAllSubscriptions(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      if (req.user.email !== "admin@aio.com") {
        return res
          .status(403)
          .json(errorResponse("Admin access required", 403));
      }

      const subscriptions = await Subscription.find()
        .populate("userId", "name email")
        .populate("storeId", "name type")
        .sort({ createdAt: -1 });

      res.json(successResponse(subscriptions));
    } catch (error) {
      logger.error("Error getting all subscriptions", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  // Cleanup expired upgrades
  async cleanupExpiredUpgrades(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      if (req.user.email !== "admin@aio.com" && !req.headers["x-system-call"]) {
        return res
          .status(403)
          .json(errorResponse("Admin access required", 403));
      }

      logger.info("Starting cleanup of expired upgrades");

      const expiredUpgrades = await Subscription.findExpiredUpgrades(30); // 30 minutes timeout
      let cleanedUp = 0;

      for (const subscription of expiredUpgrades) {
        try {
          logger.info("Rolling back expired upgrade", {
            subscriptionId: subscription._id,
            upgradeAttemptId: subscription.upgradeAttemptId,
          });

          subscription.rollbackUpgrade();
          await subscription.save();

          cleanedUp++;
          logger.info("Rolled back expired upgrade", {
            userId: subscription.userId,
          });
        } catch (error) {
          logger.error("Failed to rollback upgrade", {
            subscriptionId: subscription._id,
            error: error.message,
          });
        }
      }

      logger.info("Cleanup completed", { rolledBack: cleanedUp });

      res.json(
        successResponse({
          message: `Cleaned up ${cleanedUp} expired upgrades`,
          expiredCount: expiredUpgrades.length,
          cleanedUpCount: cleanedUp,
        })
      );
    } catch (error) {
      logger.error("Cleanup job error", error);
      res.status(500).json(errorResponse("Cleanup job failed"));
    }
  }

  // Debug PayHere status (admin only)
  getPayHereStatus = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    if (req.user.email !== "admin@aio.com") {
      return res.status(403).json(errorResponse("Admin access required", 403));
    }

    try {
      const status = {
        baseUrl: PAYHERE_BASE_URL,
        merchantId: PAYHERE_MERCHANT_ID,
        hasAppId: !!process.env.PAYHERE_APP_ID,
        hasAppSecret: !!process.env.PAYHERE_APP_SECRET,
        environment: process.env.NODE_ENV || "development",
      };

      const apiAvailable = await this.checkPayHereAPIStatus();
      status.apiAvailable = apiAvailable;

      try {
        const token = await this.getPayHereAccessToken();
        status.tokenGeneration = "success";
        status.tokenPreview = token?.substring(0, 20) + "...";
      } catch (error) {
        status.tokenGeneration = "failed";
        status.tokenError = error.message;
      }

      res.json(successResponse(status));
    } catch (error) {
      logger.error("Error getting PayHere status", error);
      res.status(500).json(errorResponse(error.message));
    }
  };
}

export default new SubscriptionController();
