// Individual serverless function for featured products
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
    
    // Get featured products (products with highest ratings and view counts)
    const featuredProducts = await Product.find({ isActive: true })
      .sort({ rating: -1, viewCount: -1 })
      .limit(10)
      .populate('artisan', 'businessName location')
      .lean();

    res.json({
      success: true,
      products: featuredProducts,
      count: featuredProducts.length
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};
