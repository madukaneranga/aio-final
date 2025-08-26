import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  color: {
    name: { type: String, trim: true },
    hex: { type: String },
  },
  size: {
    name: { type: String, trim: true },
  },
  sku: { type: String, trim: true },
  stock: { type: Number, default: 0, min: 0 },
  price: { type: Number, min: 0 },
});

export default mongoose.model("Variant", variantSchema);