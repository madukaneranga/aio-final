import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema({
  // PayHere Processing Fee Settings
  paymentProcessing: {
    payhereProcessingFee: {
      type: Number,
      default: 0.04, // Fixed 4% PayHere processing fee
      min: 0.04,
      max: 0.04 // Fixed rate, not configurable
    },
    description: {
      type: String,
      default: "PayHere processing fee - 4% of total transaction amount"
    }
  },

  // Subscription Settings
  subscriptionSettings: {
    monthlyPrice: {
      type: Number,
      default: 1000, // LKR 1000
      min: 0
    },
    currency: {
      type: String,
      default: 'LKR'
    },
    duration: {
      type: Number,
      default: 30, // days
      min: 1
    },
    trialPeriod: {
      type: Number,
      default: 0, // days
      min: 0
    }
  },

  // Payment Processing Settings
  paymentSettings: {
    processingFee: {
      type: Number,
      default: 0.03, // 3%
      min: 0,
      max: 1
    },
    minimumAmount: {
      type: Number,
      default: 100, // LKR 100
      min: 0
    },
    maximumAmount: {
      type: Number,
      default: 1000000, // LKR 1M
      min: 0
    },
    supportedMethods: [{
      id: String,
      name: String,
      description: String,
      enabled: {
        type: Boolean,
        default: true
      },
      processingFee: Number
    }]
  },

  // Platform Configuration
  platformConfig: {
    maxProductsPerStore: {
      type: Number,
      default: 1000,
      min: 1
    },
    maxServicesPerStore: {
      type: Number,
      default: 100,
      min: 1
    },
    maxImagesPerProduct: {
      type: Number,
      default: 10,
      min: 1
    },
    maxImagesPerService: {
      type: Number,
      default: 5,
      min: 1
    },
    maxFileSize: {
      type: Number,
      default: 10485760, // 10MB in bytes
      min: 1048576 // 1MB minimum
    },
    allowedFileTypes: [{
      type: String,
      default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }],
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      default: 'The platform is currently under maintenance. Please try again later.'
    }
  },

  // Feature Flags
  features: {
    enableReviews: {
      type: Boolean,
      default: true
    },
    enableSubscriptions: {
      type: Boolean,
      default: true
    },
    enableAnalytics: {
      type: Boolean,
      default: true
    },
    enableNotifications: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
platformSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure only one settings document exists
platformSettingsSchema.index({ version: 1 }, { unique: true });

export default mongoose.model('PlatformSettings', platformSettingsSchema);