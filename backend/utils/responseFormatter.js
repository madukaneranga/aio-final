/**
 * Standardized response formatter for consistent API responses
 */

/**
 * Format success response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {Object} Formatted success response
 */
export const successResponse = (data, message = 'Success', status = 200) => {
  return {
    success: true,
    message,
    data,
    status
  };
};

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {any} details - Additional error details
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, status = 500, details = null) => {
  const response = {
    success: false,
    error: message,
    status
  };

  if (details) {
    response.details = details;
  }

  return response;
};

/**
 * Format validation error response
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted validation error response
 */
export const validationErrorResponse = (errors) => {
  return {
    success: false,
    error: 'Validation failed',
    status: 400,
    details: errors
  };
};

/**
 * Format paginated response
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 */
export const paginatedResponse = (data, pagination, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination,
    status: 200
  };
};