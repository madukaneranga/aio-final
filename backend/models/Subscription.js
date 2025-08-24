import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  plan: {
    type: String,
    enum: ["monthly"],
    default: "monthly",
  },
  amount: {
    type: Number,
    required: true,
    default: 1000, // LKR 1000 per month
  },
  currency: {
    type: String,
    default: "LKR",
  },
  package: {
    type: String,
    default: "basic",
  },
  status: {
    type: String,
    enum: ["pending", "active", "inactive", "cancelled", "expired"],
    default: "active",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  lastUpgradeAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  paymentHistory: [
    {
      amount: Number,
      currency: String,
      paidAt: Date,
      localPaymentId: String,
      status: String,
      paymentMethod: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  recurrenceId: {
    type: String,
  },
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ storeId: 1, status: 1 });
subscriptionSchema.index({ recurrenceId: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ lastUpgradeAt: 1 });

// Auto-set end date to 30 days from start date
subscriptionSchema.pre("save", function (next) {
  if (!this.endDate) {
    const baseDate = this.startDate || new Date();
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1); // ✅ Correctly add 1 month
    this.endDate = newEndDate;
  }
  next();
});

export default mongoose.model("Subscription", subscriptionSchema);
