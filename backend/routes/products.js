import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { Console } from "console";
import { getUserPackage } from "../utils/getUserPackage.js";

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

    const products = await Product.find(query)
      .populate("storeId", "name type")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search/filter products via POST
router.post("/listing", async (req, res) => {
  try {
    const { category, subcategory, childCategory, search, minPrice, maxPrice } =
      req.body;

    console.log("Received search request:", {
      category,
      subcategory,
      childCategory,
      search,
      minPrice,
      maxPrice,
    });

    const query = { isActive: true };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (childCategory) query.childCategory = childCategory;

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

    const products = await Product.find(query)
      .populate("storeId", "name type")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "storeId",
      "name type ownerId profileImage"
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

export default router;
