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
  reviewed: {
    type: Boolean,
    default: false,
  },
  storeAmount: {
    type: Number,
    required: true,
  },
  combinedId: { type: String, index: true }, // optional index for quick lookup

  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "completed",
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
    paymentStatus: {
      type: String,
      enum: [
        "paid",
        "pending",
        "failed",
        "pending_bank_transfer",
        "customer_paid_pending_confirmation",
        "cod_pending",
      ],
    },
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ["stripe", "bank_transfer", "cod", "wallet"],
    },
    authorizationToken: String,
    bankTransferReference: String,
    updatedAt: Date,
    updatedBy: String,
  },
  trackingNumber: String,
  notes: String,
  
  // Customer delivery confirmation for COD
  canCustomerUpdateStatus: {
    type: Boolean,
    default: false,
  },

  // Order completion tracking
  deliveredAt: {
    type: Date,
  },
  customerConfirmationDeadline: {
    type: Date,
  },
  confirmedAt: {
    type: Date,
  },
  autoConfirmedAt: {
    type: Date,
  },
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
  updatedAt: {
    type: Date,
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
