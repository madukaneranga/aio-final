const mongoose = require('mongoose');
const moment = require('moment');
const logger = require('../utils/logger');
const notifier = require('../utils/notifier');

const orderSchema = new mongoose.Schema({}, { strict: false });
const userSchema = new mongoose.Schema({}, { strict: false });

const Order = mongoose.model('Order', orderSchema);
const User = mongoose.model('User', userSchema);

class UnpaidOrderReminderJob {
  constructor() {
    this.name = 'unpaidOrderReminder';
    this.reminderIntervals = [
      { hours: 24, label: '24 hours' },
      { hours: 48, label: '48 hours' },
      { hours: 72, label: '72 hours' }
    ];
  }

  async execute() {
    try {
      logger.info('Starting unpaid order reminder job');

      const now = moment();
      const processedOrders = [];

      for (const interval of this.reminderIntervals) {
        const targetTime = now.clone().subtract(interval.hours, 'hours');
        const orders = await this.findUnpaidOrders(targetTime, interval.hours);
        
        logger.info(`Found ${orders.length} orders to remind after ${interval.label}`);

        for (const order of orders) {
          try {
            await this.sendReminder(order, interval.label);
            await this.updateReminderSent(order._id, interval.hours);
            processedOrders.push(order._id);
          } catch (error) {
            logger.error(`Error sending reminder for order ${order._id}:`, error);
          }
        }
      }

      logger.info(`Unpaid order reminder job completed. Processed ${processedOrders.length} orders`);
      return { success: true, processedOrders: processedOrders.length };

    } catch (error) {
      logger.error('Error in unpaid order reminder job:', error);
      return { success: false, error: error.message };
    }
  }

  async findUnpaidOrders(targetTime, intervalHours) {
    try {
      const query = {
        paymentStatus: 'pending',
        status: { $nin: ['cancelled', 'expired'] },
        createdAt: {
          $gte: targetTime.clone().subtract(1, 'hour').toDate(),
          $lte: targetTime.clone().add(1, 'hour').toDate()
        },
        $or: [
          { [`reminders.${intervalHours}h`]: { $exists: false } },
          { [`reminders.${intervalHours}h`]: false }
        ]
      };

      const orders = await Order.find(query)
        .populate('userId', 'name email phone fcmTokens')
        .lean();

      return orders.filter(order => order.userId);
    } catch (error) {
      logger.error('Error finding unpaid orders:', error);
      throw error;
    }
  }

  async sendReminder(order, intervalLabel) {
    try {
      const user = order.userId;
      
      if (!user.email && !user.phone && !user.fcmTokens?.length) {
        logger.warn(`No contact methods available for user ${user._id}, order ${order._id}`);
        return;
      }

      const results = await notifier.sendOrderReminder(user, order);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value?.success
      ).length;

      logger.info(
        `Reminder sent for order ${order.orderNumber} after ${intervalLabel}. ` +
        `Success: ${successCount}/${results.length} channels`
      );

      return results;
    } catch (error) {
      logger.error(`Error sending reminder for order ${order._id}:`, error);
      throw error;
    }
  }

  async updateReminderSent(orderId, intervalHours) {
    try {
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            [`reminders.${intervalHours}h`]: true,
            [`reminders.${intervalHours}h_sentAt`]: new Date()
          }
        }
      );
    } catch (error) {
      logger.error(`Error updating reminder status for order ${orderId}:`, error);
      throw error;
    }
  }

  // Method to get pending reminders count for monitoring
  async getPendingRemindersCount() {
    try {
      const now = moment();
      let totalPending = 0;

      for (const interval of this.reminderIntervals) {
        const targetTime = now.clone().subtract(interval.hours, 'hours');
        
        const count = await Order.countDocuments({
          paymentStatus: 'pending',
          status: { $nin: ['cancelled', 'expired'] },
          createdAt: {
            $gte: targetTime.clone().subtract(1, 'hour').toDate(),
            $lte: targetTime.clone().add(1, 'hour').toDate()
          },
          $or: [
            { [`reminders.${interval.hours}h`]: { $exists: false } },
            { [`reminders.${interval.hours}h`]: false }
          ]
        });

        totalPending += count;
      }

      return totalPending;
    } catch (error) {
      logger.error('Error getting pending reminders count:', error);
      return 0;
    }
  }

  // Method to manually trigger reminder for specific order
  async sendManualReminder(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('userId', 'name email phone fcmTokens')
        .lean();

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.paymentStatus !== 'pending') {
        throw new Error('Order is not pending payment');
      }

      await this.sendReminder(order, 'manual');
      
      return { success: true, orderId, message: 'Manual reminder sent' };
    } catch (error) {
      logger.error(`Error sending manual reminder for order ${orderId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UnpaidOrderReminderJob;