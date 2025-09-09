import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

export const validateAddToCart = (req, res, next) => {
  const errors = [];
  const { itemId, quantity, variants } = req.body;

  if (!itemId) {
    errors.push({ field: 'itemId', message: 'Item ID is required' });
  } else if (!mongoose.Types.ObjectId.isValid(itemId)) {
    errors.push({ field: 'itemId', message: 'Invalid item ID format' });
  }

  if (quantity !== undefined) {
    if (typeof quantity !== 'number') {
      errors.push({ field: 'quantity', message: 'Quantity must be a number' });
    } else if (quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
    } else if (quantity > 100) {
      errors.push({ field: 'quantity', message: 'Quantity cannot exceed 100' });
    }
  }

  if (variants && typeof variants !== 'object') {
    errors.push({ field: 'variants', message: 'Variants must be an object' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateUpdateQuantity = (req, res, next) => {
  const errors = [];
  const { quantity } = req.body;

  if (quantity === undefined) {
    errors.push({ field: 'quantity', message: 'Quantity is required' });
  } else if (typeof quantity !== 'number') {
    errors.push({ field: 'quantity', message: 'Quantity must be a number' });
  } else if (quantity < 0) {
    errors.push({ field: 'quantity', message: 'Quantity cannot be negative' });
  } else if (quantity > 100) {
    errors.push({ field: 'quantity', message: 'Quantity cannot exceed 100' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

export const validateCartItemId = (req, res, next) => {
  const { itemId } = req.params;

  if (!itemId) {
    return res.status(400).json(validationErrorResponse([
      { field: 'itemId', message: 'Item ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'itemId', message: 'Invalid item ID format' }
    ]));
  }

  next();
};

export const validateAnalyticsDays = (req, res, next) => {
  const { days } = req.query;
  const errors = [];

  if (days !== undefined) {
    const daysNum = parseInt(days);
    if (isNaN(daysNum)) {
      errors.push({ field: 'days', message: 'Days must be a valid number' });
    } else if (daysNum < 1) {
      errors.push({ field: 'days', message: 'Days must be at least 1' });
    } else if (daysNum > 365) {
      errors.push({ field: 'days', message: 'Days cannot exceed 365' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};