import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

/**
 * Validate post creation request
 */
export const validateCreatePost = (req, res, next) => {
  const errors = [];
  const { title, description, hashtags, taggedProducts, mediaUrls } = req.body;

  // Validate title
  if (!title) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (typeof title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  } else if (title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title cannot be empty' });
  } else if (title.length > 200) {
    errors.push({ field: 'title', message: 'Title must not exceed 200 characters' });
  }

  // Validate description (optional)
  if (description && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be a string' });
  }

  if (description && description.length > 2000) {
    errors.push({ field: 'description', message: 'Description must not exceed 2000 characters' });
  }

  // Validate hashtags (optional)
  if (hashtags && typeof hashtags !== 'string') {
    errors.push({ field: 'hashtags', message: 'Hashtags must be a string' });
  }

  // Validate media URLs
  if (!mediaUrls) {
    errors.push({ field: 'mediaUrls', message: 'Media URLs are required' });
  } else if (!Array.isArray(mediaUrls)) {
    errors.push({ field: 'mediaUrls', message: 'Media URLs must be an array' });
  } else if (mediaUrls.length === 0) {
    errors.push({ field: 'mediaUrls', message: 'At least one media URL is required' });
  } else {
    mediaUrls.forEach((url, index) => {
      if (typeof url !== 'string' || !url.trim()) {
        errors.push({ field: `mediaUrls[${index}]`, message: 'Media URL must be a valid string' });
      }
    });
  }

  // Validate tagged products (optional)
  if (taggedProducts) {
    const productIds = Array.isArray(taggedProducts) ? taggedProducts : [taggedProducts];
    productIds.forEach((id, index) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        errors.push({ field: `taggedProducts[${index}]`, message: 'Invalid product ID format' });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate post ID parameter
 */
export const validatePostId = (req, res, next) => {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'postId', message: 'Post ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'postId', message: 'Invalid post ID format' }
    ]));
  }

  next();
};

/**
 * Validate user ID parameter
 */
export const validateUserId = (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'userId', message: 'User ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'userId', message: 'Invalid user ID format' }
    ]));
  }

  next();
};

/**
 * Validate comment ID parameter
 */
export const validateCommentId = (req, res, next) => {
  const { commentId } = req.params;

  if (!commentId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'commentId', message: 'Comment ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'commentId', message: 'Invalid comment ID format' }
    ]));
  }

  next();
};

/**
 * Validate add comment request
 */
export const validateAddComment = (req, res, next) => {
  const errors = [];
  const { text, parentComment } = req.body;

  // Validate text
  if (!text) {
    errors.push({ field: 'text', message: 'Comment text is required' });
  } else if (typeof text !== 'string') {
    errors.push({ field: 'text', message: 'Comment text must be a string' });
  } else if (text.trim().length === 0) {
    errors.push({ field: 'text', message: 'Comment text cannot be empty' });
  } else if (text.length > 2200) {
    errors.push({ field: 'text', message: 'Comment text must not exceed 2200 characters' });
  }

  // Validate parent comment (optional)
  if (parentComment && !mongoose.Types.ObjectId.isValid(parentComment)) {
    errors.push({ field: 'parentComment', message: 'Invalid parent comment ID format' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate comment reaction request
 */
export const validateCommentReaction = (req, res, next) => {
  const errors = [];
  const { reactionType } = req.body;

  // Validate reaction type
  if (!reactionType) {
    errors.push({ field: 'reactionType', message: 'Reaction type is required' });
  } else if (typeof reactionType !== 'string') {
    errors.push({ field: 'reactionType', message: 'Reaction type must be a string' });
  } else {
    const validReactions = ["like", "love", "laugh", "wow", "sad", "angry"];
    if (!validReactions.includes(reactionType)) {
      errors.push({ 
        field: 'reactionType', 
        message: `Reaction type must be one of: ${validReactions.join(', ')}` 
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate product search query
 */
export const validateProductSearch = (req, res, next) => {
  const { q } = req.query;

  if (q && typeof q !== 'string') {
    return res.status(400).json(validationErrorResponse([
      { field: 'q', message: 'Search query must be a string' }
    ]));
  }

  if (q && q.length > 100) {
    return res.status(400).json(validationErrorResponse([
      { field: 'q', message: 'Search query must not exceed 100 characters' }
    ]));
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const errors = [];
  const { page, limit } = req.query;

  if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
    errors.push({ field: 'page', message: 'Page must be a positive number' });
  }

  if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};