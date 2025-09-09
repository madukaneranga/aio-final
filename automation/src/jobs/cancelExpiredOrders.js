const mongoose = require('mongoose');
const moment = require('moment');
const logger = require('../utils/logger');
const notifier = require('../utils/notifier');

const orderSchema = new mongoose.Schema({}, { strict: false });
const userSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });

const Order = mongoose.model('Order', orderSchema);
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

class CancelExpiredOrdersJob {
  constructor() {
    this.name = 'cancelExpiredOrders';
    this.expirationHours = parseInt(process.env.ORDER_EXPIRATION_HOURS) || 96; // 4 days default
  }

  async execute() {
    try {
      logger.info('Starting cancel expired orders job');

      const expiredOrders = await this.findExpiredOrders();
      logger.info(`Found ${expiredOrders.length} expired orders to cancel`);

      const results = {
        success: [],
        failed: [],
        totalProcessed: expiredOrders.length
      };

      for (const order of expiredOrders) {
        try {
          await this.cancelOrder(order);
          results.success.push(order._id);
          logger.info(`Successfully cancelled expired order: ${order.orderNumber}`);
        } catch (error) {
          logger.error(`Failed to cancel order ${order.orderNumber}:`, error);
          results.failed.push({ orderId: order._id, error: error.message });
        }
      }

      logger.info(
        `Cancel expired orders job completed. ` +
        `Success: ${results.success.length}, Failed: ${results.failed.length}`
      );

      return {
        success: true,
        results: {
          cancelled: results.success.length,
          failed: results.failed.length,
          total: results.totalProcessed
        }
      };

    } catch (error) {
      logger.error('Error in cancel expired orders job:', error);
      return { success: false, error: error.message };
    }
  }

  async findExpiredOrders() {
    try {
      const expirationTime = moment().subtract(this.expirationHours, 'hours');

      const query = {
        paymentStatus: 'pending',
        status: { $nin: ['cancelled', 'expired', 'completed', 'processing'] },
        createdAt: { $lte: expirationTime.toDate() },
        autoCancel: { $ne: false } // Allow orders to opt out of auto-cancellation
      };

      const orders = await Order.find(query)
        .populate('userId', 'name email phone fcmTokens')
        .populate('items.productId', 'name stock')
        .lean();

      return orders;
    } catch (error) {
      logger.error('Error finding expired orders:', error);
      throw error;
    }
  }

  async cancelOrder(order) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Update order status
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'expired',
              paymentStatus: 'cancelled',
              cancelledAt: new Date(),
              cancellationReason: 'Automatic cancellation due to non-payment',
              autoCancel: true
            }
          },
          { session }
        );

        // Restore product stock if needed
        await this.restoreStock(order.items, session);

        // Send cancellation notification
        if (order.userId) {
          await notifier.sendOrderCancellation(order.userId, order);
        }

        // Log the cancellation
        logger.info(`Order ${order.orderNumber} cancelled after ${this.expirationHours} hours`);
      });

    } catch (error) {
      logger.error(`Error cancelling order ${order.orderNumber}:`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async restoreStock(orderItems, session) {
    try {
      for (const item of orderItems) {
        if (item.productId && item.quantity) {
          await Product.updateOne(
            { _id: item.productId._id },
            {
              $inc: { 
                stock: item.quantity,
                reservedStock: -item.quantity 
              }
            },
            { session }
          );

          logger.debug(
            `Restored ${item.quantity} units for product ${item.productId._id}`
          );
        }
      }
    } catch (error) {
      logger.error('Error restoring stock:', error);
      throw error;
    }
  }

  // Method to get count of orders that will expire soon
  async getExpiringOrdersCount(hoursUntilExpiration = 24) {
    try {
      const now = moment();
      const expirationTime = now.clone().subtract(this.expirationHours, 'hours');
      const warningTime = now.clone().subtract(this.expirationHours - hoursUntilExpiration, 'hours');

      const count = await Order.countDocuments({
        paymentStatus: 'pending',
        status: { $nin: ['cancelled', 'expired', 'completed', 'processing'] },
        createdAt: {
          $gte: expirationTime.toDate(),
          $lte: warningTime.toDate()
        },
        autoCancel: { $ne: false }
      });

      return count;
    } catch (error) {
      logger.error('Error getting expiring orders count:', error);
      return 0;
    }
  }

  // Method to manually cancel a specific order
  async cancelSpecificOrder(orderId, reason = 'Manual cancellation') {
    try {
      const order = await Order.findById(orderId)
        .populate('userId', 'name email phone fcmTokens')
        .populate('items.productId', 'name stock')
        .lean();

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled' || order.status === 'expired') {
        throw new Error('Order is already cancelled');
      }

      if (order.paymentStatus === 'completed') {
        throw new Error('Cannot cancel paid order');
      }

      // Create a modified order object for cancellation
      const orderToCancel = {
        ...order,
        cancellationReason: reason
      };

      await this.cancelOrder(orderToCancel);

      return {
        success: true,
        orderId,
        message: 'Order cancelled successfully'
      };

    } catch (error) {
      logger.error(`Error manually cancelling order ${orderId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Method to extend order expiration
  async extendOrderExpiration(orderId, additionalHours = 24) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled' || order.status === 'expired') {
        throw new Error('Cannot extend cancelled or expired order');
      }

      if (order.paymentStatus === 'completed') {
        throw new Error('Order is already paid');
      }

      const newExpirationTime = moment(order.createdAt)
        .add(this.expirationHours + additionalHours, 'hours');

      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            extendedAt: new Date(),
            extensionHours: additionalHours,
            notes: `Order expiration extended by ${additionalHours} hours`
          }
        }
      );

      logger.info(`Order ${order.orderNumber} expiration extended by ${additionalHours} hours`);

      return {
        success: true,
        orderId,
        newExpirationTime: newExpirationTime.toDate(),
        message: `Order expiration extended by ${additionalHours} hours`
      };

    } catch (error) {
      logger.error(`Error extending order expiration for ${orderId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Method to check if order is expired
  isOrderExpired(order) {
    const now = moment();
    const orderCreated = moment(order.createdAt);
    const additionalHours = order.extensionHours || 0;
    
    return now.diff(orderCreated, 'hours') >= (this.expirationHours + additionalHours);
  }
}

module.exports = CancelExpiredOrdersJob;