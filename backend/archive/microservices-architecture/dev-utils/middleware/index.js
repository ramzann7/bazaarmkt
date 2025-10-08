/**
 * Development Middleware for Serverless Architecture
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for development
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    
    await client.close();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of allowed user roles
 * @returns {Function} - Middleware function
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Validation middleware factory
 * @param {Function} validationFn - Validation function
 * @returns {Function} - Middleware function
 */
const validate = (validationFn) => {
  return (req, res, next) => {
    try {
      const validation = validationFn(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors || validation.missingFields
        });
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

/**
 * Rate limiting middleware (basic implementation)
 * @param {Object} options - Rate limiting options
 * @returns {Function} - Middleware function
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP'
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(ip)) {
      const userRequests = requests.get(ip).filter(time => time > windowStart);
      requests.set(ip, userRequests);
    }

    // Check if user has exceeded limit
    const userRequests = requests.get(ip) || [];
    if (userRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: message
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(ip, userRequests);

    next();
  };
};

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * Error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (error, req, res, next) => {
  console.error('Server error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors
    });
  }

  if (error.name === 'MongoError' && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * CORS middleware for development
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const corsHandler = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  validate,
  rateLimit,
  requestLogger,
  errorHandler,
  corsHandler
};
