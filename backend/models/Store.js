import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["product", "service"],
    required: true,
  },
  description: {
    type: String,
  },
  themeColor: {
    type: String,
    default: "#000000",
  },
  heroImages: [
    {
      type: String,
    },
  ],
  socialLinks: [
    {
      type: String,
    },
  ],
  idImages: [
    {
      type: String,
    },
  ],
  addressVerificationImages: [
    {
      type: String,
    },
  ],
  profileImage: {
    type: String,
    default: "",
  },
  timeSlots: [
    {
      day: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
      startTime: String,
      endTime: String,
    },
  ],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    whatsapp: {
      type: String,
      required: false,
    },
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  // NEW FIELDS ADDED FROM defaultStore
  isPremium: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  storeLevel: {
    type: String,
    enum: ["Bronze", "Silver", "Gold", "Premium"],
    default: "Bronze",
  },
  responseTime: {
    type: Number,
    default: 0,
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  badges: [
    {
      type: String,
    },
  ],
  operatingHours: {
    weekdays: {
      type: String,
      default: "9:00 AM - 6:00 PM",
    },
    weekends: {
      type: String,
      default: "10:00 AM - 4:00 PM",
    },
  },
  shippingInfo: {
    freeShipping: {
      type: Boolean,
      default: false,
    },
    deliveryDaysMin: {
      type: Number,
      default: 3,
    },
    deliveryDaysMax: {
      type: Number,
      default: 3,
    },
    areas: [
      {
        type: String,
      },
    ],
  },
  stats: {
    totalOrders: {
      type: Number,
      default: 0,
    },
    repeatCustomers: {
      type: Number,
      default: 0,
    },
    avgOrderValue: {
      type: Number,
      default: 0,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Store", storeSchema);
