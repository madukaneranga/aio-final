/**
 * Simple, clean logging utility
 * - Development-only logs for routes and info
 * - Always show errors regardless of environment
 * - Minimal, focused logging approach
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Log route entry (development only)
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   */
  route: (method, path) => {
    if (isDevelopment) {
      console.log(`🔗 ${method} ${path}`);
    }
  },

  /**
   * Log errors (always shown)
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or additional data
   */
  error: (message, error) => {
    console.error(`❌ ${message}`, error || '');
  },

  /**
   * Log informational messages (development only)
   * @param {string} message - Info message
   * @param {any} data - Optional data to log
   */
  info: (message, data) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },

  /**
   * Log warnings (always shown)
   * @param {string} message - Warning message
   * @param {any} data - Optional data to log
   */
  warn: (message, data) => {
    console.warn(`⚠️ ${message}`, data || '');
  },

  /**
   * Log success messages (development only)
   * @param {string} message - Success message
   * @param {any} data - Optional data to log
   */
  success: (message, data) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
  }
};

export default logger;