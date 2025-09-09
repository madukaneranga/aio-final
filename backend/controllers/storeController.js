import Store from "../models/Store.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class StoreController {
  calculateCompletionRate = async (storeId) => {
    try {
      const orderStats = await Order.aggregate([
        { $match: { storeId: storeId } },
        {
          $group: {
            _id: null,
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "delivered"] }, 1, 0]
              }
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
              }
            }
          }
        }
      ]);

      let completedCount = 0;
      let cancelledCount = 0;

      if (orderStats.length > 0) {
        completedCount = orderStats[0].completed;
        cancelledCount = orderStats[0].cancelled;
      }

      const total = completedCount + cancelledCount;
      const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return completionRate;
    } catch (error) {
      logger.error("Error calculating completion rate", error);
      return 0;
    }
  }

  addDynamicStats = async (stores) => {
    return await Promise.all(
      stores.map(async (store) => {
        const completionRate = await this.calculateCompletionRate(store._id);
        store._completionRate = completionRate;
        
        const totalOrders = await Order.countDocuments({ storeId: store._id });
        
        const storeWithStats = store.toObject();
        storeWithStats.stats = {
          ...storeWithStats.stats,
          totalOrders: totalOrders
        };
        
        return storeWithStats;
      })
    );
  }

  getAllStores = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const { search, category } = req.query;
      let query = { isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const stores = await Store.find(query)
        .populate("ownerId", "name")
        .sort({ rating: -1, totalSales: -1 });

      const storesWithDynamicStats = await this.addDynamicStats(stores);

      res.json(successResponse(storesWithDynamicStats));
    } catch (error) {
      logger.error("Error fetching stores", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  searchStores = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const { search } = req.body;
      const query = { isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const stores = await Store.find(query)
        .populate("ownerId", "name")
        .sort({ createdAt: -1 });

      const storesWithDynamicStats = await this.addDynamicStats(stores);

      res.json(successResponse(storesWithDynamicStats));
    } catch (error) {
      logger.error("Search error", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  getFeaturedStores = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      const stores = await Store.find({ isActive: true })
        .populate("ownerId", "name")
        .sort({ rating: -1, totalSales: -1 })
        .limit(6);

      const storesWithDynamicStats = await this.addDynamicStats(stores);

      res.json(successResponse(storesWithDynamicStats));
    } catch (error) {
      logger.error("Error fetching featured stores", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async createStore(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const existingStore = await Store.findOne({ ownerId: req.user._id });
      if (existingStore) {
        return res.status(400).json(errorResponse("You can only create one store per account", 400));
      }

      const {
        name,
        description,
        themeColor,
        contactInfo,
        heroImages,
        idImages,
        addressVerificationImages,
      } = req.body;

      const store = new Store({
        name,
        description,
        themeColor,
        heroImages,
        idImages,
        addressVerificationImages,
        ownerId: req.user._id,
        contactInfo: contactInfo || "{}",
      });

      await store.save();

      await User.findByIdAndUpdate(req.user._id, {
        role: "store_owner",
        storeId: store._id,
      });

      res.status(201).json(successResponse(store, "Store created successfully", 201));
    } catch (error) {
      logger.error("Error creating store", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  getStoreById = async (req, res) => {
    logger.route(req.method, req.originalUrl);
    try {
      logger.info("Fetching store with ID", req.params.id);

      const store = await Store.findById(req.params.id).populate(
        "ownerId",
        "name email phone"
      );

      if (!store) {
        logger.info("Store not found");
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      logger.info("Store found", store.name);

      const completionRate = await this.calculateCompletionRate(store._id);
      store._completionRate = completionRate;

      const totalOrders = await Order.countDocuments({ storeId: store._id });

      const listings = await Product.find({ storeId: store._id, isActive: true });
      logger.info("Found products", listings.length);

      const storeWithDynamicStats = {
        ...store.toObject(),
        stats: {
          ...store.stats,
          totalOrders: totalOrders
        }
      };

      res.json(successResponse({
        store: storeWithDynamicStats,
        listings,
      }));
    } catch (error) {
      logger.error("Error in store route", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async checkFollowStatus(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      logger.info("Fetching store with ID", req.params.id);

      const store = await Store.findById(req.params.id).populate(
        "ownerId",
        "name email phone"
      );

      if (!store) {
        logger.info("Store not found");
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      logger.info("Store found", store.name);

      let isFollowing = false;
      let isOwnStore = false;
      
      if (req.user) {
        const user = await User.findById(req.user._id);
        isFollowing = user?.followingStores.some(id => id.toString() === req.params.id) || false;
        isOwnStore = store.ownerId._id.toString() === req.user._id.toString();
      }

      logger.info("Sending follow response", { isFollowing, isOwnStore });

      res.json(successResponse({
        isFollowing,
        isOwnStore,
      }));
    } catch (error) {
      logger.error("Error in follow-check route", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async updateStore(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      if (store.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      const updates = req.body;

      const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      });

      res.json(successResponse(updatedStore, "Store updated successfully"));
    } catch (error) {
      logger.error("Error updating store", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async incrementViews(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        { $inc: { "stats.views": 1 } },
        { new: true }
      );

      if (!updatedStore) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      res.json(successResponse({ views: updatedStore.views }, "Views incremented successfully"));
    } catch (error) {
      logger.error("Error incrementing views", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async updateProfileImage(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      if (store.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      const { profileImage } = req.body;

      if (!profileImage) {
        return res.status(400).json(errorResponse("No image file provided", 400));
      }

      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        { profileImage },
        { new: true }
      );

      res.json(successResponse(updatedStore, "Profile image updated successfully"));
    } catch (error) {
      logger.error("Error updating profile image", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getItemCount(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const storeId = req.params.storeId;
      const store = await Store.findById(storeId);

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      const count = await Product.countDocuments({ storeId, isActive: true });

      res.json(successResponse({ count }, "Item count retrieved successfully"));
    } catch (error) {
      logger.error("Error fetching item count", error);
      res.status(500).json(errorResponse("Failed to get active item count"));
    }
  }

  async updateVerificationDocs(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      if (store.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse("Access denied", 403));
      }

      const { idImages, addressVerificationImages } = req.body;
      const updates = {};

      if (idImages && Array.isArray(idImages)) {
        updates.idImages = idImages;
        updates.canReuploadDocs = false;
      }

      if (addressVerificationImages && Array.isArray(addressVerificationImages)) {
        updates.addressVerificationImages = addressVerificationImages;
        updates.canReuploadDocs = false;
      }

      if (idImages || addressVerificationImages) {
        updates.isVerified = false;
      }

      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.json(successResponse(updatedStore, "Verification documents updated successfully"));
    } catch (error) {
      logger.error("Verification upload error", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async toggleFollow(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { storeId } = req.params;
      const userId = req.user._id;

      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      if (store.ownerId.toString() === userId.toString()) {
        return res.status(400).json(errorResponse("Cannot follow your own store", 400));
      }

      const user = await User.findById(userId);
      const isFollowing = user.followingStores.some(id => id.toString() === storeId);

      if (isFollowing) {
        user.followingStores = user.followingStores.filter(
          (id) => id.toString() !== storeId
        );
        store.followers = store.followers.filter(
          (id) => id.toString() !== userId.toString()
        );

        await user.save();
        store.stats.followersCount = store.followers.length;
        await store.save();

        res.json(successResponse({
          followersCount: store.stats.followersCount,
          isFollowing: false,
        }, "Store unfollowed successfully"));
      } else {
        user.followingStores.push(storeId);
        store.followers.push(userId);

        await user.save();
        store.stats.followersCount = store.followers.length;
        await store.save();

        res.json(successResponse({
          followersCount: store.stats.followersCount,
          isFollowing: true,
        }, "Store followed successfully"));
      }
    } catch (error) {
      logger.error("Error toggling follow", error);
      res.status(500).json(errorResponse("Server error"));
    }
  }
}

export default new StoreController();