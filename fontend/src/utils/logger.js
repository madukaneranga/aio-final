/**
 * Simple, clean logging utility for frontend
 * - Development-only logs for debugging
 * - Always show errors regardless of environment
 * - Minimal, focused logging approach
 */

const isDevelopment = import.meta.env.MODE === 'development';

const logger = {
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
   * Log errors (always shown)
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or additional data
   */
  error: (message, error) => {
    console.error(`❌ ${message}`, error || '');
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
   * Log debug messages (development only)
   * @param {string} message - Debug message
   * @param {any} data - Optional data to log
   */
  debug: (message, data) => {
    if (isDevelopment) {
      console.debug(`🐛 ${message}`, data || '');
    }
  },

  /**
   * Log API calls (development only)
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {any} data - Optional request data
   */
  api: (method, url, data) => {
    if (isDevelopment) {
      console.log(`🌐 API ${method} ${url}`, data ? { data } : '');
    }
  }
};

export default logger;