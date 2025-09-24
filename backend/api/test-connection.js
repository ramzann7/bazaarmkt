// Simple test to verify MongoDB connection utility
const connectToDatabase = require('./lib/mongodb');

module.exports = async (req, res) => {
  try {
    console.log('🧪 Testing MongoDB connection utility...');
    
    // Test the connection utility
    await connectToDatabase();
    
    res.json({
      success: true,
      message: 'MongoDB connection utility test successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MongoDB connection utility test failed:', error);
    res.status(500).json({
      success: false,
      message: 'MongoDB connection utility test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
