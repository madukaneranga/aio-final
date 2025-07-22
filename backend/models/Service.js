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
  priceType: {
    type: String,
    enum: ["fixed", "hourly"],
    default: "fixed",
  },
  images: [
    {
      type: String,
    },
  ],
  category: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  timeSlots: [
    {
      startTime: String,
      endTime: String,
    },
  ],
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
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Service", serviceSchema);
