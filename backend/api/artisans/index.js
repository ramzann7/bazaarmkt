// Individual serverless function for artisans
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 5000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 1000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      });
    }

    const Artisan = require('../../src/models/artisan');
    
    // Get all artisans
    const artisans = await Artisan.find({ isActive: true })
      .select('businessName location description profileImage rating')
      .lean();

    res.json({
      success: true,
      artisans: artisans,
      count: artisans.length
    });
  } catch (error) {
    console.error('Error fetching artisans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching artisans',
      error: error.message
    });
  }
};
