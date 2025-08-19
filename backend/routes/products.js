import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import { authenticate, authorize, optionalAuth} from "../middleware/auth.js";
import { Console } from "console";
import { getUserPackage } from "../utils/getUserPackage.js";
import SearchHistory from "../models/SearchHistory.js";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/products"));
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

// Get all active products
router.get("/",optionalAuth, async (req, res) => {
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

      await saveSearchToHistory(req.user, search.trim());
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const products = await Product.find(query)
      .populate("storeId", "name type")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search/filter products via POST
router.post("/listing",optionalAuth, async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      childCategory,
      stock,
      rating,
      shipping,
      condition,
      warrantyMonths,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sortBy,
    } = req.body;

    console.log("Received search request:", {
      search,
      category,
      subcategory,
      childCategory,
      stock,
      rating,
      shipping,
      condition,
      warrantyMonths,
      minPrice,
      maxPrice,
      page,
      limit,
      sortBy,
    });

    // Build the base query
    const query = { isActive: true };

    // Category filters (hierarchical)
    if (childCategory) query.childCategory = childCategory;
    else if (subcategory) query.subcategory = subcategory;
    else if (category) query.category = category;

    // Stock filter
    if (stock) {
      if (stock === "in") {
        query.stock = { $gt: 0 }; // In stock: greater than 0
      }
      if (stock === "out") {
        query.stock = { $eq: 0 }; // Out of stock: exactly 0
      }
    }

    // Other filters
    if (rating) query.rating = { $gte: rating };
    if (shipping) query.shipping = shipping;
    if (condition) query.condition = condition;
    if (warrantyMonths) query.warrentyMonths = { $gte: warrantyMonths };

    // Search filter (title and description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];

      await saveSearchToHistory(req.user, search.trim());

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
    const [products, totalCount] = await Promise.all([
      // Get paginated products
      Product.find(query)
        .populate("storeId", "name type")
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(pageSize)
        .lean(), // Use lean() for better performance

      // Get total count for pagination info
      Product.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = pageNumber < totalPages;
    const hasPrevious = pageNumber > 1;

    // Enhanced response with pagination metadata
    const response = {
      products,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalProducts: totalCount,
        productsPerPage: pageSize,
        hasMore,
        hasPrevious,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, totalCount),
      },
      // Legacy support for frontend
      total: totalCount,
      hasMore,
      // Performance metrics (optional - remove in production)
      meta: {
        query: query,
        executionTime: new Date(),
        resultsFound: products.length,
      },
    };

    console.log("Returning results:", {
      productsCount: products.length,
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
      details: "An error occurred while fetching products",
    });
  }
});

router.post("/sale-listing", async (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      childCategory,
      stock,
      rating,
      shipping,
      condition,
      warrantyMonths,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.body;

    console.log("Received search request:", {
      search,
      category,
      subcategory,
      childCategory,
      stock,
      rating,
      shipping,
      condition,
      warrantyMonths,
      minPrice,
      maxPrice,
      page,
      limit,
    });

    // Build the base query
    const query = { isActive: true };

    // Category filters (hierarchical)
    if (childCategory) query.childCategory = childCategory;
    else if (subcategory) query.subcategory = subcategory;
    else if (category) query.category = category;

    // Stock filter
    if (stock) {
      if (stock === "in") {
        query.stock = { $gt: 0 }; // In stock: greater than 0
      }
      if (stock === "out") {
        query.stock = { $eq: 0 }; // Out of stock: exactly 0
      }
    }

    // Other filters
    if (rating) query.rating = { $gte: rating };
    if (shipping) query.shipping = shipping;
    if (condition) query.condition = condition;
    if (warrantyMonths) query.warrentyMonths = { $gte: warrantyMonths };

    // Search filter (title and description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];

      await saveSearchToHistory(req.user, search.trim());
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
    const [products, totalCount] = await Promise.all([
      // Get paginated products sorted by discount (highest first)
      Product.find(query)
        .populate("storeId", "name type")
        .sort({ discount: -1, createdAt: -1 }) // Sort by highest discount first, then newest
        .skip(skip)
        .limit(pageSize)
        .lean(), // Use lean() for better performance

      // Get total count for pagination info
      Product.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasMore = pageNumber < totalPages;
    const hasPrevious = pageNumber > 1;

    // Enhanced response with pagination metadata
    const response = {
      products,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalProducts: totalCount,
        productsPerPage: pageSize,
        hasMore,
        hasPrevious,
        startIndex: skip + 1,
        endIndex: Math.min(skip + pageSize, totalCount),
      },
      // Legacy support for frontend
      total: totalCount,
      hasMore,
      // Performance metrics (optional - remove in production)
      meta: {
        query: query,
        executionTime: new Date(),
        resultsFound: products.length,
      },
    };

    console.log("Returning results:", {
      productsCount: products.length,
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
      details: "An error occurred while fetching products",
    });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { "stats.views": 1 } }, // increment views
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
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
      stock,
      images,
      variants,
      isPreorder = false,
      shipping,
      condition,
      warrentyMonths = 0,
      discount = 0,
      tags = [],
    } = req.body;

    // Verify store ownership
    const store = await Store.findOne({
      ownerId: req.user._id,
      type: "product",
      isActive: true,
    });

    if (!store) {
      return res.status(403).json({
        error:
          "Product store not found. You need a product store to create products.",
      });
    }

    // Check Limits
    const userId = req.user._id;
    const userPackage = await getUserPackage(userId);

    const currentItemCount = await Product.countDocuments({
      ownerId: userId,
      isActive: true,
    });

    if (currentItemCount >= userPackage.items) {
      return res.status(403).json({
        error: `Item limit reached for your ${userPackage.name} plan`,
      });
    }

    if (variants && variants.length > 0 && !userPackage.itemVariant) {
      return res
        .status(403)
        .json({ error: "Your current plan does not allow item variants" });
    }

    // Calculate total stock
    let totalStock = 0;
    if (variants && variants.length > 0) {
      totalStock = variants.reduce(
        (acc, variant) => acc + (parseInt(variant.stock) || 0),
        0
      );
    } else {
      totalStock = parseInt(stock) || 0;
    }

    const product = new Product({
      title,
      description,
      price: parseFloat(price),
      oldPrice: oldPrice ? parseFloat(oldPrice) : undefined,
      category: category || "",
      subcategory: subcategory || "",
      childCategory: childCategory || "",
      stock: totalStock,
      images,
      isPreorder,
      shipping: shipping || "",
      condition: condition || "",
      warrentyMonths: parseInt(warrentyMonths) || 0,
      orderCount: 0,
      storeId: store._id,
      ownerId: req.user._id,
      variants: variants && variants.length > 0 ? variants : [],
      discount: discount || 0,
      tags: tags || [],
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put("/:id", authenticate, authorize("store_owner"), async (req, res) => {
  console.log("Received update request for product:", req.params.id);
  console.log("Request body:", req.body);
  try {
    const product = await Product.findById(req.params.id).populate("storeId");

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.storeId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete(
  "/:id",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).populate("storeId");

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.storeId.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }

      await Product.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/products/impression
router.post("/impression", async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId)
      return res.status(400).json({ message: "Product ID required" });

    await Product.findByIdAndUpdate(
      productId,
      { $inc: { "stats.impressions": 1 } } // increment impressions
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const saveSearchToHistory = async (user, query) => {
  try {
    // Don't save empty or very short queries
    if (!query || query.length < 3) return;
    
    let searchHistory;
    
    if (user.isGuest) {
      // Check if this exact query already exists for this guest recently (last 24 hours)
      const existingSearch = await SearchHistory.findOne({
        guestId: user.guestId,
        query: query,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      if (!existingSearch) {
        searchHistory = await SearchHistory.create({
          guestId: user.guestId,
          query: query
        });
      }
    } else {
      // Check if this exact query already exists for this user recently (last 24 hours)
      const existingSearch = await SearchHistory.findOne({
        userId: user._id,
        query: query,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      if (!existingSearch) {
        searchHistory = await SearchHistory.create({
          userId: user._id,
          query: query
        });
        
        // Add to user's searchHistory array
        await User.findByIdAndUpdate(
          user._id,
          { $push: { searchHistory: searchHistory._id } }
        );
      }
    }
  } catch (error) {
    // Don't let search history errors break the search functionality
    console.error("Error saving search history:", error);
  }
};

export default router;
