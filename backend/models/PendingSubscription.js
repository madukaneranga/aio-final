import mongoose from "mongoose";

const pendingSubscriptionSchema = new mongoose.Schema({
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
  packageName: {
    type: String,
    enum: ["basic", "standard", "pro", "premium"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "LKR",
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  paymentParams: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Store user information for PayHere parameters
  userInfo: {
    name: String,
    email: String,
    phone: String,
    address: Object,
  },
  // Store information
  storeName: {
    type: String,
    required: true,
  },
});

// Indexes for better query performance
pendingSubscriptionSchema.index({ userId: 1 });
pendingSubscriptionSchema.index({ createdAt: 1 });
pendingSubscriptionSchema.index({ isActive: 1 });
pendingSubscriptionSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model("PendingSubscription", pendingSubscriptionSchema);