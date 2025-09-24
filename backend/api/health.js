// Individual serverless function for health endpoint
const connectToDatabase = require('./lib/mongodb');

module.exports = async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    // Test database connection using proper serverless pattern
    await connectToDatabase();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `error: ${error.message}`;
  }

  res.json({
    status: 'OK',
    message: 'bazaar API is running - optimized for serverless',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    databaseConnection: dbStatus
  });
};