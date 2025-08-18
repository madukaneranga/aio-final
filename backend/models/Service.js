import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  oldPrice: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    min: 0,
  },
  duration: {
    type: Number,
    required: true,
    min: 30,
  },
  images: [
    {
      type: String,
    },
  ],
  category: {
    type: String,
    required: true,
    trim: true,
  },
  subcategory: {
    type: String,
    required: true,
    trim: true,
  },
  childCategory: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  bookingSettings: {
    maxAdvanceBookingDays: Number, // Override store setting if needed
    minAdvanceBookingHours: {
      type: Number,
      default: 1,
    },
    maxBookingsPerDay: Number,
    maxBookingsPerSlot: {
      type: Number,
      default: 1,
    },
  },
  duration: {
    type: Number, // in minutes
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  stats: {
    totalBookings: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 98,
    },
    impressions: {
      type: Number,
      default: 0,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

serviceSchema.index({
  categoryId: 1,
  category: 1,
  subcategory: 1,
  childCategory: 1,
});

export default mongoose.model("Service", serviceSchema);
