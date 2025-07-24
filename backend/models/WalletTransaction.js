import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["sale", "withdrawal", "refund", "adjustment"],
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
      default: "completed",
    },
    description: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    withdrawalDetails: {
      requestedAt: Date,
      processedAt: Date,
      bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BankDetails",
      },
      adminNotes: String,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
    },
    metadata: {
      paymentMethod: String,
      paymentId: String,
      fees: Number,
      netAmount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
walletTransactionSchema.index({ userId: 1, type: 1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, type: 1 });

// Virtual for formatted amount
walletTransactionSchema.virtual("formattedAmount").get(function () {
  return `Rs. ${this.amount.toFixed(2)}`;
});

// Static method to get wallet balance
walletTransactionSchema.statics.getWalletBalance = async function (userId) {
  const result = await this.aggregate([
    { $match: { userId: Types.ObjectId(userId) } },
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
    } else if (item._id === "withdrawal" || item._id === "refund") {
      totalWithdrawals += item.total;
      balance -= item.total;
    }
  });

  return {
    availableBalance: Math.max(balance, 0),
    totalEarnings,
    totalWithdrawals,
  };
};

// Static method to get pending withdrawals
walletTransactionSchema.statics.getPendingWithdrawals = async function (userId) {
  const pending = await this.find({
    userId,
    type: "withdrawal",
    status: { $in: ["pending", "approved"] },
  });

  return pending.reduce((sum, transaction) => sum + transaction.amount, 0);
};

// Static method to check monthly withdrawal limit
walletTransactionSchema.statics.getMonthlyWithdrawalCount = async function (
  userId
) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await this.countDocuments({
    userId,
    type: "withdrawal",
    createdAt: { $gte: startOfMonth },
  });

  return count;
};

export default mongoose.model("WalletTransaction", walletTransactionSchema);
