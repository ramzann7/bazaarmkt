/**
 * Database Middleware
 * Attaches database connection to request object
 */

const { getDB } = require('../config/database');

/**
 * Middleware to attach database connection to request
 * Skips health check endpoints to avoid circular dependencies
 */
const databaseMiddleware = async (req, res, next) => {
  // Skip database connection for health check endpoints
  const skipPaths = ['/api/health', '/api/ping'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  try {
    // Get database connection and attach to request
    req.db = await getDB();
    next();
  } catch (error) {
    console.error('❌ Database middleware error:', error.message);
    
    // Return error response
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
    });
  }
};

module.exports = databaseMiddleware;


