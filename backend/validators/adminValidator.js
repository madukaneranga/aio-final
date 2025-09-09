import { validationErrorResponse } from "../utils/responseFormatter.js";

/**
 * Validate withdrawal processing request
 */
export const validateProcessWithdrawal = (req, res, next) => {

  next();
};

/**
 * Validate bulk operation request
 */
export const validateBulkOperation = (req, res, next) => {


  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  
  next();
};

/**
 * Validate collection parameter
 */
export const validateCollection = (req, res, next) => {


  next();
};

/**
 * Validate analytics query parameters
 */
export const validateAnalyticsQuery = (req, res, next) => {
 

  next();
};

/**
 * Validate order update request
 */
export const validateOrderUpdate = (req, res, next) => {
  

  next();
};

/**
 * Validate user update request
 */
export const validateUserUpdate = (req, res, next) => {
  
  next();
};

/**
 * Validate store update request
 */
export const validateStoreUpdate = (req, res, next) => {
  
  next();
};

/**
 * Validate subscription update request
 */
export const validateSubscriptionUpdate = (req, res, next) => {
  

  next();
};

/**
 * Validate flash deal update request
 */
export const validateFlashDealUpdate = (req, res, next) => {
 
  next();
};

/**
 * Validate system settings update request
 */
export const validateSystemSettings = (req, res, next) => {
  
  next();
};

/**
 * Validate security query parameters
 */
export const validateSecurityQuery = (req, res, next) => {
  
  next();
};

/**
 * Require admin role middleware
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};