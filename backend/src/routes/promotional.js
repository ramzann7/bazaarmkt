const express = require('express');
const router = express.Router();
const PromotionalFeature = require('../models/promotionalFeature');
const Product = require('../models/product');
const Artisan = require('../models/artisan');

// Get featured products for homepage
router.get('/products/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const featuredProducts = await PromotionalFeature.aggregate([
      {
        $match: {
          featureType: 'product_featured',
          status: 'active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
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
        $match: {
          'product.isActive': true
        }
      },
      {
        $sort: { 'specifications.priority': -1, createdAt: -1 }
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
          artisan: '$product.seller',
          isFeatured: true,
          promotionEndDate: '$endDate'
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

// Get sponsored products for search results
router.get('/products/sponsored', async (req, res) => {
  try {
    const { limit = 3, category } = req.query;
    
    let matchQuery = {
      featureType: 'product_sponsored',
      status: 'active',
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
        $match: {
          'product.isActive': true,
          ...(category && { 'product.category': category })
        }
      },
      {
        $sort: { 'specifications.priority': -1, createdAt: -1 }
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
          artisan: '$product.seller',
          isSponsored: true,
          promotionEndDate: '$endDate'
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

// Get featured artisans for find artisans page
router.get('/artisans/featured', async (req, res) => {
  try {
    const { limit = 4 } = req.query;
    
    const featuredArtisans = await PromotionalFeature.aggregate([
      {
        $match: {
          featureType: 'artisan_spotlight',
          status: 'active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $unwind: '$artisan'
      },
      {
        $match: {
          'artisan.isActive': true
        }
      },
      {
        $sort: { 'specifications.priority': -1, createdAt: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: '$artisan._id',
          artisanName: '$artisan.artisanName',
          description: '$artisan.description',
          category: '$artisan.category',
          specialties: '$artisan.specialties',
          rating: '$artisan.rating',
          isFeatured: true,
          promotionEndDate: '$endDate'
        }
      }
    ]);

    res.json({
      success: true,
      data: featuredArtisans
    });
  } catch (error) {
    console.error('Error fetching featured artisans:', error);
    res.status(500).json({ message: 'Error fetching featured artisans' });
  }
});

// Get search boost products for enhanced search ranking
router.get('/products/search-boost', async (req, res) => {
  try {
    const { query, category } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const searchBoostProducts = await PromotionalFeature.aggregate([
      {
        $match: {
          featureType: 'search_boost',
          status: 'active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
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
        $match: {
          'product.isActive': true,
          $or: [
            { 'product.name': { $regex: query, $options: 'i' } },
            { 'product.description': { $regex: query, $options: 'i' } },
            { 'product.tags': { $in: [new RegExp(query, 'i')] } }
          ],
          ...(category && { 'product.category': category })
        }
      },
      {
        $sort: { 'specifications.priority': -1, createdAt: -1 }
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
          artisan: '$product.seller',
          isSearchBoost: true,
          promotionEndDate: '$endDate',
          boostScore: '$specifications.priority'
        }
      }
    ]);

    res.json({
      success: true,
      data: searchBoostProducts
    });
  } catch (error) {
    console.error('Error fetching search boost products:', error);
    res.status(500).json({ message: 'Error fetching search boost products' });
  }
});

// Get product promotions for a specific product
router.get('/revenue/promotional/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const promotions = await PromotionalFeature.find({
      productId,
      status: { $in: ['active', 'pending_approval'] }
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
router.get('/revenue/promotional/analytics', async (req, res) => {
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
