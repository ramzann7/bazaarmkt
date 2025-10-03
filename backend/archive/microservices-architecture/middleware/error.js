/**
 * Error Handling Middleware
 * Provides centralized error handling and response formatting
 */

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  
  // Log error details
  console.error(`❌ [${requestId}] Error:`, {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.path,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    userId: req.userId || 'anonymous'
  });

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details || [error.message]
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    requestId
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId || 'unknown'
  });
};

module.exports = {
  handler: errorHandler,
  notFound: notFoundHandler
};
