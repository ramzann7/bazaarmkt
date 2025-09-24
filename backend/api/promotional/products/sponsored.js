// Individual serverless function for sponsored products
const connectToDatabase = require('../../lib/mongodb');

module.exports = async (req, res) => {
  try {
    // Connect to database using proper serverless pattern
    await connectToDatabase();

    const Product = require('../../../src/models/product');
    const PromotionalFeature = require('../../../src/models/promotionalFeature');
    
    // Get query parameters
    const { limit = 3 } = req.query;
    
    // Try to get sponsored products first
    let sponsoredProducts = [];
    
    try {
      // Look for active promotional features
      const promotionalFeatures = await PromotionalFeature.find({ 
        isActive: true,
        type: 'sponsored_products'
      }).limit(1);
      
      if (promotionalFeatures.length > 0) {
        const feature = promotionalFeatures[0];
        if (feature.products && feature.products.length > 0) {
          sponsoredProducts = await Product.find({
            _id: { $in: feature.products },
            isActive: true
          })
          .populate('artisan', 'businessName location')
          .limit(parseInt(limit))
          .lean();
        }
      }
    } catch (promoError) {
      console.log('Promotional features not available, falling back to regular products');
    }
    
    // If no sponsored products found, get regular products
    if (sponsoredProducts.length === 0) {
      sponsoredProducts = await Product.find({ isActive: true })
        .sort({ rating: -1, viewCount: -1 })
        .limit(parseInt(limit))
        .populate('artisan', 'businessName location')
        .lean();
    }

    res.json({
      success: true,
      products: sponsoredProducts,
      count: sponsoredProducts.length,
      isPromotional: sponsoredProducts.length > 0 && promotionalFeatures && promotionalFeatures.length > 0
    });
  } catch (error) {
    console.error('Error fetching sponsored products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sponsored products',
      error: error.message
    });
  }
};
