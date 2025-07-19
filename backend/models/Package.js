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
  maxItems: {
    type: Number,
    default: 8,
  },
  maxHeaderImgs: {
    type: Number,
    default: 2,
  },
  maxItemImgs: {
    type: Number,
    default: 3,
  },
  itemVariant: {
    type: Boolean,
    default: false,
  },
  themeColor: {
    type: Boolean,
    default: false,
  },
  analytics: {
    type: Boolean,
    default: false,
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
