// Individual serverless function for promotional featured products
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

    const Product = require('../../../src/models/product');
    const PromotionalFeature = require('../../../src/models/promotionalFeature');
    
    // Get query parameters
    const { limit = 6 } = req.query;
    
    // Try to get promotional featured products first
    let featuredProducts = [];
    
    try {
      // Look for active promotional features
      const promotionalFeatures = await PromotionalFeature.find({ 
        isActive: true,
        type: 'featured_products'
      }).limit(1);
      
      if (promotionalFeatures.length > 0) {
        const feature = promotionalFeatures[0];
        if (feature.products && feature.products.length > 0) {
          featuredProducts = await Product.find({
            _id: { $in: feature.products },
            isActive: true
          })
          .populate('artisan', 'businessName location')
          .limit(parseInt(limit))
          .lean();
        }
      }
    } catch (promoError) {
      console.log('Promotional features not available, falling back to regular featured products');
    }
    
    // If no promotional products found, get regular featured products
    if (featuredProducts.length === 0) {
      featuredProducts = await Product.find({ isActive: true })
        .sort({ rating: -1, viewCount: -1 })
        .limit(parseInt(limit))
        .populate('artisan', 'businessName location')
        .lean();
    }

    res.json({
      success: true,
      products: featuredProducts,
      count: featuredProducts.length,
      isPromotional: featuredProducts.length > 0 && promotionalFeatures && promotionalFeatures.length > 0
    });
  } catch (error) {
    console.error('Error fetching promotional featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional featured products',
      error: error.message
    });
  }
};
