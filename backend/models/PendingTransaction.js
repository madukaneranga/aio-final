import mongoose from 'mongoose';

const pendingTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'digital_wallet', 'cash_on_delivery'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'bank', 'manual'],
    default: 'stripe'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'payout', 'adjustment'],
    required: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  metadata: {
    paymentIntentId: String,
    chargeId: String,
    refundId: String,
    failureReason: String,
    providerResponse: mongoose.Schema.Types.Mixed
  },
  processingDetails: {
    attemptedAt: Date,
    completedAt: Date,
    failedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminNotes: {
      type: String,
      maxlength: 1000
    }
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 5
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
pendingTransactionSchema.index({ createdAt: -1 });
pendingTransactionSchema.index({ status: 1, createdAt: -1 });
pendingTransactionSchema.index({ userId: 1, status: 1 });
pendingTransactionSchema.index({ storeId: 1, status: 1 });
pendingTransactionSchema.index({ transactionId: 1 }, { unique: true });

// Virtual for formatted amount
pendingTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: this.currency || 'LKR'
  }).format(this.amount);
});

// Virtual for time elapsed
pendingTransactionSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffInMinutes = Math.floor((now - created) / (1000 * 60));
  
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
});

// Pre-save middleware to set expiration
pendingTransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration based on type
    const expirationHours = this.type === 'payment' ? 24 : 72;
    this.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }
  next();
});

// Static methods for admin operations
pendingTransactionSchema.statics.getStatusCounts = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

pendingTransactionSchema.statics.getRecentFailures = async function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return await this.find({
    status: 'failed',
    updatedAt: { $gte: since }
  })
  .populate('userId', 'name email')
  .populate('storeId', 'name')
  .sort({ updatedAt: -1 });
};

// Instance methods
pendingTransactionSchema.methods.markAsProcessing = function(adminId, notes) {
  this.status = 'processing';
  this.processingDetails.attemptedAt = new Date();
  this.processingDetails.processedBy = adminId;
  if (notes) this.processingDetails.adminNotes = notes;
  return this.save();
};

pendingTransactionSchema.methods.markAsCompleted = function(adminId, metadata = {}) {
  this.status = 'completed';
  this.processingDetails.completedAt = new Date();
  this.processingDetails.processedBy = adminId;
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

pendingTransactionSchema.methods.markAsFailed = function(reason, adminId) {
  this.status = 'failed';
  this.processingDetails.failedAt = new Date();
  this.metadata.failureReason = reason;
  if (adminId) this.processingDetails.processedBy = adminId;
  this.retryCount += 1;
  return this.save();
};

export default mongoose.model('PendingTransaction', pendingTransactionSchema);