import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import walletController from "../controllers/walletController.js";
import {
  validateTransactionQuery,
  validateBankDetails,
  validateWithdrawalRequest,
  validateWalletSettings,
  validateAnalyticsQuery,
} from "../validators/walletValidator.js";

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/wallet/summary
 * @desc    Get wallet summary for authenticated user
 * @access  Private (Store Owner)
 */
router.get("/summary", walletController.getWalletSummary);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get wallet transactions with pagination and filtering
 * @access  Private (Store Owner)
 * @query   page, limit, type, status, startDate, endDate, sortBy, sortOrder
 */
router.get("/transactions", validateTransactionQuery, walletController.getWalletTransactions);

/**
 * @route   GET /api/wallet/bank-details
 * @desc    Get user's bank details
 * @access  Private (Store Owner)
 */
router.get("/bank-details", walletController.getBankDetails);

/**
 * @route   POST /api/wallet/bank-details
 * @desc    Add new bank details
 * @access  Private (Store Owner)
 * @body    accountHolderName, accountNumber, bankName, branchName, branchCode
 */
router.post("/bank-details", validateBankDetails, walletController.addBankDetails);

/**
 * @route   POST /api/wallet/withdrawal
 * @desc    Request withdrawal
 * @access  Private (Store Owner)
 * @body    amount, bankAccountId, note
 */
router.post("/withdrawal", validateWithdrawalRequest, walletController.requestWithdrawal);

/**
 * @route   PUT /api/wallet/settings
 * @desc    Update wallet settings
 * @access  Private (Store Owner)
 * @body    autoWithdrawal: { enabled, threshold }
 */
router.put("/settings", validateWalletSettings, walletController.updateWalletSettings);

/**
 * @route   GET /api/wallet/analytics
 * @desc    Get wallet analytics and statistics
 * @access  Private (Store Owner)
 * @query   period (7d, 30d, 90d, 1y)
 */
router.get("/analytics", validateAnalyticsQuery, walletController.getWalletAnalytics);

export default router;