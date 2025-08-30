// models/Package.js
import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["basic", "standard", "pro", "premium"],
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    default: 1500,
  },
  features: {
    type: [String],
    default: [],
  },
  items: {
    type: Number,
    default: 8,
  },
  themeColor: {
    type: Boolean,
    default: false,
  },
  analytics: {
    type: Boolean,
    default: false,
  },
  analyticsLevel: {
    type: Number,
    enum: [0, 1, 2, 3],
    default: 0,
  },
  analyticsFeatures: {
    type: [String],
    default: [],
  },
  businessCard: {
    type: Boolean,
    default: false,
  },
  invoices: {
    type: Boolean,
    default: false,
  },
  socialButtons: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Package", packageSchema);
