import mongoose from "mongoose";

const { Schema } = mongoose;

const contactRevealSchema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    revealedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revealedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    unitCredits: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    dedupeKey: {
      type: String,
      required: true,
      index: { unique: true },
    },
    walletTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
      required: true,
    },
    metadata: {
      ipAddress: {
        type: String,
        required: true,
      },
      userAgent: String,
      sessionId: String,
      referer: String,
    },
    status: {
      type: String,
      enum: ["completed", "failed", "refunded"],
      default: "completed",
    },
    contactDetails: {
      email: String,
      phone: String,
      whatsapp: String,
      address: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
contactRevealSchema.index({ storeId: 1, revealedAt: -1 });
contactRevealSchema.index({ revealedByUserId: 1, revealedAt: -1 });
contactRevealSchema.index({ status: 1 });

// Static method: Check if user can reveal (dedupe check)
contactRevealSchema.statics.canUserReveal = async function (userId, storeId) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dedupeKey = `${userId}_${storeId}_${todayStr}`;
    
    const existingReveal = await this.findOne({ dedupeKey });
    return !existingReveal;
  } catch (error) {
    throw new Error(`Failed to check reveal eligibility: ${error.message}`);
  }
};

// Static method: Create reveal record
contactRevealSchema.statics.createReveal = async function (data) {
  try {
    const { userId, storeId, walletTransactionId, metadata, unitCredits = 1 } = data;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dedupeKey = `${userId}_${storeId}_${todayStr}`;
    
    const reveal = new this({
      storeId,
      revealedByUserId: userId,
      unitCredits,
      dedupeKey,
      walletTransactionId,
      metadata,
      revealedAt: new Date(),
    });
    
    await reveal.save();
    return reveal;
  } catch (error) {
    throw new Error(`Failed to create reveal record: ${error.message}`);
  }
};

// Static method: Get reveal analytics for store owner
contactRevealSchema.statics.getStoreAnalytics = async function (storeId, period = 'month') {
  try {
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const analytics = await this.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          revealedAt: { $gte: startDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$revealedAt" } },
          },
          reveals: { $sum: 1 },
          credits: { $sum: "$unitCredits" },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);
    
    const totalReveals = await this.countDocuments({
      storeId,
      status: "completed",
    });
    
    const totalCreditsEarned = await this.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$unitCredits" },
        },
      },
    ]);
    
    return {
      analytics,
      totalReveals,
      totalCreditsEarned: totalCreditsEarned[0]?.total || 0,
      period,
    };
  } catch (error) {
    throw new Error(`Failed to get store analytics: ${error.message}`);
  }
};

// Static method: Get user's reveal history
contactRevealSchema.statics.getUserHistory = async function (userId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const reveals = await this.find({ revealedByUserId: userId })
      .populate('storeId', 'name profileImage type')
      .sort({ revealedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await this.countDocuments({ revealedByUserId: userId });
    
    return {
      reveals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to get user history: ${error.message}`);
  }
};

// Virtual: formatted date
contactRevealSchema.virtual("formattedDate").get(function () {
  return this.revealedAt.toLocaleDateString();
});

export default mongoose.model("ContactReveal", contactRevealSchema);