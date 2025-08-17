// models/Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  mediaUrls: [{
    type: String,
    required: true
  }],
  mediaType: {
    type: String,
    enum: ['images', 'video'],
    required: true
  },
  taggedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Engagement metrics
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  // Algorithm factors
  engagementScore: {
    type: Number,
    default: 0
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'reported', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for better performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ engagementScore: -1, createdAt: -1 });
postSchema.index({ 'taggedProducts': 1 });

export default mongoose.model('Post', postSchema);