const mongoose = require('mongoose');
const moment = require('moment');
const logger = require('../utils/logger');
const notifier = require('../utils/notifier');

const productSchema = new mongoose.Schema({}, { strict: false });
const storeSchema = new mongoose.Schema({}, { strict: false });
const userSchema = new mongoose.Schema({}, { strict: false });
const orderItemSchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.model('Product', productSchema);
const Store = mongoose.model('Store', storeSchema);
const User = mongoose.model('User', userSchema);

class StockSyncJob {
  constructor() {
    this.name = 'stockSync';
    this.lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD) || 5;
    this.outOfStockThreshold = parseInt(process.env.OUT_OF_STOCK_THRESHOLD) || 0;
  }

  async execute() {
    try {
      logger.info('Starting stock sync job');

      const results = {
        syncedProducts: [],
        lowStockAlerts: [],
        outOfStockUpdates: [],
        reservedStockCleanup: [],
        failed: []
      };

      // Sync reserved stock with actual orders
      const reservedStockResults = await this.syncReservedStock();
      results.reservedStockCleanup = reservedStockResults.cleaned;

      // Check and update out of stock products
      const outOfStockResults = await this.updateOutOfStockProducts();
      results.outOfStockUpdates = outOfStockResults.updated;

      // Send low stock alerts
      const lowStockResults = await this.sendLowStockAlerts();
      results.lowStockAlerts = lowStockResults.alerts;

      // Auto-restock from suppliers (if configured)
      const restockResults = await this.handleAutoRestock();
      results.syncedProducts = restockResults.restocked;

      logger.info(
        `Stock sync completed. ` +
        `Synced: ${results.syncedProducts.length}, ` +
        `Low stock alerts: ${results.lowStockAlerts.length}, ` +
        `Out of stock: ${results.outOfStockUpdates.length}, ` +
        `Reserved cleaned: ${results.reservedStockCleanup.length}`
      );

      return { success: true, results };

    } catch (error) {
      logger.error('Error in stock sync job:', error);
      return { success: false, error: error.message };
    }
  }

  async syncReservedStock() {
    try {
      const results = { cleaned: [], errors: [] };
      
      // Get products with reserved stock
      const productsWithReserved = await Product.find({
        reservedStock: { $gt: 0 }
      }).lean();

      for (const product of productsWithReserved) {
        try {
          // Check actual pending orders for this product
          const actualReserved = await this.calculateActualReservedStock(product._id);
          
          if (actualReserved !== product.reservedStock) {
            await Product.updateOne(
              { _id: product._id },
              {
                $set: {
                  reservedStock: actualReserved,
                  lastStockSync: new Date()
                }
              }
            );

            results.cleaned.push({
              productId: product._id,
              oldReserved: product.reservedStock,
              newReserved: actualReserved
            });

            logger.info(
              `Synced reserved stock for product ${product._id}: ` +
              `${product.reservedStock} → ${actualReserved}`
            );
          }

        } catch (error) {
          logger.error(`Error syncing reserved stock for product ${product._id}:`, error);
          results.errors.push({ productId: product._id, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in syncReservedStock:', error);
      throw error;
    }
  }

  async calculateActualReservedStock(productId) {
    try {
      const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
      
      const pipeline = [
        {
          $match: {
            'items.productId': productId,
            status: { $in: ['pending', 'confirmed'] },
            paymentStatus: 'pending'
          }
        },
        { $unwind: '$items' },
        {
          $match: { 'items.productId': productId }
        },
        {
          $group: {
            _id: null,
            totalReserved: { $sum: '$items.quantity' }
          }
        }
      ];

      const result = await Order.aggregate(pipeline);
      return result.length > 0 ? result[0].totalReserved : 0;

    } catch (error) {
      logger.error(`Error calculating reserved stock for product ${productId}:`, error);
      return 0;
    }
  }

  async updateOutOfStockProducts() {
    try {
      const results = { updated: [], errors: [] };

      // Find products that are out of stock but still active
      const outOfStockProducts = await Product.find({
        $expr: {
          $lte: [{ $subtract: ['$stock', '$reservedStock'] }, this.outOfStockThreshold]
        },
        status: { $ne: 'out_of_stock' },
        autoDisable: { $ne: false }
      });

      for (const product of outOfStockProducts) {
        try {
          await Product.updateOne(
            { _id: product._id },
            {
              $set: {
                status: 'out_of_stock',
                outOfStockAt: new Date(),
                previousStatus: product.status
              }
            }
          );

          results.updated.push(product._id);
          logger.info(`Product ${product._id} marked as out of stock`);

        } catch (error) {
          logger.error(`Error updating out of stock status for product ${product._id}:`, error);
          results.errors.push({ productId: product._id, error: error.message });
        }
      }

      // Find products that are back in stock
      const backInStockProducts = await Product.find({
        $expr: {
          $gt: [{ $subtract: ['$stock', '$reservedStock'] }, this.outOfStockThreshold]
        },
        status: 'out_of_stock'
      });

      for (const product of backInStockProducts) {
        try {
          await Product.updateOne(
            { _id: product._id },
            {
              $set: {
                status: product.previousStatus || 'active',
                backInStockAt: new Date()
              },
              $unset: {
                outOfStockAt: 1,
                previousStatus: 1
              }
            }
          );

          results.updated.push(product._id);
          logger.info(`Product ${product._id} back in stock`);

        } catch (error) {
          logger.error(`Error updating back in stock status for product ${product._id}:`, error);
          results.errors.push({ productId: product._id, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in updateOutOfStockProducts:', error);
      throw error;
    }
  }

  async sendLowStockAlerts() {
    try {
      const results = { alerts: [], errors: [] };

      // Find products with low stock that haven't been alerted recently
      const lowStockProducts = await Product.find({
        $expr: {
          $and: [
            { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, this.outOfStockThreshold] },
            { $lte: [{ $subtract: ['$stock', '$reservedStock'] }, this.lowStockThreshold] }
          ]
        },
        status: { $ne: 'out_of_stock' },
        $or: [
          { lastLowStockAlert: { $exists: false } },
          {
            lastLowStockAlert: {
              $lt: moment().subtract(24, 'hours').toDate()
            }
          }
        ]
      }).populate('storeId', 'name ownerId');

      for (const product of lowStockProducts) {
        try {
          const availableStock = product.stock - (product.reservedStock || 0);
          
          // Get store owner details
          const storeOwner = await User.findById(product.storeId.ownerId)
            .select('name email phone fcmTokens')
            .lean();

          if (storeOwner) {
            const subject = `Low Stock Alert - ${product.name}`;
            const emailContent = `
              <h2>Low Stock Alert</h2>
              <p>Dear ${storeOwner.name},</p>
              <p>Your product <strong>${product.name}</strong> is running low on stock.</p>
              <p>Current available stock: ${availableStock} units</p>
              <p>Reserved stock: ${product.reservedStock || 0} units</p>
              <p>Please restock to avoid going out of stock.</p>
            `;

            await Promise.allSettled([
              notifier.sendEmail(storeOwner.email, subject, emailContent, true),
              storeOwner.fcmTokens?.length ? notifier.sendPushNotification(
                storeOwner.fcmTokens,
                {
                  title: 'Low Stock Alert',
                  body: `${product.name} has only ${availableStock} units left`
                },
                {
                  type: 'low_stock',
                  productId: product._id.toString(),
                  availableStock: availableStock.toString()
                }
              ) : Promise.resolve()
            ]);

            // Update last alert timestamp
            await Product.updateOne(
              { _id: product._id },
              { $set: { lastLowStockAlert: new Date() } }
            );

            results.alerts.push({
              productId: product._id,
              productName: product.name,
              availableStock,
              storeOwner: storeOwner._id
            });

            logger.info(`Low stock alert sent for product ${product.name} (${availableStock} units)`);
          }

        } catch (error) {
          logger.error(`Error sending low stock alert for product ${product._id}:`, error);
          results.errors.push({ productId: product._id, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in sendLowStockAlerts:', error);
      throw error;
    }
  }

  async handleAutoRestock() {
    try {
      const results = { restocked: [], errors: [] };

      // Find products with auto-restock enabled and low stock
      const autoRestockProducts = await Product.find({
        autoRestock: true,
        restockThreshold: { $exists: true },
        restockQuantity: { $exists: true },
        supplierInfo: { $exists: true },
        $expr: {
          $lte: [{ $subtract: ['$stock', '$reservedStock'] }, '$restockThreshold']
        },
        $or: [
          { lastAutoRestock: { $exists: false } },
          {
            lastAutoRestock: {
              $lt: moment().subtract(1, 'day').toDate()
            }
          }
        ]
      });

      for (const product of autoRestockProducts) {
        try {
          // This is where you'd integrate with supplier APIs
          // For now, we'll simulate an auto-restock by adding stock
          const restockQuantity = product.restockQuantity;
          
          await Product.updateOne(
            { _id: product._id },
            {
              $inc: { stock: restockQuantity },
              $set: {
                lastAutoRestock: new Date(),
                restockHistory: {
                  $push: {
                    date: new Date(),
                    quantity: restockQuantity,
                    type: 'auto',
                    cost: product.supplierInfo?.unitCost * restockQuantity || 0
                  }
                }
              }
            }
          );

          results.restocked.push({
            productId: product._id,
            productName: product.name,
            quantity: restockQuantity,
            newStock: product.stock + restockQuantity
          });

          logger.info(`Auto-restocked ${restockQuantity} units for product ${product.name}`);

        } catch (error) {
          logger.error(`Error auto-restocking product ${product._id}:`, error);
          results.errors.push({ productId: product._id, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('Error in handleAutoRestock:', error);
      throw error;
    }
  }

  // Get stock statistics
  async getStockStats() {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            outOfStock: {
              $sum: {
                $cond: [
                  { $lte: [{ $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] }, 0] },
                  1,
                  0
                ]
              }
            },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: [{ $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] }, 0] },
                      { $lte: [{ $subtract: ['$stock', { $ifNull: ['$reservedStock', 0] }] }, this.lowStockThreshold] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalStock: { $sum: '$stock' },
            totalReserved: { $sum: { $ifNull: ['$reservedStock', 0] } }
          }
        }
      ];

      const result = await Product.aggregate(pipeline);
      
      return result.length > 0 ? result[0] : {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        totalStock: 0,
        totalReserved: 0
      };

    } catch (error) {
      logger.error('Error getting stock stats:', error);
      return null;
    }
  }

  // Manual stock sync for specific product
  async syncSpecificProduct(productId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      const actualReserved = await this.calculateActualReservedStock(productId);
      
      await Product.updateOne(
        { _id: productId },
        {
          $set: {
            reservedStock: actualReserved,
            lastStockSync: new Date()
          }
        }
      );

      return {
        success: true,
        productId,
        oldReserved: product.reservedStock,
        newReserved: actualReserved,
        availableStock: product.stock - actualReserved
      };

    } catch (error) {
      logger.error(`Error syncing specific product ${productId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = StockSyncJob;