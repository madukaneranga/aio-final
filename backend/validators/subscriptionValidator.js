import { validationErrorResponse } from "../utils/responseFormatter.js";
import mongoose from "mongoose";

/**
 * Validate create subscription request
 */
export const validateCreateSubscription = (req, res, next) => {
  const errors = [];
  const { packageName } = req.body;

  if (!packageName) {
    errors.push({ field: 'packageName', message: 'Package name is required' });
  } else if (typeof packageName !== 'string') {
    errors.push({ field: 'packageName', message: 'Package name must be a string' });
  } else if (packageName.trim().length === 0) {
    errors.push({ field: 'packageName', message: 'Package name cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate cancel subscription request
 */
export const validateCancelSubscription = (req, res, next) => {
  const errors = [];
  const { subscriptionId } = req.body;

  // subscriptionId is optional, if not provided, find by userId
  if (subscriptionId && !mongoose.Types.ObjectId.isValid(subscriptionId)) {
    errors.push({ field: 'subscriptionId', message: 'Invalid subscription ID format' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate retry payment request
 */
export const validateRetryPayment = (req, res, next) => {
  const errors = [];
  const { recurrenceId } = req.body;

  if (!recurrenceId) {
    errors.push({ field: 'recurrenceId', message: 'Recurrence ID is required' });
  } else if (typeof recurrenceId !== 'string') {
    errors.push({ field: 'recurrenceId', message: 'Recurrence ID must be a string' });
  } else if (recurrenceId.trim().length === 0) {
    errors.push({ field: 'recurrenceId', message: 'Recurrence ID cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate upgrade subscription request
 */
export const validateUpgradeSubscription = (req, res, next) => {
  const errors = [];
  const { packageName } = req.body;

  if (!packageName) {
    errors.push({ field: 'packageName', message: 'Package name is required' });
  } else if (typeof packageName !== 'string') {
    errors.push({ field: 'packageName', message: 'Package name must be a string' });
  } else if (packageName.trim().length === 0) {
    errors.push({ field: 'packageName', message: 'Package name cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate rollback upgrade request
 */
export const validateRollbackUpgrade = (req, res, next) => {
  const errors = [];
  const { upgradeAttemptId } = req.body;

  if (!upgradeAttemptId) {
    errors.push({ field: 'upgradeAttemptId', message: 'Upgrade attempt ID is required' });
  } else if (typeof upgradeAttemptId !== 'string') {
    errors.push({ field: 'upgradeAttemptId', message: 'Upgrade attempt ID must be a string' });
  } else if (upgradeAttemptId.trim().length === 0) {
    errors.push({ field: 'upgradeAttemptId', message: 'Upgrade attempt ID cannot be empty' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate PayHere IPN request
 */
export const validatePayHereIPN = (req, res, next) => {
  const errors = [];
  const {
    merchant_id,
    order_id,
    payment_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = req.body;

  if (!merchant_id) {
    errors.push({ field: 'merchant_id', message: 'Merchant ID is required' });
  }

  if (!order_id) {
    errors.push({ field: 'order_id', message: 'Order ID is required' });
  }

  if (!payment_id) {
    errors.push({ field: 'payment_id', message: 'Payment ID is required' });
  }

  if (!payhere_amount) {
    errors.push({ field: 'payhere_amount', message: 'PayHere amount is required' });
  } else if (isNaN(parseFloat(payhere_amount))) {
    errors.push({ field: 'payhere_amount', message: 'PayHere amount must be a valid number' });
  }

  if (!payhere_currency) {
    errors.push({ field: 'payhere_currency', message: 'PayHere currency is required' });
  }

  if (!status_code) {
    errors.push({ field: 'status_code', message: 'Status code is required' });
  }

  if (!md5sig) {
    errors.push({ field: 'md5sig', message: 'MD5 signature is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate admin access
 */
export const validateAdminAccess = (req, res, next) => {
  if (req.user.email !== "admin@aio.com") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      status: 403
    });
  }
  next();
};

/**
 * Validate admin or system access
 */
export const validateAdminOrSystemAccess = (req, res, next) => {
  if (req.user.email !== "admin@aio.com" && !req.headers['x-system-call']) {
    return res.status(403).json({
      success: false,
      message: "Admin or system access required",
      status: 403
    });
  }
  next();
};

/**
 * Validate store owner role
 */
export const validateStoreOwner = (req, res, next) => {
  if (!req.user || req.user.role !== 'store_owner') {
    return res.status(403).json({
      success: false,
      message: "Store owner access required",
      status: 403
    });
  }
  next();
};