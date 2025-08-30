import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  reviewed: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  bookingDetails: {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // Format: "HH:MM"
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:MM"
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    timeZone: {
      type: String,
      default: "Asia/Colombo",
    },
    notes: String,
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    reason: String,
    refundIssued: {
      type: Boolean,
      default: false,
    },
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  combinedId: { type: String, index: true }, // optional index for quick lookup

  storeAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending",
  },

  paymentDetails: {
    transactionId: String,
    paymentStatus: String,
    paidAt: Date,
    paymentMethod: String,
    authorizationToken: String,
    bankTransferReference: String,
  },
  refundDetails: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    transactionId: String,
  },
  
  // Customer delivery confirmation for COD
  canCustomerUpdateStatus: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

export default mongoose.model("Booking", bookingSchema);
