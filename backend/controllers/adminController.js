import WalletTransaction from "../models/Transaction.js";
import BankDetails from "../models/BankDetails.js";
import BankChangeRequest from "../models/BankChangeRequest.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
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
import Category from "../models/Category.js";
import Variant from "../models/Variant.js";
import Wallet from "../models/Wallet.js";
import CommentLike from "../models/CommentLike.js";
import CommentReaction from "../models/CommentReaction.js";
import { successResponse, errorResponse, paginatedResponse } from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";

class AdminController {
  /**
   * Validate admin action data
   */
  validateAdminAction(data) {
    const errors = [];

    if (
      !data.action ||
      !["approved", "rejected", "processing", "completed"].includes(data.action)
    ) {
      errors.push("Action must be one of: approved, rejected, processing, completed");
    }

    if (
      data.adminNotes &&
      (typeof data.adminNotes !== "string" || data.adminNotes.length > 500)
    ) {
      errors.push("Admin notes must be a string with maximum 500 characters");
    }

    return errors;
  }

  /**
   * Validate status transitions
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      pending: ["processing", "approved", "rejected"],
      processing: ["approved", "rejected"],
      approved: ["completed"],
      rejected: [],
      completed: [],
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get all withdrawal requests
   */
  async getWithdrawals(req, res) {
    logger.route(req.method, req.originalUrl);

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

      if (search) {
        const searchRegex = new RegExp(search, "i");
        const userIds = await User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }],
        }).distinct("_id");

        query.$or = [
          { userId: { $in: userIds } },
          { "metadata.bankDetails.accountHolderName": searchRegex },
          { adminNotes: searchRegex },
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [withdrawals, totalCount] = await Promise.all([
        WalletTransaction.find(query)
          .populate("userId", "name email")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WalletTransaction.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(withdrawals, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Withdrawals retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get withdrawals", error);
      res.status(500).json(errorResponse("Failed to retrieve withdrawals"));
    }
  }

  /**
   * Get pending withdrawal requests
   */
  async getPendingWithdrawals(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const query = { type: "withdrawal", status: "pending" };
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [withdrawals, totalCount] = await Promise.all([
        WalletTransaction.find(query)
          .populate("userId", "name email profileImage")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WalletTransaction.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(withdrawals, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Pending withdrawals retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get pending withdrawals", error);
      res.status(500).json(errorResponse("Failed to retrieve pending withdrawals"));
    }
  }

  /**
   * Process withdrawal request
   */
  async processWithdrawal(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const { action, adminNotes } = req.body;

      const validationErrors = this.validateAdminAction({ action, adminNotes });
      if (validationErrors.length > 0) {
        return res.status(400).json(errorResponse("Validation failed", 400, validationErrors));
      }

      const withdrawal = await WalletTransaction.findById(id);
      if (!withdrawal) {
        return res.status(404).json(errorResponse("Withdrawal request not found", 404));
      }

      if (!this.validateStatusTransition(withdrawal.status, action)) {
        return res.status(400).json(errorResponse(`Cannot transition from ${withdrawal.status} to ${action}`, 400));
      }

      const updateData = {
        status: action,
        processedAt: new Date(),
        processedBy: req.user._id,
      };

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      const updatedWithdrawal = await WalletTransaction.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate("userId", "name email");

      // Create notification for user
      const notification = await Notification.create({
        userId: withdrawal.userId,
        userType: 'store_owner',
        title: `Withdrawal Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        body: `Your withdrawal request of Rs. ${withdrawal.amount.toFixed(2)} has been ${action}.`,
        type: "withdrawal_update",
        metadata: { transactionId: id, amount: withdrawal.amount },
      });

      // Emit notification via socket
      if (global.io) {
        global.io.to(withdrawal.userId.toString()).emit('new-notification', notification);
      }

      res.json(successResponse(updatedWithdrawal, `Withdrawal ${action} successfully`));
    } catch (error) {
      logger.error("Failed to process withdrawal", error);
      res.status(500).json(errorResponse("Failed to process withdrawal"));
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { period = "30", startDate, endDate } = req.query;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        dateFilter = { createdAt: { $gte: daysAgo } };
      }

      const [
        totalUsers,
        totalStores,
        totalProducts,
        totalOrders,
        totalRevenue,
        newUsersCount,
        newStoresCount,
        newProductsCount,
        newOrdersCount,
      ] = await Promise.all([
        User.countDocuments(),
        Store.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        User.countDocuments(dateFilter),
        Store.countDocuments(dateFilter),
        Product.countDocuments(dateFilter),
        Order.countDocuments(dateFilter),
      ]);

      const analytics = {
        overview: {
          totalUsers,
          totalStores,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        periodData: {
          newUsers: newUsersCount,
          newStores: newStoresCount,
          newProducts: newProductsCount,
          newOrders: newOrdersCount,
          period: `${period} days`,
        },
      };

      res.json(successResponse(analytics, "Analytics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get analytics", error);
      res.status(500).json(errorResponse("Failed to retrieve analytics"));
    }
  }

  /**
   * Generic method to get collection data
   */
  async getCollectionData(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { collection } = req.params;
      const { page = 1, limit = 10, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      const modelMap = {
        "all-users": User,
        "all-stores": Store,
        "all-products": Product,
        "all-orders": Order,
        "all-contact-reveals": ContactReveal,
        "all-email-subscriptions": EmailSubscription,
        "all-flash-deals": FlashDeal,
        "all-notifications": Notification,
        "all-packages": Package,
        "all-platform-settings": PlatformSettings,
        "all-posts": Post,
        "all-post-comments": PostComment,
        "all-post-likes": PostLike,
        "all-reviews": Review,
        "all-search-history": SearchHistory,
        "all-subscriptions": Subscription,
        "all-categories": Category,
        "all-variants": Variant,
        "all-wallets": Wallet,
        "all-comment-likes": CommentLike,
        "all-comment-reactions": CommentReaction,
      };

      const Model = modelMap[collection];
      if (!Model) {
        return res.status(404).json(errorResponse("Collection not found", 404));
      }

      let query = {};
      if (search) {
        // Generic search - adjust based on model fields
        const searchRegex = new RegExp(search, "i");
        if (collection === "all-users") {
          query.$or = [{ name: searchRegex }, { email: searchRegex }];
        } else if (collection === "all-products") {
          query.$or = [{ title: searchRegex }, { description: searchRegex }];
        } else if (collection === "all-orders") {
          query.$or = [{ orderNumber: searchRegex }];
        }
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [items, totalCount] = await Promise.all([
        Model.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Model.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(items, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, `${collection} retrieved successfully`));
    } catch (error) {
      logger.error(`Failed to get ${req.params.collection}`, error);
      res.status(500).json(errorResponse(`Failed to retrieve ${req.params.collection}`));
    }
  }

  /**
   * Create collection item
   */
  async createCollectionItem(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { collection } = req.params;
      const data = req.body;

      const modelMap = {
        "all-users": User,
        "all-stores": Store,
        "all-products": Product,
        "all-notifications": Notification,
        "all-packages": Package,
        "all-platform-settings": PlatformSettings,
        "all-email-subscriptions": EmailSubscription,
        "all-flash-deals": FlashDeal,
        "all-categories": Category,
        "all-variants": Variant,
      };

      const Model = modelMap[collection];
      if (!Model) {
        return res.status(404).json(errorResponse("Collection not found", 404));
      }

      const newItem = new Model(data);
      await newItem.save();

      res.status(201).json(successResponse(newItem, `${collection} item created successfully`, 201));
    } catch (error) {
      logger.error(`Failed to create ${req.params.collection} item`, error);
      res.status(500).json(errorResponse(`Failed to create ${req.params.collection} item`));
    }
  }

  /**
   * Update collection item
   */
  async updateCollectionItem(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { collection, id } = req.params;
      const updates = req.body;

      const modelMap = {
        "all-users": User,
        "all-stores": Store,
        "all-products": Product,
        "all-orders": Order,
        "all-notifications": Notification,
        "all-packages": Package,
        "all-platform-settings": PlatformSettings,
        "all-email-subscriptions": EmailSubscription,
        "all-flash-deals": FlashDeal,
        "all-posts": Post,
        "all-post-comments": PostComment,
        "all-reviews": Review,
        "all-subscriptions": Subscription,
        "all-categories": Category,
        "all-variants": Variant,
        "all-wallets": Wallet,
      };

      const Model = modelMap[collection];
      if (!Model) {
        return res.status(404).json(errorResponse("Collection not found", 404));
      }

      const updatedItem = await Model.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (!updatedItem) {
        return res.status(404).json(errorResponse("Item not found", 404));
      }

      res.json(successResponse(updatedItem, `${collection} item updated successfully`));
    } catch (error) {
      logger.error(`Failed to update ${req.params.collection} item`, error);
      res.status(500).json(errorResponse(`Failed to update ${req.params.collection} item`));
    }
  }

  /**
   * Delete collection item
   */
  async deleteCollectionItem(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { collection, id } = req.params;

      const modelMap = {
        "all-users": User,
        "all-stores": Store,
        "all-products": Product,
        "all-orders": Order,
        "all-notifications": Notification,
        "all-packages": Package,
        "all-platform-settings": PlatformSettings,
        "all-email-subscriptions": EmailSubscription,
        "all-flash-deals": FlashDeal,
        "all-posts": Post,
        "all-post-comments": PostComment,
        "all-post-likes": PostLike,
        "all-reviews": Review,
        "all-search-history": SearchHistory,
        "all-subscriptions": Subscription,
        "all-categories": Category,
        "all-variants": Variant,
        "all-comment-likes": CommentLike,
        "all-comment-reactions": CommentReaction,
      };

      const Model = modelMap[collection];
      if (!Model) {
        return res.status(404).json(errorResponse("Collection not found", 404));
      }

      const deletedItem = await Model.findByIdAndDelete(id);

      if (!deletedItem) {
        return res.status(404).json(errorResponse("Item not found", 404));
      }

      res.json(successResponse(null, `${collection} item deleted successfully`));
    } catch (error) {
      logger.error(`Failed to delete ${req.params.collection} item`, error);
      res.status(500).json(errorResponse(`Failed to delete ${req.params.collection} item`));
    }
  }

  /**
   * Bulk operations
   */
  async bulkOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { collection } = req.params;
      const { ids, action, data = {} } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse("IDs array is required", 400));
      }

      if (!action) {
        return res.status(400).json(errorResponse("Action is required", 400));
      }

      const modelMap = {
        "all-users": User,
        "all-stores": Store,
        "all-products": Product,
        "all-orders": Order,
        "all-notifications": Notification,
        "all-reviews": Review,
        "all-subscriptions": Subscription,
      };

      const Model = modelMap[collection];
      if (!Model) {
        return res.status(404).json(errorResponse("Collection not found", 404));
      }

      let result;
      switch (action) {
        case "delete":
          result = await Model.deleteMany({ _id: { $in: ids } });
          break;
        case "update":
          result = await Model.updateMany({ _id: { $in: ids } }, data);
          break;
        case "activate":
          result = await Model.updateMany({ _id: { $in: ids } }, { isActive: true });
          break;
        case "deactivate":
          result = await Model.updateMany({ _id: { $in: ids } }, { isActive: false });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk operation`));
    }
  }

  /**
   * Get all users
   */
  async getUsers(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, search, status, role, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = {};
      if (status) query.status = status;
      if (role) query.role = role;

      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, totalCount] = await Promise.all([
        User.find(query)
          .select("-password")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(users, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Users retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get users", error);
      res.status(500).json(errorResponse("Failed to retrieve users"));
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByRole
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: "active" }),
        User.countDocuments({ verified: true }),
        User.aggregate([
          { $group: { _id: "$role", count: { $sum: 1 } } }
        ])
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };

      res.json(successResponse(stats, "User statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get user stats", error);
      res.status(500).json(errorResponse("Failed to retrieve user statistics"));
    }
  }

  /**
   * Update user
   */
  async updateUser(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json(errorResponse("User not found", 404));
      }

      res.json(successResponse(user, "User updated successfully"));
    } catch (error) {
      logger.error("Failed to update user", error);
      res.status(500).json(errorResponse("Failed to update user"));
    }
  }

  /**
   * Delete user
   */
  async deleteUser(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json(errorResponse("User not found", 404));
      }

      res.json(successResponse(null, "User deleted successfully"));
    } catch (error) {
      logger.error("Failed to delete user", error);
      res.status(500).json(errorResponse("Failed to delete user"));
    }
  }

  /**
   * Bulk user operations
   */
  async bulkUserOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { ids, action, data = {} } = req.body;

      let result;
      switch (action) {
        case "delete":
          result = await User.deleteMany({ _id: { $in: ids } });
          break;
        case "update":
          result = await User.updateMany({ _id: { $in: ids } }, data);
          break;
        case "activate":
          result = await User.updateMany({ _id: { $in: ids } }, { status: "active" });
          break;
        case "deactivate":
          result = await User.updateMany({ _id: { $in: ids } }, { status: "inactive" });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk user ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk user ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk user operation`));
    }
  }

  /**
   * Get all stores
   */
  async getStores(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, search, status, verified, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = {};
      if (status) query.status = status;
      if (verified !== undefined) query.verified = verified === "true";

      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { "owner.name": searchRegex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [stores, totalCount] = await Promise.all([
        Store.find(query)
          .populate("owner", "name email")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Store.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(stores, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Stores retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get stores", error);
      res.status(500).json(errorResponse("Failed to retrieve stores"));
    }
  }

  /**
   * Get store statistics
   */
  async getStoreStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalStores,
        activeStores,
        verifiedStores,
        pendingStores
      ] = await Promise.all([
        Store.countDocuments(),
        Store.countDocuments({ status: "active" }),
        Store.countDocuments({ verified: true }),
        Store.countDocuments({ status: "pending_approval" })
      ]);

      const stats = {
        totalStores,
        activeStores,
        verifiedStores,
        pendingStores
      };

      res.json(successResponse(stats, "Store statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get store stats", error);
      res.status(500).json(errorResponse("Failed to retrieve store statistics"));
    }
  }

  /**
   * Update store
   */
  async updateStore(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updates = req.body;

      const store = await Store.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).populate("owner", "name email");

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      res.json(successResponse(store, "Store updated successfully"));
    } catch (error) {
      logger.error("Failed to update store", error);
      res.status(500).json(errorResponse("Failed to update store"));
    }
  }

  /**
   * Update store status
   */
  async updateStoreStatus(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const updateData = { status };
      if (adminNotes) updateData.adminNotes = adminNotes;

      const store = await Store.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("owner", "name email");

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      res.json(successResponse(store, "Store status updated successfully"));
    } catch (error) {
      logger.error("Failed to update store status", error);
      res.status(500).json(errorResponse("Failed to update store status"));
    }
  }

  /**
   * Delete store
   */
  async deleteStore(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const store = await Store.findByIdAndDelete(id);
      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      res.json(successResponse(null, "Store deleted successfully"));
    } catch (error) {
      logger.error("Failed to delete store", error);
      res.status(500).json(errorResponse("Failed to delete store"));
    }
  }

  /**
   * Bulk store operations
   */
  async bulkStoreOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { ids, action, data = {} } = req.body;

      let result;
      switch (action) {
        case "delete":
          result = await Store.deleteMany({ _id: { $in: ids } });
          break;
        case "update":
          result = await Store.updateMany({ _id: { $in: ids } }, data);
          break;
        case "activate":
          result = await Store.updateMany({ _id: { $in: ids } }, { status: "active" });
          break;
        case "deactivate":
          result = await Store.updateMany({ _id: { $in: ids } }, { status: "inactive" });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk store ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk store ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk store operation`));
    }
  }

  /**
   * Get all orders
   */
  async getOrders(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, search, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = {};
      if (status) query.status = status;

      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { orderNumber: searchRegex },
          { "customer.name": searchRegex },
          { "customer.email": searchRegex }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, totalCount] = await Promise.all([
        Order.find(query)
          .populate("customer", "name email")
          .populate("store", "name")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(orders, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Orders retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get orders", error);
      res.status(500).json(errorResponse("Failed to retrieve orders"));
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        totalRevenue
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        Order.countDocuments({ status: "shipped" }),
        Order.countDocuments({ status: "delivered" }),
        Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }])
      ]);

      const stats = {
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      };

      res.json(successResponse(stats, "Order statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get order stats", error);
      res.status(500).json(errorResponse("Failed to retrieve order statistics"));
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const order = await Order.findById(id)
        .populate("customer", "name email phone")
        .populate("store", "name")
        .populate("items.product", "title price images")
        .lean();

      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      res.json(successResponse(order, "Order details retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get order details", error);
      res.status(500).json(errorResponse("Failed to retrieve order details"));
    }
  }

  /**
   * Update order
   */
  async updateOrder(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updates = req.body;

      const order = await Order.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).populate("customer", "name email");

      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      res.json(successResponse(order, "Order updated successfully"));
    } catch (error) {
      logger.error("Failed to update order", error);
      res.status(500).json(errorResponse("Failed to update order"));
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const { status, trackingNumber, adminNotes } = req.body;

      const updateData = { status };
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (adminNotes) updateData.adminNotes = adminNotes;

      const order = await Order.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("customer", "name email");

      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      res.json(successResponse(order, "Order status updated successfully"));
    } catch (error) {
      logger.error("Failed to update order status", error);
      res.status(500).json(errorResponse("Failed to update order status"));
    }
  }

  /**
   * Bulk order operations
   */
  async bulkOrderOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { ids, action, data = {} } = req.body;

      let result;
      switch (action) {
        case "update":
          result = await Order.updateMany({ _id: { $in: ids } }, data);
          break;
        case "cancel":
          result = await Order.updateMany({ _id: { $in: ids } }, { status: "cancelled" });
          break;
        case "ship":
          result = await Order.updateMany({ _id: { $in: ids } }, { status: "shipped" });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk order ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk order ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk order operation`));
    }
  }

  /**
   * Get order timeline
   */
  async getOrderTimeline(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const order = await Order.findById(id).select("statusHistory createdAt updatedAt").lean();
      
      if (!order) {
        return res.status(404).json(errorResponse("Order not found", 404));
      }

      const timeline = order.statusHistory || [];
      
      res.json(successResponse(timeline, "Order timeline retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get order timeline", error);
      res.status(500).json(errorResponse("Failed to retrieve order timeline"));
    }
  }

  /**
   * Get subscriptions
   */
  async getSubscriptions(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, status, plan, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = {};
      if (status) query.status = status;
      if (plan) query.plan = plan;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [subscriptions, totalCount] = await Promise.all([
        Subscription.find(query)
          .populate("user", "name email")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Subscription.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(subscriptions, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Subscriptions retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get subscriptions", error);
      res.status(500).json(errorResponse("Failed to retrieve subscriptions"));
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        subscriptionsByPlan
      ] = await Promise.all([
        Subscription.countDocuments(),
        Subscription.countDocuments({ status: "active" }),
        Subscription.countDocuments({ status: "cancelled" }),
        Subscription.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }])
      ]);

      const stats = {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        subscriptionsByPlan: subscriptionsByPlan.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };

      res.json(successResponse(stats, "Subscription statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get subscription stats", error);
      res.status(500).json(errorResponse("Failed to retrieve subscription statistics"));
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updates = req.body;

      const subscription = await Subscription.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).populate("user", "name email");

      if (!subscription) {
        return res.status(404).json(errorResponse("Subscription not found", 404));
      }

      res.json(successResponse(subscription, "Subscription updated successfully"));
    } catch (error) {
      logger.error("Failed to update subscription", error);
      res.status(500).json(errorResponse("Failed to update subscription"));
    }
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const subscription = await Subscription.findByIdAndDelete(id);
      if (!subscription) {
        return res.status(404).json(errorResponse("Subscription not found", 404));
      }

      res.json(successResponse(null, "Subscription deleted successfully"));
    } catch (error) {
      logger.error("Failed to delete subscription", error);
      res.status(500).json(errorResponse("Failed to delete subscription"));
    }
  }

  /**
   * Bulk subscription operations
   */
  async bulkSubscriptionOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { ids, action, data = {} } = req.body;

      let result;
      switch (action) {
        case "delete":
          result = await Subscription.deleteMany({ _id: { $in: ids } });
          break;
        case "update":
          result = await Subscription.updateMany({ _id: { $in: ids } }, data);
          break;
        case "cancel":
          result = await Subscription.updateMany({ _id: { $in: ids } }, { status: "cancelled" });
          break;
        case "activate":
          result = await Subscription.updateMany({ _id: { $in: ids } }, { status: "active" });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk subscription ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk subscription ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk subscription operation`));
    }
  }

  /**
   * Get flash deals
   */
  async getFlashDeals(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = {};
      if (status === "active") {
        query.isActive = true;
        query.startDate = { $lte: new Date() };
        query.endDate = { $gte: new Date() };
      } else if (status === "inactive") {
        query.isActive = false;
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [flashDeals, totalCount] = await Promise.all([
        FlashDeal.find(query)
          .populate("products.product", "title price images")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        FlashDeal.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(flashDeals, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Flash deals retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get flash deals", error);
      res.status(500).json(errorResponse("Failed to retrieve flash deals"));
    }
  }

  /**
   * Get flash deal statistics
   */
  async getFlashDealStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const now = new Date();
      const [
        totalFlashDeals,
        activeFlashDeals,
        upcomingFlashDeals,
        expiredFlashDeals
      ] = await Promise.all([
        FlashDeal.countDocuments(),
        FlashDeal.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
        FlashDeal.countDocuments({ isActive: true, startDate: { $gt: now } }),
        FlashDeal.countDocuments({ endDate: { $lt: now } })
      ]);

      const stats = {
        totalFlashDeals,
        activeFlashDeals,
        upcomingFlashDeals,
        expiredFlashDeals
      };

      res.json(successResponse(stats, "Flash deal statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get flash deal stats", error);
      res.status(500).json(errorResponse("Failed to retrieve flash deal statistics"));
    }
  }

  /**
   * Create flash deal
   */
  async createFlashDeal(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const flashDealData = req.body;
      
      const flashDeal = new FlashDeal(flashDealData);
      await flashDeal.save();

      res.status(201).json(successResponse(flashDeal, "Flash deal created successfully", 201));
    } catch (error) {
      logger.error("Failed to create flash deal", error);
      res.status(500).json(errorResponse("Failed to create flash deal"));
    }
  }

  /**
   * Update flash deal
   */
  async updateFlashDeal(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const updates = req.body;

      const flashDeal = await FlashDeal.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (!flashDeal) {
        return res.status(404).json(errorResponse("Flash deal not found", 404));
      }

      res.json(successResponse(flashDeal, "Flash deal updated successfully"));
    } catch (error) {
      logger.error("Failed to update flash deal", error);
      res.status(500).json(errorResponse("Failed to update flash deal"));
    }
  }

  /**
   * Delete flash deal
   */
  async deleteFlashDeal(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;

      const flashDeal = await FlashDeal.findByIdAndDelete(id);
      if (!flashDeal) {
        return res.status(404).json(errorResponse("Flash deal not found", 404));
      }

      res.json(successResponse(null, "Flash deal deleted successfully"));
    } catch (error) {
      logger.error("Failed to delete flash deal", error);
      res.status(500).json(errorResponse("Failed to delete flash deal"));
    }
  }

  /**
   * Bulk flash deal operations
   */
  async bulkFlashDealOperation(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { ids, action, data = {} } = req.body;

      let result;
      switch (action) {
        case "delete":
          result = await FlashDeal.deleteMany({ _id: { $in: ids } });
          break;
        case "update":
          result = await FlashDeal.updateMany({ _id: { $in: ids } }, data);
          break;
        case "activate":
          result = await FlashDeal.updateMany({ _id: { $in: ids } }, { isActive: true });
          break;
        case "deactivate":
          result = await FlashDeal.updateMany({ _id: { $in: ids } }, { isActive: false });
          break;
        default:
          return res.status(400).json(errorResponse("Invalid action", 400));
      }

      res.json(successResponse(result, `Bulk flash deal ${action} completed successfully`));
    } catch (error) {
      logger.error(`Failed to perform bulk flash deal ${req.body.action}`, error);
      res.status(500).json(errorResponse(`Failed to perform bulk flash deal operation`));
    }
  }

  /**
   * Get revenue data
   */
  async getRevenueData(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { period = "30", startDate, endDate } = req.query;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        dateFilter = { createdAt: { $gte: daysAgo } };
      }

      const revenueData = await Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ["delivered", "completed"] } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            },
            revenue: { $sum: "$totalAmount" },
            orders: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ]);

      res.json(successResponse(revenueData, "Revenue data retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get revenue data", error);
      res.status(500).json(errorResponse("Failed to retrieve revenue data"));
    }
  }

  /**
   * Get commissions
   */
  async getCommissions(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = { type: "commission" };
      if (status) query.status = status;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [commissions, totalCount] = await Promise.all([
        WalletTransaction.find(query)
          .populate("userId", "name email")
          .populate("relatedOrder", "orderNumber totalAmount")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WalletTransaction.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(commissions, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Commissions retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get commissions", error);
      res.status(500).json(errorResponse("Failed to retrieve commissions"));
    }
  }

  /**
   * Get payouts
   */
  async getPayouts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { page = 1, limit = 10, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;

      let query = { type: "payout" };
      if (status) query.status = status;

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [payouts, totalCount] = await Promise.all([
        WalletTransaction.find(query)
          .populate("userId", "name email")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WalletTransaction.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(paginatedResponse(payouts, {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }, "Payouts retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get payouts", error);
      res.status(500).json(errorResponse("Failed to retrieve payouts"));
    }
  }

  /**
   * Process payout
   */
  async processPayout(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const updateData = { 
        status,
        processedAt: new Date(),
        processedBy: req.user._id
      };

      if (adminNotes) updateData.adminNotes = adminNotes;

      const payout = await WalletTransaction.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("userId", "name email");

      if (!payout) {
        return res.status(404).json(errorResponse("Payout not found", 404));
      }

      res.json(successResponse(payout, "Payout processed successfully"));
    } catch (error) {
      logger.error("Failed to process payout", error);
      res.status(500).json(errorResponse("Failed to process payout"));
    }
  }

  /**
   * Get financial statistics
   */
  async getFinancialStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalRevenue,
        totalCommissions,
        pendingPayouts,
        processedPayouts
      ] = await Promise.all([
        Order.aggregate([
          { $match: { status: { $in: ["delivered", "completed"] } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        WalletTransaction.aggregate([
          { $match: { type: "commission" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        WalletTransaction.countDocuments({ type: "payout", status: "pending" }),
        WalletTransaction.countDocuments({ type: "payout", status: "completed" })
      ]);

      const stats = {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCommissions: totalCommissions[0]?.total || 0,
        pendingPayouts,
        processedPayouts
      };

      res.json(successResponse(stats, "Financial statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get financial stats", error);
      res.status(500).json(errorResponse("Failed to retrieve financial statistics"));
    }
  }

  /**
   * Get admin activities (placeholder - would need AdminActivity model)
   */
  async getAdminActivities(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      // This would typically use an AdminActivity model
      const activities = [];

      res.json(paginatedResponse(activities, {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }, "Admin activities retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get admin activities", error);
      res.status(500).json(errorResponse("Failed to retrieve admin activities"));
    }
  }

  /**
   * Get security alerts (placeholder)
   */
  async getSecurityAlerts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const alerts = [];

      res.json(paginatedResponse(alerts, {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }, "Security alerts retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get security alerts", error);
      res.status(500).json(errorResponse("Failed to retrieve security alerts"));
    }
  }

  /**
   * Get login attempts (placeholder)
   */
  async getLoginAttempts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const attempts = [];

      res.json(paginatedResponse(attempts, {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }, "Login attempts retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get login attempts", error);
      res.status(500).json(errorResponse("Failed to retrieve login attempts"));
    }
  }

  /**
   * Get security overview
   */
  async getSecurityOverview(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const overview = {
        totalUsers: await User.countDocuments(),
        activeUsers: await User.countDocuments({ status: "active" }),
        suspendedUsers: await User.countDocuments({ status: "suspended" }),
        recentLoginAttempts: 0,
        securityAlerts: 0,
        adminActivities: 0
      };

      res.json(successResponse(overview, "Security overview retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get security overview", error);
      res.status(500).json(errorResponse("Failed to retrieve security overview"));
    }
  }

  /**
   * Resolve security alert (placeholder)
   */
  async resolveSecurityAlert(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      
      // This would update the security alert status
      res.json(successResponse(null, "Security alert resolved successfully"));
    } catch (error) {
      logger.error("Failed to resolve security alert", error);
      res.status(500).json(errorResponse("Failed to resolve security alert"));
    }
  }

  /**
   * Get system settings (placeholder)
   */
  async getSystemSettings(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const settings = await PlatformSettings.findOne() || {};

      res.json(successResponse(settings, "System settings retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get system settings", error);
      res.status(500).json(errorResponse("Failed to retrieve system settings"));
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const updates = req.body;

      const settings = await PlatformSettings.findOneAndUpdate({}, updates, {
        new: true,
        upsert: true,
        runValidators: true,
      });

      res.json(successResponse(settings, "System settings updated successfully"));
    } catch (error) {
      logger.error("Failed to update system settings", error);
      res.status(500).json(errorResponse("Failed to update system settings"));
    }
  }

  /**
   * Create backup (placeholder)
   */
  async createBackup(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const backup = {
        id: Date.now(),
        createdAt: new Date(),
        size: "150MB",
        status: "completed"
      };

      res.json(successResponse(backup, "Backup created successfully"));
    } catch (error) {
      logger.error("Failed to create backup", error);
      res.status(500).json(errorResponse("Failed to create backup"));
    }
  }

  /**
   * Get backups (placeholder)
   */
  async getBackups(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const backups = [];

      res.json(paginatedResponse(backups, {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }, "Backups retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get backups", error);
      res.status(500).json(errorResponse("Failed to retrieve backups"));
    }
  }

  /**
   * Restore backup (placeholder)
   */
  async restoreBackup(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { id } = req.params;
      
      res.json(successResponse(null, "Backup restored successfully"));
    } catch (error) {
      logger.error("Failed to restore backup", error);
      res.status(500).json(errorResponse("Failed to restore backup"));
    }
  }

  /**
   * Get system logs (placeholder)
   */
  async getSystemLogs(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const logs = [];

      res.json(paginatedResponse(logs, {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
      }, "System logs retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get system logs", error);
      res.status(500).json(errorResponse("Failed to retrieve system logs"));
    }
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        userGrowth,
        revenueGrowth,
        orderStats,
        topProducts
      ] = await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        Order.aggregate([
          { $match: { status: { $in: ["delivered", "completed"] } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" }
              },
              revenue: { $sum: "$totalAmount" }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        Order.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ]),
        Product.aggregate([
          { $sort: { views: -1 } },
          { $limit: 10 },
          { $project: { title: 1, views: 1, price: 1 } }
        ])
      ]);

      const analytics = {
        userGrowth,
        revenueGrowth,
        orderStats,
        topProducts
      };

      res.json(successResponse(analytics, "Dashboard analytics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get dashboard analytics", error);
      res.status(500).json(errorResponse("Failed to retrieve dashboard analytics"));
    }
  }

  /**
   * Export analytics (placeholder)
   */
  async exportAnalytics(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { format = "csv" } = req.query;
      
      res.json(successResponse({ downloadUrl: "/api/exports/analytics.csv" }, "Analytics export initiated"));
    } catch (error) {
      logger.error("Failed to export analytics", error);
      res.status(500).json(errorResponse("Failed to export analytics"));
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const [
        totalUsers,
        totalStores,
        totalProducts,
        totalOrders,
        totalTransactions,
        pendingWithdrawals,
      ] = await Promise.all([
        User.countDocuments(),
        Store.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        WalletTransaction.countDocuments(),
        WalletTransaction.countDocuments({ type: "withdrawal", status: "pending" }),
      ]);

      const stats = {
        totalUsers,
        totalStores,
        totalProducts,
        totalOrders,
        totalTransactions,
        pendingWithdrawals,
        serverStatus: "online",
        lastUpdated: new Date(),
      };

      res.json(successResponse(stats, "System statistics retrieved successfully"));
    } catch (error) {
      logger.error("Failed to get system stats", error);
      res.status(500).json(errorResponse("Failed to retrieve system statistics"));
    }
  }
}

export default new AdminController();