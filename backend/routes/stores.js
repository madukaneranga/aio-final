import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to calculate completion rate for a store
const calculateCompletionRate = async (storeId, storeType) => {
  try {
    let completedCount = 0;
    let cancelledCount = 0;

    if (storeType === "product") {
      // For product stores: completed = delivered, cancelled = cancelled
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

      if (orderStats.length > 0) {
        completedCount = orderStats[0].completed;
        cancelledCount = orderStats[0].cancelled;
      }
    } else if (storeType === "service") {
      // For service stores: completed = completed, cancelled = cancelled
      const bookingStats = await Booking.aggregate([
        { $match: { storeId: storeId } },
        {
          $group: {
            _id: null,
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
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

      if (bookingStats.length > 0) {
        completedCount = bookingStats[0].completed;
        cancelledCount = bookingStats[0].cancelled;
      }
    }

    // Calculate completion rate: (completed / (completed + cancelled)) * 100
    const total = completedCount + cancelledCount;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return completionRate;
  } catch (error) {
    console.error("Error calculating completion rate:", error);
    return 0;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/stores"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Get all stores
router.get("/", async (req, res) => {
  try {
    const { type, search, category } = req.query;
    let query = { isActive: true };

    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const stores = await Store.find(query)
      .populate("ownerId", "name")
      .sort({ rating: -1, totalSales: -1 });

    // Calculate completion rates and dynamic stats for all stores
    const storesWithDynamicStats = await Promise.all(
      stores.map(async (store) => {
        const completionRate = await calculateCompletionRate(store._id, store.type);
        store._completionRate = completionRate;
        
        // Calculate dynamic orders/bookings count
        let totalOrdersOrBookings = 0;
        if (store.type === "product") {
          totalOrdersOrBookings = await Order.countDocuments({ storeId: store._id });
        } else if (store.type === "service") {
          totalOrdersOrBookings = await Booking.countDocuments({ storeId: store._id });
        }
        
        // Add dynamic stats to store object
        const storeWithStats = store.toObject();
        storeWithStats.stats = {
          ...storeWithStats.stats,
          totalOrdersOrBookings: totalOrdersOrBookings
        };
        
        return storeWithStats;
      })
    );

    res.json(storesWithDynamicStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search/filter stores via POST
router.post("/listing", async (req, res) => {
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
      .populate("ownerId", "name type")
      .sort({ createdAt: -1 });

    // Calculate completion rates and dynamic stats for all stores
    const storesWithDynamicStats = await Promise.all(
      stores.map(async (store) => {
        const completionRate = await calculateCompletionRate(store._id, store.type);
        store._completionRate = completionRate;
        
        // Calculate dynamic orders/bookings count
        let totalOrdersOrBookings = 0;
        if (store.type === "product") {
          totalOrdersOrBookings = await Order.countDocuments({ storeId: store._id });
        } else if (store.type === "service") {
          totalOrdersOrBookings = await Booking.countDocuments({ storeId: store._id });
        }
        
        // Add dynamic stats to store object
        const storeWithStats = store.toObject();
        storeWithStats.stats = {
          ...storeWithStats.stats,
          totalOrdersOrBookings: totalOrdersOrBookings
        };
        
        return storeWithStats;
      })
    );

    res.json(storesWithDynamicStats);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get featured stores
router.get("/featured/list", async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .populate("ownerId", "name")
      .sort({ rating: -1, totalSales: -1 })
      .limit(6);

    // Calculate completion rates and dynamic stats for all stores
    const storesWithDynamicStats = await Promise.all(
      stores.map(async (store) => {
        const completionRate = await calculateCompletionRate(store._id, store.type);
        store._completionRate = completionRate;
        
        // Calculate dynamic orders/bookings count
        let totalOrdersOrBookings = 0;
        if (store.type === "product") {
          totalOrdersOrBookings = await Order.countDocuments({ storeId: store._id });
        } else if (store.type === "service") {
          totalOrdersOrBookings = await Booking.countDocuments({ storeId: store._id });
        }
        
        // Add dynamic stats to store object
        const storeWithStats = store.toObject();
        storeWithStats.stats = {
          ...storeWithStats.stats,
          totalOrdersOrBookings: totalOrdersOrBookings
        };
        
        return storeWithStats;
      })
    );

    res.json(storesWithDynamicStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create store
router.post(
  "/",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      // Check if user already has a store
      const existingStore = await Store.findOne({ ownerId: req.user._id });
      if (existingStore) {
        return res
          .status(400)
          .json({ error: "You can only create one store per account" });
      }

      const {
        name,
        type,
        description,
        themeColor,
        contactInfo,
        heroImages,
        idImages,
        addressVerificationImages,
      } = req.body;
      const timeSlots = req.body.timeSlots || [];

      const store = new Store({
        name,
        type,
        description,
        themeColor,
        heroImages,
        idImages,
        addressVerificationImages,
        ownerId: req.user._id,
        contactInfo: contactInfo || "{}",
        timeSlots,
      });

      await store.save();

      // Update user role to store_owner
      await User.findByIdAndUpdate(req.user._id, {
        role: "store_owner",
        storeId: store._id,
      });

      res.status(201).json(store);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get store by ID
router.get("/:id", async (req, res) => {
  try {
    console.log("Fetching store with ID:", req.params.id);

    const store = await Store.findById(req.params.id).populate(
      "ownerId",
      "name email phone"
    );

    if (!store) {
      console.log("Store not found");
      return res.status(404).json({ error: "Store not found" });
    }

    console.log("Store found:", store.name, "Type:", store.type);

    // Calculate completion rate for this store
    const completionRate = await calculateCompletionRate(store._id, store.type);
    store._completionRate = completionRate;

    // Calculate dynamic orders/bookings count
    let totalOrdersOrBookings = 0;
    if (store.type === "product") {
      totalOrdersOrBookings = await Order.countDocuments({ storeId: store._id });
    } else if (store.type === "service") {
      totalOrdersOrBookings = await Booking.countDocuments({ storeId: store._id });
    }

    // Get store products or services
    let listings = [];
    if (store.type === "product") {
      listings = await Product.find({ storeId: store._id, isActive: true });
      console.log("Found products:", listings.length);
    } else {
      listings = await Service.find({ storeId: store._id, isActive: true });
      console.log("Found services:", listings.length);
    }

    // Create store object with dynamic stats
    const storeWithDynamicStats = {
      ...store.toObject(),
      stats: {
        ...store.stats,
        totalOrdersOrBookings: totalOrdersOrBookings
      }
    };

    res.json({
      store: storeWithDynamicStats,
      listings,
    });
  } catch (error) {
    console.error("Error in store route:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/follow-check", optionalAuth, async (req, res) => {
  try {
    console.log("Fetching store with ID:", req.params.id);

    const store = await Store.findById(req.params.id).populate(
      "ownerId",
      "name email phone"
    );

    if (!store) {
      console.log("Store not found");
      return res.status(404).json({ error: "Store not found" });
    }

    console.log("Store found:", store.name, "Type:", store.type);

    // Handle both authenticated and unauthenticated users
    let isFollowing = false;
    let isOwnStore = false;
    
    if (req.user) {
      const user = await User.findById(req.user._id);
      isFollowing = user?.followingStores.some(id => id.toString() === req.params.id) || false;
      isOwnStore = store.ownerId._id.toString() === req.user._id.toString();
    }

    console.log("Sending follow response:", { isFollowing, isOwnStore });

    res.json({
      isFollowing,
      isOwnStore,
    });
  } catch (error) {
    console.error("Error in follow-check route:", error);
    res.status(500).json({ error: error.message });
  }
});



// Update store
router.put("/:id", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    if (store.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = req.body;

    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    res.json(updatedStore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment store views
router.patch("/:id/views", async (req, res) => {
  try {
    const updatedStore = await Store.findByIdAndUpdate(
      req.params.id,
      { $inc: { "stats.views": 1 } },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.json({ views: updatedStore.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Upload profile image for store
router.put(
  "/:id/profile-image",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      if (store.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { profileImage } = req.body;

      if (!profileImage) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        { profileImage },
        { new: true }
      );

      res.json(updatedStore);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


router.get("/:storeId/item-count", async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    let count = 0;

    if (store.type === "product") {
      count = await Product.countDocuments({ storeId, isActive: true });
    } else if (store.type === "service") {
      count = await Service.countDocuments({ storeId, isActive: true });
    }

    res.json({ count });
  } catch (error) {
    console.error("Error fetching item count:", error);
    res.status(500).json({ error: "Failed to get active item count" });
  }
});

// Upload verification documents
router.put(
  "/:id/verification-docs",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const store = await Store.findById(req.params.id);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      if (store.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { idImages, addressVerificationImages } = req.body;
      const updates = {};

      if (idImages && Array.isArray(idImages)) {
        updates.idImages = idImages;
        updates.canReuploadDocs = false; // Lock re-upload after first submission
      }

      if (addressVerificationImages && Array.isArray(addressVerificationImages)) {
        updates.addressVerificationImages = addressVerificationImages;
        updates.canReuploadDocs = false; // Lock re-upload after first submission
      }

      // Reset verification status to pending when new documents are uploaded
      if (idImages || addressVerificationImages) {
        updates.isVerified = false;
      }

      const updatedStore = await Store.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.json(updatedStore);
    } catch (error) {
      console.error('Verification upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Toggle follow/unfollow a store
router.post("/:storeId/follow", authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user._id;

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Check if user is trying to follow their own store
    if (store.ownerId.toString() === userId.toString()) {
      return res.status(400).json({ error: "Cannot follow your own store" });
    }

    // Check if already following
    const user = await User.findById(userId);
    const isFollowing = user.followingStores.some(id => id.toString() === storeId);

    if (isFollowing) {
      // UNFOLLOW - Remove from both arrays
      user.followingStores = user.followingStores.filter(
        (id) => id.toString() !== storeId
      );
      store.followers = store.followers.filter(
        (id) => id.toString() !== userId.toString()
      );

      await user.save();
      store.stats.followersCount = store.followers.length;
      await store.save();

      res.status(200).json({
        message: "Store unfollowed successfully",
        followersCount: store.stats.followersCount,
        isFollowing: false,
      });
    } else {
      // FOLLOW - Add to both arrays
      user.followingStores.push(storeId);
      store.followers.push(userId);

      await user.save();
      store.stats.followersCount = store.followers.length;
      await store.save();

      res.status(200).json({
        message: "Store followed successfully",
        followersCount: store.stats.followersCount,
        isFollowing: true,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;
