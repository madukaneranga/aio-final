import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getUserPackage } from "../utils/getUserPackage.js";

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
// Get all active services
router.get("/", async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, storeId } = req.query;
    let query = { isActive: true };

    console.log("Received search request:", {
      category,
      search,
      minPrice,
      maxPrice,
      storeId,
    });

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

// Search/filter services via POST
router.post("/listing", async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      childCategory,
      rating,
      minPrice,
      maxPrice,
      duration,
      page = 1,
      limit = 20,
    } = req.body;

    console.log("Received search request:", {
      search,
      category,
      subcategory,
      childCategory,
      rating,
      minPrice,
      maxPrice,
      duration,
      page,
      limit,
    });

    // Build the base query
    const query = { isActive: true };

    // Category filters (hierarchical)
    if (childCategory) query.childCategory = childCategory;
    else if (subcategory) query.subcategory = subcategory;
    else if (category) query.category = category;

    // Other filters
    if (rating) query.rating = { $gte: rating };
    if (duration) query.duration = { $lte: parseFloat(duration) };

    // Search filter (title and description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Calculate pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    console.log("Executing query:", JSON.stringify(query, null, 2));
    console.log("Pagination:", { page: pageNumber, limit: pageSize, skip });

    // Execute queries in parallel for better performance
    const [services, totalCount] = await Promise.all([
      // Get paginated services
      Service.find(query)
        .populate("storeId", "name type")
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(pageSize)
        .lean(), // Use lean() for better performance

      // Get total count for pagination info
      Service.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = pageNumber < totalPages;
    const hasPrevious = pageNumber > 1;

    // Enhanced response with pagination metadata
    const response = {
      services,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalServices: totalCount,
        servicesPerPage: pageSize,
        hasMore,
        hasPrevious,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, totalCount),
      },
      // Legacy support for frontend
      total: totalCount,
      hasMore,
      // Performance metrics (optional - remove in serviceion)
      meta: {
        query: query,
        executionTime: new Date(),
        resultsFound: services.length,
      },
    };

    console.log("Returning results:", {
      servicesCount: services.length,
      totalCount,
      currentPage: pageNumber,
      totalPages,
      hasMore,
    });

    res.json(response);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: error.message,
      details: "An error occurred while fetching services",
    });
  }
});

// Get service by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const service = await Service.findByIdAndUpdate(
      id,
      { $inc: { "stats.views": 1 } }, // increment views
      { new: true }
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
      oldPrice,
      category,
      subcategory,
      childCategory,
      duration,
      images,
    } = req.body;

    // Verify store ownership
    const store = await Store.findOne({
      ownerId: req.user._id,
      type: "service",
      isActive: true,
    });

    if (!store) {
      return res.status(403).json({
        error:
          "Service store not found. You need a service store to create services.",
      });
    }

    //Check Limits
    const userId = req.user._id;
    const userPackage = await getUserPackage(userId);

    const currentItemCount = await Service.countDocuments({
      ownerId: userId,
      isActive: true,
    });

    if (currentItemCount >= userPackage.items) {
      return res.status(403).json({
        error: `Item limit reached for your ${userPackage.name} plan`,
      });
    }

    const service = new Service({
      title,
      description,
      price: parseFloat(price),
      oldPrice: oldPrice ? parseFloat(oldPrice) : null, // or undefined
      images,
      category,
      subcategory,
      childCategory,
      duration: parseInt(duration),
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

// POST /api/services/impression
router.post("/impression", async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ message: "Service ID required" });

    await Service.findByIdAndUpdate(
      serviceId,
      { $inc: { "stats.impressions": 1 } } // increment impressions
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
