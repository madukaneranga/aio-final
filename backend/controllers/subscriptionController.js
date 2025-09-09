import crypto from "crypto";
import SubscriptionService from "../services/subscriptionService.js";
import {
  successResponse,
  errorResponse,
} from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";


/**
 * SubscriptionController - Clean HTTP layer for subscription management
 * Handles request/response, delegates business logic to SubscriptionService
 */
class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Get current user's active subscription
   * GET /api/subscriptions/subscription
   */
  getSubscription = async (req, res) => {
    try {
      const userId = req.user._id;
      logger.info("Getting subscription", { userId });

      const subscription = await this.subscriptionService.getActiveSubscription(
        userId
      );

      if (!subscription) {
        // Return success response with default "pending" status instead of 404 error
        const defaultSubscription = {
          status: "pending",
          package: null,
          userId: userId,
        };
        
        return res.json(
          successResponse({ 
            subscription: defaultSubscription, 
            isSubscribed: false 
          })
        );
      }

      res.json(
        successResponse({ subscription, isSubscribed: Boolean(subscription) })
      );
    } catch (error) {
      logger.error("Error getting subscription", {
        userId: req.user._id,
        error: error.message,
      });
      res.status(500).json(errorResponse("Failed to fetch subscription", 500));
    }
  };

  /**
   * Create new subscription
   * POST /api/subscriptions/subscription
   * Body: { packageName: "basic|standard|premium" }
   */
  createSubscription = async (req, res) => {
    try {
      const userId = req.user._id;
      const { packageName } = req.body;

      if (!packageName) {
        return res
          .status(400)
          .json(errorResponse("Package name is required", 400));
      }

      logger.info("Creating subscription", { userId, packageName });

      const { pendingSubscription, paymentParams } =
        await this.subscriptionService.createSubscription(userId, packageName);

      res
        .status(201)
        .json(
          successResponse(
            { pendingSubscription, paymentParams },
            "Pending subscription created - complete payment to activate",
            201
          )
        );
    } catch (error) {
      logger.error("Error creating subscription", {
        userId: req.user._id,
        packageName: req.body.packageName,
        error: error.message,
      });

      // Map business errors to HTTP status codes
      const statusCode = this.getErrorStatusCode(error.message);
      const errorCode = this.getErrorCode(error.message);

      res
        .status(statusCode)
        .json(errorResponse(error.message, statusCode, errorCode));
    }
  };

  handleIpnEvent = async (req, res) => {
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

      // ✅ Generate local signature
      if (!process.env.PAYHERE_SECRET) {
        console.error("PAYHERE_SECRET environment variable is not set");
        return res.status(500).send("Server configuration error");
      }

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
              .update(process.env.PAYHERE_SECRET)
              .digest("hex")
              .toUpperCase()
        )
        .digest("hex")
        .toUpperCase();

      if (localMd5Sig !== md5sig) {
        return res.status(400).send("Invalid signature");
      }

      // Pass to service layer
      await this.subscriptionService.processIPN({
        order_id,
        payment_id,
        subscription_id,
        payhere_amount,
        payhere_currency,
        status_code,
      });

      res.send("OK");
    } catch (err) {
      console.error("❌ Error in handleIPN:", err);
      res.status(500).send("IPN Error");
    }
  };

  /**
   * Upgrade/downgrade existing subscription
   * PUT /api/subscriptions/subscription/upgrade
   * Body: { packageName: "basic|standard|premium" }
   */
  upgradeSubscription = async (req, res) => {
    try {
      const user = req.user;
      const { packageName } = req.body;

      if (!packageName) {
        return res
          .status(400)
          .json(errorResponse("Package name is required", 400));
      }

      logger.info("Upgrading subscription", { user, packageName });

      const updatedSubscription =
        await this.subscriptionService.upgradeSubscription(user, packageName);

      res.json(
        successResponse(
          updatedSubscription,
          "Subscription updated successfully"
        )
      );
    } catch (error) {
      logger.error("Error upgrading subscription", {
        user,
        packageName: req.body.packageName,
        error: error.message,
      });

      const statusCode = this.getErrorStatusCode(error.message);
      const errorCode = this.getErrorCode(error.message);

      res
        .status(statusCode)
        .json(errorResponse(error.message, statusCode, errorCode));
    }
  };

  /**
   * Cancel user subscription
   * DELETE /api/subscriptions/subscription
   */
  cancelSubscription = async (req, res) => {
    try {
      const userId = req.user._id;
      logger.info("Cancelling subscription", { userId });

      const result = await this.subscriptionService.cancelSubscription(userId);

      res.json(
        successResponse(
          {
            status: "cancelled",
            validUntil: result.validUntil,
          },
          "Subscription cancelled successfully"
        )
      );
    } catch (error) {
      logger.error("Error cancelling subscription", {
        userId: req.user._id,
        error: error.message,
      });

      const statusCode = this.getErrorStatusCode(error.message);
      const errorCode = this.getErrorCode(error.message);

      res
        .status(statusCode)
        .json(errorResponse(error.message, statusCode, errorCode));
    }
  };

  /**
   * Rollback failed upgrade
   * POST /api/subscriptions/rollback
   */
  rollbackUpgrade = async (req, res) => {
    try {
      const userId = req.user._id;
      logger.info("Rolling back upgrade", { userId });

      const result = await this.subscriptionService.rollbackUpgrade(userId);

      res.json(
        successResponse(result, "Upgrade rolled back successfully")
      );
    } catch (error) {
      logger.error("Error rolling back upgrade", {
        userId: req.user._id,
        error: error.message,
      });

      const statusCode = this.getErrorStatusCode(error.message);
      const errorCode = this.getErrorCode(error.message);

      res
        .status(statusCode)
        .json(errorResponse(error.message, statusCode, errorCode));
    }
  };

  // ============ ADMIN ENDPOINTS ============

  /**
   * Get all subscriptions (admin only)
   * GET /api/subscriptions/admin/all
   */
  getAllSubscriptions = async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        package: req.query.package,
      };

      logger.info("Getting all subscriptions", {
        filters,
        adminId: req.user._id,
      });

      const subscriptions = await this.subscriptionService.getAllSubscriptions(
        filters
      );

      res.json(
        successResponse({
          subscriptions,
          count: subscriptions.length,
        })
      );
    } catch (error) {
      logger.error("Error getting all subscriptions", {
        adminId: req.user._id,
        error: error.message,
      });

      res.status(500).json(errorResponse("Failed to fetch subscriptions", 500));
    }
  };

  /**
   * Get subscription statistics (admin only)
   * GET /api/subscriptions/admin/stats
   */
  getSubscriptionStats = async (req, res) => {
    try {
      logger.info("Getting subscription stats", { adminId: req.user._id });

      const stats = await this.subscriptionService.getSubscriptionStats();

      res.json(successResponse(stats));
    } catch (error) {
      logger.error("Error getting subscription stats", {
        adminId: req.user._id,
        error: error.message,
      });

      res
        .status(500)
        .json(errorResponse("Failed to fetch subscription statistics", 500));
    }
  };

  // ============ UTILITY METHODS ============

  /**
   * Map business errors to HTTP status codes
   * @param {string} errorMessage - Error message from service
   * @returns {number} HTTP status code
   */
  getErrorStatusCode(errorMessage) {
    if (errorMessage.includes("not found")) return 404;
    if (errorMessage.includes("already has active")) return 409;
    if (errorMessage.includes("already on this package")) return 400;
    if (errorMessage.includes("cooldown")) return 403;
    if (errorMessage.includes("must have a store")) return 400;
    if (errorMessage.includes("Package") && errorMessage.includes("not found"))
      return 400;
    if (errorMessage.includes("invalid amount")) return 400;

    return 400; // Default to bad request
  }

  /**
   * Map business errors to error codes
   * @param {string} errorMessage - Error message from service
   * @returns {string} Error code for frontend handling
   */
  getErrorCode(errorMessage) {
    if (errorMessage.includes("No active subscription found"))
      return "NO_SUBSCRIPTION";
    if (errorMessage.includes("already has active"))
      return "SUBSCRIPTION_EXISTS";
    if (errorMessage.includes("already on this package")) return "SAME_PACKAGE";
    if (errorMessage.includes("cooldown")) return "DOWNGRADE_COOLDOWN";
    if (errorMessage.includes("must have a store")) return "NO_STORE";
    if (errorMessage.includes("not found")) return "NOT_FOUND";

    return "VALIDATION_ERROR";
  }
}

export default SubscriptionController;