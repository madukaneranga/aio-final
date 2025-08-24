import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { contactRevealLimits } from "../middleware/rateLimiter.js";
import ContactReveal from "../models/ContactReveal.js";
import Wallet from "../models/Wallet.js";
import Store from "../models/Store.js";

const router = express.Router();

// Contact reveal endpoint - main functionality
router.post(
  "/stores/:storeId/reveal-contact",
  authenticate,
  authorize("customer", "store_owner"),
  contactRevealLimits, // Apply rate limiting
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const userId = req.user._id;
      const { recaptchaToken } = req.body;

      // Validate reCAPTCHA token (if implemented)
      if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
        const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}&remoteip=${req.ip}`
        });
        
        const recaptchaResult = await recaptchaResponse.json();
        if (!recaptchaResult.success) {
          return res.status(400).json({
            success: false,
            message: "reCAPTCHA verification failed. Please try again.",
          });
        }
      }

      // Check if store exists
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Check if user can reveal (dedupe check - 24 hour window)
      const canReveal = await ContactReveal.canUserReveal(userId, storeId);
      if (!canReveal) {
        return res.status(400).json({
          success: false,
          message: "You have already revealed this store's contact details today. Please try again tomorrow.",
          nextAvailableTime: "24 hours",
        });
      }

      // Get user's wallet
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      const requiredCredits = 1; // 1 credit per reveal
      
      // Check if user has sufficient credits
      if (wallet.credits.balance < requiredCredits) {
        return res.status(402).json({ // 402 Payment Required
          success: false,
          message: "Insufficient credits to reveal contact details",
          required: requiredCredits,
          available: wallet.credits.balance,
          canPurchaseWithWallet: wallet.balance.availableBalance >= 10, // LKR 10 per credit
        });
      }

      // Use credits for reveal
      const creditTransaction = await wallet.useCredits(
        requiredCredits, 
        `Contact reveal for ${store.name}`,
        null // We'll set this after creating the reveal
      );

      // Create reveal record
      const revealData = {
        userId,
        storeId,
        walletTransactionId: creditTransaction._id,
        unitCredits: requiredCredits,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          referer: req.get('Referer'),
        },
      };

      const reveal = await ContactReveal.createReveal(revealData);

      // Update the credit transaction with reveal ID
      creditTransaction.creditDetails.relatedRevealId = reveal._id;
      await creditTransaction.save();

      // Return contact details
      const contactDetails = {
        email: store.contactInfo?.email,
        phone: store.contactInfo?.phone,
        whatsapp: store.contactInfo?.whatsapp,
        address: store.contactInfo?.address,
      };

      // Store contact details in reveal record for audit
      reveal.contactDetails = contactDetails;
      await reveal.save();

      res.json({
        success: true,
        message: "Contact details revealed successfully",
        data: {
          contactDetails,
          creditsUsed: requiredCredits,
          remainingCredits: wallet.credits.balance - requiredCredits,
          revealId: reveal._id,
        },
      });

    } catch (error) {
      console.error("Contact reveal error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reveal contact details",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// Get user's reveal history
router.get(
  "/my-reveals",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      const result = await ContactReveal.getUserHistory(userId, parseInt(page), parseInt(limit));

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get reveal history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch reveal history",
      });
    }
  }
);

// Get store reveal analytics (for store owners)
router.get(
  "/stores/:storeId/reveals",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { period = 'month', page = 1, limit = 20 } = req.query;
      const userId = req.user._id;

      // Verify store ownership
      const store = await Store.findOne({ _id: storeId, ownerId: userId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found or access denied",
        });
      }

      // Get analytics
      const analytics = await ContactReveal.getStoreAnalytics(storeId, period);

      // Get recent reveals with user info
      const skip = (page - 1) * limit;
      const recentReveals = await ContactReveal.find({ storeId, status: 'completed' })
        .populate('revealedByUserId', 'name email')
        .sort({ revealedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalReveals = await ContactReveal.countDocuments({ storeId });

      res.json({
        success: true,
        data: {
          analytics,
          recentReveals,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalReveals,
            pages: Math.ceil(totalReveals / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get store reveals error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch store reveal data",
      });
    }
  }
);

// Check if user can reveal a specific store (used by frontend)
router.get(
  "/stores/:storeId/can-reveal",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const userId = req.user._id;

      // Check if store exists
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Check dedupe
      const canReveal = await ContactReveal.canUserReveal(userId, storeId);
      
      // Get user's wallet info
      const wallet = await Wallet.getOrCreateWallet(userId);
      const requiredCredits = 1;
      const hasCredits = wallet.credits.balance >= requiredCredits;

      res.json({
        success: true,
        data: {
          canReveal: canReveal && hasCredits,
          reasons: {
            alreadyRevealed: !canReveal,
            insufficientCredits: !hasCredits,
          },
          userCredits: wallet.credits.balance,
          requiredCredits,
          canPurchaseCredits: wallet.balance.availableBalance >= 10,
        },
      });
    } catch (error) {
      console.error("Check reveal eligibility error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check reveal eligibility",
      });
    }
  }
);

export default router;