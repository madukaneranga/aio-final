import mongoose from "mongoose";

const impressionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for anonymous users
  },
  sessionId: {
    type: String,
    required: true, // UUID for session tracking
    index: true,
  },
  itemType: {
    type: String,
    enum: ["product", "service", "store"],
    required: true,
    index: true,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  metadata: {
    itemName: {
      type: String,
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false, // Not applicable for store impressions
    },
    storeName: {
      type: String,
      required: false,
    },
    categoryName: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: false, // Not applicable for store impressions
    },
    source: {
      type: String,
      enum: ["home", "category", "search", "store_page", "wishlist", "recommendations"],
      default: "home",
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  userAgent: {
    type: String,
    required: false,
  },
  ipAddress: {
    type: String,
    required: false,
  },
  // Additional tracking data
  viewportSize: {
    width: Number,
    height: Number,
  },
  deviceType: {
    type: String,
    enum: ["desktop", "tablet", "mobile"],
    required: false,
  },
  // For deduplication - prevent same item impression multiple times in same session
  deduplicationKey: {
    type: String,
    required: true,
    // Format: sessionId-itemType-itemId
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
impressionSchema.index({ sessionId: 1, itemType: 1, itemId: 1 });
impressionSchema.index({ itemType: 1, itemId: 1, timestamp: -1 });
impressionSchema.index({ userId: 1, timestamp: -1 });
impressionSchema.index({ "metadata.storeId": 1, timestamp: -1 });
impressionSchema.index({ deduplicationKey: 1 }, { unique: true });

// Static methods for analytics
impressionSchema.statics.getTopImpressions = async function(itemType, storeId = null, days = 30) {
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);
  
  const matchFilter = {
    itemType,
    timestamp: { $gte: dateFilter }
  };
  
  if (storeId && itemType !== 'store') {
    matchFilter['metadata.storeId'] = new mongoose.Types.ObjectId(storeId);
  }
  
  return this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$itemId",
        impressions: { $sum: 1 },
        uniqueSessions: { $addToSet: "$sessionId" },
        itemName: { $first: "$metadata.itemName" },
        price: { $first: "$metadata.price" },
        storeName: { $first: "$metadata.storeName" },
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: "$uniqueSessions" }
      }
    },
    {
      $project: {
        uniqueSessions: 0
      }
    },
    { $sort: { impressions: -1 } },
    { $limit: 20 }
  ]);
};

impressionSchema.statics.getImpressionsBySource = async function(itemType, days = 30) {
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        itemType,
        timestamp: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: "$metadata.source",
        impressions: { $sum: 1 },
        uniqueSessions: { $addToSet: "$sessionId" }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: "$uniqueSessions" }
      }
    },
    {
      $project: {
        source: "$_id",
        impressions: 1,
        uniqueSessionCount: 1,
        _id: 0
      }
    },
    { $sort: { impressions: -1 } }
  ]);
};

// Method to check if impression already exists (for deduplication)
impressionSchema.statics.hasImpression = async function(sessionId, itemType, itemId) {
  const deduplicationKey = `${sessionId}-${itemType}-${itemId}`;
  const existing = await this.findOne({ deduplicationKey });
  return !!existing;
};

// Method to safely create impression with deduplication
impressionSchema.statics.createImpression = async function(impressionData) {
  const { sessionId, itemType, itemId } = impressionData;
  const deduplicationKey = `${sessionId}-${itemType}-${itemId}`;
  
  // Check if impression already exists
  const existing = await this.findOne({ deduplicationKey });
  if (existing) {
    return { created: false, impression: existing, reason: 'duplicate' };
  }
  
  try {
    const impression = new this({
      ...impressionData,
      deduplicationKey
    });
    
    const saved = await impression.save();
    return { created: true, impression: saved };
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return { created: false, impression: null, reason: 'duplicate' };
    }
    throw error;
  }
};

// TTL index to automatically delete old impressions after 1 year
impressionSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
    background: true 
  }
);

export default mongoose.model("Impression", impressionSchema);