import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";

import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Store from "../models/Store.js";
import Subscription from "../models/Subscription.js";
import Package from "../models/Package.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/users"));
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

// Get all users with optional filters
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }); // sort by newest first (optional)

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put(
  "/profile",
  authenticate,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const updates = req.body;

      if (req.file) {
        updates.profileImage = `/uploads/users/${req.file.filename}`;
      }

      // Validate email format
      if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Check if email is already taken by another user
      if (updates.email && updates.email !== req.user.email) {
        const existingUser = await User.findOne({ email: updates.email });
        if (existingUser) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/usage-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Store
    const store = await Store.findOne({ ownerId: userId });
    if (!store) return res.status(404).json({ error: "Store not found" });

    const storeId = store._id;

    // 2. Active products & services
    const products = await Product.find({ storeId, isActive: true });
    const services = await Service.find({ storeId, isActive: true });

    // 3. Count
    const productCount = products.length;
    const serviceCount = services.length;
    const productImageCount = products.reduce(
      (max, p) => Math.max(max, p.images?.length || 0),
      0
    );
    const serviceImageCount = services.reduce(
      (max, s) => Math.max(max, s.images?.length || 0),
      0
    );
    const headerImagesCount = store.heroImages?.length || 0;

    // 4. Variant check
    const hasVariants =
      products.some(
        (p) =>
          (p.variants?.colors?.length || 0) > 0 ||
          (p.variants?.sizes?.length || 0) > 0
      ) ||
      services.some(
        (s) =>
          (s.variants?.colors?.length || 0) > 0 ||
          (s.variants?.sizes?.length || 0) > 0
      );

    // 5. Plan details
    const subscription = await Subscription.findOne({ storeId });
    const userPackage = subscription
      ? await Package.findOne({ name: subscription.package })
      : null;

    // Set fallback limits if no package (free tier or none)
    const limits = userPackage || {
      items: 0,
      itemVariants: false,
      itemImages: 0,
      headerImages: 0,
    };

    // 6. Limit checks
    const isProductLimitReached = productCount >= limits.items;
    const isServiceLimitReached = serviceCount >= limits.items;
    const isHeaderImageLimitReached = headerImagesCount >= limits.headerImages;
    const isProductImageLimitReached = productImageCount >= limits.itemImages;
    const isServiceImageLimitReached = serviceImageCount >= limits.itemImages;
    const isVariantAllowedViolated = hasVariants && !limits.itemVariants;

    // 7. Final response
    res.json({
      planInfo: userPackage?.name || "none",
      storeId,
      usageInfo: {
        productsInfo: {
          count: productCount,
          images: productImageCount,
          limitReached: isProductLimitReached,
          imageLimitReached: isProductImageLimitReached,
        },
        servicesInfo: {
          count: serviceCount,
          images: serviceImageCount,
          limitReached: isServiceLimitReached,
          imageLimitReached: isServiceImageLimitReached,
        },
        headerImagesInfo: {
          count: headerImagesCount,
          limitReached: isHeaderImageLimitReached,
        },
        variantsInfo: {
          used: hasVariants,
          allowed: limits.itemVariants,
          violated: isVariantAllowedViolated,
        },
      },
      limitsInfo: limits,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch usage summary" });
  }
});

// Upload verification document for COD eligibility (Firebase URL)
router.post(
  "/upload-verification",
  authenticate,
  async (req, res) => {
    try {
      const { idDocumentUrl, originalName, size } = req.body;

      if (!idDocumentUrl) {
        return res.status(400).json({ error: "Please provide an ID document URL" });
      }

      if (req.user.verificationStatus === "verified") {
        return res.status(400).json({ error: "You are already verified" });
      }

      if (req.user.verificationStatus === "pending") {
        return res.status(400).json({ 
          error: "Your verification is already under review. Please wait for approval." 
        });
      }

      // Validate Firebase URL format
      if (!idDocumentUrl.includes('firebase') || !idDocumentUrl.includes('id-documents')) {
        return res.status(400).json({ error: "Invalid document URL format" });
      }

      // Validate file size if provided (max 5MB)
      if (size && size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "File size must be less than 5MB" });
      }

      // Update user with verification document and status
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          idDocument: idDocumentUrl,
          verificationStatus: "pending",
          verificationSubmittedAt: new Date(),
        },
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Verification document uploaded successfully. Your request is under review.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Verification upload error:", error);
      res.status(500).json({ error: "Failed to upload verification document" });
    }
  }
);

// Get verification status
router.get("/verification-status", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "verificationStatus idDocument verificationSubmittedAt"
    );
    
    res.json({
      verificationStatus: user.verificationStatus,
      hasDocument: !!user.idDocument,
      submittedAt: user.verificationSubmittedAt,
      canUseCOD: user.verificationStatus === "verified",
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
});

export default router;
