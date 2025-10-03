/**
 * Centralized Middleware System
 * Provides reusable middleware components for authentication, validation, logging, and more
 */

const authMiddleware = require('./auth');
const validationMiddleware = require('./validation');
const loggingMiddleware = require('./logging');
const rateLimitMiddleware = require('./rateLimit');
const errorMiddleware = require('./error');

/**
 * Combine multiple middlewares into a single middleware function
 */
const combine = (...middlewares) => {
  return (req, res, next) => {
    const executeMiddleware = (index) => {
      if (index >= middlewares.length) return next();
      
      middlewares[index](req, res, (err) => {
        if (err) return next(err);
        executeMiddleware(index + 1);
      });
    };
    
    executeMiddleware(0);
  };
};

/**
 * Predefined middleware combinations for common use cases
 */
const presets = {
  // Authentication required
  auth: combine(
    loggingMiddleware.request,
    authMiddleware,
    loggingMiddleware.response
  ),
  
  // Public endpoint with logging
  public: combine(
    loggingMiddleware.request,
    rateLimitMiddleware,
    loggingMiddleware.response
  ),
  
  // Admin only endpoint
  admin: combine(
    loggingMiddleware.request,
    authMiddleware,
    (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      next();
    },
    loggingMiddleware.response
  ),
  
  // Artisan only endpoint
  artisan: combine(
    loggingMiddleware.request,
    authMiddleware,
    (req, res, next) => {
      if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Artisan access required'
        });
      }
      next();
    },
    loggingMiddleware.response
  )
};

module.exports = {
  // Individual middleware
  auth: authMiddleware,
  validation: validationMiddleware,
  logging: loggingMiddleware,
  rateLimit: rateLimitMiddleware,
  error: errorMiddleware,
  
  // Utility functions
  combine,
  
  // Predefined combinations
  presets
};
