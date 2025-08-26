import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Core Balance Information
    balance: {
      availableBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalWithdrawals: {
        type: Number,
        default: 0,
        min: 0,
      },
      pendingWithdrawals: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Credits Information
    credits: {
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalPurchased: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastPurchaseDate: Date,
    },
    // Transaction Statistics
    statistics: {
      totalTransactions: {
        type: Number,
        default: 0,
      },
      successfulTransactions: {
        type: Number,
        default: 0,
      },
      failedTransactions: {
        type: Number,
        default: 0,
      },
      averageTransactionAmount: {
        type: Number,
        default: 0,
      },
    },
    // Withdrawal Information
    withdrawalInfo: {
      monthlyWithdrawals: {
        type: Number,
        default: 0,
      },
      monthlyLimit: {
        type: Number,
        default: 4,
      },
      lastWithdrawalDate: Date,
      totalWithdrawalRequests: {
        type: Number,
        default: 0,
      },
    },
    // Revenue Breakdown
    revenue: {
      thisMonth: {
        type: Number,
        default: 0,
      },
      lastMonth: {
        type: Number,
        default: 0,
      },
      thisYear: {
        type: Number,
        default: 0,
      },
      lastYear: {
        type: Number,
        default: 0,
      },
    },
    // Payment Methods & Bank Info
    paymentInfo: {
      defaultBankAccountId: {
        type: Schema.Types.ObjectId,
        ref: "BankDetails",
      },
      paymentMethods: [
        {
          type: String,
          name: String,
          isDefault: Boolean,
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    // Wallet Settings
    settings: {
      autoWithdrawal: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: {
          type: Number,
          default: 10000,
        },
        bankAccountId: {
          type: Schema.Types.ObjectId,
          ref: "BankDetails",
        },
      },
      notifications: {
        transactionAlerts: {
          type: Boolean,
          default: true,
        },
        monthlyReports: {
          type: Boolean,
          default: true,
        },
        lowBalanceAlert: {
          type: Boolean,
          default: true,
        },
        lowBalanceThreshold: {
          type: Number,
          default: 1000,
        },
      },
    },
    // Metadata
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      lastTransactionDate: Date,
      lastBalanceUpdate: Date,
      walletStatus: {
        type: String,
        enum: ["active", "suspended", "frozen", "closed"],
        default: "active",
      },
      currency: {
        type: String,
        default: "LKR",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
walletSchema.index({ userId: 1 }, { unique: true });
walletSchema.index({ "metadata.walletStatus": 1 });
walletSchema.index({ "metadata.lastTransactionDate": -1 });

// Virtual: formatted available balance
walletSchema.virtual("formattedBalance").get(function () {
  return `Rs. ${this.balance.availableBalance.toFixed(2)}`;
});

// Virtual: withdrawal availability
walletSchema.virtual("canWithdraw").get(function () {
  return (
    this.balance.availableBalance >= 2000 &&
    this.withdrawalInfo.monthlyWithdrawals < this.withdrawalInfo.monthlyLimit &&
    this.metadata.walletStatus === "active"
  );
});

// Virtual: monthly earnings growth
walletSchema.virtual("monthlyGrowth").get(function () {
  if (this.revenue.lastMonth === 0) return this.revenue.thisMonth > 0 ? 100 : 0;
  return ((this.revenue.thisMonth - this.revenue.lastMonth) / this.revenue.lastMonth) * 100;
});

// Static method: Create wallet for new user
walletSchema.statics.createWallet = async function (userId) {
  try {
    const existingWallet = await this.findOne({ userId });
    if (existingWallet) {
      return existingWallet;
    }

    const wallet = new this({
      userId,
      metadata: {
        createdAt: new Date(),
        lastBalanceUpdate: new Date(),
        walletStatus: "active",
        currency: "LKR",
      },
    });

    try {
      await wallet.save();
      return wallet;
    } catch (saveError) {
      // Handle race condition - if another process created the wallet
      if (saveError.code === 11000) {
        const existingWallet = await this.findOne({ userId });
        if (existingWallet) {
          return existingWallet;
        }
      }
      throw saveError;
    }
  } catch (error) {
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
};

// Instance method: Update balance from transactions
walletSchema.methods.updateBalanceFromTransactions = async function () {
  const WalletTransaction = mongoose.model("WalletTransaction");
  
  try {
    const result = await WalletTransaction.aggregate([
      {
        $match: {
          userId: this.userId,
          status: "completed",
          excludeFromBalance: { $ne: true }, // Exclude transactions marked as excludeFromBalance
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let availableBalance = 0;
    let totalEarnings = 0;
    let totalWithdrawals = 0;
    let successfulTransactions = 0;

    result.forEach((item) => {
      successfulTransactions += item.count;
      
      if (item._id === "sale") {
        totalEarnings += item.total;
        availableBalance += item.total;
      } else if (item._id === "withdrawal") {
        totalWithdrawals += item.total;
        availableBalance -= item.total;
      } else if (item._id === "refund") {
        availableBalance += item.total;
      } else if (item._id === "credit_purchase") {
        // Credit purchases deduct from available balance
        availableBalance -= item.total;
      }
      // Note: credit_usage transactions don't affect cash balance
    });

    // Get pending withdrawals
    const pendingWithdrawals = await WalletTransaction.aggregate([
      {
        $match: {
          userId: this.userId,
          type: "withdrawal",
          status: { $in: ["pending", "approved", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const pendingAmount = pendingWithdrawals[0]?.total || 0;

    // Get monthly revenue
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const thisMonthRevenue = await WalletTransaction.aggregate([
      {
        $match: {
          userId: this.userId,
          type: "sale",
          status: "completed",
          excludeFromBalance: { $ne: true }, // Exclude transactions marked as excludeFromBalance
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Calculate credit balances
    const creditTransactions = await WalletTransaction.aggregate([
      {
        $match: {
          userId: this.userId,
          type: { $in: ["credit_purchase", "credit_usage"] },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$type",
          totalCredits: { $sum: "$creditDetails.creditsAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let creditsBalance = 0;
    let totalCreditsPurchased = 0;
    let totalCreditsSpent = 0;

    creditTransactions.forEach((item) => {
      if (item._id === "credit_purchase") {
        totalCreditsPurchased += item.totalCredits;
        creditsBalance += item.totalCredits;
      } else if (item._id === "credit_usage") {
        totalCreditsSpent += item.totalCredits; // creditsAmount is now positive for usage
        creditsBalance -= item.totalCredits; // Subtract from balance for usage
      }
    });

    // Get last credit purchase date
    const lastCreditPurchase = await WalletTransaction.findOne(
      {
        userId: this.userId,
        type: "credit_purchase",
        status: "completed",
      },
      {},
      { sort: { createdAt: -1 } }
    );

    // Update wallet
    this.balance = {
      availableBalance: Math.max(availableBalance, 0),
      totalEarnings,
      totalWithdrawals,
      pendingWithdrawals: pendingAmount,
    };

    this.credits = {
      balance: Math.max(creditsBalance, 0),
      totalPurchased: totalCreditsPurchased,
      totalSpent: totalCreditsSpent,
      lastPurchaseDate: lastCreditPurchase?.createdAt,
    };

    this.statistics.successfulTransactions = successfulTransactions;
    this.statistics.totalTransactions = successfulTransactions; // You can calculate failed separately if needed
    
    if (successfulTransactions > 0) {
      this.statistics.averageTransactionAmount = totalEarnings / successfulTransactions;
    }

    this.revenue.thisMonth = thisMonthRevenue[0]?.total || 0;
    this.metadata.lastBalanceUpdate = new Date();

    // Update last transaction date
    const lastTransaction = await WalletTransaction.findOne(
      { userId: this.userId },
      {},
      { sort: { createdAt: -1 } }
    );
    
    if (lastTransaction) {
      this.metadata.lastTransactionDate = lastTransaction.createdAt;
    }

    await this.save();
    return this;
  } catch (error) {
    throw new Error(`Failed to update balance: ${error.message}`);
  }
};

// Instance method: Add transaction and update balance
walletSchema.methods.addTransaction = async function (transactionData) {
  const WalletTransaction = mongoose.model("WalletTransaction");
  
  try {
    // Create transaction
    const transaction = new WalletTransaction({
      ...transactionData,
      userId: this.userId,
    });
    
    await transaction.save();
    
    // Update wallet balance
    await this.updateBalanceFromTransactions();
    
    return transaction;
  } catch (error) {
    throw new Error(`Failed to add transaction: ${error.message}`);
  }
};

// Instance method: Purchase credits using wallet balance
walletSchema.methods.purchaseCredits = async function (creditsAmount, packagePrice, packageId) {
  const WalletTransaction = mongoose.model("WalletTransaction");
  
  try {
    const totalCost = packagePrice;
    const creditPrice = packagePrice / creditsAmount;
    
    // Check if wallet has sufficient balance
    if (this.balance.availableBalance < totalCost) {
      throw new Error("Insufficient wallet balance for credit purchase");
    }
    
    const transactionId = `CP-${Date.now()}-${uuidv4()}`;
    
    // Create credit purchase transaction (positive amount, balance calculation handles the spending)
    const transaction = new WalletTransaction({
      userId: this.userId,
      transactionId,
      type: "credit_purchase",
      amount: totalCost,
      status: "completed",
      description: `Purchased ${creditsAmount} credits`,
      creditDetails: {
        creditsAmount,
        creditPrice: creditPrice,
        packageId,
      },
    });
    
    await transaction.save();
    
    // Update wallet balances
    await this.updateBalanceFromTransactions();
    
    return transaction;
  } catch (error) {
    throw new Error(`Failed to purchase credits: ${error.message}`);
  }
};

// Instance method: Use credits for contact reveal
walletSchema.methods.useCredits = async function (creditsAmount, purpose, relatedRevealId) {
  const WalletTransaction = mongoose.model("WalletTransaction");
  
  try {
    // Check if wallet has sufficient credits
    if (this.credits.balance < creditsAmount) {
      throw new Error("Insufficient credits balance");
    }
    
    const transactionId = `CU-${Date.now()}-${uuidv4()}`;
    
    // Create credit usage transaction (positive amount, transaction type indicates usage)
    const transaction = new WalletTransaction({
      userId: this.userId,
      transactionId,
      type: "credit_usage",
      amount: 0, // No cash involved
      status: "completed",
      description: purpose || "Credit usage",
      creditDetails: {
        creditsAmount: creditsAmount, // Positive value, type indicates usage
        relatedRevealId,
      },
    });
    
    await transaction.save();
    
    // Update wallet balances
    await this.updateBalanceFromTransactions();
    
    return transaction;
  } catch (error) {
    throw new Error(`Failed to use credits: ${error.message}`);
  }
};

// Instance method: Get wallet summary for API
walletSchema.methods.getSummary = function () {
  return {
    availableBalance: this.balance.availableBalance,
    totalEarnings: this.balance.totalEarnings,
    totalWithdrawals: this.balance.totalWithdrawals,
    pendingWithdrawals: this.balance.pendingWithdrawals,
    monthlyWithdrawals: this.withdrawalInfo.monthlyWithdrawals,
    monthlyLimit: this.withdrawalInfo.monthlyLimit,
    canWithdraw: this.canWithdraw,
    currency: this.metadata.currency,
    status: this.metadata.walletStatus,
    revenue: this.revenue,
    statistics: this.statistics,
    monthlyGrowth: this.monthlyGrowth,
    credits: {
      balance: this.credits.balance,
      totalPurchased: this.credits.totalPurchased,
      totalSpent: this.credits.totalSpent,
      lastPurchaseDate: this.credits.lastPurchaseDate,
    },
  };
};

// Static method: Get or create wallet (atomic operation)
walletSchema.statics.getOrCreateWallet = async function (userId) {
  try {
    // Use findOneAndUpdate with upsert for atomic operation
    const wallet = await this.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          balance: {
            availableBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            pendingWithdrawals: 0,
          },
          credits: {
            balance: 0,
            totalPurchased: 0,
            totalSpent: 0,
          },
          statistics: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageTransactionAmount: 0,
          },
          withdrawalInfo: {
            monthlyWithdrawals: 0,
            monthlyLimit: 4,
            totalWithdrawalRequests: 0,
          },
          revenue: {
            thisMonth: 0,
            lastMonth: 0,
            thisYear: 0,
            lastYear: 0,
          },
          paymentInfo: {
            paymentMethods: [],
          },
          settings: {
            autoWithdrawal: {
              enabled: false,
              threshold: 10000,
            },
            notifications: {
              transactionAlerts: true,
              monthlyReports: true,
              lowBalanceAlert: true,
              lowBalanceThreshold: 1000,
            },
          },
          metadata: {
            createdAt: new Date(),
            lastBalanceUpdate: new Date(),
            walletStatus: "active",
            currency: "LKR",
          },
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );
    
    // Update balance from latest transactions
    await wallet.updateBalanceFromTransactions();
    
    return wallet;
  } catch (error) {
    console.error("Get or create wallet error:", error);
    throw new Error(`Failed to get or create wallet: ${error.message}`);
  }
};

export default mongoose.model("Wallet", walletSchema);