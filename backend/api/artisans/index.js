// Individual serverless function for artisans
const connectToDatabase = require('../lib/mongodb');

module.exports = async (req, res) => {
  try {
    // Connect to database using proper serverless pattern
    await connectToDatabase();

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
