// Individual serverless function for popular products
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  try {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 15000,
        connectTimeoutMS: 10000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 1000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      });
      console.log('✅ MongoDB connected');
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
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular products',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
