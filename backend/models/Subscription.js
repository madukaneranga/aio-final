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
    enum: ["pending", "active", "inactive", "cancelled", "expired", "pending_upgrade"],
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
  // Upgrade rollback fields
  upgradeAttemptId: {
    type: String,
    default: null,
  },
  originalSubscriptionData: {
    package: String,
    amount: Number,
    status: String,
    recurrenceId: String,
    lastUpgradeAt: Date,
  },
  upgradeInitiatedAt: {
    type: Date,
    default: null,
  },
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ storeId: 1, status: 1 });
subscriptionSchema.index({ recurrenceId: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ lastUpgradeAt: 1 });
subscriptionSchema.index({ upgradeAttemptId: 1 });
subscriptionSchema.index({ upgradeInitiatedAt: 1 });
subscriptionSchema.index({ status: 1, upgradeInitiatedAt: 1 }); // For cleanup jobs

// Helper methods for upgrade management
subscriptionSchema.methods.initiateUpgrade = function(newPackage, upgradeAttemptId) {
  // Store original subscription data for rollback
  this.originalSubscriptionData = {
    package: this.package,
    amount: this.amount,
    status: this.status,
    recurrenceId: this.recurrenceId,
    lastUpgradeAt: this.lastUpgradeAt
  };
  
  // Set upgrade fields
  this.upgradeAttemptId = upgradeAttemptId;
  this.upgradeInitiatedAt = new Date();
  this.status = "pending_upgrade";
  
  // Update to new package (temporarily)
  this.package = newPackage.name;
  this.amount = newPackage.amount;
  this.recurrenceId = null; // Will be set after successful payment
};

subscriptionSchema.methods.completeUpgrade = function() {
  // Upgrade successful - clear backup data
  this.status = "active";
  this.lastUpgradeAt = new Date();
  this.originalSubscriptionData = null;
  this.upgradeAttemptId = null;
  this.upgradeInitiatedAt = null;
};

subscriptionSchema.methods.rollbackUpgrade = function() {
  // Restore original subscription data
  if (this.originalSubscriptionData) {
    this.package = this.originalSubscriptionData.package;
    this.amount = this.originalSubscriptionData.amount;
    this.status = this.originalSubscriptionData.status;
    this.recurrenceId = this.originalSubscriptionData.recurrenceId;
    this.lastUpgradeAt = this.originalSubscriptionData.lastUpgradeAt;
  }
  
  // Clear upgrade fields
  this.originalSubscriptionData = null;
  this.upgradeAttemptId = null;
  this.upgradeInitiatedAt = null;
};

subscriptionSchema.methods.isUpgradeExpired = function(timeoutMinutes = 30) {
  if (!this.upgradeInitiatedAt || this.status !== "pending_upgrade") {
    return false;
  }
  
  const expiryTime = new Date(this.upgradeInitiatedAt);
  expiryTime.setMinutes(expiryTime.getMinutes() + timeoutMinutes);
  
  return new Date() > expiryTime;
};

// Static method to find expired upgrades
subscriptionSchema.statics.findExpiredUpgrades = function(timeoutMinutes = 30) {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);
  
  return this.find({
    status: "pending_upgrade",
    upgradeInitiatedAt: { $lt: cutoffTime }
  });
};

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
