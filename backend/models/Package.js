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
    type: [String], // List of features as strings
    default: [],
  },
});

export default mongoose.model("Package", packageSchema);
