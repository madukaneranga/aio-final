import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/services"));
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

// Get all services
router.get("/", async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, storeId } = req.query;
    let query = { isActive: true };

    if (category) query.category = category;
    if (storeId) query.storeId = storeId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const services = await Service.find(query)
      .populate("storeId", "name type")
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service by ID
router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "storeId",
      "name type ownerId profileImage"
    );

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create service
router.post("/", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      priceType,
      category,
      duration,
      availability,
      images,
    } = req.body;

    // Verify store ownership
    const store = await Store.findOne({
      ownerId: req.user._id,
      type: "service",
    });
    if (!store) {
      return res.status(403).json({
        error:
          "Service store not found. You need a service store to create services.",
      });
    }

    // Parse timeSlots if provided
    const timeSlots = Array.isArray(req.body.timeSlots)
      ? req.body.timeSlots
      : [];

    const service = new Service({
      title,
      description,
      price: parseFloat(price),
      priceType,
      images,
      category,
      duration: parseInt(duration),
      timeSlots,
      ownerId: req.user._id,
      storeId: store._id,
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put("/:id", authenticate, authorize("store_owner"), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate("storeId");

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.storeId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = req.body;

    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.duration !== undefined)
      updates.duration = parseInt(updates.duration);

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete service
router.delete(
  "/:id",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const service = await Service.findById(req.params.id).populate("storeId");

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (service.storeId.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      await Service.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
