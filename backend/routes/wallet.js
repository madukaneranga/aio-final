import express from "express";
const router = express.Router();
import WalletTransaction from "../models/WalletTransaction.js";
import BankDetails from "../models/BankDetails.js";
import { authenticate, authorize } from "../middleware/auth.js";

// Custom validation functions
const validateWithdrawalRequest = (data) => {
  const errors = [];

  if (
    !data.amount ||
    typeof data.amount !== "number" ||
    data.amount < 100 ||
    data.amount > 100000
  ) {
    errors.push("Amount must be a number between 100 and 100000");
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
const generateTransactionId = () => {
  return `WD-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

// Middleware to check if user is a store owner
const requireStoreOwner = (req, res, next) => {
  if (!req.user.storeId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Store owner required.",
    });
  }
  next();
};

// Get wallet summary
router.get(
  "/summary",
  authenticate,
  authorize("store_owner"),
  async (req, res) => {
    try {
      const userId = req.user._id;

      const balance = await getWalletBalance(userId);
      const pendingWithdrawals = await getPendingWithdrawals(userId);
      const monthlyWithdrawals = await getMonthlyWithdrawalCount(userId);

      res.json({
        success: true,
        data: {
          ...balance,
          pendingWithdrawals,
          monthlyWithdrawals,
          monthlyLimit: 2,
        },
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

      const transactions = await find(query)
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

      // Check monthly withdrawal limit
      const monthlyCount = await getMonthlyWithdrawalCount(userId);
      if (monthlyCount >= 2) {
        return res.status(400).json({
          success: false,
          message: "Monthly withdrawal limit (2) exceeded",
        });
      }

      // Check available balance
      const balance = await getWalletBalance(userId);
      if (balance.availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      // Verify bank account exists and belongs to store
      const bankAccount = await findOne({
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

      // Create withdrawal transaction
      const transaction = new WalletTransaction({
        userId,
        transactionId: generateTransactionId(),
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

      // Emit real-time notification
      req.io.emit(`wallet-update-${userId}`, {
        type: "withdrawal_requested",
        transaction: transaction,
      });

      // Notify admins
      req.io.emit("admin-notification", {
        type: "new_withdrawal_request",
        userId,
        amount,
        transactionId: transaction._id,
      });

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
      const bankDetails = await findOne({ userId, isActive: true });

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

      const bankDetails = await findOneAndUpdate(
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

export default router;
