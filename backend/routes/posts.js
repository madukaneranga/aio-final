import express from "express";
import { authenticate } from "../middleware/auth.js";
import postController from "../controllers/postController.js";
import {
  validateCreatePost,
  validatePostId,
  validateUserId,
  validateCommentId,
  validateAddComment,
  validateCommentReaction,
  validateProductSearch,
  validatePagination,
} from "../validators/postValidator.js";

const router = express.Router();

// Post routes
router.post("/", authenticate, validateCreatePost, postController.createPost);
router.get("/feed", authenticate, validatePagination, postController.getFeed);
router.get("/user/:userId", validateUserId, validatePagination, postController.getUserPosts);

// Post interactions
router.post("/:postId/like", authenticate, validatePostId, postController.togglePostLike);
router.post("/:postId/view", validatePostId, postController.incrementViewCount);

// Product search for tagging
router.get("/products/search", authenticate, validateProductSearch, postController.searchProducts);

// Comment routes
router.get("/:postId/comments", authenticate, validatePostId, validatePagination, postController.getPostComments);
router.get("/comments/:commentId/replies", authenticate, validateCommentId, validatePagination, postController.getCommentReplies);
router.post("/:postId/comment", authenticate, validatePostId, validateAddComment, postController.addComment);

// Comment interactions
router.post("/comments/:commentId/like", authenticate, validateCommentId, postController.toggleCommentLike);
router.post("/comments/:commentId/reaction", authenticate, validateCommentId, validateCommentReaction, postController.updateCommentReaction);
router.delete("/comments/:commentId", authenticate, validateCommentId, postController.deleteComment);

export default router;