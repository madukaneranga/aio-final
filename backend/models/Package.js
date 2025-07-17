import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: [
      "basic",
      "standard",
      "pro",
      "premium",
    ],
    default: "basic",
  },
  amount: {
    type: Number,
    default: 1500
  }
});

export default mongoose.model("Package", packageSchema);
