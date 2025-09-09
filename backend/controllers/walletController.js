import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import BankDetails from "../models/BankDetails.js";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import { v4 as uuidv4 } from "uuid";

class WalletController {
  /**
   * Get wallet summary for authenticated user
   */
  async getWalletSummary(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;

      let wallet = await Wallet.findOne({ userId });
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: {
            availableBalance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            pendingWithdrawals: 0,
          },
          statistics: {
            totalTransactions: 0,
            successfulTransactions: 0,
            pendingTransactions: 0,
            averageTransactionAmount: 0,
          },
          withdrawalInfo: {
            monthlyWithdrawals: 0,
            monthlyLimit: 2,
            totalWithdrawalRequests: 0,
          },
          revenue: {
            thisMonth: 0,
            lastMonth: 0,
            thisYear: 0,
            lastYear: 0,
          },
          metadata: {
            walletStatus: "active",
            currency: "LKR",
          },
        });
        await wallet.save();
        logger.info(`Created new wallet for user ${userId}`);
      }

      // Calculate monthly withdrawal count
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const monthlyWithdrawals = await Withdrawal.countDocuments({
        userId,
        createdAt: { $gte: startOfMonth },
        status: { $in: ['approved', 'completed'] }
      });

      wallet.withdrawalInfo.monthlyWithdrawals = monthlyWithdrawals;

      res.json(successResponse(wallet));
    } catch (error) {
      logger.error("Error fetching wallet summary", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get wallet transactions with pagination and filtering
   */
  async getWalletTransactions(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;
      const { 
        page = 1, 
        limit = 20, 
        type, 
        status, 
        startDate, 
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = { userId };
      
      if (type) {
        query.type = type;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Get transactions with pagination
      const [transactions, totalCount] = await Promise.all([
        Transaction.find(query)
          .populate('orderId', 'orderNumber totalAmount')
          .populate('withdrawalId', 'amount status')
          .populate('refundId', 'amount reason')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        Transaction.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json(successResponse({
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }));
    } catch (error) {
      logger.error("Error fetching wallet transactions", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get user's bank details
   */
  async getBankDetails(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;

      const bankDetails = await BankDetails.find({ userId, isActive: true })
        .sort({ createdAt: -1 });

      res.json(successResponse(bankDetails));
    } catch (error) {
      logger.error("Error fetching bank details", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Add new bank details
   */
  async addBankDetails(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;
      const { 
        accountHolderName, 
        accountNumber, 
        bankName, 
        branchName, 
        branchCode
      } = req.body;

      // Validate required fields
      if (!accountHolderName || !accountNumber || !bankName || !branchName) {
        return res.status(400).json(errorResponse("All bank details are required", 400));
      }

      // Check if user already has bank details
      const existingBankDetails = await BankDetails.findOne({ 
        userId, 
        isActive: true 
      });

      let bankDetails;

      if (existingBankDetails) {
        // User has existing bank details - this is a change request
        // Archive current details to history
        existingBankDetails.archiveCurrentDetails('change_request');
        
        // Update with new details and mark as unverified
        existingBankDetails.accountHolderName = accountHolderName.trim();
        existingBankDetails.accountNumber = accountNumber.trim();
        existingBankDetails.bankName = bankName.trim();
        existingBankDetails.branchName = branchName.trim();
        existingBankDetails.branchCode = branchCode?.trim();
        existingBankDetails.isVerified = false;
        existingBankDetails.verifiedAt = null;
        existingBankDetails.verifiedBy = null;
        existingBankDetails.lastModifiedAt = new Date();
        existingBankDetails.lastModifiedBy = userId;

        await existingBankDetails.save();
        bankDetails = existingBankDetails;

        logger.info(`Bank details updated for user ${userId} - pending verification`);
        res.status(200).json(successResponse(bankDetails, "Bank details change request submitted successfully. Pending verification."));
      } else {
        // User has no bank details - this is a new addition
        bankDetails = new BankDetails({
          userId,
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          branchCode: branchCode?.trim(),
          isActive: true,
          isVerified: false
        });

        await bankDetails.save();

        logger.info(`Bank details added for user ${userId}`);
        res.status(201).json(successResponse(bankDetails, "Bank details added successfully. Pending verification."));
      }
    } catch (error) {
      logger.error("Error processing bank details", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;
      const { amount, bankAccountId, note } = req.body;

      // Validate input
      if (!amount || amount <= 0) {
        return res.status(400).json(errorResponse("Valid withdrawal amount is required", 400));
      }

      if (!bankAccountId) {
        return res.status(400).json(errorResponse("Bank account is required", 400));
      }

      // Get wallet and bank details
      const [wallet, bankDetails] = await Promise.all([
        Wallet.findOne({ userId }),
        BankDetails.findOne({ _id: bankAccountId, userId, isActive: true })
      ]);

      if (!wallet) {
        return res.status(404).json(errorResponse("Wallet not found", 404));
      }

      if (!bankDetails) {
        return res.status(404).json(errorResponse("Bank account not found", 404));
      }

      // Check wallet status
      if (wallet.metadata.walletStatus !== 'active') {
        return res.status(400).json(errorResponse("Wallet is not active", 400));
      }

      // Check available balance
      if (wallet.balance.availableBalance < amount) {
        return res.status(400).json(errorResponse("Insufficient balance", 400));
      }

      // Check monthly withdrawal limit
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const monthlyWithdrawals = await Withdrawal.countDocuments({
        userId,
        createdAt: { $gte: startOfMonth },
        status: { $in: ['approved', 'completed'] }
      });

      if (monthlyWithdrawals >= wallet.withdrawalInfo.monthlyLimit) {
        return res.status(400).json(errorResponse("Monthly withdrawal limit exceeded", 400));
      }

      // Create withdrawal request
      const withdrawal = new Withdrawal({
        userId,
        amount,
        bankAccountId,
        note: note?.trim(),
        status: 'pending',
        requestedAt: new Date()
      });

      await withdrawal.save();

      // Create transaction record
      const transaction = new Transaction({
        userId,
        transactionId: `WD_${uuidv4().substring(0, 8).toUpperCase()}`,
        type: 'withdrawal',
        amount,
        status: 'pending',
        description: `Withdrawal request for Rs. ${amount.toFixed(2)}`,
        withdrawalId: withdrawal._id,
        metadata: {
          netAmount: amount
        }
      });

      await transaction.save();

      // Update wallet balances
      await Wallet.updateOne(
        { userId },
        {
          $inc: {
            'balance.availableBalance': -amount,
            'balance.pendingWithdrawals': amount,
            'statistics.pendingTransactions': 1,
            'withdrawalInfo.totalWithdrawalRequests': 1
          },
          'metadata.lastTransactionDate': new Date(),
          'metadata.lastBalanceUpdate': new Date(),
          'withdrawalInfo.lastWithdrawalDate': new Date()
        }
      );

      logger.info(`Withdrawal request created: ${withdrawal._id} for user ${userId}`);
      res.status(201).json(successResponse(
        { withdrawal, transaction }, 
        "Withdrawal request submitted successfully"
      ));
    } catch (error) {
      logger.error("Error requesting withdrawal", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Update wallet settings
   */
  async updateWalletSettings(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;
      const { autoWithdrawal } = req.body;

      const updateData = {};
      
      if (autoWithdrawal !== undefined) {
        if (typeof autoWithdrawal.enabled === 'boolean') {
          updateData['settings.autoWithdrawal.enabled'] = autoWithdrawal.enabled;
        }
        
        if (autoWithdrawal.threshold && autoWithdrawal.threshold > 0) {
          updateData['settings.autoWithdrawal.threshold'] = autoWithdrawal.threshold;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json(errorResponse("No valid settings to update", 400));
      }

      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!wallet) {
        return res.status(404).json(errorResponse("Wallet not found", 404));
      }

      logger.info(`Wallet settings updated for user ${userId}`);
      res.json(successResponse(wallet.settings, "Wallet settings updated successfully"));
    } catch (error) {
      logger.error("Error updating wallet settings", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get wallet statistics and analytics
   */
  async getWalletAnalytics(req, res) {
    logger.route(req.method, req.originalUrl);
    try {
      const userId = req.user._id;
      const { period = '30d' } = req.query;

      // Calculate date range
      let startDate;
      const endDate = new Date();
      
      switch (period) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get wallet and transaction analytics
      const [wallet, transactionStats] = await Promise.all([
        Wallet.findOne({ userId }),
        Transaction.aggregate([
          {
            $match: {
              userId,
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ])
      ]);

      if (!wallet) {
        return res.status(404).json(errorResponse("Wallet not found", 404));
      }

      // Format analytics data
      const analytics = {
        wallet: wallet.toObject(),
        period: {
          startDate,
          endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        transactionBreakdown: transactionStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
            averageAmount: stat.avgAmount
          };
          return acc;
        }, {})
      };

      res.json(successResponse(analytics));
    } catch (error) {
      logger.error("Error fetching wallet analytics", error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export default new WalletController();