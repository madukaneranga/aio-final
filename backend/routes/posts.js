import express from "express";
import Post from "../models/Post.js";
import PostLike from "../models/PostLike.js";
import PostComment from "../models/PostComment.js";
import CommentLike from "../models/CommentLike.js";
import CommentReaction from "../models/CommentReaction.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import { validateMediaUrls, determineMediaType } from "../utils/validation.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Helper function to parse hashtags
const parseHashtags = (hashtagString) => {
  if (!hashtagString) return [];
  return hashtagString
    .split(/\s+/)
    .filter((tag) => tag.startsWith("#"))
    .map((tag) => tag.slice(1).toLowerCase())
    .filter((tag) => tag.length > 0);
};

// Helper function to calculate engagement score
const calculateEngagementScore = (
  likes,
  comments,
  views,
  shares,
  ageInHours
) => {
  const baseScore = likes * 3 + comments * 5 + shares * 10;
  const viewRate = views > 0 ? baseScore / views : 0;
  const timeDecay = Math.max(0.1, 1 / (1 + ageInHours * 0.1));
  return baseScore * (1 + viewRate) * timeDecay;
};

// CREATE POST
router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, hashtags, taggedProducts, mediaUrls } =
      req.body;
    const userId = req.user.id;

    // Validation
    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one media URL is required" });
    }

    // Validate media URLs and determine type
    validateMediaUrls(mediaUrls);
    const mediaType = determineMediaType(mediaUrls);

    // Validate media constraints
    if (mediaType === "video" && mediaUrls.length > 1) {
      return res.status(400).json({ error: "Only one video allowed per post" });
    }

    if (mediaType === "images" && mediaUrls.length > 5) {
      return res
        .status(400)
        .json({ error: "Maximum 5 images allowed per post" });
    }

    // Parse hashtags
    const parsedHashtags = parseHashtags(hashtags);

    // Validate tagged products
    let validatedProducts = [];
    if (taggedProducts) {
      const productIds = Array.isArray(taggedProducts)
        ? taggedProducts
        : [taggedProducts];
      validatedProducts = await Product.find({
        _id: { $in: productIds },
      }).select("_id");
    }

    // Create post
    const post = new Post({
      title: title.trim(),
      description: description?.trim() || "",
      hashtags: parsedHashtags,
      mediaUrls,
      mediaType,
      taggedProducts: validatedProducts.map((p) => p._id),
      userId,
    });

    await post.save();

    // Populate post data for response
    const populatedPost = await Post.findById(post._id)
      .populate("userId", "username profilePicture")
      .populate("taggedProducts", "name price image");

    res.status(201).json({
      success: true,
      post: populatedPost,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({
      error: error.message || "Failed to create post",
    });
  }
});

// GET FEED (Algorithmic - keep liked posts but lower priority)
router.get("/feed", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get user's liked posts
    const userLikes = await PostLike.find({ userId }).select("postId");
    const likedPostIds = userLikes.map((like) => like.postId);

    const posts = await Post.aggregate([
      {
        $match: { status: "active" },
      },
      {
        $addFields: {
          ageInHours: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60,
            ],
          },
          alreadyLiked: { $in: ["$_id", likedPostIds] },
        },
      },
      {
        $addFields: {
          calculatedScore: {
            $add: [
              { $multiply: ["$likes", 3] },
              { $multiply: ["$comments", 5] },
              { $multiply: ["$shares", 10] },
              { $cond: ["$isPromoted", 100, 0] },
            ],
          },
        },
      },
      {
        $addFields: {
          finalScore: {
            $multiply: [
              "$calculatedScore",
              {
                $max: [
                  0.1,
                  {
                    $divide: [
                      1,
                      { $add: [1, { $multiply: ["$ageInHours", 0.1] }] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      // Push not-liked posts first, then by score
      { $sort: { alreadyLiked: 1, finalScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { username: 1, profilePicture: 1 } }],
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "taggedProducts",
          foreignField: "_id",
          as: "products",
          pipeline: [{ $project: { name: 1, price: 1, image: 1 } }],
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

// GET USER POSTS
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      userId,
      status: "active",
    })
      .populate("userId", "username profilePicture")
      .populate("taggedProducts", "name price image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    console.error("User posts error:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// LIKE POST
router.post("/:postId/like", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const existingLike = await PostLike.findOne({ userId, postId });

    if (existingLike) {
      // Unlike
      await PostLike.deleteOne({ userId, postId });
      await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });

      res.json({ success: true, liked: false });
    } else {
      // Like
      await PostLike.create({ userId, postId });
      await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });

      res.json({ success: true, liked: true });
    }

    // Update engagement score
    const post = await Post.findById(postId);
    if (post) {
      const ageInHours = (Date.now() - post.createdAt) / (1000 * 60 * 60);
      const newScore = calculateEngagementScore(
        post.likes,
        post.comments,
        post.views,
        post.shares,
        ageInHours
      );
      await Post.findByIdAndUpdate(postId, { engagementScore: newScore });
    }
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ error: "Failed to update like" });
  }
});

// ADD COMMENT
router.post("/:postId/comment", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentComment } = req.body;
    const userId = req.user.id;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const comment = new PostComment({
      userId,
      postId,
      text: text.trim(),
      parentComment: parentComment || null,
    });

    await comment.save();
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });

    const populatedComment = await PostComment.findById(comment._id).populate(
      "userId",
      "username profilePicture"
    );

    res.status(201).json({
      success: true,
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET POST COMMENTS
router.get("/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await PostComment.find({
      postId,
      parentComment: null,
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        hasMore: comments.length === limit,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// SEARCH PRODUCTS (for tagging)
router.get("/products/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, products: [] });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ],
      status: "active",
    })
      .select("name price image category")
      .limit(10);

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Product search error:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

// INCREMENT VIEW COUNT
router.post("/:postId/view", async (req, res) => {
  try {
    const { postId } = req.params;

    await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });

    res.json({ success: true });
  } catch (error) {
    console.error("View increment error:", error);
    res.status(500).json({ error: "Failed to update view count" });
  }
});

router.get("/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.user?.id; // Optional user for like status

    // Get top-level comments (no parent)
    const comments = await PostComment.find({
      postId,
      parentComment: null,
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user's comment likes if authenticated
    let userCommentLikes = [];
    let userReactions = [];
    if (userId) {
      const commentIds = comments.map((c) => c._id);
      userCommentLikes = await CommentLike.find({
        userId,
        commentId: { $in: commentIds },
      }).select("commentId");

      userReactions = await CommentReaction.find({
        userId,
        commentId: { $in: commentIds },
      }).select("commentId reactionType");
    }

    // Add user interaction status to comments
    const commentsWithStatus = comments.map((comment) => ({
      ...comment,
      isLiked: userCommentLikes.some(
        (like) => like.commentId.toString() === comment._id.toString()
      ),
      userReaction:
        userReactions.find(
          (reaction) => reaction.commentId.toString() === comment._id.toString()
        )?.reactionType || null,
    }));

    res.json({
      success: true,
      comments: commentsWithStatus,
      pagination: {
        page,
        limit,
        hasMore: comments.length === limit,
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// GET COMMENT REPLIES
router.get("/comments/:commentId/replies", async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user?.id;

    const replies = await PostComment.find({
      parentComment: commentId,
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: 1 }) // Oldest first for replies
      .skip(skip)
      .limit(limit)
      .lean();

    // Get user's likes and reactions for replies
    let userCommentLikes = [];
    let userReactions = [];
    if (userId) {
      const replyIds = replies.map((r) => r._id);
      userCommentLikes = await CommentLike.find({
        userId,
        commentId: { $in: replyIds },
      }).select("commentId");

      userReactions = await CommentReaction.find({
        userId,
        commentId: { $in: replyIds },
      }).select("commentId reactionType");
    }

    const repliesWithStatus = replies.map((reply) => ({
      ...reply,
      isLiked: userCommentLikes.some(
        (like) => like.commentId.toString() === reply._id.toString()
      ),
      userReaction:
        userReactions.find(
          (reaction) => reaction.commentId.toString() === reply._id.toString()
        )?.reactionType || null,
    }));

    res.json({
      success: true,
      replies: repliesWithStatus,
      pagination: {
        page,
        limit,
        hasMore: replies.length === limit,
      },
    });
  } catch (error) {
    console.error("Get replies error:", error);
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

// ADD COMMENT (UPDATED)
router.post("/:postId/comment", authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentComment } = req.body;
    const userId = req.user.id;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    if (text.length > 2200) {
      return res.status(400).json({ error: "Comment is too long" });
    }

    // Validate parent comment exists if provided
    if (parentComment) {
      const parentExists = await PostComment.findById(parentComment);
      if (!parentExists) {
        return res.status(400).json({ error: "Parent comment not found" });
      }
    }

    const comment = new PostComment({
      userId,
      postId,
      text: text.trim(),
      parentComment: parentComment || null,
    });

    await comment.save();

    // Update post comment count
    await Post.findByIdAndUpdate(postId, { $inc: { comments: 1 } });

    // Update parent comment reply count if this is a reply
    if (parentComment) {
      await PostComment.findByIdAndUpdate(parentComment, {
        $inc: { replyCount: 1 },
      });
    }

    const populatedComment = await PostComment.findById(comment._id)
      .populate("userId", "username profilePicture")
      .lean();

    res.status(201).json({
      success: true,
      comment: {
        ...populatedComment,
        isLiked: false,
        userReaction: null,
      },
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// LIKE/UNLIKE COMMENT
router.post(
  "/comments/:commentId/like",
  authenticate,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const existingLike = await CommentLike.findOne({ userId, commentId });

      if (existingLike) {
        // Unlike
        await CommentLike.deleteOne({ userId, commentId });
        await PostComment.findByIdAndUpdate(commentId, { $inc: { likes: -1 } });

        res.json({ success: true, liked: false });
      } else {
        // Like
        await CommentLike.create({ userId, commentId });
        await PostComment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } });

        res.json({ success: true, liked: true });
      }
    } catch (error) {
      console.error("Like comment error:", error);
      res.status(500).json({ error: "Failed to update like" });
    }
  }
);

// ADD/UPDATE COMMENT REACTION
router.post(
  "/comments/:commentId/reaction",
  authenticate,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reactionType } = req.body;
      const userId = req.user.id;

      const validReactions = ["like", "love", "laugh", "wow", "sad", "angry"];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }

      const existingReaction = await CommentReaction.findOne({
        userId,
        commentId,
      });

      if (existingReaction) {
        if (existingReaction.reactionType === reactionType) {
          // Remove reaction if same type
          await CommentReaction.deleteOne({ userId, commentId });
          await PostComment.findByIdAndUpdate(commentId, {
            $inc: { [`reactions.${reactionType}`]: -1 },
          });

          res.json({ success: true, reaction: null });
        } else {
          // Update reaction type
          const oldType = existingReaction.reactionType;
          existingReaction.reactionType = reactionType;
          await existingReaction.save();

          await PostComment.findByIdAndUpdate(commentId, {
            $inc: {
              [`reactions.${oldType}`]: -1,
              [`reactions.${reactionType}`]: 1,
            },
          });

          res.json({ success: true, reaction: reactionType });
        }
      } else {
        // Add new reaction
        await CommentReaction.create({ userId, commentId, reactionType });
        await PostComment.findByIdAndUpdate(commentId, {
          $inc: { [`reactions.${reactionType}`]: 1 },
        });

        res.json({ success: true, reaction: reactionType });
      }
    } catch (error) {
      console.error("Reaction error:", error);
      res.status(500).json({ error: "Failed to update reaction" });
    }
  }
);

// DELETE COMMENT
router.delete("/comments/:commentId", authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await PostComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    // Delete all replies if this is a parent comment
    if (!comment.parentComment) {
      const replyCount = await PostComment.countDocuments({
        parentComment: commentId,
      });
      await PostComment.deleteMany({ parentComment: commentId });

      // Update post comment count
      await Post.findByIdAndUpdate(comment.postId, {
        $inc: { comments: -(replyCount + 1) },
      });
    } else {
      // Update parent reply count and post count
      await PostComment.findByIdAndUpdate(comment.parentComment, {
        $inc: { replyCount: -1 },
      });
      await Post.findByIdAndUpdate(comment.postId, { $inc: { comments: -1 } });
    }

    // Delete the comment
    await PostComment.findByIdAndDelete(commentId);

    // Clean up related data
    await CommentLike.deleteMany({ commentId });
    await CommentReaction.deleteMany({ commentId });

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
