/**
 * Rate Limiting Middleware
 * Provides rate limiting functionality for API endpoints
 */

const rateLimitMap = new Map();

/**
 * Create rate limiting middleware
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, {
        requests: [],
        resetTime: now + windowMs
      });
    }

    const rateLimitData = rateLimitMap.get(key);
    
    // Clean up old requests
    rateLimitData.requests = rateLimitData.requests.filter(
      requestTime => requestTime > windowStart
    );

    // Check if limit is exceeded
    if (rateLimitData.requests.length >= max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((rateLimitData.requests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    rateLimitData.requests.push(now);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - rateLimitData.requests.length),
      'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Predefined rate limit configurations
 */
const presets = {
  // General API rate limiting
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.'
  }),

  // Strict rate limiting for sensitive endpoints
  strict: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many requests to sensitive endpoints, please try again later.'
  }),

  // Login rate limiting
  login: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.'
  })
};

module.exports = {
  create: createRateLimit,
  presets
};
