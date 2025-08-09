import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
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
  images: [
    {
      type: String,
      required: true,
    },
  ],

  // Updated category structure
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
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

  stock: {
    type: Number,
    min: 5,
  },
  isPreorder: {
    type: Boolean,
    required: true,
    default: false,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
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

  variants: {
    colors: [
      {
        name: { type: String, trim: true },
        hex: { type: String },
      },
    ],
    sizes: [
      {
        name: { type: String, trim: true },
        inStock: { type: Boolean },
      },
    ],
  },
});

productSchema.index({
  categoryId: 1,
  category: 1,
  subcategory: 1,
  childCategory: 1,
});

export default mongoose.model("Product", productSchema);
