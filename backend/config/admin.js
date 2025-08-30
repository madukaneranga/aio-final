// Admin System Configuration
export const ADMIN_CONFIG = {
  // Security settings
  SECURITY: {
    ADMIN_EMAIL: 'admin@aio.com',
    SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    PASSWORD_MIN_LENGTH: 8,
    REQUIRE_MFA: false // Set to true for production MFA
  },

  // Rate limiting
  RATE_LIMITS: {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // requests per window
    },
    SENSITIVE: {
      windowMs: 15 * 60 * 1000,
      max: 100 // for sensitive operations
    },
    BULK_OPERATIONS: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10 // bulk operations per window
    }
  },

  // Pagination limits
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1
  },

  // Search configuration
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_RESULTS: 1000,
    HIGHLIGHT_RESULTS: true
  },

  // Export settings
  EXPORT: {
    MAX_RECORDS: 10000,
    ALLOWED_FORMATS: ['csv', 'json'],
    INCLUDE_METADATA: true
  },

  // Monitoring thresholds
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 30 * 1000, // 30 seconds
    MEMORY_WARNING_THRESHOLD: 0.8, // 80% memory usage
    DB_RESPONSE_WARNING: 1000, // 1 second
    ERROR_RATE_THRESHOLD: 0.05 // 5% error rate
  },

  // Activity logging
  AUDIT: {
    LOG_ALL_ACTIONS: true,
    RETENTION_DAYS: 90,
    INCLUDE_REQUEST_BODY: false, // Set to false in production for sensitive data
    LOG_IP_ADDRESS: true,
    MAX_LOG_ENTRIES: 10000
  },

  // Collection permissions
  PERMISSIONS: {
    // Collections that can be created
    CREATABLE: [
      'users', 'stores', 'products', 'services', 'categories', 
      'packages', 'addons', 'variants', 'time-slots', 'flash-deals',
      'email-subscriptions', 'notifications', 'platform-settings', 'marketing'
    ],
    
    // Collections that can be edited
    EDITABLE: [
      'users', 'stores', 'products', 'services', 'orders', 'bookings',
      'categories', 'packages', 'addons', 'variants', 'time-slots',
      'flash-deals', 'email-subscriptions', 'notifications', 'posts',
      'post-comments', 'reviews', 'wallets', 
      'pending-transactions', 'subscriptions', 'platform-settings', 'marketing'
    ],
    
    // Collections that can be deleted
    DELETABLE: [
      'products', 'services', 'categories', 'packages', 'addons', 
      'variants', 'time-slots', 'flash-deals', 'email-subscriptions',
      'notifications', 'posts', 'post-comments', 'post-likes', 'reviews',
      'chats', 'pending-transactions', 'search-history', 'comment-likes',
      'comment-reactions', 'platform-settings', 'marketing'
    ],
    
    // Collections that are read-only
    READ_ONLY: [
      'contact-reveals', 'chat-analytics', 'audit'
    ]
  },

  // System alerts
  ALERTS: {
    CRITICAL_MEMORY_USAGE: 0.9,
    HIGH_ERROR_RATE: 0.1,
    DATABASE_SLOW_QUERY: 2000, // 2 seconds
    FAILED_LOGIN_THRESHOLD: 10 // in 1 hour
  },

  // Feature flags
  FEATURES: {
    BULK_OPERATIONS: true,
    DATA_EXPORT: true,
    REAL_TIME_MONITORING: true,
    ADVANCED_ANALYTICS: true,
    ACTIVITY_LOGGING: true,
    SYSTEM_HEALTH_CHECKS: true
  },

  // UI Configuration
  UI: {
    ITEMS_PER_PAGE_OPTIONS: [10, 20, 50, 100],
    DEFAULT_SORT_ORDER: 'desc',
    DEFAULT_SORT_FIELD: 'createdAt',
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
    MAX_SEARCH_HISTORY: 10
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  ADMIN_CONFIG.SECURITY.REQUIRE_MFA = true;
  ADMIN_CONFIG.AUDIT.INCLUDE_REQUEST_BODY = false;
  ADMIN_CONFIG.MONITORING.HEALTH_CHECK_INTERVAL = 60000; // 1 minute in production
}

if (process.env.NODE_ENV === 'development') {
  ADMIN_CONFIG.RATE_LIMITS.GENERAL.max = 10000; // Higher limits in dev
  ADMIN_CONFIG.AUDIT.RETENTION_DAYS = 30; // Shorter retention in dev
}

export default ADMIN_CONFIG;