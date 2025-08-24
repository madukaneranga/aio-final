import rateLimit from 'express-rate-limit';

// Rate limiter for contact reveals - per IP
export const contactRevealRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reveals per IP per hour
  message: {
    success: false,
    message: "Too many contact reveals attempted. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default IP handling which properly supports IPv6
  skip: (req) => {
    // Skip rate limiting for development/testing
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiter for contact reveals - per user
export const contactRevealUserLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 reveals per user per day
  message: {
    success: false,
    message: "Daily contact reveal limit reached. Please try again tomorrow.",
    retryAfter: "24 hours"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID as key, or fall back to default IP handling
    if (req.user?._id) {
      return `user_${req.user._id.toString()}`;
    }
    // Return undefined to use default IP key generation (which handles IPv6 properly)
    return undefined;
  },
  skip: (req) => {
    // Skip rate limiting for development/testing
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiter for store-level reveals (prevent abuse of specific stores)
export const storeRevealLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour  
  max: 100, // 100 reveals per store per hour
  message: {
    success: false,
    message: "This store has reached the maximum contact reveals for this hour. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use store ID as key
    return `store_${req.params.storeId}`;
  },
  skip: (req) => {
    // Skip rate limiting for development/testing
    return process.env.NODE_ENV === 'development';
  }
});

// Combined middleware for contact reveals
export const contactRevealLimits = [
  contactRevealRateLimit,
  contactRevealUserLimit,
  storeRevealLimit
];