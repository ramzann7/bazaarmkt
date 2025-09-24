// Individual serverless function for featured products
const connectToDatabase = require('../lib/mongodb');

module.exports = async (req, res) => {
  try {
    // Connect to database using proper serverless pattern
    await connectToDatabase();

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
