// util/validations.js - Add these validations to your existing file

import { body } from 'express-validator';

// Flash Deal Validation Rules
export const flashDealValidationRules = () => {
  return [
    body('saleName')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Sale name must be between 3 and 100 characters'),
    
    body('saleSubtitle')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Sale subtitle must be between 10 and 200 characters'),
    
    body('discountText')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Discount text must be between 3 and 50 characters'),
    
    body('buttonText')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Button text must be between 2 and 30 characters'),
    
    body('timerLabel')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Timer label must be between 3 and 50 characters'),
    
    body('saleStartTime')
      .isISO8601()
      .withMessage('Sale start time must be a valid date')
      .custom((value) => {
        const startTime = new Date(value);
        const now = new Date();
        if (startTime < now) {
          throw new Error('Sale start time cannot be in the past');
        }
        return true;
      }),
    
    body('saleEndTime')
      .isISO8601()
      .withMessage('Sale end time must be a valid date')
      .custom((value, { req }) => {
        const endTime = new Date(value);
        const startTime = new Date(req.body.saleStartTime);
        
        if (endTime <= startTime) {
          throw new Error('Sale end time must be after start time');
        }
        
        // Check minimum duration (at least 1 hour)
        const duration = endTime - startTime;
        const oneHour = 60 * 60 * 1000;
        if (duration < oneHour) {
          throw new Error('Sale must run for at least 1 hour');
        }
        
        // Check maximum duration (30 days)
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (duration > thirtyDays) {
          throw new Error('Sale cannot run for more than 30 days');
        }
        
        return true;
      }),
    
    body('backgroundColor')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Background color must be a valid CSS value'),
    
    body('backgroundImage')
      .optional()
      .trim()
      .isURL()
      .withMessage('Background image must be a valid URL'),
    
    body('textColor')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)
      .withMessage('Text color must be a valid CSS color'),
    
    body('accentColor')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)
      .withMessage('Accent color must be a valid CSS color'),
    
    body('heroImage')
      .trim()
      .isURL()
      .withMessage('Hero image must be a valid URL'),
    
    body('showHeroImage')
      .optional()
      .isBoolean()
      .withMessage('Show hero image must be a boolean'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Is active must be a boolean'),
    
    body('isPublished')
      .optional()
      .isBoolean()
      .withMessage('Is published must be a boolean'),
    
    body('priority')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Priority must be between 0 and 100'),
    
    body('featuredProducts')
      .optional()
      .isArray()
      .withMessage('Featured products must be an array')
      .custom((products) => {
        if (products && products.length > 10) {
          throw new Error('Cannot feature more than 10 products');
        }
        return true;
      }),
    
    body('featuredProducts.*')
      .optional()
      .isMongoId()
      .withMessage('Each featured product must be a valid product ID'),
    
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    
    body('categories.*')
      .optional()
      .isMongoId()
      .withMessage('Each category must be a valid category ID'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each tag must be between 1 and 30 characters')
  ];
};

// Flash Deal Update Validation (more lenient)
export const flashDealUpdateValidationRules = () => {
  return [
    body('saleName')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Sale name must be between 3 and 100 characters'),
    
    body('saleSubtitle')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Sale subtitle must be between 10 and 200 characters'),
    
    body('discountText')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Discount text must be between 3 and 50 characters'),
    
    body('buttonText')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Button text must be between 2 and 30 characters'),
    
    body('timerLabel')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Timer label must be between 3 and 50 characters'),
    
    body('saleStartTime')
      .optional()
      .isISO8601()
      .withMessage('Sale start time must be a valid date'),
    
    body('saleEndTime')
      .optional()
      .isISO8601()
      .withMessage('Sale end time must be a valid date')
      .custom((value, { req }) => {
        if (value && req.body.saleStartTime) {
          const endTime = new Date(value);
          const startTime = new Date(req.body.saleStartTime);
          
          if (endTime <= startTime) {
            throw new Error('Sale end time must be after start time');
          }
        }
        return true;
      }),
    
    body('backgroundColor')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Background color must be a valid CSS value'),
    
    body('backgroundImage')
      .optional()
      .trim()
      .isURL()
      .withMessage('Background image must be a valid URL'),
    
    body('textColor')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)
      .withMessage('Text color must be a valid CSS color'),
    
    body('accentColor')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)
      .withMessage('Accent color must be a valid CSS color'),
    
    body('heroImage')
      .optional()
      .trim()
      .isURL()
      .withMessage('Hero image must be a valid URL'),
    
    body('showHeroImage')
      .optional()
      .isBoolean()
      .withMessage('Show hero image must be a boolean'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Is active must be a boolean'),
    
    body('isPublished')
      .optional()
      .isBoolean()
      .withMessage('Is published must be a boolean'),
    
    body('priority')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Priority must be between 0 and 100'),
    
    body('featuredProducts')
      .optional()
      .isArray()
      .withMessage('Featured products must be an array'),
    
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ];
};
export const validateMediaUrls = (mediaUrls) => {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    throw new Error('At least one media URL is required');
  }

  // Check if URLs are valid Firebase Storage URLs
  const firebaseStoragePattern = /^https:\/\/firebasestorage\.googleapis\.com\//;
  
  for (const url of mediaUrls) {
    if (!firebaseStoragePattern.test(url)) {
      throw new Error('Invalid media URL format');
    }
  }

  return true;
};

export const determineMediaType = (mediaUrls) => {
  // Check first URL to determine type (frontend should ensure consistency)
  const url = mediaUrls[0];
  
  // Extract file extension from Firebase URL
  const urlParts = url.split('?')[0]; // Remove query params
  const extension = urlParts.split('.').pop().toLowerCase();
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
  
  if (imageExtensions.includes(extension)) {
    return 'images';
  } else if (videoExtensions.includes(extension)) {
    return 'video';
  } else {
    throw new Error('Unsupported media type');
  }
};