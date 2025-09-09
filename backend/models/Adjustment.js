import mongoose from "mongoose";
const { Schema } = mongoose;

const adjustmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    reason: { type: String, required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

adjustmentSchema.index({ userId: 1, type: 1 });

export default mongoose.model("Adjustment", adjustmentSchema);
