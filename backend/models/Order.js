import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  platformFee: {
    type: Number,
    required: true,
  },
  storeAmount: {
    type: Number,
    required: true,
  },
  combinedId: { type: String, index: true }, // optional index for quick lookup

  status: {
    type: String,
    enum: [
      "paid",
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  paymentDetails: {
    transactionId: String,
    paymentStatus: String,
    paidAt: Date,
    paymentMethod: String,
    authorizationToken: String,
  },
  trackingNumber: String,
  notes: String,
  statusHistory: [
    {
      status: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      notes: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add status to history when status changes
orderSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (update.status) {
    if (!update.$push) update.$push = {};
    update.$push.statusHistory = {
      status: update.status,
      timestamp: new Date(),
      notes: update.notes || "",
    };
  }
});

export default mongoose.model("Order", orderSchema);
