/**
 * Simplified Error Handling for Serverless Environment
 * Adopts the pattern suggested for better serverless compatibility
 */

/**
 * Error handler wrapper for serverless functions
 * @param {Function} handler - The async route handler
 * @returns {Function} - Wrapped handler with error handling
 */
const errorHandler = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('Function error:', error);
    
    // JWT Authentication Errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Validation Errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // MongoDB Errors
    if (error.name === 'MongoError' || error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Database operation failed'
      });
    }
    
    // Default server error
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Async handler wrapper (compatible with Express middleware pattern)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for unknown routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFoundHandler
};