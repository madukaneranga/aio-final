import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
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
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0.07 // 7%
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  storeAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['order', 'booking'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Commission', commissionSchema);