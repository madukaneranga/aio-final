// middleware/contentModeration.js

/**
 * Content Moderation Middleware for Chat Messages
 * Detects and blocks prohibited content including:
 * - Phone numbers, email addresses
 * - Social media handles
 * - External links and URLs
 * - Street addresses and personal information
 * - Payment details
 */

// Phone number patterns (international formats)
const phonePatterns = [
  // International format: +1234567890, +12 345 678 9012
  /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // US format: (123) 456-7890, 123-456-7890
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // Alternative formats
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\b\d{10,15}\b/g,
];

// Email patterns
const emailPatterns = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/g,
  // Obfuscated emails: user [at] domain [dot] com
  /\b[A-Za-z0-9._%+-]+\s*\[?\s*at\s*\]?\s*[A-Za-z0-9.-]+\s*\[?\s*dot\s*\]?\s*[A-Z|a-z]{2,}\b/gi,
];

// Social media patterns
const socialMediaPatterns = [
  // WhatsApp
  /(?:whatsapp|wa\.me|chat\.whatsapp\.com)/gi,
  /\b(?:whatsapp|wa)\s*[:=]?\s*[\+\d\s\-\(\)]{7,20}/gi,
  
  // Instagram
  /(?:instagram\.com\/|@[a-zA-Z0-9_.]{1,30})/g,
  /\b(?:insta|ig)\s*[:=]?\s*@?[a-zA-Z0-9_.]{1,30}/gi,
  
  // Facebook
  /(?:facebook\.com\/|fb\.com\/|fb\.me\/)/gi,
  /\b(?:facebook|fb)\s*[:=]?\s*[a-zA-Z0-9.]{1,50}/gi,
  
  // TikTok
  /(?:tiktok\.com\/@|@[a-zA-Z0-9_.]{1,24})/g,
  /\btiktok\s*[:=]?\s*@?[a-zA-Z0-9_.]{1,24}/gi,
  
  // Twitter/X
  /(?:twitter\.com\/|x\.com\/)/gi,
  /\btwitter\s*[:=]?\s*@?[a-zA-Z0-9_]{1,15}/gi,
  
  // YouTube
  /(?:youtube\.com\/|youtu\.be\/)/gi,
  /\byoutube\s*[:=]?\s*[a-zA-Z0-9_]{1,30}/gi,
  
  // LinkedIn
  /(?:linkedin\.com\/in\/)/gi,
  /\blinkedin\s*[:=]?\s*[a-zA-Z0-9-]{1,30}/gi,
  
  // Snapchat
  /\bsnapchat\s*[:=]?\s*[a-zA-Z0-9_.]{1,15}/gi,
  /\bsnap\s*[:=]?\s*[a-zA-Z0-9_.]{1,15}/gi,
  
  // Telegram
  /(?:t\.me\/|telegram\.me\/)/gi,
  /\btelegram\s*[:=]?\s*@?[a-zA-Z0-9_]{5,32}/gi,
  
  // Discord
  /\bdiscord\s*[:=]?\s*[a-zA-Z0-9_#]{2,32}/gi,
  
  // General @ mentions
  /@[a-zA-Z0-9_.]{3,30}/g,
];

// URL and website patterns
const urlPatterns = [
  // Standard URLs
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g,
  
  // Obfuscated URLs
  /\b[a-zA-Z0-9-]+\s*\[?\s*dot\s*\]?\s*[a-zA-Z]{2,}/gi,
  /\b[a-zA-Z0-9-]+\s*\.\s*[a-zA-Z]{2,}\s*\/[^\s]*/gi,
];

// Payment information patterns
const paymentPatterns = [
  // Credit card numbers (basic pattern)
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  /\b\d{13,19}\b/g,
  
  // PayPal
  /paypal\.me\/[a-zA-Z0-9_.-]+/gi,
  /\bpaypal\s*[:=]?\s*[a-zA-Z0-9@._-]+/gi,
  
  // Bank account references
  /\b(?:account|acc)\s*(?:number|no|#)?\s*[:=]?\s*\d{8,20}/gi,
  /\biban\s*[:=]?\s*[a-zA-Z0-9\s]{15,34}/gi,
  /\brouting\s*(?:number|no)?\s*[:=]?\s*\d{9}/gi,
  
  // Digital payment methods
  /\b(?:venmo|cashapp|zelle)\s*[:=]?\s*[@$]?[a-zA-Z0-9_.-]+/gi,
  /\bcash\s*app\s*[:=]?\s*\$[a-zA-Z0-9_.-]+/gi,
];

// Address patterns
const addressPatterns = [
  // Street addresses
  /\b\d+\s+[a-zA-Z0-9\s,.-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl)\b/gi,
  
  // ZIP codes
  /\b\d{5}(?:-\d{4})?\b/g,
  
  // Postal codes (international)
  /\b[a-zA-Z]\d[a-zA-Z]\s*\d[a-zA-Z]\d\b/g, // Canadian
  /\b[a-zA-Z]{1,2}\d{1,2}[a-zA-Z]?\s*\d[a-zA-Z]{2}\b/g, // UK
];

// Personal information patterns
const personalInfoPatterns = [
  // Government ID patterns
  /\b(?:ssn|social\s*security)\s*[:=]?\s*\d{3}-?\d{2}-?\d{4}/gi,
  /\b(?:driver\s*license|dl)\s*[:=]?\s*[a-zA-Z0-9]{8,20}/gi,
  /\b(?:passport|id)\s*[:=]?\s*[a-zA-Z0-9]{6,15}/gi,
  
  // Full names with specific context
  /\b(?:my\s*name\s*is|call\s*me|i\s*am)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g,
];

/**
 * Main content moderation function
 * @param {string} content - Message content to check
 * @returns {Object} - Moderation result
 */
export const moderateContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { isBlocked: false, reason: null, violations: [] };
  }

  const violations = [];
  const cleanContent = content.toLowerCase().trim();

  // Check phone numbers
  for (const pattern of phonePatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'phone_number',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check email addresses
  for (const pattern of emailPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'email_address',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check social media
  for (const pattern of socialMediaPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'social_media',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check URLs and websites
  for (const pattern of urlPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'external_link',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check payment information
  for (const pattern of paymentPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'payment_info',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check addresses
  for (const pattern of addressPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'address',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Check personal information
  for (const pattern of personalInfoPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'personal_info',
        pattern: pattern.toString(),
        matches: content.match(pattern) || [],
      });
    }
  }

  // Additional keyword-based checks
  const prohibitedKeywords = [
    'whatsapp number', 'phone number', 'call me', 'text me',
    'my number', 'contact me', 'reach me', 'email me',
    'outside platform', 'off platform', 'direct contact',
    'personal contact', 'private message', 'dm me',
    'add me on', 'follow me on', 'find me on',
    'bank account', 'credit card', 'debit card',
    'cash on delivery', 'cod', 'bank transfer',
    'direct payment', 'outside payment', 'cash payment',
  ];

  for (const keyword of prohibitedKeywords) {
    if (cleanContent.includes(keyword)) {
      violations.push({
        type: 'prohibited_keyword',
        keyword: keyword,
        matches: [keyword],
      });
    }
  }

  // Determine if content should be blocked
  const isBlocked = violations.length > 0;
  
  // Generate reason message
  let reason = null;
  if (isBlocked) {
    const types = [...new Set(violations.map(v => v.type))];
    reason = generateModerationReason(types);
  }

  return {
    isBlocked,
    reason,
    violations,
    violationCount: violations.length,
  };
};

/**
 * Generate user-friendly moderation reason
 * @param {Array} violationTypes - Array of violation types
 * @returns {string} - User-friendly reason message
 */
const generateModerationReason = (violationTypes) => {
  const reasonMap = {
    phone_number: "phone numbers",
    email_address: "email addresses",
    social_media: "social media handles",
    external_link: "external links",
    payment_info: "payment information",
    address: "personal addresses",
    personal_info: "personal information",
    prohibited_keyword: "prohibited content",
  };

  const reasons = violationTypes.map(type => reasonMap[type] || type);
  
  if (reasons.length === 1) {
    return `Message blocked: Contains ${reasons[0]}`;
  } else if (reasons.length === 2) {
    return `Message blocked: Contains ${reasons[0]} and ${reasons[1]}`;
  } else {
    const lastReason = reasons.pop();
    return `Message blocked: Contains ${reasons.join(', ')}, and ${lastReason}`;
  }
};

/**
 * Express middleware for content moderation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const moderateMessageContent = (req, res, next) => {
  const { content } = req.body;
  
  if (!content) {
    return next(); // Skip moderation for non-text messages
  }

  const moderationResult = moderateContent(content);
  
  if (moderationResult.isBlocked) {
    return res.status(400).json({
      success: false,
      error: "Message blocked by content moderation",
      reason: moderationResult.reason,
      violations: moderationResult.violations.map(v => ({
        type: v.type,
        count: v.matches.length,
      })),
      userMessage: "Your message contains prohibited content. Please remove any contact information, external links, or payment details and try again.",
    });
  }

  // Add moderation result to request for logging
  req.moderationResult = moderationResult;
  next();
};

/**
 * Rate limiting for chat messages
 * @param {number} maxMessages - Maximum messages per window
 * @param {number} windowMs - Time window in milliseconds
 */
export const createChatRateLimit = (maxMessages = 30, windowMs = 60000) => {
  const userMessageCounts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const now = Date.now();
    const userKey = userId.toString();
    
    // Get or create user data
    if (!userMessageCounts.has(userKey)) {
      userMessageCounts.set(userKey, {
        count: 0,
        resetTime: now + windowMs,
      });
    }
    
    const userData = userMessageCounts.get(userKey);
    
    // Reset count if window expired
    if (now >= userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (userData.count >= maxMessages) {
      const resetIn = Math.ceil((userData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message: `Too many messages. Please wait ${resetIn} seconds before sending another message.`,
        resetIn,
      });
    }
    
    // Increment count
    userData.count++;
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const expiredUsers = [];
      for (const [key, data] of userMessageCounts.entries()) {
        if (now >= data.resetTime + windowMs) {
          expiredUsers.push(key);
        }
      }
      expiredUsers.forEach(key => userMessageCounts.delete(key));
    }
    
    next();
  };
};

/**
 * Clean and sanitize message content
 * @param {string} content - Message content
 * @returns {string} - Cleaned content
 */
export const sanitizeContent = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, 2000); // Limit length
};

/**
 * Log moderation events for admin review
 * @param {Object} moderationData - Moderation event data
 */
export const logModerationEvent = async (moderationData) => {
  try {
    // In a real application, you would save this to a ModerationLog model
   /* console.log('🚨 Content Moderation Event:', {
      timestamp: new Date().toISOString(),
      userId: moderationData.userId,
      chatId: moderationData.chatId,
      content: moderationData.content,
      violations: moderationData.violations,
      action: moderationData.action, // 'blocked' | 'flagged' | 'approved'
    });*/
    
    // TODO: Save to database for admin review
    // const ModerationLog = mongoose.model('ModerationLog');
    // await ModerationLog.create(moderationData);
    
  } catch (error) {
    console.error('Failed to log moderation event:', error);
  }
};

// Export default moderation settings
export const MODERATION_SETTINGS = {
  RATE_LIMIT: {
    MAX_MESSAGES: 30,
    WINDOW_MS: 60000, // 1 minute
  },
  MESSAGE: {
    MAX_LENGTH: 1000,
    ALLOWED_TYPES: ['text', 'image', 'receipt', 'system'],
  },
  VIOLATIONS: {
    AUTO_BLOCK: true,
    LOG_EVENTS: true,
    NOTIFY_ADMINS: false, // Set to true when admin system is ready
  },
};