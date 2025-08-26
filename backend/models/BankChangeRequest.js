import mongoose from "mongoose";

const bankChangeRequestSchema = new mongoose.Schema({
  // User making the request
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Reference to current bank details
  currentBankDetailsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankDetails',
    required: true
  },
  
  // Snapshot of current bank details (for audit trail)
  currentDetails: {
    accountHolderName: String,
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    branchName: String,
    branchCode: String,
    accountType: String
  },
  
  // Requested new bank details
  requestedDetails: {
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
      required: true
    }
  },
  
  // Request details
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Supporting documents (optional)
  supportingDocuments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Request metadata
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Review details
  reviewedAt: {
    type: Date
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Security tracking
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // Auto-expiry for pending requests (30 days)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
bankChangeRequestSchema.index({ userId: 1, status: 1 });
bankChangeRequestSchema.index({ status: 1, requestedAt: -1 });
bankChangeRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 });

// Virtual: Request age in days
bankChangeRequestSchema.virtual('requestAge').get(function() {
  return Math.floor((new Date() - this.requestedAt) / (1000 * 60 * 60 * 24));
});

// Virtual: Is expired
bankChangeRequestSchema.virtual('isExpired').get(function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
});

// Method to get field changes comparison
bankChangeRequestSchema.methods.getChanges = function() {
  const changes = {};
  const currentDetails = this.currentDetails;
  const requestedDetails = this.requestedDetails;
  
  const fieldsToCheck = [
    'accountHolderName', 'bankName', 'accountNumber', 
    'routingNumber', 'branchName', 'branchCode', 'accountType'
  ];
  
  fieldsToCheck.forEach(field => {
    if (currentDetails[field] !== requestedDetails[field]) {
      changes[field] = {
        from: currentDetails[field],
        to: requestedDetails[field]
      };
    }
  });
  
  return changes;
};

// Method to approve request
bankChangeRequestSchema.methods.approve = async function(adminId, adminNotes = '') {
  const BankDetails = mongoose.model('BankDetails');
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update the change request
      this.status = 'approved';
      this.reviewedAt = new Date();
      this.reviewedBy = adminId;
      this.adminNotes = adminNotes;
      await this.save({ session });
      
      // Update the bank details
      const bankDetails = await BankDetails.findById(this.currentBankDetailsId).session(session);
      if (!bankDetails) {
        throw new Error('Bank details not found');
      }
      
      // Track the modification
      bankDetails.trackModification(
        this.userId, 
        this.getChanges(),
        `Approved change request: ${this.reason}`,
        this.ipAddress
      );
      
      // Update with new details
      Object.assign(bankDetails, this.requestedDetails);
      
      // Temporarily unlock for user to make edits after approval
      bankDetails.isLocked = false;
      bankDetails.lockReason = null;
      bankDetails.lockedAt = null;
      
      // Mark as unverified for security (will require re-verification)
      bankDetails.isVerified = false;
      bankDetails.verifiedAt = null;
      bankDetails.verifiedBy = null;
      
      await bankDetails.save({ session });
    });
    
    return this;
  } catch (error) {
    throw new Error(`Failed to approve change request: ${error.message}`);
  } finally {
    await session.endSession();
  }
};

// Method to reject request
bankChangeRequestSchema.methods.reject = function(adminId, adminNotes = '') {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  this.adminNotes = adminNotes;
  return this.save();
};

// Method to cancel request (by user)
bankChangeRequestSchema.methods.cancel = function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending requests can be cancelled');
  }
  this.status = 'cancelled';
  return this.save();
};

// Static method to create change request
bankChangeRequestSchema.statics.createChangeRequest = async function(data) {
  const BankDetails = mongoose.model('BankDetails');
  
  // Get current bank details
  const currentBankDetails = await BankDetails.findOne({ 
    userId: data.userId, 
    isActive: true 
  });
  
  if (!currentBankDetails) {
    throw new Error('No existing bank details found');
  }
  
  if (!currentBankDetails.isLocked) {
    throw new Error('Bank details are not locked. You can edit them directly.');
  }
  
  // Check for existing pending request
  const existingRequest = await this.findOne({
    userId: data.userId,
    status: 'pending'
  });
  
  if (existingRequest) {
    throw new Error('You already have a pending change request. Please wait for it to be reviewed.');
  }
  
  // Create snapshot of current details
  const currentDetails = {
    accountHolderName: currentBankDetails.accountHolderName,
    bankName: currentBankDetails.bankName,
    accountNumber: currentBankDetails.accountNumber,
    routingNumber: currentBankDetails.routingNumber,
    branchName: currentBankDetails.branchName,
    branchCode: currentBankDetails.branchCode,
    accountType: currentBankDetails.accountType
  };
  
  // Create the change request
  const changeRequest = new this({
    userId: data.userId,
    currentBankDetailsId: currentBankDetails._id,
    currentDetails,
    requestedDetails: data.requestedDetails,
    reason: data.reason,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    supportingDocuments: data.supportingDocuments || []
  });
  
  return await changeRequest.save();
};

// Static method to get pending requests for admin
bankChangeRequestSchema.statics.getPendingRequests = function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({ status: 'pending' })
    .populate('userId', 'name email')
    .populate('reviewedBy', 'name email')
    .sort({ requestedAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get user's requests
bankChangeRequestSchema.statics.getUserRequests = function(userId) {
  return this.find({ userId })
    .populate('reviewedBy', 'name email')
    .sort({ requestedAt: -1 })
    .limit(10);
};

export default mongoose.model('BankChangeRequest', bankChangeRequestSchema);