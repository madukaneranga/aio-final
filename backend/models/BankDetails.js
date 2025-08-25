import mongoose from "mongoose";

const bankDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  routingNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15
  },
  branchName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  branchCode: {
    type: String,
    trim: true,
    maxlength: 10
  },
  accountType: {
    type: String,
    enum: ['savings', 'checking', 'business'],
    default: 'savings'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Security and Lock Fields
  isLocked: {
    type: Boolean,
    default: false
  },
  lockReason: {
    type: String,
    enum: ['auto_lock_after_first_save', 'admin_lock', 'security_lock', 'manual_lock'],
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  // Change tracking
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modificationHistory: [{
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changes: {
      type: mongoose.Schema.Types.Mixed
    },
    reason: String,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Method to mask account number for display
bankDetailsSchema.methods.getMaskedAccountNumber = function() {
  const accountNumber = this.accountNumber;
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
};

// Method to lock bank details
bankDetailsSchema.methods.lockDetails = function(reason = 'manual_lock', lockedBy = null) {
  this.isLocked = true;
  this.lockReason = reason;
  this.lockedAt = new Date();
  if (lockedBy) {
    this.lockedBy = lockedBy;
  }
  return this.save();
};

// Method to unlock bank details (admin only)
bankDetailsSchema.methods.unlockDetails = function(unlockedBy) {
  this.isLocked = false;
  this.lockReason = null;
  this.lockedAt = null;
  this.lockedBy = null;
  
  // Add to modification history
  this.modificationHistory.push({
    modifiedAt: new Date(),
    modifiedBy: unlockedBy,
    changes: { action: 'unlocked' },
    reason: 'Admin unlocked bank details'
  });
  
  return this.save();
};

// Method to check if details can be modified
bankDetailsSchema.methods.canModify = function() {
  return !this.isLocked;
};

// Method to get lock status info
bankDetailsSchema.methods.getLockInfo = function() {
  return {
    isLocked: this.isLocked,
    lockReason: this.lockReason,
    lockedAt: this.lockedAt,
    lockedBy: this.lockedBy,
    canModify: this.canModify()
  };
};

// Method to track modifications
bankDetailsSchema.methods.trackModification = function(userId, changes, reason, ipAddress) {
  this.lastModifiedAt = new Date();
  this.lastModifiedBy = userId;
  
  this.modificationHistory.push({
    modifiedAt: new Date(),
    modifiedBy: userId,
    changes,
    reason,
    ipAddress
  });
  
  return this;
};

// Pre-save middleware to auto-lock after first save
bankDetailsSchema.pre('save', function(next) {
  // If this is a new document (first save) and not already locked
  if (this.isNew && !this.isLocked) {
    this.isLocked = true;
    this.lockReason = 'auto_lock_after_first_save';
    this.lockedAt = new Date();
  }
  next();
});

export default mongoose.model('BankDetails', bankDetailsSchema);