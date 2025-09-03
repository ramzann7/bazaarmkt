import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { config } from '../config/environment.js';
import enhancedLogger from '../utils/logger.js';

// Redis client for rate limiting (if available)
let redisClient = null;
if (config.external.redis.enabled) {
  try {
    redisClient = new Redis(config.external.redis.url);
    redisClient.on('error', (error) => {
      enhancedLogger.error('Redis connection error for rate limiting', { error: error.message });
    });
  } catch (error) {
    enhancedLogger.warn('Failed to connect to Redis for rate limiting, using memory store', { error: error.message });
  }
}

// Create rate limiters for different endpoints
export const createRateLimiters = () => {
  const limiters = {};

  // General API rate limiter
  limiters.general = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.maxRequests,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
      });
    }
  });

  // Authentication endpoints rate limiter (stricter)
  limiters.auth = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    handler: (req, res) => {
      enhancedLogger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      });
    }
  });

  // File upload rate limiter
  limiters.upload = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: {
      error: 'Too many file uploads, please try again later.',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Upload rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many file uploads, please try again later.',
        retryAfter: 3600
      });
    }
  });

  // Payment endpoints rate limiter (very strict)
  limiters.payment = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 payment attempts per hour
    message: {
      error: 'Too many payment attempts, please try again later.',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Payment rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many payment attempts, please try again later.',
        retryAfter: 3600
      });
    }
  });

  // Search endpoints rate limiter
  limiters.search = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
      error: 'Too many search requests, please try again later.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Search rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many search requests, please try again later.',
        retryAfter: 60
      });
    }
  });

  // Admin endpoints rate limiter
  limiters.admin = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 admin requests per minute
    message: {
      error: 'Too many admin requests, please try again later.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Admin rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
      res.status(429).json({
        error: 'Too many admin requests, please try again later.',
        retryAfter: 60
      });
    }
  });

  return limiters;
};

// Dynamic rate limiter based on user type
export const dynamicRateLimit = (req, res, next) => {
  const user = req.user;
  let maxRequests = config.security.rateLimit.maxRequests;

  // Adjust limits based on user type
  if (user) {
    if (user.role === 'admin') {
      maxRequests = 200; // Higher limit for admins
    } else if (user.role === 'artisan') {
      maxRequests = 150; // Higher limit for artisans
    } else {
      maxRequests = 100; // Standard limit for patrons
    }
  } else {
    maxRequests = 50; // Lower limit for anonymous users
  }

  // Create dynamic limiter
  const limiter = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }) : undefined,
    windowMs: config.security.rateLimit.windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return user ? user.id : req.ip;
    },
    message: {
      error: 'Rate limit exceeded, please try again later.',
      retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      enhancedLogger.warn('Dynamic rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userId: user?.id || 'anonymous',
        userRole: user?.role || 'anonymous',
        maxRequests,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Rate limit exceeded, please try again later.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
      });
    }
  });

  limiter(req, res, next);
};

// Export individual limiters for specific routes
export const { general, auth, upload, payment, search, admin } = createRateLimiters();

export default createRateLimiters;
