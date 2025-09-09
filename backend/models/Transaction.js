import mongoose from "mongoose";

const { Schema } = mongoose;

const TransactionSchema = new Schema(
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
      enum: [
        "completed",
        "pending",
        "approved",
        "rejected",
        "processing",
        "cancelled",
        "failed",
      ],
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
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: "Refund",
    },
    adjustmentId: {
      type: Schema.Types.ObjectId,
      ref: "Adjustment",
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
    excludeFromBalance: {
      type: Boolean,
      default: false,
    },
    orderData: {
      type: Schema.Types.Mixed,
    },
    shippingAddress: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimized queries
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });

// Virtual: formatted amount
TransactionSchema.virtual("formattedAmount").get(function () {
  return `Rs. ${this.amount.toFixed(2)}`;
});

export default mongoose.model("Transaction", TransactionSchema);
