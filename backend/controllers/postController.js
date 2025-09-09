import mongoose from "mongoose";
import Post from "../models/Post.js";
import PostLike from "../models/PostLike.js";
import PostComment from "../models/PostComment.js";
import CommentLike from "../models/CommentLike.js";
import CommentReaction from "../models/CommentReaction.js";
import Product from "../models/Product.js";
import { validateMediaUrls, determineMediaType } from "../utils/validation.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import  logger  from "../utils/logger.js";

class PostController {
  // Helper function to parse hashtags
  parseHashtags(hashtagString) {
    if (!hashtagString) return [];
    return hashtagString
      .split(/\s+/)
      .filter((tag) => tag.startsWith("#"))
      .map((tag) => tag.slice(1).toLowerCase())
      .filter((tag) => tag.length > 0);
  }

  // Helper function to calculate engagement score
  calculateEngagementScore(likes, comments, views, shares, ageInHours) {
    const baseScore = likes * 3 + comments * 5 + shares * 10;
    const viewRate = views > 0 ? baseScore / views : 0;
    const timeDecay = Math.max(0.1, 1 / (1 + ageInHours * 0.1));
    return baseScore * (1 + viewRate) * timeDecay;
  }

  // Create Post
  async createPost(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { title, description, hashtags, taggedProducts, mediaUrls } = req.body;
      const userId = req.user.id;

      // Validation
      if (!title?.trim()) {
        return res.status(400).json(errorResponse("Title is required", 400));
      }

      if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        return res.status(400).json(errorResponse("At least one media URL is required", 400));
      }

      // Validate media URLs and determine type
      validateMediaUrls(mediaUrls);
      const mediaType = determineMediaType(mediaUrls);

      // Validate media constraints
      if (mediaType === "video" && mediaUrls.length > 1) {
        return res.status(400).json(errorResponse("Only one video allowed per post", 400));
      }

      if (mediaType === "images" && mediaUrls.length > 5) {
        return res.status(400).json(errorResponse("Maximum 5 images allowed per post", 400));
      }

      // Parse hashtags
      const parsedHashtags = this.parseHashtags(hashtags);

      // Validate tagged products
      let validatedProducts = [];
      if (taggedProducts) {
        const productIds = Array.isArray(taggedProducts) ? taggedProducts : [taggedProducts];
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

      res.status(201).json(successResponse({ post: populatedPost }, "Post created successfully"));
    } catch (error) {
      logger.error("Create post error", error);
      res.status(500).json(errorResponse(error.message || "Failed to create post"));
    }
  }

  // Get Feed (Algorithmic)
  async getFeed(req, res) {
    logger.route(req.method, req.originalUrl);

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

      res.json(successResponse({
        posts,
        pagination: {
          page,
          limit,
          hasMore: posts.length === limit,
        },
      }));
    } catch (error) {
      logger.error("Feed error", error);
      res.status(500).json(errorResponse("Failed to fetch feed"));
    }
  }

  // Get User Posts
  async getUserPosts(req, res) {
    logger.route(req.method, req.originalUrl);

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

      res.json(successResponse({
        posts,
        pagination: {
          page,
          limit,
          hasMore: posts.length === limit,
        },
      }));
    } catch (error) {
      logger.error("User posts error", error);
      res.status(500).json(errorResponse("Failed to fetch user posts"));
    }
  }

  // Like/Unlike Post
  async togglePostLike(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { postId } = req.params;
      const userId = req.user.id;

      const existingLike = await PostLike.findOne({ userId, postId });

      if (existingLike) {
        // Unlike
        await PostLike.deleteOne({ userId, postId });
        await Post.findByIdAndUpdate(postId, { $inc: { likes: -1 } });

        res.json(successResponse({ liked: false }));
      } else {
        // Like
        await PostLike.create({ userId, postId });
        await Post.findByIdAndUpdate(postId, { $inc: { likes: 1 } });

        res.json(successResponse({ liked: true }));
      }

      // Update engagement score
      const post = await Post.findById(postId);
      if (post) {
        const ageInHours = (Date.now() - post.createdAt) / (1000 * 60 * 60);
        const newScore = this.calculateEngagementScore(
          post.likes,
          post.comments,
          post.views,
          post.shares,
          ageInHours
        );
        await Post.findByIdAndUpdate(postId, { engagementScore: newScore });
      }
    } catch (error) {
      logger.error("Like post error", error);
      res.status(500).json(errorResponse("Failed to update like"));
    }
  }

  // Increment View Count
  async incrementViewCount(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { postId } = req.params;

      await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });

      res.json(successResponse({ message: "View count updated" }));
    } catch (error) {
      logger.error("View increment error", error);
      res.status(500).json(errorResponse("Failed to update view count"));
    }
  }

  // Search Products (for tagging)
  async searchProducts(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.json(successResponse({ products: [] }));
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

      res.json(successResponse({ products }));
    } catch (error) {
      logger.error("Product search error", error);
      res.status(500).json(errorResponse("Failed to search products"));
    }
  }

  // Get Post Comments
  async getPostComments(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const userId = req.user?.id;

      // Get top-level comments with replyCount using aggregation
      const comments = await PostComment.aggregate([
        {
          $match: {
            postId: new mongoose.Types.ObjectId(postId),
            parentComment: null
          }
        },
        {
          $lookup: {
            from: "postcomments",
            localField: "_id",
            foreignField: "parentComment",
            as: "repliesData"
          }
        },
        {
          $addFields: {
            replyCount: { $size: "$repliesData" }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
            pipeline: [{ $project: { username: 1, profilePicture: 1 } }]
          }
        },
        {
          $addFields: {
            userId: { $arrayElemAt: ["$userId", 0] }
          }
        },
        {
          $project: {
            repliesData: 0 // Remove the temporary replies data
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);

      // Get user's comment likes and reactions if authenticated
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
        replies: [], // Initialize empty replies array
        repliesLoaded: false // Mark as not loaded initially
      }));

      res.json(successResponse({
        comments: commentsWithStatus,
        pagination: {
          page,
          limit,
          hasMore: comments.length === limit,
        },
      }));
    } catch (error) {
      logger.error("Get comments error", error);
      res.status(500).json(errorResponse("Failed to fetch comments"));
    }
  }

  // Get Comment Replies
  async getCommentReplies(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { commentId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const userId = req.user?.id;

      logger.info(`Loading replies for comment: ${commentId}, user: ${userId}`);

      const replies = await PostComment.find({
        parentComment: commentId,
      })
        .populate("userId", "username profilePicture")
        .sort({ createdAt: 1 }) // Oldest first for replies
        .skip(skip)
        .limit(limit)
        .lean();

      logger.info(`Found ${replies.length} replies`);

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

      res.json(successResponse({
        replies: repliesWithStatus,
        pagination: {
          page,
          limit,
          hasMore: replies.length === limit,
        },
      }));
    } catch (error) {
      logger.error("Get replies error", error);
      res.status(500).json(errorResponse("Failed to fetch replies"));
    }
  }

  // Add Comment
  async addComment(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { postId } = req.params;
      const { text, parentComment } = req.body;
      const userId = req.user.id;

      if (!text?.trim()) {
        return res.status(400).json(errorResponse("Comment text is required", 400));
      }

      if (text.length > 2200) {
        return res.status(400).json(errorResponse("Comment is too long", 400));
      }

      // Validate parent comment exists if provided
      if (parentComment) {
        const parentExists = await PostComment.findById(parentComment);
        if (!parentExists) {
          return res.status(400).json(errorResponse("Parent comment not found", 400));
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

      res.status(201).json(successResponse({
        comment: {
          ...populatedComment,
          isLiked: false,
          userReaction: null,
        },
      }, "Comment added successfully"));
    } catch (error) {
      logger.error("Add comment error", error);
      res.status(500).json(errorResponse("Failed to add comment"));
    }
  }

  // Like/Unlike Comment
  async toggleCommentLike(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const existingLike = await CommentLike.findOne({ userId, commentId });

      if (existingLike) {
        // Unlike
        await CommentLike.deleteOne({ userId, commentId });
        await PostComment.findByIdAndUpdate(commentId, { $inc: { likes: -1 } });

        res.json(successResponse({ liked: false }));
      } else {
        // Like
        await CommentLike.create({ userId, commentId });
        await PostComment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } });

        res.json(successResponse({ liked: true }));
      }
    } catch (error) {
      logger.error("Like comment error", error);
      res.status(500).json(errorResponse("Failed to update like"));
    }
  }

  // Add/Update Comment Reaction
  async updateCommentReaction(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { commentId } = req.params;
      const { reactionType } = req.body;
      const userId = req.user.id;

      const validReactions = ["like", "love", "laugh", "wow", "sad", "angry"];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json(errorResponse("Invalid reaction type", 400));
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

          res.json(successResponse({ reaction: null }));
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

          res.json(successResponse({ reaction: reactionType }));
        }
      } else {
        // Add new reaction
        await CommentReaction.create({ userId, commentId, reactionType });
        await PostComment.findByIdAndUpdate(commentId, {
          $inc: { [`reactions.${reactionType}`]: 1 },
        });

        res.json(successResponse({ reaction: reactionType }));
      }
    } catch (error) {
      logger.error("Reaction error", error);
      res.status(500).json(errorResponse("Failed to update reaction"));
    }
  }

  // Delete Comment
  async deleteComment(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const comment = await PostComment.findById(commentId);
      if (!comment) {
        return res.status(404).json(errorResponse("Comment not found", 404));
      }

      // Check if user owns the comment
      if (comment.userId.toString() !== userId) {
        return res.status(403).json(errorResponse("Not authorized to delete this comment", 403));
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

      res.json(successResponse({ message: "Comment deleted successfully" }));
    } catch (error) {
      logger.error("Delete comment error", error);
      res.status(500).json(errorResponse("Failed to delete comment"));
    }
  }
}

export default new PostController();