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
      pendingBalance: {
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
      pendingTransactions: {
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
        default: 2,
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
      paymentMethods: [
        {
          type: String,
          name: String,
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


export default mongoose.model("Wallet", walletSchema);