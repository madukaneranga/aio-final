import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import WalletTransaction from "../models/Transaction.js";
import { authenticate } from "../middleware/auth.js";
import { validationErrorResponse } from "../utils/responseFormatter.js";

const router = express.Router();

// Validation middleware for transaction ID
const validateTransactionId = (req, res, next) => {
  const { transactionId } = req.params;

  if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'transactionId', message: 'Valid transaction ID is required' }
    ]));
  }

  next();
};

/**
 * Get thank you page data for orders
 * GET /api/thank-you/order/:transactionId
 */
router.get("/order/:transactionId", authenticate, validateTransactionId, async (req, res) => {
  try {
    const { transactionId } = req.params;
    console.log(`ThankYou API - Order request for transaction: ${transactionId}, user: ${req.user._id}`);

    let order = null;
    
    // First try to find completed order (but catch any MongoDB ObjectId errors)
    try {
      console.log(`ThankYou API - Attempting to find order by ID: ${transactionId}`);
      order = await Order.findById(transactionId);
      console.log(`ThankYou API - Raw order lookup result: ${order ? 'found' : 'not found'}`);
      
      if (order) {
        console.log(`ThankYou API - Order found, now populating fields...`);
        order = await Order.findById(transactionId)
          .populate('customerId', 'name email phone')
          .populate('storeId', 'name email phone address province processingDays')
          .populate({
            path: 'items.productId',
            select: 'title images price category isPreorder'
          });
        console.log(`ThankYou API - Population complete. Order user: ${order.customerId._id}, items: ${order.items.length}`);
      }
    } catch (orderError) {
      console.log(`ThankYou API - Order lookup failed: ${orderError.message}`);
      console.log(`ThankYou API - Error stack:`, orderError.stack);
    }

    if (order && order.customerId._id.toString() !== req.user._id.toString()) {
      console.log(`ThankYou API - Order access denied for user ${req.user._id}`);
      return res.status(403).json({ message: "Access denied" });
    }

    // If no completed order found, check for pending transaction
    if (!order) {
      console.log(`ThankYou API - Looking for pending transaction: ${transactionId}`);
      let pendingTransaction = null;
      
      try {
        pendingTransaction = await WalletTransaction.findById(transactionId)
          .populate('userId', 'name email phone');
        console.log(`ThankYou API - Pending transaction lookup result: ${pendingTransaction ? 'found' : 'not found'}`);
      } catch (txError) {
        console.log(`ThankYou API - Pending transaction lookup failed: ${txError.message}`);
      }

      if (!pendingTransaction) {
        console.log(`ThankYou API - No transaction found for ID: ${transactionId}`);
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (pendingTransaction.userId._id.toString() !== req.user._id.toString()) {
        console.log(`ThankYou API - Pending transaction access denied for user ${req.user._id}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Return pending transaction data
      if (pendingTransaction.type === 'sale' && pendingTransaction.orderData) {
        console.log(`ThankYou API - Returning pending order data`);
        const orderData = pendingTransaction.orderData;
        
        // Handle both array and individual order formats
        let items = [];
        let storeId = null;
        let shippingMethod = "standard";
        
        if (Array.isArray(orderData)) {
          // orderData is an array of store orders
          items = orderData.flatMap(store => store.items || []);
          storeId = orderData[0]?.storeId || null;
          shippingMethod = orderData[0]?.shippingMethod || "standard";
        } else {
          // orderData is a single order object
          items = orderData.items || [];
          storeId = orderData.storeId;
          shippingMethod = orderData.shippingMethod || "standard";
        }
        
        return res.json({
          _id: transactionId,
          status: "pending",
          paymentStatus: "pending",
          totalAmount: Math.abs(pendingTransaction.amount),
          paymentMethod: pendingTransaction.paymentMethod,
          createdAt: pendingTransaction.createdAt,
          items: items,
          shippingAddress: pendingTransaction.shippingAddress,
          shippingMethod: shippingMethod,
          storeId: {
            _id: storeId,
            name: "Store (Pending)",
            processingDays: 1
          },
          userId: pendingTransaction.userId
        });
      }
    }

    if (!order) {
      console.log(`ThankYou API - Order not found for transaction: ${transactionId}`);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`ThankYou API - Order found successfully for transaction: ${transactionId}`);
    console.log(`ThankYou API - Order details:`, order);
    res.json({data:order});

  } catch (error) {
    console.error("Error fetching order for thank you page:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
});


/**
 * Get purchase statistics for user (optional for thank you page enhancements)
 * GET /api/thank-you/stats
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's purchase statistics
    const orderStats = await Order.aggregate([
      { $match: { customerId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);

    const stats = {
      orders: orderStats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 }
    };

    res.json({data:stats});

  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;