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
  }
}, {
  timestamps: true
});

// Method to mask account number for display
bankDetailsSchema.methods.getMaskedAccountNumber = function() {
  const accountNumber = this.accountNumber;
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
};

export default mongoose.model('BankDetails', bankDetailsSchema);