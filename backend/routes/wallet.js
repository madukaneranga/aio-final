import express from "express";
const router = express.Router();
import WalletTransaction from "../models/WalletTransaction.js";
import Wallet from "../models/Wallet.js";
import BankDetails from "../models/BankDetails.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import { emitNotification } from "../utils/socketUtils.js";
import Notification from "../models/Notification.js";

// Custom validation functions
const validateWithdrawalRequest = (data) => {
  const errors = [];

  if (
    !data.amount ||
    typeof data.amount !== "number" ||
    data.amount < 2000 ||
    data.amount > 150000
  ) {
    errors.push("Amount must be a number between 2000 and 150000");
  }

  if (!data.bankAccountId || typeof data.bankAccountId !== "string") {
    errors.push("Bank account ID is required");
  }

  return errors;
};

const validateBankDetails = (data) => {
  const errors = [];

  if (
    !data.accountHolderName ||
    typeof data.accountHolderName !== "string" ||
    data.accountHolderName.trim().length === 0 ||
    data.accountHolderName.length > 100
  ) {
    errors.push(
      "Account holder name is required and must be less than 100 characters"
    );
  }

  if (
    !data.bankName ||
    typeof data.bankName !== "string" ||
    data.bankName.trim().length === 0 ||
    data.bankName.length > 100
  ) {
    errors.push("Bank name is required and must be less than 100 characters");
  }

  if (
    !data.accountNumber ||
    typeof data.accountNumber !== "string" ||
    data.accountNumber.trim().length === 0 ||
    data.accountNumber.length > 20
  ) {
    errors.push(
      "Account number is required and must be less than 20 characters"
    );
  }

  if (
    !data.routingNumber ||
    typeof data.routingNumber !== "string" ||
    data.routingNumber.trim().length === 0 ||
    data.routingNumber.length > 15
  ) {
    errors.push(
      "Routing number is required and must be less than 15 characters"
    );
  }

  if (
    !data.branchName ||
    typeof data.branchName !== "string" ||
    data.branchName.trim().length === 0 ||
    data.branchName.length > 100
  ) {
    errors.push("Branch name is required and must be less than 100 characters");
  }

  if (
    data.branchCode &&
    (typeof data.branchCode !== "string" || data.branchCode.length > 10)
  ) {
    errors.push("Branch code must be less than 10 characters");
  }

  if (
    data.accountType &&
    !["savings", "checking", "business"].includes(data.accountType)
  ) {
    errors.push("Account type must be savings, checking, or business");
  }

  return errors;
};

// Generate unique transaction ID
const generateTransactionId = (prefix = "TX", userId = "") =>
  `${prefix}-${Date.now()}-${userId}-${uuidv4()}`;

// Get wallet summary
router.get(
  "/summary",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;

      // Get or create wallet and update with latest transactions
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      res.json({
        success: true,
        data: wallet.getSummary(),
      });
    } catch (error) {
      console.error("Get wallet summary error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wallet summary",
      });
    }
  }
);

// Get full wallet details (extended endpoint)
router.get(
  "/details",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      console.error("Get wallet details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wallet details",
      });
    }
  }
);

// Get transaction history
router.get(
  "/transactions",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const {
        page = 1,
        limit = 10,
        type,
        status,
        startDate,
        endDate,
      } = req.query;

      const query = { userId };

      if (type) query.type = type;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await WalletTransaction.find(query)
        .populate("withdrawalDetails.bankAccountId")
        .populate("withdrawalDetails.processedBy", "name")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await WalletTransaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get transaction history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction history",
      });
    }
  }
);

// Request withdrawal
router.post(
  "/withdraw",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const validationErrors = validateWithdrawalRequest(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors[0],
        });
      }

      const userId = req.user._id;
      const { amount, bankAccountId } = req.body;

      // Check if there's already a pending withdrawal request
      const pendingWithdrawal = await WalletTransaction.findOne({
        userId,
        type: "withdrawal",
        status: { $in: ["pending", "approved", "processing"] },
      });

      if (pendingWithdrawal) {
        return res.status(400).json({
          success: false,
          message:
            "You already have a pending withdrawal request. Please wait for it to be processed.",
        });
      }

      // Get wallet and check limits
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      // Check monthly withdrawal limit
      if (wallet.withdrawalInfo.monthlyWithdrawals >= wallet.withdrawalInfo.monthlyLimit) {
        return res.status(400).json({
          success: false,
          message: `Monthly withdrawal limit (${wallet.withdrawalInfo.monthlyLimit}) exceeded`,
        });
      }

      // Check available balance
      if (wallet.balance.availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      // Verify bank account exists and belongs to store
      const bankAccount = await BankDetails.findOne({
        _id: bankAccountId,
        userId,
        isActive: true,
      });

      if (!bankAccount) {
        return res.status(400).json({
          success: false,
          message: "Invalid bank account",
        });
      }

      const withdrawId = generateTransactionId("WD", req.user._id);
      // Create withdrawal transaction
      const transaction = new WalletTransaction({
        userId,
        transactionId: withdrawId,
        type: "withdrawal",
        amount,
        status: "pending",
        description: `Withdrawal request to ${bankAccount.bankName}`,
        withdrawalDetails: {
          requestedAt: new Date(),
          bankAccountId,
        },
      });

      await transaction.save();

      // Update wallet with new pending withdrawal
      wallet.balance.pendingWithdrawals += amount;
      wallet.withdrawalInfo.monthlyWithdrawals += 1;
      wallet.withdrawalInfo.totalWithdrawalRequests += 1;
      wallet.withdrawalInfo.lastWithdrawalDate = new Date();
      await wallet.save();

      // Notify store owner about the withdrawal request
      const storeNotification = await Notification.create({
        userId: req.user._id,
        title: `Withdrawal Requested`,
        userType: "store_owner",
        body: `You have submitted a new withdrawal request with ID #${withdrawId
          .toString()
          .slice(-8)}`,
        type: "withdrawal_update",
      });

      emitNotification(req.user._id.toString(), storeNotification);

      res.status(201).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        data: transaction,
      });
    } catch (error) {
      console.error("Request withdrawal error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process withdrawal request",
      });
    }
  }
);

// Get bank details
router.get(
  "/bank-details",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const bankDetails = await BankDetails.findOne({ userId, isActive: true });

      res.json({
        success: true,
        data: bankDetails,
      });
    } catch (error) {
      console.error("Get bank details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch bank details",
      });
    }
  }
);

// Update bank details
router.put(
  "/bank-details",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const validationErrors = validateBankDetails(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: validationErrors[0],
        });
      }

      const userId = req.user._id;
      const bankData = {
        accountHolderName: req.body.accountHolderName?.trim(),
        bankName: req.body.bankName?.trim(),
        accountNumber: req.body.accountNumber?.trim(),
        routingNumber: req.body.routingNumber?.trim(),
        branchName: req.body.branchName?.trim(),
        branchCode: req.body.branchCode?.trim() || "",
        accountType: req.body.accountType || "savings",
      };

      const bankDetails = await BankDetails.findOneAndUpdate(
        { userId },
        { ...bankData, userId, isVerified: false },
        { new: true, upsert: true }
      );

      res.json({
        success: true,
        message: "Bank details updated successfully",
        data: bankDetails,
      });
    } catch (error) {
      console.error("Update bank details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update bank details",
      });
    }
  }
);

// Update wallet settings
router.put(
  "/settings",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { autoWithdrawal, notifications } = req.body;

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // Update auto withdrawal settings
      if (autoWithdrawal) {
        wallet.settings.autoWithdrawal = {
          ...wallet.settings.autoWithdrawal,
          ...autoWithdrawal,
        };
      }

      // Update notification settings
      if (notifications) {
        wallet.settings.notifications = {
          ...wallet.settings.notifications,
          ...notifications,
        };
      }

      await wallet.save();

      res.json({
        success: true,
        message: "Wallet settings updated successfully",
        data: wallet.settings,
      });
    } catch (error) {
      console.error("Update wallet settings error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update wallet settings",
      });
    }
  }
);

// Get wallet analytics/statistics
router.get(
  "/analytics",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { period = "month" } = req.query; // month, year, all

      const wallet = await Wallet.getOrCreateWallet(userId);
      
      // Get transaction analytics based on period
      let startDate;
      const now = new Date();
      
      switch (period) {
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "month":
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const analytics = await WalletTransaction.aggregate([
        {
          $match: {
            userId: wallet.userId,
            createdAt: period === "all" ? { $exists: true } : { $gte: startDate },
            status: "completed",
          },
        },
        {
          $group: {
            _id: {
              type: "$type",
              day: period === "month" ? { $dayOfMonth: "$createdAt" } : null,
              month: period === "year" ? { $month: "$createdAt" } : null,
            },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.day": 1, "_id.month": 1 },
        },
      ]);

      res.json({
        success: true,
        data: {
          wallet: wallet.getSummary(),
          analytics,
          period,
        },
      });
    } catch (error) {
      console.error("Get wallet analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch wallet analytics",
      });
    }
  }
);

// Credit management constants
const CREDIT_PACKAGES = {
  pack_100: { credits: 100, price: 1000, discount: 0 },
  pack_500: { credits: 500, price: 4500, discount: 10 },
  pack_2000: { credits: 2000, price: 16000, discount: 20 }
};

// Get available credit packages
router.get(
  "/credits/packages",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      // Calculate which packages user can afford with wallet balance
      const packagesWithAffordability = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
        id: key,
        ...pkg,
        canAffordWithWallet: wallet.balance.availableBalance >= pkg.price,
        walletCoverage: Math.min(100, (wallet.balance.availableBalance / pkg.price) * 100),
      }));
      
      res.json({
        success: true,
        data: {
          packages: packagesWithAffordability,
          walletBalance: wallet.balance.availableBalance,
          currentCredits: wallet.credits.balance,
        },
      });
    } catch (error) {
      console.error("Get credit packages error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch credit packages",
      });
    }
  }
);

// Purchase credits using wallet balance
router.post(
  "/credits/purchase",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { packageId } = req.body;
      
      if (!packageId || !CREDIT_PACKAGES[packageId]) {
        return res.status(400).json({
          success: false,
          message: "Invalid package ID",
        });
      }
      
      const pkg = CREDIT_PACKAGES[packageId];
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      // Check if user has sufficient wallet balance
      if (wallet.balance.availableBalance < pkg.price) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
          required: pkg.price,
          available: wallet.balance.availableBalance,
        });
      }
      
      // Purchase credits using wallet balance
      const transaction = await wallet.purchaseCredits(pkg.credits, pkg.price, packageId);
      
      // Refresh wallet data
      await wallet.updateBalanceFromTransactions();
      
      res.json({
        success: true,
        message: `Successfully purchased ${pkg.credits} credits`,
        data: {
          transaction,
          newCreditBalance: wallet.credits.balance,
          newWalletBalance: wallet.balance.availableBalance,
        },
      });
    } catch (error) {
      console.error("Purchase credits error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to purchase credits",
      });
    }
  }
);

// Get credit balance and history
router.get(
  "/credits",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;
      
      const wallet = await Wallet.getOrCreateWallet(userId);
      
      // Get credit transaction history
      const skip = (page - 1) * limit;
      const creditTransactions = await WalletTransaction.find({
        userId,
        type: { $in: ["credit_purchase", "credit_usage"] },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('creditDetails.relatedRevealId', 'storeId');
      
      const total = await WalletTransaction.countDocuments({
        userId,
        type: { $in: ["credit_purchase", "credit_usage"] },
      });
      
      res.json({
        success: true,
        data: {
          credits: wallet.credits,
          walletBalance: wallet.balance.availableBalance,
          transactions: creditTransactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get credits error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch credit information",
      });
    }
  }
);

// ===== CUSTOMER-SPECIFIC WALLET ENDPOINTS =====

// Get customer's credit balance only (no sensitive wallet data)
router.get(
  "/customer/credits",
  authenticate,
  authorize("customer"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const wallet = await Wallet.getOrCreateWallet(userId);

      res.json({
        success: true,
        data: {
          credits: {
            balance: wallet.credits.balance,
            totalPurchased: wallet.credits.totalPurchased,
            totalSpent: wallet.credits.totalSpent,
          },
          availableBalance: wallet.balance.availableBalance,
        },
      });
    } catch (error) {
      console.error("Get customer credits error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch credit balance",
      });
    }
  }
);

// Check contact reveal eligibility for customers and store owners
router.get(
  "/customer/reveals/:storeId/eligibility",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { storeId } = req.params;

      // Import ContactReveal model
      const ContactReveal = (await import("../models/ContactReveal.js")).default;
      const Store = (await import("../models/Store.js")).default;

      // Check if store exists
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Check for existing reveal within 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingReveal = await ContactReveal.findOne({
        revealedByUserId: userId,
        storeId,
        revealedAt: { $gte: twentyFourHoursAgo },
        status: "completed"
      });

      if (existingReveal) {
        // User has valid reveal, return contact details
        return res.json({
          success: true,
          data: {
            canReveal: false,
            hasValidReveal: true,
            contactDetails: {
              email: store.contactInfo?.email,
              phone: store.contactInfo?.phone,
              address: store.contactInfo?.address,
              whatsapp: store.contactInfo?.whatsapp,
            },
            revealExpiresAt: new Date(existingReveal.revealedAt.getTime() + 24 * 60 * 60 * 1000),
            reasons: {
              alreadyRevealed: true,
            },
          },
        });
      }

      // Check eligibility for new reveal (dedupe check)
      const canReveal = await ContactReveal.canUserReveal(userId, storeId);
      
      // Check if store owner has sufficient credits
      const storeOwnerWallet = await Wallet.getOrCreateWallet(store.ownerId);
      const hasOwnerCredits = storeOwnerWallet.credits.balance >= 1;

      res.json({
        success: true,
        data: {
          canReveal: canReveal && hasOwnerCredits,
          hasValidReveal: false,
          reasons: {
            alreadyRevealed: !canReveal,
            insufficientOwnerCredits: !hasOwnerCredits,
          },
          requiredCredits: 1,
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

// Perform contact reveal for customers and store owners
router.post(
  "/customer/reveals/:storeId",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { storeId } = req.params;

      // Import models
      const ContactReveal = (await import("../models/ContactReveal.js")).default;
      const Store = (await import("../models/Store.js")).default;

      // Check if store exists
      const store = await Store.findById(storeId).populate('ownerId', 'name email phone');
      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      // Check if user can reveal (dedupe check)
      const canReveal = await ContactReveal.canUserReveal(userId, storeId);
      if (!canReveal) {
        return res.status(409).json({
          success: false,
          message: "Contact already revealed for this store today",
          code: "ALREADY_REVEALED",
        });
      }

      // Check if store owner has sufficient credits
      const storeOwnerWallet = await Wallet.getOrCreateWallet(store.ownerId);
      if (storeOwnerWallet.credits.balance < 1) {
        return res.status(402).json({
          success: false,
          message: "Store owner has insufficient credits for contact reveals",
          code: "INSUFFICIENT_OWNER_CREDITS",
        });
      }

      // Deduct 1 credit from store owner's wallet
      const transaction = await storeOwnerWallet.useCredits(1, `Contact reveal for user ${userId}`, null);

      // Create the reveal record
      const revealData = {
        userId: userId,
        storeId,
        walletTransactionId: transaction._id, // Link to the credit usage transaction
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'Unknown',
          revealedAt: new Date(),
        },
        unitCredits: 1,
      };

      const reveal = await ContactReveal.createReveal(revealData);

      res.json({
        success: true,
        message: "Contact details revealed successfully",
        data: {
          contactDetails: {
            email: store.contactInfo?.email,
            phone: store.contactInfo?.phone,
            address: store.contactInfo?.address,
            whatsapp: store.contactInfo?.whatsapp,
          },
          creditsUsed: 1,
          remainingCredits: storeOwnerWallet.credits.balance,
          revealId: reveal._id,
        },
      });
    } catch (error) {
      console.error("Contact reveal error:", error);
      
      // Handle specific error types
      if (error.message.includes("insufficient credits")) {
        return res.status(402).json({
          success: false,
          message: "Store owner has insufficient credits for contact reveals",
          code: "INSUFFICIENT_OWNER_CREDITS",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to reveal contact details",
      });
    }
  }
);

// Get user's reveal history
router.get(
  "/customer/reveals",
  authenticate,
  authorize("customer", "store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      // Import ContactReveal model
      const ContactReveal = (await import("../models/ContactReveal.js")).default;

      const reveals = await ContactReveal.find({ revealedByUserId: userId })
        .populate('storeId', 'name type profileImage')
        .sort({ revealedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await ContactReveal.countDocuments({ revealedByUserId: userId });

      res.json({
        success: true,
        data: {
          reveals,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get customer reveals error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch reveal history",
      });
    }
  }
);

export default router;
