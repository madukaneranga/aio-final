import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Store from "../models/Store.js";
import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { emitNotification } from "../utils/socketUtils.js";
import {
  updateStoreRating,
  updateProductRating,
} from "../helpers/updateratings.js";

class ReviewController {
  async getStoreReviews(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const reviews = await Review.find({
        storeId: req.params.storeId,
        isVisible: true,
      })
        .populate("customerId", "name")
        .sort({ createdAt: -1 });

      res.json(successResponse(reviews));
    } catch (error) {
      logger.error("Error fetching store reviews", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getProductReviews(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const productId = req.params.productId;

      // Find orders that contain this product
      const orders = await Order.find({ 
        "items.productId": productId,
        status: { $in: ["delivered", "completed"] }
      }, { _id: 1 });
      const orderIds = orders.map(order => order._id);

      // Find reviews for those orders that are visible
      const reviews = await Review.find({ 
        orderId: { $in: orderIds },
        isVisible: true 
      })
        .populate("customerId", "name")
        .populate("storeId", "name")
        .populate("orderId", "createdAt")
        .sort({ createdAt: -1 });

      res.json(successResponse(reviews));
    } catch (error) {
      logger.error("Error fetching product reviews", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getManageReviews(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const reviews = await Review.find({ storeId: req.user.storeId })
        .populate("customerId", "name email")
        .populate("orderId", "totalAmount")
        .sort({ createdAt: -1 });

      res.json(successResponse(reviews));
    } catch (error) {
      logger.error("Error fetching manage reviews", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async createReview(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { storeId, orderId, rating, comment } = req.body;

      let hasCompletedTransaction = false;
      let isReviewed = false;
      let order = null;

      if (orderId) {
        order = await Order.findOne({
          _id: orderId,
          customerId: req.user._id,
          status: { $in: ["delivered", "completed"] },
        }).populate("items.productId");

        hasCompletedTransaction = !!order;
        isReviewed = !!order?.reviewed;
      }

      if (!hasCompletedTransaction) {
        return res.status(400).json(errorResponse("You can only review after completing an order", 400));
      }

      if (isReviewed) {
        return res.status(400).json(errorResponse("You have already reviewed this transaction", 400));
      }

      const review = new Review({
        customerId: req.user._id,
        storeId,
        orderId: orderId || undefined,
        rating,
        comment,
      });
      await review.save();

      await updateStoreRating(storeId);

      if (order && order.items?.length) {
        for (const item of order.items) {
          await updateProductRating(item.productId);
        }
        order.reviewed = true;
        await order.save();
      }

      const store = await Store.findById(storeId);
      if (store) {
        const notification = await Notification.create({
          userId: store.ownerId,
          title: "New Review Received",
          userType: "store_owner",
          body: "Your store has received a new customer review. Please respond to maintain excellent customer engagement.",
          type: "review_update",
          link: `/store/${store._id}`,
        });

        emitNotification(store.ownerId.toString(), notification);
      }

      const populatedReview = await Review.findById(review._id)
        .populate("customerId", "name")
        .populate("orderId", "totalAmount");

      res.status(201).json(successResponse(populatedReview, "Review created successfully", 201));
    } catch (error) {
      logger.error("Error creating review", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async updateReviewVisibility(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { isVisible } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json(errorResponse("Review not found", 404));
      }

      if (review.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      review.isVisible = isVisible;
      await review.save();

      await updateStoreRating(review.storeId);

      res.json(successResponse(review, "Review visibility updated"));
    } catch (error) {
      logger.error("Error updating review visibility", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async respondToReview(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { message } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json(errorResponse("Review not found", 404));
      }

      if (review.storeId.toString() !== req.user.storeId?.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      review.response = {
        message,
        respondedAt: new Date(),
      };
      await review.save();

      const store = await Store.findById(review.storeId);

      try {
        const notification = await Notification.create({
          userId: review.customerId,
          userType: "customer",
          title: "Response to Your Review",
          body: "The store owner has responded to your review. Please check their reply.",
          type: "review_update",
          link: `/store/${store._id}`,
        });

        emitNotification(review.customerId.toString(), notification);
      } catch (err) {
        logger.error("Failed to create or emit notification", err);
      }

      res.json(successResponse(review, "Review response added successfully"));
    } catch (error) {
      logger.error("Error responding to review", error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export default new ReviewController();