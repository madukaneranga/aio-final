import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  plan: {
    type: String,
    enum: ['monthly'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true,
    default: 1000 // LKR 1000 per month
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  localPaymentId: String,
  paymentHistory: [{
    amount: Number,
    currency: String,
    paidAt: Date,
    localPaymentId: String,
    status: String,
    paymentMethod: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-set end date to 30 days from start date
subscriptionSchema.pre('save', function(next) {
  if (this.isNew && !this.endDate) {
    this.endDate = new Date(this.startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  next();
});

export default mongoose.model('Subscription', subscriptionSchema);