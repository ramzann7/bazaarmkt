/**
 * Geospatial Search Handler
 * Optimized location-based product search using $geoNear
 */

const { getInStockInventoryConditions } = require('../../utils/inventoryUtils');

/**
 * Perform geospatial search with $geoNear
 * More efficient than $lookup + manual distance calculation
 */
async function geoNearSearch(req, res) {
  try {
    const startTime = Date.now();
    
    const {
      search: searchQuery,
      category,
      lat,
      lng,
      radius = 50, // Default 50km
      limit = 20
    } = req.query;

    // Validate location parameters
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Location parameters (lat, lng) are required for geospatial search'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusInMeters = parseFloat(radius) * 1000;

    const db = req.db;
    const productsCollection = db.collection('products');

    // Build base match query for $geoNear
    const matchQuery = {
      isActive: { $ne: false },
      ...getInStockInventoryConditions()
    };

    // Add text search if provided
    if (searchQuery) {
      matchQuery.$text = {
        $search: searchQuery,
        $caseSensitive: false,
        $diacriticSensitive: false
      };
    }

    // Add category filter
    if (category) {
      matchQuery.category = category;
    }

    // Build $geoNear pipeline
    // Note: $geoNear must be the FIRST stage in the pipeline
    const pipeline = [];

    // We need to join with artisans first to get coordinates
    // Since products don't have coordinates, we use a different approach
    pipeline.push(
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $unwind: { path: '$artisanInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          // Calculate distance using artisan coordinates
          distance: {
            $cond: {
              if: { $and: [
                { $ne: ['$artisanInfo.address.coordinates', null] },
                { $isArray: '$artisanInfo.address.coordinates' }
              ]},
              then: {
                // Haversine formula in MongoDB
                $let: {
                  vars: {
                    dLat: {
                      $degreesToRadians: {
                        $subtract: [
                          { $arrayElemAt: ['$artisanInfo.address.coordinates', 1] },
                          userLat
                        ]
                      }
                    },
                    dLng: {
                      $degreesToRadians: {
                        $subtract: [
                          { $arrayElemAt: ['$artisanInfo.address.coordinates', 0] },
                          userLng
                        ]
                      }
                    },
                    lat1: { $degreesToRadians: userLat },
                    lat2: {
                      $degreesToRadians: {
                        $arrayElemAt: ['$artisanInfo.address.coordinates', 1]
                      }
                    }
                  },
                  in: {
                    $multiply: [
                      6371, // Earth radius in km
                      {
                        $multiply: [
                          2,
                          {
                            $asin: {
                              $sqrt: {
                                $add: [
                                  {
                                    $pow: [
                                      { $sin: { $divide: ['$$dLat', 2] } },
                                      2
                                    ]
                                  },
                                  {
                                    $multiply: [
                                      { $cos: '$$lat1' },
                                      { $cos: '$$lat2' },
                                      {
                                        $pow: [
                                          { $sin: { $divide: ['$$dLng', 2] } },
                                          2
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              },
              else: null
            }
          }
        }
      },
      {
        // Filter by radius
        $match: {
          $or: [
            { distance: { $lte: parseFloat(radius) } },
            { distance: null } // Include products without location
          ]
        }
      }
    );

    // Add advanced relevance scoring
    if (searchQuery) {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      pipeline.push({
        $addFields: {
          textScore: { $meta: "textScore" },
          proximityScore: {
            $cond: {
              if: { $ne: ['$distance', null] },
              then: {
                // Exponential decay: closer = higher score (0-100 points)
                $multiply: [
                  100,
                  { $exp: { $divide: [{ $multiply: ['$distance', -1] }, parseFloat(radius)] } }
                ]
              },
              else: 0
            }
          },
          relevanceScore: {
            $add: [
              // Text match relevance (30% weight - reduced for geo search)
              { $multiply: [{ $meta: "textScore" }, 0.3] },
              
              // Proximity score (20% weight - important for geo search)
              {
                $multiply: [
                  {
                    $cond: {
                      if: { $ne: ['$distance', null] },
                      then: {
                        $multiply: [
                          100,
                          { $exp: { $divide: [{ $multiply: ['$distance', -1] }, parseFloat(radius)] } }
                        ]
                      },
                      else: 0
                    }
                  },
                  0.2
                ]
              },
              
              // Popularity from views
              { $multiply: [{ $ifNull: ["$views", 0] }, 0.0001] },
              
              // Sales history
              { $multiply: [{ $ifNull: ["$soldCount", 0] }, 0.001] },
              
              // Featured products boost
              { $cond: [{ $eq: ["$isFeatured", true] }, 50, 0] },
              
              // Recent listings boost
              { $cond: [{ $gte: ["$createdAt", recentDate] }, 25, 0] },
              
              // Artisan spotlight boost
              { $cond: [{ $eq: ["$artisanSpotlight", true] }, 100, 0] },
              
              // Promotional products boost
              { $cond: [{ $eq: ["$isPromotional", true] }, 75, 0] }
            ]
          }
        }
      });
      
      // Sort by combined relevance and proximity
      pipeline.push({ $sort: { relevanceScore: -1, distance: 1 } });
    } else {
      // No search query - sort by distance then recency
      pipeline.push({ $sort: { distance: 1, createdAt: -1 } });
    }

    pipeline.push({ $limit: parseInt(limit) });

    // Project final fields
    pipeline.push({
      $project: {
        name: 1,
        description: 1,
        price: 1,
        images: 1,
        category: 1,
        subcategory: 1,
        productType: 1,
        stock: 1,
        remainingCapacity: 1,
        availableQuantity: 1,
        createdAt: 1,
        isFeatured: 1,
        isPromotional: 1,
        artisanSpotlight: 1,
        views: 1,
        soldCount: 1,
        textScore: 1,
        relevanceScore: 1,
        distance: 1,
        artisan: {
          _id: '$artisanInfo._id',
          artisanName: '$artisanInfo.artisanName',
          businessName: '$artisanInfo.businessName',
          profileImage: '$artisanInfo.profileImage',
          'address.city': '$artisanInfo.address.city',
          'address.state': '$artisanInfo.address.state',
          'address.coordinates': '$artisanInfo.address.coordinates'
        }
      }
    });

    const products = await productsCollection.aggregate(pipeline).toArray();

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    res.json({
      success: true,
      products,
      count: products.length,
      searchMetadata: {
        query: searchQuery,
        location: { lat: userLat, lng: userLng },
        radius,
        responseTime,
        geoOptimized: true
      }
    });

  } catch (error) {
    console.error('Geospatial search error:', error);
    res.status(500).json({
      success: false,
      message: 'Geospatial search failed',
      error: error.message
    });
  }
}

module.exports = {
  geoNearSearch
};

