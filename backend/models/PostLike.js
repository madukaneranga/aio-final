// models/PostLike.js
import mongoose from 'mongoose';

const postLikeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  }
}, {
  timestamps: true
});

postLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
export default mongoose.model('PostLike', postLikeSchema);
