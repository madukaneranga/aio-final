import { Router } from "express";
const router = Router();
import WalletTransaction from "../models/WalletTransaction.js";
import BankDetails from "../models/BankDetails.js";
import BankChangeRequest from "../models/BankChangeRequest.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Chat from "../models/Chat.js";
import ChatAnalytics from "../models/ChatAnalytics.js";
import ContactReveal from "../models/ContactReveal.js";
import EmailSubscription from "../models/EmailSubscription.js";
import FlashDeal from "../models/FlashDeal.js";
import Notification from "../models/Notification.js";
import Package from "../models/Package.js";
import PlatformSettings from "../models/PlatformSettings.js";
import Post from "../models/Post.js";
import PostComment from "../models/PostComment.js";
import PostLike from "../models/PostLike.js";
import Review from "../models/Review.js";
import SearchHistory from "../models/SearchHistory.js";
import Subscription from "../models/Subscription.js";
import TimeSlot from "../models/TimeSlot.js";
import Category from "../models/Category.js";
import Variant from "../models/Variant.js";
import Wallet from "../models/Wallet.js";
import Addon from "../models/Addon.js";
import CommentLike from "../models/CommentLike.js";
import CommentReaction from "../models/CommentReaction.js";
import Marketing from "../models/marketing.js";
import { authenticate, authorize } from "../middleware/auth.js"

// Custom validation for admin actions - UPDATED
const validateAdminAction = (data) => {
  const errors = [];

  // Updated to include all workflow statuses
  if (
    !data.action ||
    !["approved", "rejected", "processing", "completed"].includes(data.action)
  ) {
    errors.push(
      "Action must be one of: approve, reject, processing, completed"
    );
  }

  if (
    data.adminNotes &&
    (typeof data.adminNotes !== "string" || data.adminNotes.length > 500)
  ) {
    errors.push("Admin notes must be a string with maximum 500 characters");
  }

  return errors;
};

// Workflow validation function - NEW
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    pending: ["processing", "approved", "rejected"],
    processing: ["approved", "rejected"],
    approved: ["completed"],
    rejected: [], // Final state
    completed: [], // Final state
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin required.",
    });
  }
  next();
};

// Get all withdrawal requests - UPDATED
router.get(
  "/withdrawals",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        userId,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const query = { type: "withdrawal" };
      if (status) query.status = status;
      if (userId) query.userId = userId;

      // Add search functionality - NEW
      let populateQuery = {};
      if (search) {
        const stores = await Store.find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }).select("_id");

        if (stores.length > 0) {
          query.userId = { $in: stores.map((s) => s._id) };
        } else {
          // Avoid 500 error
          query.userId = { $in: [] };
        }
      }

      // Build sort object - NEW
      const sortObj = {};
      if (sortBy === "storeName") {
        // Will sort after population
      } else if (sortBy === "amount") {
        sortObj.amount = sortOrder === "desc" ? -1 : 1;
      } else {
        sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;
      }

      const withdrawals = await WalletTransaction.find(query)
        .populate("userId", "name email")
        .populate("withdrawalDetails.bankAccountId")
        .populate("withdrawalDetails.processedBy", "name email")
        .populate("withdrawalDetails.completedBy", "name email") // NEW
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      // Sort by store name if requested - NEW
      if (sortBy === "storeName") {
        withdrawals.sort((a, b) => {
          const nameA = a.userId?.name || "";
          const nameB = b.userId?.name || "";
          return sortOrder === "desc"
            ? nameB.localeCompare(nameA)
            : nameA.localeCompare(nameB);
        });
      }

      const total = await WalletTransaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          withdrawals,
          pagination: {
            current: parseInt(page), // Changed from 'page' to 'current'
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get all withdrawals error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch withdrawals",
      });
    }
  }
);

// Process withdrawal request - UPDATED
router.put("/withdrawals/:id/process", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const validationErrors = validateAdminAction(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
      });
    }

    const { action, adminNotes } = req.body;

    const withdrawal = await WalletTransaction.findOne({
      _id: id,
      type: "withdrawal",
    }).populate("userId");

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    // Validate status transition - NEW
    if (!validateStatusTransition(withdrawal.status, action)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${withdrawal.status} to ${action}`,
      });
    }

    // Update based on action - UPDATED
    const updateData = {
      status: action,
      "withdrawalDetails.adminNotes": adminNotes,
    };

    // Set appropriate timestamps and admin references
    if (action === "processing") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "approved" || action === "rejected") {
      if (!withdrawal.withdrawalDetails.processedAt) {
        updateData["withdrawalDetails.processedAt"] = new Date();
        updateData["withdrawalDetails.processedBy"] = req.user.id;
      }
    } else if (action === "completed") {
      updateData["withdrawalDetails.completedAt"] = new Date();
      updateData["withdrawalDetails.completedBy"] = req.user.id;
    }

    await WalletTransaction.findByIdAndUpdate(id, updateData);

    // Emit real-time notification to store owner
    req.io?.emit(`wallet-update-${withdrawal.userId._id}`, {
      type: "withdrawal_processed",
      action,
      transaction: withdrawal,
      adminNotes,
    });

    // Create audit log
    console.log(
      `Admin ${req.user.id} changed withdrawal ${id} status to ${action} for store ${withdrawal.userId._id}`
    );

    res.json({
      success: true,
      message: `Withdrawal request ${action} successfully`,
    });
  } catch (error) {
    console.error("Process withdrawal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal request",
    });
  }
});

// Bulk process withdrawals - NEW
router.put("/withdrawals/bulk-process", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { ids, action, adminNotes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array is required",
      });
    }

    if (!["approve", "reject", "processing", "completed"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }

    const withdrawals = await WalletTransaction.find({
      _id: { $in: ids },
      type: "withdrawal",
    });

    // Validate all transitions
    const invalidTransitions = withdrawals.filter(
      (w) => !validateStatusTransition(w.status, action)
    );

    if (invalidTransitions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some withdrawals cannot transition to ${action}`,
      });
    }

    // Update all valid withdrawals
    const updateData = {
      status: action,
      "withdrawalDetails.adminNotes": adminNotes,
    };

    if (action === "processing") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "approved" || action === "rejected") {
      updateData["withdrawalDetails.processedAt"] = new Date();
      updateData["withdrawalDetails.processedBy"] = req.user.id;
    } else if (action === "completed") {
      updateData["withdrawalDetails.completedAt"] = new Date();
      updateData["withdrawalDetails.completedBy"] = req.user.id;
    }

    await WalletTransaction.updateMany({ _id: { $in: ids } }, updateData);

    res.json({
      success: true,
      message: `${ids.length} withdrawals processed successfully`,
    });
  } catch (error) {
    console.error("Bulk process error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk action",
    });
  }
});

// Remove the separate complete endpoint since it's handled in process now
// The /withdrawals/:id/complete route is no longer needed

// Get wallet analytics for admin dashboard - UPDATED
router.get("/analytics", authenticate,
  authorize("admin"), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = { type: "withdrawal" }; // Focus on withdrawals
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await WalletTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const summary = {
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      totalAmount: 0,
    };

    analytics.forEach((item) => {
      if (summary[item._id]) {
        summary[item._id].count = item.count;
        summary[item._id].amount = item.totalAmount;
        summary.totalAmount += item.totalAmount;
      }
    });

    res.json({
      success: true,
      data: {
        summary,
        analytics,
      },
    });
  } catch (error) {
    console.error("Get wallet analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet analytics",
    });
  }
});

// =================== BANK CHANGE REQUEST MANAGEMENT ===================

// Get all pending bank change requests
router.get('/bank-change-requests', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || 'pending';
    
    let query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const requests = await BankChangeRequest.find(query)
      .populate('userId', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('currentBankDetailsId')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await BankChangeRequest.countDocuments(query);
    
    res.json({
      success: true,
      data: requests,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Get bank change requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bank change requests' 
    });
  }
});

// Approve bank change request
router.put('/bank-change-requests/:requestId/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;
    
    const changeRequest = await BankChangeRequest.findById(requestId);
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    if (changeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be approved'
      });
    }
    
    await changeRequest.approve(adminId, adminNotes);
    
    res.json({
      success: true,
      message: 'Change request approved successfully',
      data: changeRequest
    });
    
  } catch (error) {
    console.error('Approve bank change request error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to approve change request' 
    });
  }
});

// Reject bank change request
router.put('/bank-change-requests/:requestId/reject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;
    
    if (!adminNotes || adminNotes.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejection (minimum 5 characters)'
      });
    }
    
    const changeRequest = await BankChangeRequest.findById(requestId);
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    if (changeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be rejected'
      });
    }
    
    await changeRequest.reject(adminId, adminNotes.trim());
    
    res.json({
      success: true,
      message: 'Change request rejected',
      data: changeRequest
    });
    
  } catch (error) {
    console.error('Reject bank change request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject change request' 
    });
  }
});

// Emergency function to lock all existing unlocked bank details
router.post('/lock-all-bank-details', authenticate, authorize('admin'), async (req, res) => {
  try {
    const adminId = req.user._id;
    
    // Find all unlocked bank details
    const unlockedDetails = await BankDetails.find({ 
      isLocked: { $ne: true },
      isActive: true 
    });
    
    let lockedCount = 0;
    
    for (const bankDetails of unlockedDetails) {
      bankDetails.isLocked = true;
      bankDetails.lockReason = 'admin_mass_lock';
      bankDetails.lockedAt = new Date();
      bankDetails.lockedBy = adminId;
      
      // Add to modification history
      bankDetails.modificationHistory.push({
        modifiedAt: new Date(),
        modifiedBy: adminId,
        changes: { action: 'mass_lock' },
        reason: 'Admin mass lock of all unlocked bank details for security',
        ipAddress: req.ip || req.connection.remoteAddress
      });
      
      await bankDetails.save();
      lockedCount++;
    }
    
    res.json({
      success: true,
      message: `Successfully locked ${lockedCount} bank details records`,
      lockedCount,
      totalFound: unlockedDetails.length
    });
    
  } catch (error) {
    console.error('Mass lock bank details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to lock bank details' 
    });
  }
});

// =================== COMPREHENSIVE ADMIN CRUD ROUTES ===================

// Generic helper function for building queries with search, filter, and sort
const buildAdminQuery = (req, searchFields = ['name'], filterField = 'isActive') => {
  const { search, status, userId, storeId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  let query = {};
  
  // Search functionality
  if (search) {
    const searchConditions = searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }));
    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }
  }
  
  // Status/filter functionality
  if (status && status !== 'all') {
    if (filterField === 'isActive') {
      query.isActive = status === 'active';
    } else {
      query[filterField] = status;
    }
  }
  
  // Additional filters
  if (userId) query.userId = userId;
  if (storeId) query.storeId = storeId;
  
  // Sort object
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return { query, sortObj };
};

// Generic CRUD endpoints for each collection
const createCRUDRoutes = (path, Model, searchFields = ['name'], filterField = 'isActive', populateFields = '') => {
  
  // GET all items with pagination, search, filter, sort
  router.get(`/${path}`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { query, sortObj } = buildAdminQuery(req, searchFields, filterField);
      
      const items = await Model.find(query)
        .populate(populateFields)
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
      
      const total = await Model.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          items,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error(`Get ${path} error:`, error);
      console.error(`Error details:`, error.message);
      console.error(`Stack trace:`, error.stack);
      res.status(500).json({ 
        success: false, 
        message: `Failed to fetch ${path}`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // GET single item by ID
  router.get(`/${path}/:id`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = await Model.findById(req.params.id).populate(populateFields);
      if (!item) {
        return res.status(404).json({ success: false, message: `${path} not found` });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      console.error(`Get single ${path} error:`, error);
      res.status(500).json({ success: false, message: `Failed to fetch ${path}` });
    }
  });
  
  // POST create new item
  router.post(`/${path}`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = new Model(req.body);
      await item.save();
      res.status(201).json({ success: true, data: item, message: `${path} created successfully` });
    } catch (error) {
      console.error(`Create ${path} error:`, error);
      res.status(400).json({ success: false, message: error.message || `Failed to create ${path}` });
    }
  });
  
  // PUT update item
  router.put(`/${path}/:id`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!item) {
        return res.status(404).json({ success: false, message: `${path} not found` });
      }
      res.json({ success: true, data: item, message: `${path} updated successfully` });
    } catch (error) {
      console.error(`Update ${path} error:`, error);
      res.status(400).json({ success: false, message: error.message || `Failed to update ${path}` });
    }
  });
  
  // DELETE item
  router.delete(`/${path}/:id`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: `${path} not found` });
      }
      res.json({ success: true, message: `${path} deleted successfully` });
    } catch (error) {
      console.error(`Delete ${path} error:`, error);
      res.status(500).json({ success: false, message: `Failed to delete ${path}` });
    }
  });
  
  // PATCH toggle status (if applicable)
  router.patch(`/${path}/:id/toggle-status`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: `${path} not found` });
      }
      
      if (filterField === 'isActive') {
        item.isActive = !item.isActive;
      } else if (filterField === 'status') {
        item.status = item.status === 'active' ? 'inactive' : 'active';
      }
      
      await item.save();
      res.json({ success: true, data: item, message: `${path} status updated successfully` });
    } catch (error) {
      console.error(`Toggle ${path} status error:`, error);
      res.status(500).json({ success: false, message: `Failed to update ${path} status` });
    }
  });
  
  // POST bulk operations
  router.post(`/${path}/bulk`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const { ids, action, data } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'IDs array is required' });
      }
      
      let result;
      switch (action) {
        case 'delete':
          result = await Model.deleteMany({ _id: { $in: ids } });
          break;
        case 'update':
          result = await Model.updateMany({ _id: { $in: ids } }, data);
          break;
        case 'toggle-status':
          const items = await Model.find({ _id: { $in: ids } });
          for (const item of items) {
            if (filterField === 'isActive') {
              item.isActive = !item.isActive;
            }
            await item.save();
          }
          result = { modifiedCount: items.length };
          break;
        default:
          return res.status(400).json({ success: false, message: 'Invalid bulk action' });
      }
      
      res.json({ 
        success: true, 
        message: `Bulk ${action} completed successfully`, 
        affected: result.modifiedCount || result.deletedCount || ids.length 
      });
    } catch (error) {
      console.error(`Bulk ${path} operation error:`, error);
      res.status(500).json({ success: false, message: `Failed to perform bulk ${action}` });
    }
  });
};

// Create CRUD routes for all collections
createCRUDRoutes('all-users', User, ['name', 'email'], 'isActive', '');
createCRUDRoutes('all-stores', Store, ['name', 'email'], 'isActive', 'ownerId');
createCRUDRoutes('all-products', Product, ['title', 'description'], 'isActive', 'storeId');
createCRUDRoutes('all-services', Service, ['title', 'description'], 'isActive', 'storeId');
createCRUDRoutes('all-orders', Order, [], 'status', 'customerId storeId');
createCRUDRoutes('all-bookings', Booking, [], 'status', 'customerId storeId serviceId');
createCRUDRoutes('all-chats', Chat, [], 'status', 'participants.userId');
createCRUDRoutes('all-chat-analytics', ChatAnalytics, [], '', 'chatId storeId');
createCRUDRoutes('all-contact-reveals', ContactReveal, [], '', 'customerId storeId');
createCRUDRoutes('all-email-subscriptions', EmailSubscription, ['email'], 'isActive', '');
createCRUDRoutes('all-flash-deals', FlashDeal, ['saleName', 'saleSubtitle'], 'isActive', '');
createCRUDRoutes('all-notifications', Notification, ['title', 'body'], '', 'userId');
createCRUDRoutes('all-packages', Package, ['name', 'description'], 'isActive', '');
createCRUDRoutes('all-platform-settings', PlatformSettings, ['key'], '', '');
createCRUDRoutes('all-posts', Post, ['content'], 'isActive', 'userId storeId');
createCRUDRoutes('all-post-comments', PostComment, ['content'], '', 'userId postId');
createCRUDRoutes('all-post-likes', PostLike, [], '', 'userId postId');
createCRUDRoutes('all-reviews', Review, ['comment'], '', 'userId storeId productId serviceId orderId bookingId');
createCRUDRoutes('all-search-history', SearchHistory, ['query'], '', 'userId');
createCRUDRoutes('all-subscriptions', Subscription, [], 'status', 'userId storeId');
createCRUDRoutes('all-time-slots', TimeSlot, [], 'isActive', 'storeId serviceId');
createCRUDRoutes('all-categories', Category, ['name', 'description'], 'isActive', '');
createCRUDRoutes('all-variants', Variant, ['name'], 'isActive', 'productId');
createCRUDRoutes('all-wallets', Wallet, [], '', 'userId');
createCRUDRoutes('all-addons', Addon, ['name', 'description'], 'isActive', '');
createCRUDRoutes('all-comment-likes', CommentLike, [], '', 'userId commentId');
createCRUDRoutes('all-comment-reactions', CommentReaction, [], '', 'userId commentId');
createCRUDRoutes('all-marketing', Marketing, [], 'isActive', '');

// =================== ADVANCED ADMIN ANALYTICS & MONITORING ===================

// Real-time system statistics
router.get('/system/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Product.countDocuments(),
      Service.countDocuments(),
      Order.countDocuments(),
      Booking.countDocuments(),
      Chat.countDocuments(),
      Notification.countDocuments(),
      Review.countDocuments(),
      Post.countDocuments(),
      
      // Active counts
      User.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Service.countDocuments({ isActive: true }),
      
      // Recent activity (last 24 hours)
      Order.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Booking.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Store.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      
      // Revenue calculations
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
    ]);
    
    const [
      totalUsers, totalStores, totalProducts, totalServices, totalOrders, totalBookings,
      totalChats, totalNotifications, totalReviews, totalPosts,
      activeUsers, activeStores, activeProducts, activeServices,
      recentOrders, recentBookings, newUsers, newStores,
      orderRevenue, bookingRevenue
    ] = stats;
    
    const totalRevenue = (orderRevenue[0]?.total || 0) + (bookingRevenue[0]?.total || 0);
    
    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          stores: totalStores, 
          products: totalProducts,
          services: totalServices,
          orders: totalOrders,
          bookings: totalBookings,
          chats: totalChats,
          notifications: totalNotifications,
          reviews: totalReviews,
          posts: totalPosts,
          revenue: totalRevenue
        },
        active: {
          users: activeUsers,
          stores: activeStores,
          products: activeProducts,
          services: activeServices
        },
        recent24h: {
          orders: recentOrders,
          bookings: recentBookings,
          users: newUsers,
          stores: newStores
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system statistics' });
  }
});

// Advanced analytics dashboard
router.get('/analytics/dashboard', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const [userGrowth, storeGrowth, orderTrends, revenueTrends, topCategories, topStores] = await Promise.all([
      // User growth over period
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Store growth
      Store.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Order trends
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { 
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Revenue trends
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top categories
      Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Top performing stores
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$storeId',
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store'
          }
        }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        userGrowth,
        storeGrowth, 
        orderTrends,
        revenueTrends,
        topCategories,
        topStores,
        period: days
      }
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
});

// System health monitoring
router.get('/system/health', authenticate, authorize('admin'), async (req, res) => {
  try {
    const healthChecks = {
      database: { status: 'healthy', responseTime: 0 },
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date(),
      version: process.version,
      platform: process.platform
    };
    
    // Database response time check
    const start = Date.now();
    await User.findOne().limit(1);
    healthChecks.database.responseTime = Date.now() - start;
    
    // Check for any critical issues
    const criticalIssues = [];
    if (healthChecks.database.responseTime > 1000) {
      criticalIssues.push('Database response time is high');
    }
    if (healthChecks.memory.heapUsed / healthChecks.memory.heapTotal > 0.9) {
      criticalIssues.push('Memory usage is critical');
    }
    
    res.json({
      success: true,
      data: {
        ...healthChecks,
        criticalIssues,
        overallStatus: criticalIssues.length === 0 ? 'healthy' : 'warning'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'System health check failed',
      data: {
        overallStatus: 'critical',
        criticalIssues: ['Health check endpoint failed']
      }
    });
  }
});

// Admin activity logging
const adminActionLog = [];
const logAdminAction = (adminId, action, target, details = {}) => {
  const logEntry = {
    id: Date.now() + Math.random(),
    adminId,
    action,
    target,
    details,
    timestamp: new Date(),
    ip: details.ip || 'unknown'
  };
  
  adminActionLog.unshift(logEntry);
  // Keep only last 1000 entries
  if (adminActionLog.length > 1000) {
    adminActionLog.splice(1000);
  }
  
  console.log(`Admin Action Log: ${adminId} performed ${action} on ${target}`, details);
};

// Get admin activity logs
router.get('/activity-logs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const logs = adminActionLog.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          total: adminActionLog.length,
          pages: Math.ceil(adminActionLog.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Activity logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

// Middleware to log admin actions
const logAction = (action, target) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode < 400) {
        logAdminAction(req.user.id, action, target, {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          body: req.method !== 'GET' ? req.body : undefined
        });
      }
      originalSend.call(this, data);
    };
    next();
  };
};

// ===================================================================================
// COMPREHENSIVE COLLECTION MANAGEMENT ROUTES
// ===================================================================================

// Generic function to create collection routes
const createCollectionRoutes = (collectionName, Model, options = {}) => {
  const route = `/all-${collectionName}`;
  
  // GET all items
  router.get(route, authenticate, authorize('admin'), async (req, res) => {
    try {
      const { page = 1, limit = 50, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      // Build query
      let query = {};
      if (search && options.searchFields) {
        const searchRegex = { $regex: search, $options: 'i' };
        query.$or = options.searchFields.map(field => ({ [field]: searchRegex }));
      }
      
      // Build sort
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const [items, total] = await Promise.all([
        Model.find(query)
          .sort(sort)
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit))
          .populate(options.populate || []),
        Model.countDocuments(query)
      ]);
      
      logAdminAction(req.user._id, 'view', collectionName, { 
        search, page, limit, total,
        ip: req.ip 
      });
      
      res.json({
        success: true,
        data: {
          items,
          pagination: {
            current: parseInt(page),
            total,
            pages: Math.ceil(total / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error(`Get ${collectionName} error:`, error);
      res.status(500).json({ success: false, message: `Failed to fetch ${collectionName}` });
    }
  });
  
  // GET single item
  router.get(`${route}/:id`, authenticate, authorize('admin'), async (req, res) => {
    try {
      const item = await Model.findById(req.params.id).populate(options.populate || []);
      if (!item) {
        return res.status(404).json({ success: false, message: `${collectionName} not found` });
      }
      
      logAdminAction(req.user._id, 'view_detail', collectionName, { 
        itemId: req.params.id,
        ip: req.ip 
      });
      
      res.json({ success: true, data: item });
    } catch (error) {
      console.error(`Get ${collectionName} by ID error:`, error);
      res.status(500).json({ success: false, message: `Failed to fetch ${collectionName}` });
    }
  });
  
  // POST create new item (if allowed)
  if (!options.readOnly) {
    router.post(route, authenticate, authorize('admin'), async (req, res) => {
      try {
        const item = new Model(req.body);
        await item.save();
        
        logAdminAction(req.user._id, 'create', collectionName, { 
          itemId: item._id,
          data: req.body,
          ip: req.ip 
        });
        
        res.status(201).json({ success: true, data: item });
      } catch (error) {
        console.error(`Create ${collectionName} error:`, error);
        res.status(400).json({ success: false, message: error.message });
      }
    });
  }
  
  // PUT update item (if allowed)
  if (!options.readOnly) {
    router.put(`${route}/:id`, authenticate, authorize('admin'), async (req, res) => {
      try {
        const item = await Model.findByIdAndUpdate(
          req.params.id, 
          req.body, 
          { new: true, runValidators: true }
        );
        
        if (!item) {
          return res.status(404).json({ success: false, message: `${collectionName} not found` });
        }
        
        logAdminAction(req.user._id, 'update', collectionName, { 
          itemId: req.params.id,
          changes: req.body,
          ip: req.ip 
        });
        
        res.json({ success: true, data: item });
      } catch (error) {
        console.error(`Update ${collectionName} error:`, error);
        res.status(400).json({ success: false, message: error.message });
      }
    });
  }
  
  // DELETE item (if allowed)
  if (!options.readOnly) {
    router.delete(`${route}/:id`, authenticate, authorize('admin'), async (req, res) => {
      try {
        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) {
          return res.status(404).json({ success: false, message: `${collectionName} not found` });
        }
        
        logAdminAction(req.user._id, 'delete', collectionName, { 
          itemId: req.params.id,
          deletedData: item,
          ip: req.ip 
        });
        
        res.json({ success: true, message: `${collectionName} deleted successfully` });
      } catch (error) {
        console.error(`Delete ${collectionName} error:`, error);
        res.status(500).json({ success: false, message: `Failed to delete ${collectionName}` });
      }
    });
  }
  
  // PATCH toggle status (if status field exists)
  if (options.hasStatus) {
    router.patch(`${route}/:id/toggle-status`, authenticate, authorize('admin'), async (req, res) => {
      try {
        const item = await Model.findById(req.params.id);
        if (!item) {
          return res.status(404).json({ success: false, message: `${collectionName} not found` });
        }
        
        const statusField = options.statusField || 'isActive';
        item[statusField] = !item[statusField];
        await item.save();
        
        logAdminAction(req.user._id, 'toggle_status', collectionName, { 
          itemId: req.params.id,
          newStatus: item[statusField],
          ip: req.ip 
        });
        
        res.json({ success: true, data: item });
      } catch (error) {
        console.error(`Toggle ${collectionName} status error:`, error);
        res.status(500).json({ success: false, message: `Failed to toggle ${collectionName} status` });
      }
    });
  }
};

// Bulk operations route
router.post('/:collection/bulk', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { ids, action, data = {} } = req.body;
    const collectionName = req.params.collection; // Extract collection from params
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid IDs array required' });
    }
    
    // Map collection names to models
    const modelMap = {
      'all-users': User,
      'all-stores': Store,
      'all-products': Product,
      'all-services': Service,
      'all-orders': Order,
      'all-bookings': Booking,
      'all-chats': Chat,
      'all-chat-analytics': ChatAnalytics,
      'all-contact-reveals': ContactReveal,
      'all-email-subscriptions': EmailSubscription,
      'all-flash-deals': FlashDeal,
      'all-notifications': Notification,
      'all-packages': Package,
      'all-platform-settings': PlatformSettings,
      'all-posts': Post,
      'all-post-comments': PostComment,
      'all-post-likes': PostLike,
      'all-reviews': Review,
      'all-search-history': SearchHistory,
      'all-subscriptions': Subscription,
      'all-time-slots': TimeSlot,
      'all-categories': Category,
      'all-variants': Variant,
      'all-wallets': Wallet,
      'all-addons': Addon,
      'all-comment-likes': CommentLike,
      'all-comment-reactions': CommentReaction,
      'all-marketing': Marketing,
    };
    
    const Model = modelMap[collectionName];
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid collection' });
    }
    
    let result;
    switch (action) {
      case 'delete':
        result = await Model.deleteMany({ _id: { $in: ids } });
        break;
      case 'activate':
        result = await Model.updateMany({ _id: { $in: ids } }, { isActive: true });
        break;
      case 'deactivate':
        result = await Model.updateMany({ _id: { $in: ids } }, { isActive: false });
        break;
      case 'update':
        result = await Model.updateMany({ _id: { $in: ids } }, data);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    logAdminAction(req.user._id, `bulk_${action}`, collectionName, { 
      ids,
      count: result.modifiedCount || result.deletedCount,
      data,
      ip: req.ip 
    });
    
    res.json({ 
      success: true, 
      message: `Bulk ${action} completed`,
      affected: result.modifiedCount || result.deletedCount || 0
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ success: false, message: 'Bulk operation failed' });
  }
});

// Create routes for all collections
createCollectionRoutes('users', User, { 
  searchFields: ['name', 'email'], 
  hasStatus: true,
  populate: ['storeId']
});

createCollectionRoutes('stores', Store, { 
  searchFields: ['name', 'description', 'email'], 
  hasStatus: true,
  populate: ['ownerId', 'category']
});

createCollectionRoutes('products', Product, { 
  searchFields: ['name', 'description'], 
  hasStatus: true,
  populate: ['storeId', 'category']
});

createCollectionRoutes('services', Service, { 
  searchFields: ['name', 'description'], 
  hasStatus: true,
  populate: ['storeId', 'category']
});

createCollectionRoutes('orders', Order, { 
  searchFields: ['orderNumber'], 
  populate: ['customerId', 'storeId', 'items.productId']
});

createCollectionRoutes('bookings', Booking, { 
  populate: ['customerId', 'storeId', 'serviceId']
});

createCollectionRoutes('chats', Chat, { 
  populate: ['participants', 'storeId']
});

createCollectionRoutes('chat-analytics', ChatAnalytics, { 
  populate: ['storeId']
});

createCollectionRoutes('contact-reveals', ContactReveal, { 
  populate: ['userId', 'storeId']
});

createCollectionRoutes('email-subscriptions', EmailSubscription, { 
  searchFields: ['email']
});

createCollectionRoutes('flash-deals', FlashDeal, { 
  searchFields: ['title'], 
  hasStatus: true,
  populate: ['productIds', 'storeIds']
});

createCollectionRoutes('notifications', Notification, { 
  searchFields: ['title', 'message'], 
  populate: ['userId']
});

createCollectionRoutes('packages', Package, { 
  searchFields: ['name', 'description'], 
  hasStatus: true
});

createCollectionRoutes('platform-settings', PlatformSettings, { 
  searchFields: ['key', 'description']
});

createCollectionRoutes('posts', Post, { 
  searchFields: ['content'], 
  hasStatus: true,
  populate: ['authorId', 'storeId']
});

createCollectionRoutes('post-comments', PostComment, { 
  populate: ['postId', 'authorId']
});

createCollectionRoutes('post-likes', PostLike, { 
  populate: ['postId', 'userId']
});

createCollectionRoutes('reviews', Review, { 
  searchFields: ['comment'], 
  populate: ['customerId', 'storeId', 'productId', 'serviceId']
});

createCollectionRoutes('search-history', SearchHistory, { 
  searchFields: ['query'], 
  populate: ['userId']
});

createCollectionRoutes('subscriptions', Subscription, { 
  populate: ['userId', 'packageId']
});

createCollectionRoutes('time-slots', TimeSlot, { 
  populate: ['serviceId']
});

createCollectionRoutes('categories', Category, { 
  searchFields: ['name', 'description'], 
  hasStatus: true
});

createCollectionRoutes('variants', Variant, { 
  searchFields: ['name'], 
  populate: ['productId']
});

createCollectionRoutes('wallets', Wallet, { 
  populate: ['userId']
});

createCollectionRoutes('addons', Addon, { 
  searchFields: ['name', 'description'], 
  hasStatus: true,
  populate: ['serviceId']
});

createCollectionRoutes('comment-likes', CommentLike, { 
  populate: ['commentId', 'userId']
});

createCollectionRoutes('comment-reactions', CommentReaction, { 
  populate: ['commentId', 'userId']
});

createCollectionRoutes('marketing', Marketing, { 
  searchFields: ['title', 'description'], 
  hasStatus: true,
  populate: ['targetStores']
});

export default router;
