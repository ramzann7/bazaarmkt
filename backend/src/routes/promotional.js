const express = require('express');
const router = express.Router();
const PromotionalFeature = require('../models/promotionalFeature');
const Product = require('../models/product');
const Artisan = require('../models/artisan');
const verifyToken = require('../middleware/authmiddleware');

// Get featured products for homepage with distance-based ranking
router.get('/products/featured', async (req, res) => {
  try {
    const { limit = 6, userLat, userLng } = req.query;
    
    let matchQuery = {
      featureType: 'featured_product',
      status: 'active',
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    };

    const featuredProducts = await PromotionalFeature.aggregate([
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'product.artisan',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $unwind: '$artisan'
      },
      {
        $match: {
          'product.isActive': true,
          'product.status': 'active'
        }
      },
      {
        $addFields: {
          // Calculate distance if user coordinates provided
          distance: {
            $cond: {
              if: { $and: [userLat, userLng, '$artisan.coordinates'] },
              then: {
                $divide: [
                  {
                    $add: [
                      { $pow: [{ $subtract: ['$artisan.coordinates.latitude', parseFloat(userLat)] }, 2] },
                      { $pow: [{ $subtract: ['$artisan.coordinates.longitude', parseFloat(userLng)] }, 2] }
                    ]
                  },
                  1000 // Convert to km approximation
                ]
              },
              else: 999999 // Large distance for sorting when no coordinates
            }
          }
        }
      },
      {
        $sort: { 
          distance: 1, // Closest first
          'specifications.priority': -1, // Then by priority
          createdAt: -1 // Then by creation date
        }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          description: '$product.description',
          price: '$product.price',
          image: '$product.image',
          category: '$product.category',
          subcategory: '$product.subcategory',
          artisan: {
            _id: '$artisan._id',
            artisanName: '$artisan.artisanName',
            businessType: '$artisan.businessType',
            coordinates: '$artisan.coordinates'
          },
          isFeatured: true,
          promotionEndDate: '$endDate',
          distance: '$distance',
          remainingDays: {
            $ceil: {
              $divide: [
                { $subtract: ['$endDate', new Date()] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: featuredProducts
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ message: 'Error fetching featured products' });
  }
});

// Get sponsored products for search results with enhanced ranking
router.get('/products/sponsored', async (req, res) => {
  try {
    const { limit = 3, category, searchQuery, userLat, userLng } = req.query;
    
    let matchQuery = {
      featureType: 'sponsored_product',
      status: 'active',
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    };

    const sponsoredProducts = await PromotionalFeature.aggregate([
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'product.artisan',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $unwind: '$artisan'
      },
      {
        $match: {
          'product.isActive': true,
          'product.status': 'active',
          ...(category && { 'product.category': category })
        }
      },
      {
        $addFields: {
          // Calculate relevance score
          relevanceScore: {
            $add: [
              // Base sponsored boost
              100,
              // Category match boost
              { $cond: { if: { $eq: ['$product.category', category] }, then: 50, else: 0 } },
              // Search query relevance (if provided)
              {
                $cond: {
                  if: searchQuery,
                  then: {
                    $multiply: [
                      {
                        $size: {
                          $setIntersection: [
                            '$specifications.searchKeywords',
                            searchQuery.toLowerCase().split(' ')
                          ]
                        }
                      },
                      25
                    ]
                  },
                  else: 0
                }
              },
              // Proximity boost
              {
                $cond: {
                  if: { $and: [userLat, userLng, '$artisan.coordinates'] },
                  then: {
                    $max: [
                      0,
                      { $subtract: [100, { $multiply: ['$distance', 10] }] }
                    ]
                  },
                  else: 0
                }
              }
            ]
          },
          // Calculate distance if user coordinates provided
          distance: {
            $cond: {
              if: { $and: [userLat, userLng, '$artisan.coordinates'] },
              then: {
                $divide: [
                  {
                    $add: [
                      { $pow: [{ $subtract: ['$artisan.coordinates.latitude', parseFloat(userLat)] }, 2] },
                      { $pow: [{ $subtract: ['$artisan.coordinates.longitude', parseFloat(userLng)] }, 2] }
                    ]
                  },
                  1000
                ]
              },
              else: 999999
            }
          }
        }
      },
      {
        $sort: { 
          relevanceScore: -1, // Highest relevance first
          'specifications.priority': -1, // Then by priority
          distance: 1 // Then by distance
        }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          description: '$product.description',
          price: '$product.price',
          image: '$product.image',
          category: '$product.category',
          subcategory: '$product.subcategory',
          artisan: {
            _id: '$artisan._id',
            artisanName: '$artisan.artisanName',
            businessType: '$artisan.businessType',
            coordinates: '$artisan.coordinates'
          },
          isSponsored: true,
          promotionEndDate: '$endDate',
          relevanceScore: '$relevanceScore',
          distance: '$distance',
          remainingDays: {
            $ceil: {
              $divide: [
                { $subtract: ['$endDate', new Date()] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: sponsoredProducts
    });
  } catch (error) {
    console.error('Error fetching sponsored products:', error);
    res.status(500).json({ message: 'Error fetching sponsored products' });
  }
});

// Create new promotional feature (artisan request)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { productId, featureType, durationDays, customText, searchKeywords, categoryBoost } = req.body;
    
    // Validate feature type
    if (!['featured_product', 'sponsored_product'].includes(featureType)) {
      return res.status(400).json({ message: 'Invalid feature type' });
    }
    
    // Validate duration
    if (!durationDays || durationDays < 1 || durationDays > 365) {
      return res.status(400).json({ message: 'Invalid duration' });
    }
    
    // Check if product exists and belongs to artisan
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.artisan.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only promote your own products' });
    }
    
    // Calculate pricing based on feature type
    let price, placement;
    if (featureType === 'featured_product') {
      price = 25; // $25 for featured products
      placement = 'homepage';
    } else if (featureType === 'sponsored_product') {
      price = 40; // $40 for 7 days of sponsored products
      placement = 'search_results';
    }
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    // Create promotional feature
    const promotionalFeature = new PromotionalFeature({
      artisanId: req.user._id,
      productId,
      featureType,
      startDate,
      endDate,
      durationDays,
      price,
      currency: 'USD',
      specifications: {
        placement,
        priority: 5,
        customText,
        searchKeywords: featureType === 'sponsored_product' ? searchKeywords : [],
        categoryBoost: featureType === 'sponsored_product' ? categoryBoost : [],
        proximityBoost: true,
        geographicTarget: 'local'
      },
      status: 'pending_approval',
      isActive: false
    });
    
    await promotionalFeature.save();
    
    res.json({
      success: true,
      message: 'Promotional feature request submitted successfully',
      data: promotionalFeature
    });
  } catch (error) {
    console.error('Error creating promotional feature:', error);
    res.status(500).json({ message: 'Error creating promotional feature' });
  }
});

// Get artisan's promotional features
router.get('/artisan/:artisanId', verifyToken, async (req, res) => {
  try {
    const { artisanId } = req.params;
    
    // Verify artisan owns the request or is admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== artisanId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const features = await PromotionalFeature.find({ artisanId })
      .populate('productId', 'name image category')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error fetching artisan promotional features:', error);
    res.status(500).json({ message: 'Error fetching promotional features' });
  }
});

// Admin: Get pending promotional features for approval
router.get('/admin/pending', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const pendingFeatures = await PromotionalFeature.find({ status: 'pending_approval' })
      .populate('artisanId', 'firstName lastName artisanName businessType')
      .populate('productId', 'name image category price')
      .sort({ createdAt: 1 });
    
    res.json({
      success: true,
      data: pendingFeatures
    });
  } catch (error) {
    console.error('Error fetching pending promotional features:', error);
    res.status(500).json({ message: 'Error fetching pending features' });
  }
});

// Admin: Approve or reject promotional feature
router.put('/admin/:featureId/approve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { featureId } = req.params;
    const { action, rejectionReason } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    
    const feature = await PromotionalFeature.findById(featureId);
    if (!feature) {
      return res.status(404).json({ message: 'Promotional feature not found' });
    }
    
    if (action === 'approve') {
      feature.status = 'approved';
      feature.isActive = true;
      feature.approvedBy = req.user._id;
      feature.approvedAt = new Date();
    } else {
      feature.status = 'rejected';
      feature.isActive = false;
      feature.rejectionReason = rejectionReason;
    }
    
    await feature.save();
    
    res.json({
      success: true,
      message: `Promotional feature ${action}d successfully`,
      data: feature
    });
  } catch (error) {
    console.error('Error updating promotional feature:', error);
    res.status(500).json({ message: 'Error updating promotional feature' });
  }
});

// Get product promotions for a specific product
router.get('/revenue/promotional/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const promotions = await PromotionalFeature.find({
      productId,
      status: { $in: ['active', 'pending_approval', 'approved'] }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    console.error('Error fetching product promotions:', error);
    res.status(500).json({ message: 'Error fetching product promotions' });
  }
});

// Get promotion analytics for artisans
router.get('/revenue/promotional/analytics', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const startDate = getPeriodStartDate(period);
    
    const analytics = await PromotionalFeature.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$featureType',
          totalSpent: { $sum: '$price' },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $gte: ['$endDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalCount: { $sum: 1 },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    const totalSpent = analytics.reduce((sum, item) => sum + item.totalSpent, 0);
    const totalActive = analytics.reduce((sum, item) => sum + item.activeCount, 0);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        totalSpent,
        totalActive,
        breakdown: analytics,
        summary: {
          totalPromotions: analytics.reduce((sum, item) => sum + item.totalCount, 0),
          averageSpend: totalSpent / analytics.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching promotion analytics:', error);
    res.status(500).json({ message: 'Error fetching promotion analytics' });
  }
});

// Helper function to get period start date
function getPeriodStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

module.exports = router;
