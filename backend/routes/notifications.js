// routes/notifications.js
import express from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get notifications for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Soft delete notification
router.patch('/:id/delete', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDeleted: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Mark all as read
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * Create purchase confirmation notifications
 */
export const createPurchaseNotification = async (userId, type, data) => {
  try {
    let title, message, actionUrl;
    
    if (type === 'order') {
      title = "🛒 Order Confirmed!";
      message = `Your order #${data._id?.slice(-8).toUpperCase()} has been confirmed. Total: LKR ${data.totalAmount?.toLocaleString()}`;
      actionUrl = `/account/orders`;
    } else if (type === 'booking') {
      title = "📅 Booking Confirmed!";
      message = `Your service booking #${data._id?.slice(-8).toUpperCase()} has been confirmed. Total: LKR ${data.totalAmount?.toLocaleString()}`;
      actionUrl = `/account/bookings`;
    }
    
    const notification = new Notification({
      userId,
      title,
      message,
      type: 'purchase_confirmation',
      actionUrl,
      metadata: {
        transactionId: data._id,
        transactionType: type,
        amount: data.totalAmount,
        paymentMethod: data.paymentMethod
      }
    });
    
    await notification.save();
    console.log(`Purchase notification created for user ${userId}`);
    
  } catch (error) {
    console.error('Error creating purchase notification:', error);
  }
};

/**
 * Create payment success notifications
 */
export const createPaymentSuccessNotification = async (userId, transactionData) => {
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
    console.log(`Payment success notification created for user ${userId}`);
    
  } catch (error) {
    console.error('Error creating payment success notification:', error);
  }
};

/**
 * Create delivery update notifications  
 */
export const createDeliveryNotification = async (userId, orderId, status, estimatedDate) => {
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
    console.log(`Delivery notification created for user ${userId}, status: ${status}`);
    
  } catch (error) {
    console.error('Error creating delivery notification:', error);
  }
};

export default router;
