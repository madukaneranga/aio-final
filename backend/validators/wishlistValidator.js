import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateAddToWishlist = (req, res, next) => {
  const errors = [];
  const { itemId, priority, notes } = req.body;

  if (!itemId) {
    errors.push({ field: 'itemId', message: 'Item ID is required' });
  } else if (!mongoose.Types.ObjectId.isValid(itemId)) {
    errors.push({ field: 'itemId', message: 'Invalid item ID format' });
  }

  if (priority && !["low", "medium", "high"].includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
  }

  if (notes && typeof notes !== 'string') {
    errors.push({ field: 'notes', message: 'Notes must be a string' });
  }

  if (notes && notes.length > 500) {
    errors.push({ field: 'notes', message: 'Notes must not exceed 500 characters' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateWishlistItemId = (req, res, next) => {
  const { itemId } = req.params;

  if (!itemId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'itemId', message: 'Item ID is required' }
    ]));
  }

  // Allow both MongoDB ObjectIds and temporary IDs (numbers)
  const isValidObjectId = mongoose.Types.ObjectId.isValid(itemId);
  const isTemporaryId = /^\d+$/.test(itemId); // Only digits (timestamp IDs)

  if (!isValidObjectId && !isTemporaryId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'itemId', message: 'Invalid item ID format' }
    ]));
  }

  next();
};

export const validateUpdatePriority = (req, res, next) => {
  const errors = [];
  const { priority } = req.body;

  if (!priority) {
    errors.push({ field: 'priority', message: 'Priority is required' });
  } else if (!["low", "medium", "high"].includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateUpdateNotes = (req, res, next) => {
  const errors = [];
  const { notes } = req.body;

  if (notes !== undefined && typeof notes !== 'string') {
    errors.push({ field: 'notes', message: 'Notes must be a string' });
  }

  if (notes && notes.length > 500) {
    errors.push({ field: 'notes', message: 'Notes must not exceed 500 characters' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateMoveToCart = (req, res, next) => {
  const errors = [];
  const { quantity } = req.body;

  if (quantity !== undefined) {
    if (typeof quantity !== 'number') {
      errors.push({ field: 'quantity', message: 'Quantity must be a number' });
    } else if (quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
    } else if (quantity > 100) {
      errors.push({ field: 'quantity', message: 'Quantity cannot exceed 100' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateWishlistFilter = (req, res, next) => {
  const errors = [];
  const { priority, storeId } = req.query;

  if (priority && !["low", "medium", "high"].includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
  }

  if (storeId && !mongoose.Types.ObjectId.isValid(storeId)) {
    errors.push({ field: 'storeId', message: 'Invalid store ID format' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateShareToken = (req, res, next) => {
  const { shareToken } = req.params;

  if (!shareToken) {
    return res.status(400).json(validationErrorResponse([
      { field: 'shareToken', message: 'Share token is required' }
    ]));
  }

  if (typeof shareToken !== 'string') {
    return res.status(400).json(validationErrorResponse([
      { field: 'shareToken', message: 'Share token must be a string' }
    ]));
  }

  if (shareToken.length < 10) {
    return res.status(400).json(validationErrorResponse([
      { field: 'shareToken', message: 'Invalid share token format' }
    ]));
  }

  next();
};