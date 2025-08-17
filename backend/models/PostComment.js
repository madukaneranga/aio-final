import mongoose from 'mongoose';

const postCommentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxLength: 2200
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostComment',
    default: null
  },
  likes: {
    type: Number,
    default: 0
  },
  replyCount: {
    type: Number,
    default: 0
  },
  reactions: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 },
    wow: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    angry: { type: Number, default: 0 }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
postCommentSchema.index({ postId: 1, parentComment: 1, createdAt: -1 });
postCommentSchema.index({ parentComment: 1, createdAt: 1 });
postCommentSchema.index({ userId: 1 });

export default mongoose.model('PostComment', postCommentSchema);

