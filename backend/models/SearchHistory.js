import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema({
  // For authenticated users
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  // For guest users  
  guestId: {
    type: String,
    default: null
  },
  query: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // TTL for guest records (expire after 30 days)
  expiresAt: {
    type: Date,
    default: function() {
      // Only set expiration for guest records
      return this.guestId ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined;
    }
  }
});

// Compound index for efficient querying
searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ guestId: 1, createdAt: -1 });

// TTL index for guest records
searchHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Validation: Either userId or guestId must be present
searchHistorySchema.pre('save', function(next) {
  if (!this.userId && !this.guestId) {
    return next(new Error('Either userId or guestId must be provided'));
  }
  if (this.userId && this.guestId) {
    return next(new Error('Cannot have both userId and guestId'));
  }
  next();
});

export default mongoose.model("SearchHistory", searchHistorySchema);