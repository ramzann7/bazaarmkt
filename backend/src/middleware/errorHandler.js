import enhancedLogger from '../utils/logger.js';
import { config } from '../config/environment.js';

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, true);
    this.details = details;
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, true);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, true);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, true);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  enhancedLogger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for ${field}. Please use another value.`;
    error = new ConflictError(message);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File too large');
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ValidationError('Too many files');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError('Unexpected file field');
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new RateLimitError(err.message || 'Too many requests');
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal server error';
  }

  // Error response
  const errorResponse = {
    error: {
      message: error.message,
      status: error.status || 'error',
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  };

  // Add validation details if available
  if (error.details) {
    errorResponse.error.details = error.details;
  }

  // Add stack trace in development
  if (config.server.isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.error.requestId = req.id;
  }

  // Send error response
  res.status(error.statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Request timeout handler
export const timeoutHandler = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError('Request timeout', 408);
        next(error);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// Graceful shutdown handler
export const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    enhancedLogger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      enhancedLogger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      enhancedLogger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    enhancedLogger.error('Uncaught Exception', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    enhancedLogger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      promise: promise
    });
    process.exit(1);
  });
};

// Error monitoring integration
export const setupErrorMonitoring = () => {
  // Sentry integration
  if (config.monitoring.sentry.enabled) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.init({
        dsn: config.monitoring.sentry.dsn,
        environment: config.server.nodeEnv,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: true })
        ],
        tracesSampleRate: config.server.isProduction ? 0.1 : 1.0
      });
      
      enhancedLogger.info('Sentry error monitoring initialized');
    } catch (error) {
      enhancedLogger.warn('Failed to initialize Sentry', { error: error.message });
    }
  }

  // New Relic integration
  if (config.monitoring.newRelic.enabled) {
    try {
      require('newrelic');
      enhancedLogger.info('New Relic monitoring initialized');
    } catch (error) {
      enhancedLogger.warn('Failed to initialize New Relic', { error: error.message });
    }
  }
};

// Export all error handling utilities
export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
  gracefulShutdown,
  setupErrorMonitoring
};
