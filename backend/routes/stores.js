import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { Console } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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

    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    // Get store products or services
    let listings = [];
    if (store.type === "product") {
      listings = await Product.find({ storeId: store._id, isActive: true });
      console.log("Found products:", listings.length);
    } else {
      listings = await Service.find({ storeId: store._id, isActive: true });
      console.log("Found services:", listings.length);
    }

    console.log("Sending response with store and listings");
    res.json({ store, listings });
  } catch (error) {
    console.error("Error in store route:", error);
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

      const { name, type, description, themeColor, contactInfo, heroImages } =
        req.body;
      const timeSlots = req.body.timeSlots || [];

      const store = new Store({
        name,
        type,
        description,
        themeColor,
        heroImages,
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

    //if (updates.contactInfo) {
    //updates.contactInfo = JSON.parse(updates.contactInfo);
    //}

    const updatedStore = await Store.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    res.json(updatedStore);
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
// Get featured stores
router.get("/featured/list", async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .populate("ownerId", "name")
      .sort({ rating: -1, totalSales: -1 })
      .limit(6);

    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
