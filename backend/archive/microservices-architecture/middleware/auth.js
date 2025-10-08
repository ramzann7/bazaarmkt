/**
 * Authentication Middleware
 * Handles JWT token validation and user authentication
 */

const jwt = require('jsonwebtoken');
const { DatabaseManager } = require('../config/database');
const { CacheService } = require('../services/cacheService');

/**
 * Main authentication middleware
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check cache first for user data
    const cacheKey = `user:${decoded.userId}`;
    let user = await CacheService.get(cacheKey, async () => {
      const db = await DatabaseManager.connect();
      const usersCollection = db.collection('users');
      return await usersCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(decoded.userId) 
      });
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user data to request
    req.user = user;
    req.userId = decoded.userId;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
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
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
