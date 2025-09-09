import mongoose from "mongoose";

const bankDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  // History of previous bank details when changes are requested
  history: [{
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    branchName: String,
    branchCode: String,
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'business']
    },
    archivedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: 'change_request'
    },
    wasVerified: {
      type: Boolean,
      default: false
    }
  }],
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

// Indexes for performance optimization
bankDetailsSchema.index({ userId: 1 });
bankDetailsSchema.index({ userId: 1, isActive: 1 });
bankDetailsSchema.index({ isVerified: 1 });

// Method to mask account number for display
bankDetailsSchema.methods.getMaskedAccountNumber = function() {
  const accountNumber = this.accountNumber;
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
};

// Method to archive current details before making changes
bankDetailsSchema.methods.archiveCurrentDetails = function(reason = 'change_request') {
  // Archive current details to history
  this.history.push({
    accountHolderName: this.accountHolderName,
    bankName: this.bankName,
    accountNumber: this.accountNumber,
    branchName: this.branchName,
    branchCode: this.branchCode,
    accountType: this.accountType,
    archivedAt: new Date(),
    reason: reason,
    wasVerified: this.isVerified
  });
  
  return this;
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

// Method to check if details can be modified (always true now since we removed locking)
bankDetailsSchema.methods.canModify = function() {
  return true;
};

// Method to get verification status info
bankDetailsSchema.methods.getVerificationInfo = function() {
  return {
    isVerified: this.isVerified,
    verifiedAt: this.verifiedAt,
    verifiedBy: this.verifiedBy,
    canModify: this.canModify()
  };
};

export default mongoose.model('BankDetails', bankDetailsSchema);