import mongoose from "mongoose";

const addonsSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  currency: { type: String, default: "LKR" },
  recurrence: { type: String, default: "1 Month" }, // PayHere expects "1 Month", "3 Months", etc.
  duration: { type: String, default: "Forever" }, // Or "12" for 12 cycles
});
export default mongoose.model("Addon", orderSchema);
