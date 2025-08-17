import mongoose from "mongoose";

const commentReactionSchema = new mongoose.Schema(
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
    reactionType: {
      type: String,
      enum: ["like", "love", "laugh", "wow", "sad", "angry"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

commentReactionSchema.index({ userId: 1, commentId: 1 }, { unique: true });
export default mongoose.model("CommentReaction", commentReactionSchema);
