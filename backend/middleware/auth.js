/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { USER_ROLES } = require('../config/constants');

/**
 * Verify JWT token and attach user to request
 */
const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    let message = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token not active';
    }
    
    return res.status(401).json({
      success: false,
      message
    });
  }
};

/**
 * Verify user has artisan role and attach artisan profile to request
 */
const verifyArtisanRole = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const db = req.db;
    
    console.log('🔍 verifyArtisanRole: userId =', userId);
    
    // Validate userId is a valid ObjectId
    if (!ObjectId.isValid(userId)) {
      console.log('❌ verifyArtisanRole: Invalid ObjectId format');
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    // Get user from database to check role
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    console.log('🔍 verifyArtisanRole: user found =', user ? 'yes' : 'no');
    
    if (!user) {
      console.log('❌ verifyArtisanRole: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('🔍 verifyArtisanRole: user.role =', user.role, 'user.userType =', user.userType);
    
    // Check if user has artisan role
    const isArtisan = user.role === USER_ROLES.ARTISAN || user.userType === USER_ROLES.ARTISAN;
    console.log('🔍 verifyArtisanRole: isArtisan =', isArtisan);
    
    if (!isArtisan) {
      console.log('❌ verifyArtisanRole: User is not an artisan');
      return res.status(403).json({
        success: false,
        message: 'Artisan privileges required'
      });
    }
    
    // Find artisan profile using user ID
    const artisan = await db.collection('artisans').findOne({ user: new ObjectId(userId) });
    console.log('🔍 verifyArtisanRole: artisan profile found =', artisan ? 'yes' : 'no');
    
    if (!artisan) {
      console.log('❌ verifyArtisanRole: Artisan profile not found');
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    console.log('🔍 verifyArtisanRole: artisan._id =', artisan._id);
    console.log('✅ verifyArtisanRole: All checks passed');
    
    // Add both user and artisan info to request for use in endpoints
    req.artisan = artisan;
    req.artisanId = artisan._id; // This is the artisan ID we need for order lookups
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ verifyArtisanRole: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify artisan role',
      error: error.message
    });
  }
};

/**
 * Verify user has admin role
 */
const verifyAdminRole = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const db = req.db;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isAdmin = user.role === USER_ROLES.ADMIN || user.userType === USER_ROLES.ADMIN;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ verifyAdminRole: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin role',
      error: error.message
    });
  }
};

/**
 * Optional JWT verification - doesn't fail if no token provided
 */
const optionalJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without user info if token is invalid
    next();
  }
};

module.exports = {
  verifyJWT,
  verifyArtisanRole,
  verifyAdminRole,
  optionalJWT
};
