import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

/**
 * Validate payment intent request (PayHere, Bank Transfer, COD)
 */
export const validatePaymentIntent = (req, res, next) => {
  const errors = [];
  const { orderItems = [], shippingAddress = {} } = req.body;

  // Validate order items
  if (!orderItems || !Array.isArray(orderItems)) {
    errors.push({ field: 'orderItems', message: 'Order items must be an array' });
  } else if (orderItems.length === 0) {
    errors.push({ field: 'orderItems', message: 'At least one order item is required' });
  } else {
    orderItems.forEach((item, index) => {
      if (!item.productId) {
        errors.push({ field: `orderItems[${index}].productId`, message: 'Product ID is required' });
      } else if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        errors.push({ field: `orderItems[${index}].productId`, message: 'Invalid product ID format' });
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push({ field: `orderItems[${index}].quantity`, message: 'Quantity must be a positive number' });
      }

      if (item.storeId && !mongoose.Types.ObjectId.isValid(item.storeId)) {
        errors.push({ field: `orderItems[${index}].storeId`, message: 'Invalid store ID format' });
      }
    });
  }

  // Validate shipping address
  if (!shippingAddress.street || typeof shippingAddress.street !== 'string') {
    errors.push({ field: 'shippingAddress.street', message: 'Street address is required' });
  }

  if (!shippingAddress.city || typeof shippingAddress.city !== 'string') {
    errors.push({ field: 'shippingAddress.city', message: 'City is required' });
  }

  if (!shippingAddress.state || typeof shippingAddress.state !== 'string') {
    errors.push({ field: 'shippingAddress.state', message: 'Province/State is required' });
  }

  if ((!shippingAddress.postalCode && !shippingAddress.zipCode) || 
      (shippingAddress.postalCode && typeof shippingAddress.postalCode !== 'string') ||
      (shippingAddress.zipCode && typeof shippingAddress.zipCode !== 'string')) {
    errors.push({ field: 'shippingAddress.postalCode', message: 'Postal code is required' });
  }

  if (shippingAddress.phone && typeof shippingAddress.phone !== 'string') {
    errors.push({ field: 'shippingAddress.phone', message: 'Phone number must be a string' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate bank transfer preview request
 */
export const validateBankTransferPreview = (req, res, next) => {
  const errors = [];
  const { orderItems = [] } = req.body;

  if (!orderItems || !Array.isArray(orderItems)) {
    errors.push({ field: 'orderItems', message: 'Order items must be an array' });
  } else if (orderItems.length === 0) {
    errors.push({ field: 'orderItems', message: 'At least one order item is required' });
  } else {
    orderItems.forEach((item, index) => {
      if (!item.productId) {
        errors.push({ field: `orderItems[${index}].productId`, message: 'Product ID is required' });
      } else if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        errors.push({ field: `orderItems[${index}].productId`, message: 'Invalid product ID format' });
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate PayHere IPN request
 */
export const validatePayhereIPN = (req, res, next) => {
  const errors = [];
  const data = req.body;

  if (!data.merchant_id) {
    errors.push({ field: 'merchant_id', message: 'Merchant ID is required' });
  }

  if (!data.order_id) {
    errors.push({ field: 'order_id', message: 'Order ID is required' });
  }

  if (!data.payhere_amount) {
    errors.push({ field: 'payhere_amount', message: 'PayHere amount is required' });
  } else if (isNaN(parseFloat(data.payhere_amount))) {
    errors.push({ field: 'payhere_amount', message: 'PayHere amount must be a valid number' });
  }

  if (!data.payhere_currency) {
    errors.push({ field: 'payhere_currency', message: 'PayHere currency is required' });
  }

  if (!data.md5sig) {
    errors.push({ field: 'md5sig', message: 'MD5 signature is required' });
  }

  if (!data.status_code) {
    errors.push({ field: 'status_code', message: 'Status code is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate cancel payment request
 */
export const validateCancelPayment = (req, res, next) => {
  const errors = [];
  const { id } = req.params;

  if (!id) {
    errors.push({ field: 'id', message: 'Payment/Order ID is required' });
  } else if (!mongoose.Types.ObjectId.isValid(id)) {
    errors.push({ field: 'id', message: 'Invalid payment/order ID format' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate customer role for certain payment operations
 */
export const validateCustomerRole = (req, res, next) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Only customers can perform this operation",
      status: 403
    });
  }
  next();
};

/**
 * Validate customer verification for COD
 */
export const validateCustomerVerification = (req, res, next) => {
  if (req.user.verificationStatus !== "verified") {
    return res.status(403).json({
      success: false,
      message: "Document verification required for Cash on Delivery",
      status: 403,
      details: {
        requiresVerification: true
      }
    });
  }
  next();
};