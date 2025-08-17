import mongoose from "mongoose";
const commentLikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostComment",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
export default mongoose.model("CommentLike", commentLikeSchema);
