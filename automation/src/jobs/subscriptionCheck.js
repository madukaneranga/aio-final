const mongoose = require('mongoose');
const moment = require('moment');
const logger = require('../utils/logger');
const notifier = require('../utils/notifier');

const userSchema = new mongoose.Schema({}, { strict: false });
const subscriptionSchema = new mongoose.Schema({}, { strict: false });
const storeSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', userSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Store = mongoose.model('Store', storeSchema);

class SubscriptionCheckJob {
  constructor() {
    this.name = 'subscriptionCheck';
    this.warningDays = parseInt(process.env.SUBSCRIPTION_WARNING_DAYS) || 7;
    this.gracePeriodDays = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS) || 3;
  }

  async execute() {
    try {
      logger.info('Starting subscription check job');

      const results = {
        expiringSoon: [],
        expired: [],
        downgraded: [],
        failed: []
      };

      // Check for subscriptions expiring soon
      const expiringSoon = await this.findExpiringSoonSubscriptions();
      for (const subscription of expiringSoon) {
        try {
          await this.sendExpiryWarning(subscription);
          results.expiringSoon.push(subscription._id);
        } catch (error) {
          logger.error(`Error sending expiry warning for subscription ${subscription._id}:`, error);
          results.failed.push({ id: subscription._id, error: error.message });
        }
      }

      // Check for expired subscriptions
      const expired = await this.findExpiredSubscriptions();
      for (const subscription of expired) {
        try {
          await this.handleExpiredSubscription(subscription);
          results.expired.push(subscription._id);
        } catch (error) {
          logger.error(`Error handling expired subscription ${subscription._id}:`, error);
          results.failed.push({ id: subscription._id, error: error.message });
        }
      }

      // Check for subscriptions past grace period
      const pastGrace = await this.findSubscriptionsPastGrace();
      for (const subscription of pastGrace) {
        try {
          await this.downgradeSubscription(subscription);
          results.downgraded.push(subscription._id);
        } catch (error) {
          logger.error(`Error downgrading subscription ${subscription._id}:`, error);
          results.failed.push({ id: subscription._id, error: error.message });
        }
      }

      logger.info(
        `Subscription check completed. ` +
        `Warnings: ${results.expiringSoon.length}, ` +
        `Expired: ${results.expired.length}, ` +
        `Downgraded: ${results.downgraded.length}, ` +
        `Failed: ${results.failed.length}`
      );

      return { success: true, results };

    } catch (error) {
      logger.error('Error in subscription check job:', error);
      return { success: false, error: error.message };
    }
  }

  async findExpiringSoonSubscriptions() {
    try {
      const warningDate = moment().add(this.warningDays, 'days').startOf('day');
      const tomorrow = moment().add(1, 'day').startOf('day');

      return await Subscription.find({
        status: 'active',
        endDate: {
          $gte: tomorrow.toDate(),
          $lte: warningDate.toDate()
        },
        $or: [
          { expiryWarningsent: { $exists: false } },
          { expiryWarningsent: false }
        ]
      }).populate('userId', 'name email phone fcmTokens businessName');

    } catch (error) {
      logger.error('Error finding expiring subscriptions:', error);
      throw error;
    }
  }

  async findExpiredSubscriptions() {
    try {
      const now = moment().startOf('day');

      return await Subscription.find({
        status: 'active',
        endDate: { $lt: now.toDate() },
        $or: [
          { expiredNotificationSent: { $exists: false } },
          { expiredNotificationSent: false }
        ]
      }).populate('userId', 'name email phone fcmTokens businessName');

    } catch (error) {
      logger.error('Error finding expired subscriptions:', error);
      throw error;
    }
  }

  async findSubscriptionsPastGrace() {
    try {
      const gracePeriodEnd = moment().subtract(this.gracePeriodDays, 'days').startOf('day');

      return await Subscription.find({
        status: 'expired',
        endDate: { $lt: gracePeriodEnd.toDate() },
        $or: [
          { downgraded: { $exists: false } },
          { downgraded: false }
        ]
      }).populate('userId', 'name email phone fcmTokens businessName');

    } catch (error) {
      logger.error('Error finding subscriptions past grace period:', error);
      throw error;
    }
  }

  async sendExpiryWarning(subscription) {
    try {
      const seller = subscription.userId;
      const daysUntilExpiry = moment(subscription.endDate).diff(moment(), 'days');

      await notifier.sendSubscriptionExpiry(seller, {
        ...subscription.toObject(),
        daysUntilExpiry,
        isWarning: true
      });

      await Subscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            expiryWarningsent: true,
            expiryWarningSentAt: new Date()
          }
        }
      );

      logger.info(`Expiry warning sent for subscription ${subscription._id} (${daysUntilExpiry} days)`);

    } catch (error) {
      logger.error(`Error sending expiry warning for subscription ${subscription._id}:`, error);
      throw error;
    }
  }

  async handleExpiredSubscription(subscription) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Update subscription status
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'expired',
              expiredAt: new Date(),
              expiredNotificationSent: true,
              expiredNotificationSentAt: new Date()
            }
          },
          { session }
        );

        // Apply immediate restrictions but don't fully downgrade yet (grace period)
        await this.applyExpiredRestrictions(subscription.userId._id, session);

        // Send expiry notification
        const seller = subscription.userId;
        await notifier.sendSubscriptionExpiry(seller, {
          ...subscription.toObject(),
          isExpired: true,
          gracePeriodDays: this.gracePeriodDays
        });

        logger.info(`Subscription ${subscription._id} marked as expired with grace period`);
      });

    } catch (error) {
      logger.error(`Error handling expired subscription ${subscription._id}:`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async downgradeSubscription(subscription) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const userId = subscription.userId._id;
        
        // Create a new free subscription
        const freeSubscription = new Subscription({
          userId: userId,
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          endDate: null, // Free plan doesn't expire
          features: this.getFreeFeatures(),
          limits: this.getFreeLimits(),
          createdAt: new Date()
        });

        await freeSubscription.save({ session });

        // Mark old subscription as downgraded
        await Subscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: 'downgraded',
              downgradedAt: new Date(),
              downgraded: true,
              downgradedTo: freeSubscription._id
            }
          },
          { session }
        );

        // Apply downgrade restrictions
        await this.applyDowngradeRestrictions(userId, session);

        // Send downgrade notification
        const seller = subscription.userId;
        await notifier.sendSubscriptionExpiry(seller, {
          ...subscription.toObject(),
          isDowngraded: true,
          newPlan: 'free'
        });

        logger.info(`Subscription ${subscription._id} downgraded to free plan`);
      });

    } catch (error) {
      logger.error(`Error downgrading subscription ${subscription._id}:`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async applyExpiredRestrictions(userId, session) {
    try {
      // Disable premium features but keep basic functionality
      await Store.updateMany(
        { ownerId: userId },
        {
          $set: {
            premiumFeaturesDisabled: true,
            disabledAt: new Date(),
            disabledReason: 'subscription_expired'
          }
        },
        { session }
      );

      logger.info(`Applied expired restrictions for user ${userId}`);
    } catch (error) {
      logger.error(`Error applying expired restrictions for user ${userId}:`, error);
      throw error;
    }
  }

  async applyDowngradeRestrictions(userId, session) {
    try {
      // Apply free plan limitations
      const freeLimits = this.getFreeLimits();

      await Store.updateMany(
        { ownerId: userId },
        {
          $set: {
            plan: 'free',
            planLimits: freeLimits,
            downgradedAt: new Date(),
            premiumFeaturesDisabled: true
          }
        },
        { session }
      );

      // Disable products exceeding free limits
      await this.enforceProductLimits(userId, freeLimits.maxProducts, session);

      logger.info(`Applied downgrade restrictions for user ${userId}`);
    } catch (error) {
      logger.error(`Error applying downgrade restrictions for user ${userId}:`, error);
      throw error;
    }
  }

  async enforceProductLimits(userId, maxProducts, session) {
    try {
      const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

      const userStores = await Store.find({ ownerId: userId }, '_id', { session });
      const storeIds = userStores.map(store => store._id);

      // Get products exceeding limit
      const excessProducts = await Product.find({ storeId: { $in: storeIds } })
        .sort({ createdAt: -1 })
        .skip(maxProducts)
        .select('_id')
        .session(session);

      if (excessProducts.length > 0) {
        const excessProductIds = excessProducts.map(p => p._id);
        
        await Product.updateMany(
          { _id: { $in: excessProductIds } },
          {
            $set: {
              status: 'disabled',
              disabledReason: 'plan_limit_exceeded',
              disabledAt: new Date()
            }
          },
          { session }
        );

        logger.info(`Disabled ${excessProducts.length} products exceeding free plan limits for user ${userId}`);
      }

    } catch (error) {
      logger.error(`Error enforcing product limits for user ${userId}:`, error);
      throw error;
    }
  }

  getFreeFeatures() {
    return [
      'basic_store',
      'product_listing',
      'order_management',
      'basic_analytics'
    ];
  }

  getFreeLimits() {
    return {
      maxProducts: 10,
      maxImages: 3,
      maxStores: 1,
      maxCategories: 5,
      storageLimit: 100, // MB
      monthlyOrders: 50
    };
  }

  // Get subscription statistics
  async getSubscriptionStats() {
    try {
      const now = moment();
      const warningDate = now.clone().add(this.warningDays, 'days');
      const gracePeriodEnd = now.clone().subtract(this.gracePeriodDays, 'days');

      const stats = await Promise.all([
        Subscription.countDocuments({ status: 'active' }),
        Subscription.countDocuments({ status: 'expired' }),
        Subscription.countDocuments({
          status: 'active',
          endDate: { $lte: warningDate.toDate(), $gte: now.toDate() }
        }),
        Subscription.countDocuments({
          status: 'expired',
          endDate: { $lt: gracePeriodEnd.toDate() },
          downgraded: { $ne: true }
        })
      ]);

      return {
        active: stats[0],
        expired: stats[1],
        expiringSoon: stats[2],
        pendingDowngrade: stats[3]
      };

    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return null;
    }
  }
}

module.exports = SubscriptionCheckJob;