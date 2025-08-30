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
  socialLinks: {
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
    youtube: {
      type: String,
    },
    tiktok: {
      type: String,
    },
    linkedin: {
      type: String,
    },
    pinterest: {
      type: String,
    },
    snapchat: {
      type: String,
    },
    website: {
      type: String,
    },
  },

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
    default: true,
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
  canReuploadDocs: {
    type: Boolean,
    default: true, // Allow initial upload, then lock after first submission
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
  badges: [
    {
      type: String,
    },
  ],
  serviceSettings: {
    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
    },
    workingDays: {
      type: [String],
      default: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    excludedDates: { type: [Date], default: [] },
    timeZone: { type: String, default: "Asia/Colombo" },
    bookingBuffer: { type: Number, default: 0 },
    advanceBookingDays: { type: Number, default: 30 },
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
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  stats: {
    totalOrdersOrBookings: {
      type: Number,
      default: 0,
    },
    followersCount: {
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual field for avgPurchaseAmount - automatically calculated
storeSchema.virtual("stats.avgPurchaseAmount").get(function () {
  if (
    !this.stats.totalOrdersOrBookings ||
    this.stats.totalOrdersOrBookings === 0
  ) {
    return 0;
  }
  return (
    Math.round((this.totalSales / this.stats.totalOrdersOrBookings) * 100) / 100
  );
});

// Virtual field for completionRate - calculated from actual orders/bookings
// Note: This is a placeholder that will be populated by the route handlers
// since we need to perform database aggregation queries
storeSchema.virtual("completionRate").get(function () {
  // This will be populated by route handlers using aggregation
  return this._completionRate || 0;
});

storeSchema.virtual("stats.completionRate").get(function () {
  // This will be populated by route handlers using aggregation  
  return this._completionRate || 0;
});

// Ensure virtuals are included when converting to JSON/Object
storeSchema.set("toJSON", { virtuals: true });
storeSchema.set("toObject", { virtuals: true });

export default mongoose.model("Store", storeSchema);
