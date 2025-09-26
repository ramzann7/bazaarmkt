/**
 * Centralized Error Handling Middleware
 * 
 * Provides consistent error responses and logging across all endpoints.
 * Handles various error types including JWT, MongoDB, validation, and general errors.
 */

/**
 * Main error handling middleware
 * Should be the last middleware in the Express app
 * 
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  console.error(`🚨 Error in ${req.method} ${req.path}:`, {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      error: 'INVALID_TOKEN',
      code: 'AUTH_001'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired',
      error: 'TOKEN_EXPIRED',
      code: 'AUTH_002'
    });
  }

  // MongoDB Errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        error: 'DUPLICATE_KEY',
        code: 'DB_001'
      });
    }

    // General MongoDB errors
    return res.status(500).json({
      success: false,
      message: 'Database operation failed',
      error: 'DATABASE_ERROR',
      code: 'DB_002'
    });
  }

  // MongoDB Connection Errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'DATABASE_UNAVAILABLE',
      code: 'DB_003'
    });
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      code: 'VAL_001',
      details: errors
    });
  }

  // Custom Application Errors
  if (err.name === 'AppError') {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      error: err.errorCode || 'APPLICATION_ERROR',
      code: err.code || 'APP_001'
    });
  }

  // Multer (File Upload) Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size too large',
        error: 'FILE_TOO_LARGE',
        code: 'FILE_001'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: 'FILE_UPLOAD_ERROR',
      code: 'FILE_002'
    });
  }

  // Syntax Errors (malformed JSON, etc.)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'INVALID_JSON',
      code: 'REQ_001'
    });
  }

  // Rate Limiting Errors
  if (err.name === 'TooManyRequestsError') {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      error: 'RATE_LIMIT_EXCEEDED',
      code: 'RATE_001'
    });
  }

  // Default Server Error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'SERVER_ERROR',
    code: 'SRV_001',
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    })
  });
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'APPLICATION_ERROR', code = 'APP_001') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND',
    'ROUTE_001'
  );
  next(error);
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFoundHandler
};
