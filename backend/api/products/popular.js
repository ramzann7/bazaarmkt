// Individual serverless function for popular products
const connectToDatabase = require('../lib/mongodb');

module.exports = async (req, res) => {
  try {
    // Connect to database using proper serverless pattern
    await connectToDatabase();

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
