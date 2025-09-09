import mongoose from "mongoose";

const { Schema } = mongoose;

const withdrawalSchema = new Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "rejected", "cancelled", "failed"],
      default: "pending",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
     method: {
      type: String,
      enum: ["bank_transfer", "mobile_wallet", "paypal"],
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: "BankDetails",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500
    },
    adminNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Static method: pending withdrawals
withdrawalSchema.statics.getPendingWithdrawals = async function (userId) {
  const pending = await this.find({
    userId,
    status: { $in: ["pending"] },
  });

  return pending.reduce((sum, tx) => sum + tx.amount, 0);
};

// Static method: monthly withdrawal count
withdrawalSchema.statics.getMonthlyWithdrawalCount = async function (userId) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  return await this.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth },
  });
};

export default mongoose.model("Withdrawal", withdrawalSchema);
