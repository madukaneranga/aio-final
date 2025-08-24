import mongoose from "mongoose";

const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["sale", "withdrawal", "refund", "adjustment", "credit_purchase", "credit_usage"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "approved", "rejected", "processing"],
      default: "pending",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    withdrawalDetails: {
      requestedAt: Date,
      processedAt: Date,
      completedAt: Date, 
      bankAccountId: {
        type: Schema.Types.ObjectId,
        ref: "BankDetails",
      },
      adminNotes: String,
      processedBy: {
        type: Schema.Types.ObjectId,
        ref: "User", 
      },
      completedBy: {
        // 🆕 ADD THIS FIELD
        type: Schema.Types.ObjectId,
        ref: "User", 
      },
    },
    metadata: {
      paymentMethod: String,
      paymentId: String,
      fees: {
        type: Number,
        min: 0,
      },
      netAmount: {
        type: Number,
        min: 0,
      },
    },
    creditDetails: {
      creditsAmount: {
        type: Number,
        min: 0,
      },
      creditPrice: {
        type: Number,
        min: 0,
      },
      relatedRevealId: {
        type: Schema.Types.ObjectId,
        ref: "ContactReveal",
      },
      packageId: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimized queries
walletTransactionSchema.index({ userId: 1, type: 1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });

// Virtual: formatted amount
walletTransactionSchema.virtual("formattedAmount").get(function () {
  return `Rs. ${this.amount.toFixed(2)}`;
});

//Wallet balance
walletTransactionSchema.statics.getWalletBalance = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let balance = 0;
  let totalEarnings = 0;
  let totalWithdrawals = 0;

  result.forEach((item) => {
    if (item._id === "sale") {
      totalEarnings += item.total;
      balance += item.total;
    } else if (item._id === "withdrawal") {
      totalWithdrawals += item.total;
      balance -= item.total;
    } else if (item._id === "refund") {
      // Refunds typically add back to balance
      balance += item.total;
    }
    // Handle "adjustment" type as needed
  });

  return {
    availableBalance: Math.max(balance, 0),
    totalEarnings,
    totalWithdrawals,
  };
};

// Static method: pending withdrawals
walletTransactionSchema.statics.getPendingWithdrawals = async function (
  userId
) {
  const pending = await this.find({
    userId,
    type: "withdrawal",
    status: { $in: ["pending", "approved"] },
  });

  return pending.reduce((sum, tx) => sum + tx.amount, 0);
};

// Static method: monthly withdrawal count
walletTransactionSchema.statics.getMonthlyWithdrawalCount = async function (
  userId
) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  return await this.countDocuments({
    userId,
    type: "withdrawal",
    createdAt: { $gte: startOfMonth },
  });
};

export default mongoose.model("WalletTransaction", walletTransactionSchema);
