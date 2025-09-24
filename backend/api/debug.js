// Individual serverless function for debug endpoint
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      API_URL: process.env.API_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      databaseConnection: 'unknown'
    };

    try {
      if (process.env.MONGODB_URI) {
        if (mongoose.connection.readyState === 1) {
          const User = require('../src/models/user');
          const userCount = await User.countDocuments();
          envInfo.databaseConnection = 'connected';
          envInfo.userCount = userCount;
        } else {
          envInfo.databaseConnection = 'connecting';
          envInfo.connectionState = mongoose.connection.readyState;
        }
      } else {
        envInfo.databaseConnection = 'no_uri';
      }
    } catch (dbError) {
      envInfo.databaseConnection = 'error';
      envInfo.databaseError = dbError.message;
    }

    res.json({
      success: true,
      message: 'Debug endpoint working',
      environment: envInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
