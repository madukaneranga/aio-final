import { validationErrorResponse } from "../utils/responseFormatter.js";

/**
 * Validate user registration
 */
export const validateRegister = (req, res, next) => {
  const errors = [];
  const { name, email, password, role } = req.body;

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  } else if (name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Name must not exceed 50 characters' });
  }

  // Email validation
  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }
  }

  // Password validation
  if (!password || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
  } else if (password.length > 128) {
    errors.push({ field: 'password', message: 'Password must not exceed 128 characters' });
  }

  // Role validation (optional)
  if (role && !['customer', 'store_owner'].includes(role)) {
    errors.push({ field: 'role', message: 'Role must be either "customer" or "store_owner"' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate user login
 */
export const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  // Email validation
  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }
  }

  // Password validation
  if (!password || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};

/**
 * Validate Google OAuth token
 */
export const validateGoogleAuth = (req, res, next) => {
  const errors = [];
  const { token } = req.body;

  if (!token || token.trim().length === 0) {
    errors.push({ field: 'token', message: 'Google ID token is required' });
  } else if (typeof token !== 'string') {
    errors.push({ field: 'token', message: 'Google ID token must be a string' });
  }

  if (errors.length > 0) {
    return res.status(400).json(validationErrorResponse(errors));
  }

  next();
};