import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class NotificationController {
  async getNotifications(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const notifications = await Notification.find({
        userId: req.user._id,
        isDeleted: false,
      }).sort({ createdAt: -1 }).limit(20);
      
      res.json(successResponse({ notifications }));
    } catch (err) {
      logger.error("Failed to fetch notifications", err);
      res.status(500).json(errorResponse("Failed to fetch notifications"));
    }
  }

  async markAsRead(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isRead: true }
      );
      
      if (!notification) {
        return res.status(404).json(errorResponse("Notification not found", 404));
      }
      
      res.json(successResponse(null, "Notification marked as read"));
    } catch (err) {
      logger.error("Failed to mark as read", err);
      res.status(500).json(errorResponse("Failed to mark as read"));
    }
  }

  async deleteNotification(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isDeleted: true }
      );
      
      if (!notification) {
        return res.status(404).json(errorResponse("Notification not found", 404));
      }
      
      res.json(successResponse(null, "Notification deleted"));
    } catch (err) {
      logger.error("Failed to delete notification", err);
      res.status(500).json(errorResponse("Failed to delete notification"));
    }
  }

  async markAllAsRead(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { isRead: true }
      );
      res.json(successResponse(null, "All notifications marked as read"));
    } catch (err) {
      logger.error("Failed to mark all as read", err);
      res.status(500).json(errorResponse("Failed to mark all as read"));
    }
  }

  static async createPurchaseNotification(userId, data) {
    try {
      let title, message, actionUrl;
      
      title = "🛒 Order Confirmed!";
      message = `Your order #${data._id?.slice(-8).toUpperCase()} has been confirmed. Total: LKR ${data.totalAmount?.toLocaleString()}`;
      actionUrl = `/account/orders`;
      
      if (!title) {
        logger.info('Skipping notification for unsupported formats');
        return;
      }
      
      const notification = new Notification({
        userId,
        title,
        message,
        type: 'purchase_confirmation',
        actionUrl,
        metadata: {
          transactionId: data._id,
          amount: data.totalAmount,
          paymentMethod: data.paymentMethod
        }
      });
      
      await notification.save();
      logger.info(`Purchase notification created for user ${userId}`);
      
    } catch (error) {
      logger.error('Error creating purchase notification', error);
    }
  }

  static async createPaymentSuccessNotification(userId, transactionData) {
    try {
      const notification = new Notification({
        userId,
        title: "💳 Payment Successful!",
        message: `Your payment of LKR ${transactionData.amount?.toLocaleString()} has been processed successfully via ${transactionData.paymentMethod?.toUpperCase()}.`,
        type: 'payment_success',
        actionUrl: `/account/wallet`,
        metadata: {
          transactionId: transactionData._id,
          amount: transactionData.amount,
          paymentMethod: transactionData.paymentMethod
        }
      });
      
      await notification.save();
      logger.info(`Payment success notification created for user ${userId}`);
      
    } catch (error) {
      logger.error('Error creating payment success notification', error);
    }
  }

  static async createDeliveryNotification(userId, orderId, status, estimatedDate) {
    try {
      let title, message;
      
      switch (status) {
        case 'processing':
          title = "📦 Order Processing";
          message = "Your order is being prepared and will be shipped soon.";
          break;
        case 'shipped':
          title = "🚚 Order Shipped";
          message = `Your order is on the way! Expected delivery: ${estimatedDate}`;
          break;
        case 'delivered':
          title = "✅ Order Delivered";
          message = "Your order has been delivered successfully!";
          break;
        default:
          title = "📋 Order Update";
          message = "There's an update on your order.";
      }
      
      const notification = new Notification({
        userId,
        title,
        message,
        type: 'delivery_update',
        actionUrl: `/account/orders`,
        metadata: {
          orderId,
          deliveryStatus: status,
          estimatedDate
        }
      });
      
      await notification.save();
      logger.info(`Delivery notification created for user ${userId}, status: ${status}`);
      
    } catch (error) {
      logger.error('Error creating delivery notification', error);
    }
  }
}

export default new NotificationController();

export const {
  createPurchaseNotification,
  createPaymentSuccessNotification,
  createDeliveryNotification
} = NotificationController;