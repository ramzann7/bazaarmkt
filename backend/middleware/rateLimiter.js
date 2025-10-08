/**
 * Rate Limiter Middleware
 * Request rate limiting with configurable rules
 */

const rateLimit = require('express-rate-limit');
const { getRateLimitConfig, getCorsOrigins } = require('../config/environment');
const { RATE_LIMIT_SKIP_PATHS } = require('../config/constants');

/**
 * Create rate limiter with custom configuration
 */
const createRateLimiter = (options = {}) => {
  const defaultConfig = getRateLimitConfig();
  
  const config = {
    ...defaultConfig,
    ...options,
    skip: (req) => {
      // Skip rate limiting for specific paths
      const path = req.path;
      return RATE_LIMIT_SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
    }
  };

  return rateLimit(config);
};

/**
 * General API rate limiter
 */
const apiRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again later.'
  }
});

/**
 * Auth endpoints rate limiter
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

/**
 * Upload endpoints rate limiter
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    success: false,
    message: 'Too many upload attempts, please try again later.'
  }
});

/**
 * Community endpoints rate limiter (more lenient)
 */
const communityRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many community requests, please slow down.'
  }
});

/**
 * Admin endpoints rate limiter
 */
const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  }
});

/**
 * Dynamic rate limiter based on user role
 */
const roleBasedRateLimiter = (req, res, next) => {
  // If user is authenticated, use role-based limits
  if (req.user) {
    const userRole = req.user.role || req.user.userType;
    
    switch (userRole) {
      case 'admin':
        return adminRateLimiter(req, res, next);
      case 'artisan':
        return createRateLimiter({
          windowMs: 15 * 60 * 1000,
          max: 200, // Artisans get higher limits
          message: {
            success: false,
            message: 'Rate limit exceeded for artisan account.'
          }
        })(req, res, next);
      default:
        return apiRateLimiter(req, res, next);
    }
  }
  
  // For unauthenticated users, use general rate limiter
  return apiRateLimiter(req, res, next);
};

/**
 * IP-based rate limiter for suspicious activity
 */
const suspiciousActivityLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: {
    success: false,
    message: 'Suspicious activity detected. Please try again later.'
  }
});

/**
 * Rate limiter for password reset endpoints
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again in an hour.'
  }
});

/**
 * Rate limiter for email verification
 */
const emailVerificationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 email verification attempts per minute
  message: {
    success: false,
    message: 'Too many email verification attempts. Please try again later.'
  }
});

/**
 * Custom rate limiter for specific endpoints
 */
const createCustomRateLimiter = (windowMs, max, message) => {
  return createRateLimiter({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Rate limit exceeded. Please try again later.'
    }
  });
};

module.exports = {
  createRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  communityRateLimiter,
  adminRateLimiter,
  roleBasedRateLimiter,
  suspiciousActivityLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  createCustomRateLimiter
};
