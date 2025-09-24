// Individual serverless function for popular products
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

    const Product = require('../../src/models/product');
    
    // Get popular products (products with highest view counts)
    const popularProducts = await Product.find({ isActive: true })
      .sort({ viewCount: -1 })
      .limit(10)
      .populate('artisan', 'businessName location')
      .lean();

    res.json({
      success: true,
      products: popularProducts,
      count: popularProducts.length
    });
  } catch (error) {
    console.error('Error fetching popular products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular products',
      error: error.message
    });
  }
};
