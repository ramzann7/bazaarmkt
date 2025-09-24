// Individual serverless function for enhanced product search
const connectToDatabase = require('../lib/mongodb');

module.exports = async (req, res) => {
  try {
    // Connect to database using proper serverless pattern
    await connectToDatabase();

    const Product = require('../../src/models/product');
    
    // Get query parameters
    const { userLat, userLng, proximityRadius = 25, enhancedRanking = true, includeDistance = true, limit = 8 } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    // If location is provided, add proximity filter
    if (userLat && userLng) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      const radius = parseFloat(proximityRadius);
      
      // Simple proximity filter (you can enhance this with proper geospatial queries)
      query = {
        ...query,
        'location.latitude': {
          $gte: lat - (radius / 111), // Rough conversion: 1 degree ≈ 111 km
          $lte: lat + (radius / 111)
        },
        'location.longitude': {
          $gte: lng - (radius / 111),
          $lte: lng + (radius / 111)
        }
      };
    }
    
    // Get products
    let products = await Product.find(query)
      .populate('artisan', 'businessName location')
      .limit(parseInt(limit))
      .lean();
    
    // Apply enhanced ranking if requested
    if (enhancedRanking) {
      products = products.sort((a, b) => {
        // Simple ranking based on view count and rating
        const scoreA = (a.viewCount || 0) + (a.rating || 0) * 10;
        const scoreB = (b.viewCount || 0) + (b.rating || 0) * 10;
        return scoreB - scoreA;
      });
    }
    
    // Add distance if requested and location provided
    if (includeDistance && userLat && userLng) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      
      products = products.map(product => {
        if (product.location && product.location.latitude && product.location.longitude) {
          const distance = calculateDistance(lat, lng, product.location.latitude, product.location.longitude);
          return { ...product, distance };
        }
        return product;
      });
    }
    
    res.json({
      success: true,
      products: products,
      count: products.length,
      query: { userLat, userLng, proximityRadius, enhancedRanking, includeDistance, limit }
    });
  } catch (error) {
    console.error('Error in enhanced search:', error);
    res.status(500).json({
      success: false,
      message: 'Error in enhanced search',
      error: error.message
    });
  }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}
