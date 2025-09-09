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
  discount: {
    type: Number,
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
  shipping: {
    type: String,
  },
  condition: {
    type: String,
  },
  warrentyMonths: {
    type: Number,
    default: 0,
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
  orderCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  stats: {
    totalOrders: {
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
  variants: [
    {
      name: { type: String }, // color name
      hex: { type: String }, // color hex code
      size: { type: String },
      stock: { type: Number, min: 0 },
    },
  ],

  tags: [
    {
      type: String,
    },
  ],
});

productSchema.pre("save", function (next) {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce(
      (acc, variant) => acc + (variant.stock || 0),
      0
    );
  }
  // else do nothing - keep stock as set manually

  next();
});

productSchema.index({
  categoryId: 1,
  category: 1,
  subcategory: 1,
  childCategory: 1,
});

export default mongoose.model("Product", productSchema);
