import User from "../models/User.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Subscription from "../models/Subscription.js";
import Package from "../models/Package.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";

class UserController {
  async getAllUsers(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { search } = req.query;
      let query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query).sort({ createdAt: -1 });

      res.json(successResponse(users));
    } catch (error) {
      logger.error("Error fetching users", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getUserProfile(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const user = await User.findById(req.user._id).select("-password");
      res.json(successResponse(user));
    } catch (error) {
      logger.error("Error fetching user profile", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async updateUserProfile(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const updates = req.body;

      if (req.file) {
        updates.profileImage = `/uploads/users/${req.file.filename}`;
      }

      if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json(errorResponse("Invalid email format", 400));
      }

      if (updates.email && updates.email !== req.user.email) {
        const existingUser = await User.findOne({ email: updates.email });
        if (existingUser) {
          return res.status(400).json(errorResponse("Email already in use", 400));
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json(errorResponse("User not found", 404));
      }

      res.json(successResponse(user, "Profile updated successfully"));
    } catch (error) {
      logger.error("Profile update error", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  async getUsageSummary(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;

      const store = await Store.findOne({ ownerId: userId });
      if (!store) {
        return res.status(404).json(errorResponse("Store not found", 404));
      }

      const storeId = store._id;

      const products = await Product.find({ storeId, isActive: true });

      const productCount = products.length;
      const productImageCount = products.reduce(
        (max, p) => Math.max(max, p.images?.length || 0),
        0
      );
      const headerImagesCount = store.heroImages?.length || 0;

      const hasVariants = products.some(
        (p) =>
          (p.variants?.colors?.length || 0) > 0 ||
          (p.variants?.sizes?.length || 0) > 0
      );

      const subscription = await Subscription.findOne({ storeId });
      const userPackage = subscription
        ? await Package.findOne({ name: subscription.package })
        : null;

      const limits = userPackage || {
        items: 0,
        itemVariants: false,
        itemImages: 0,
        headerImages: 0,
      };

      const isProductLimitReached = productCount >= limits.items;
      const isHeaderImageLimitReached = headerImagesCount >= limits.headerImages;
      const isProductImageLimitReached = productImageCount >= limits.itemImages;
      const isVariantAllowedViolated = hasVariants && !limits.itemVariants;

      res.json(successResponse({
        planInfo: userPackage?.name || "none",
        storeId,
        usageInfo: {
          productsInfo: {
            count: productCount,
            images: productImageCount,
            limitReached: isProductLimitReached,
            imageLimitReached: isProductImageLimitReached,
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
      }));
    } catch (err) {
      logger.error("Failed to fetch usage summary", err);
      res.status(500).json(errorResponse("Failed to fetch usage summary"));
    }
  }

  async uploadVerification(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const { idDocumentUrl, originalName, size } = req.body;

      if (!idDocumentUrl) {
        return res.status(400).json(errorResponse("Please provide an ID document URL", 400));
      }

      if (req.user.verificationStatus === "verified") {
        return res.status(400).json(errorResponse("You are already verified", 400));
      }

      if (req.user.verificationStatus === "pending") {
        return res.status(400).json(errorResponse(
          "Your verification is already under review. Please wait for approval.",
          400
        ));
      }

      if (!idDocumentUrl.includes('firebase') || !idDocumentUrl.includes('id-documents')) {
        return res.status(400).json(errorResponse("Invalid document URL format", 400));
      }

      if (size && size > 5 * 1024 * 1024) {
        return res.status(400).json(errorResponse("File size must be less than 5MB", 400));
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          idDocument: idDocumentUrl,
          verificationStatus: "pending",
          verificationSubmittedAt: new Date(),
        },
        { new: true }
      ).select("-password");

      res.json(successResponse(
        { user: updatedUser },
        "Verification document uploaded successfully. Your request is under review."
      ));
    } catch (error) {
      logger.error("Verification upload error", error);
      res.status(500).json(errorResponse("Failed to upload verification document"));
    }
  }

  async getVerificationStatus(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const user = await User.findById(req.user._id).select(
        "verificationStatus idDocument verificationSubmittedAt"
      );
      
      res.json(successResponse({
        verificationStatus: user.verificationStatus,
        hasDocument: !!user.idDocument,
        submittedAt: user.verificationSubmittedAt,
        canUseCOD: user.verificationStatus === "verified",
      }));
    } catch (error) {
      logger.error("Error fetching verification status", error);
      res.status(500).json(errorResponse("Failed to fetch verification status"));
    }
  }
}

export default new UserController();