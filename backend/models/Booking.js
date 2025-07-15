import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    required: true
  },
  combinedId: { type: String, index: true },  // optional index for quick lookup

  storeAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['paid','pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  paymentDetails: {
    transactionId: String,
    paymentStatus: String,
    paidAt: Date,
    paymentMethod: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Booking', bookingSchema);