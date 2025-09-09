import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

/**
 * Validate order ID parameter
 */
export const validateOrderId = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json(validationErrorResponse([
      { field: 'id', message: 'Order ID is required' }
    ]));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(validationErrorResponse([
      { field: 'id', message: 'Invalid order ID format' }
    ]));
  }

  next();
};

/**
 * Validate order status update request
 */
export const validateOrderStatusUpdate = (req, res, next) => {
  const errors = [];
  const { status, trackingNumber, notes } = req.body;

  // Validate status
  if (!status) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else if (typeof status !== 'string') {
    errors.push({ field: 'status', message: 'Status must be a string' });
  } else {
    const validStatuses = ['pending', 'accepted', 'processing', 'ready', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      errors.push({ 
        field: 'status', 
        message: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }
  }

  // Validate tracking number (optional)
  if (trackingNumber && typeof trackingNumber !== 'string') {
    errors.push({ field: 'trackingNumber', message: 'Tracking number must be a string' });
  }

  if (trackingNumber && trackingNumber.length > 100) {
    errors.push({ field: 'trackingNumber', message: 'Tracking number must not exceed 100 characters' });
  }

  // Validate notes (optional)
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

/**
 * Validate payment status update request
 */
export const validatePaymentStatusUpdate = (req, res, next) => {
  const errors = [];
  const { paymentStatus, notes } = req.body;

  // Validate payment status
  if (!paymentStatus) {
    errors.push({ field: 'paymentStatus', message: 'Payment status is required' });
  } else if (typeof paymentStatus !== 'string') {
    errors.push({ field: 'paymentStatus', message: 'Payment status must be a string' });
  } else {
    const validPaymentStatuses = ['paid', 'failed'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      errors.push({ 
        field: 'paymentStatus', 
        message: `Payment status must be one of: ${validPaymentStatuses.join(', ')}` 
      });
    }
  }

  // Validate notes (optional)
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

/**
 * Validate customer role for customer-specific endpoints
 */
export const validateCustomerAccess = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: "Only customers can perform this operation",
      status: 403
    });
  }
  next();
};

/**
 * Validate store owner role and store ownership
 */
export const validateStoreOwnerAccess = (req, res, next) => {
  if (!req.user || req.user.role !== 'store_owner') {
    return res.status(403).json({
      success: false,
      message: "Only store owners can perform this operation",
      status: 403
    });
  }

  if (!req.user.storeId) {
    return res.status(403).json({
      success: false,
      message: "Store not found for user",
      status: 403
    });
  }

  next();
};