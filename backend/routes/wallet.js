import express from "express";
const router = express.Router();
import WalletTransaction from "../models/WalletTransaction.js";
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
      console.log("Authenticated user:", req.user);

      const userId = req.user._id;

      console.log("Getting wallet balance...");
      const balance = await WalletTransaction.getWalletBalance(userId);

      console.log("Getting pending withdrawals...");
      const pendingWithdrawals = await WalletTransaction.getPendingWithdrawals(
        userId
      );

      console.log("Getting monthly withdrawal count...");
      const monthlyWithdrawals =
        await WalletTransaction.getMonthlyWithdrawalCount(userId);

      res.json({
        success: true,
        data: {
          ...balance,
          pendingWithdrawals,
          monthlyWithdrawals,
          monthlyLimit: 4,
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

      // Check monthly withdrawal limit
      const monthlyCount = await WalletTransaction.getMonthlyWithdrawalCount(
        userId
      );
      if (monthlyCount >= 4) {
        return res.status(400).json({
          success: false,
          message: "Monthly withdrawal limit (4) exceeded",
        });
      }

      // Check available balance
      const balance = await WalletTransaction.getWalletBalance(userId);
      if (balance.availableBalance < amount) {
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

export default router;
