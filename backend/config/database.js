/**
 * Database Configuration Module
 * Centralized database connection management for serverless environments
 */

const { getDB, closeDB, getStats, testConnection, resetConnection } = require('../lib/database');

// Database middleware for Express
const databaseMiddleware = async (req, res, next) => {
  try {
    req.db = await getDB();
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};

module.exports = {
  getDB,
  closeDB,
  getStats,
  testConnection,
  resetConnection,
  databaseMiddleware
};
