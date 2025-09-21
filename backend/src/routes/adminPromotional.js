const express = require('express');
const router = express.Router();
const PromotionalFeature = require('../models/promotionalFeature');
const PromotionalPricing = require('../models/promotionalPricing');
const Artisan = require('../models/artisan');
const User = require('../models/user');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const { logAdminAction } = require('../utils/adminAuditLogger');
const { paginationMiddleware, paginatedResponse } = require('../middleware/pagination');
const { validate, promotionalPricingSchema } = require('../middleware/validation');

// Admin middleware to check if user is admin
const requireAdmin = [auth, adminAuth];

// Test endpoint to check if route is working (no auth for testing)
router.get('/test-no-auth', async (req, res) => {
  try {
    console.log('🔍 Test endpoint (no auth) called');
    
    // Test if PromotionalFeature model can be queried
    const count = await PromotionalFeature.countDocuments();
    console.log('🔍 PromotionalFeature count:', count);
    
    res.json({ 
      message: 'Promotional routes are working!', 
      timestamp: new Date(),
      promotionalFeatureCount: count
    });
  } catch (error) {
    console.error('🔍 Test endpoint error:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint with basic auth only
router.get('/test-auth-only', auth, async (req, res) => {
  try {
    console.log('🔍 Test endpoint (auth only) called');
    console.log('🔍 User:', req.user);
    
    // Test if PromotionalFeature model can be queried
    const count = await PromotionalFeature.countDocuments();
    console.log('🔍 PromotionalFeature count:', count);
    
    res.json({ 
      message: 'Auth is working!', 
      timestamp: new Date(),
      user: req.user,
      promotionalFeatureCount: count
    });
  } catch (error) {
    console.error('🔍 Test endpoint error:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint to check if route is working
router.get('/test', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Test endpoint called');
    
    // Test if PromotionalFeature model can be queried
    const count = await PromotionalFeature.countDocuments();
    console.log('🔍 PromotionalFeature count:', count);
    
    res.json({ 
      message: 'Promotional routes are working!', 
      timestamp: new Date(),
      promotionalFeatureCount: count
    });
  } catch (error) {
    console.error('🔍 Test endpoint error:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Get promotional statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Promotional stats endpoint called');
    const { period = 30 } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log('🔍 Stats query params:', { period, days, startDate });

    // Get total revenue from promotional features (from Revenue collection)
    console.log('🔍 Starting revenue stats aggregation...');
    const Revenue = require('../models/revenue');
    const revenueStats = await Revenue.aggregate([
      {
        $match: {
          type: 'promotional',
          paymentDate: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grossAmount' },
          totalPromotions: { $sum: 1 }
        }
      }
    ]);
    console.log('🔍 Revenue stats result:', revenueStats);

    // Get active promotions count
    console.log('🔍 Starting active promotions count...');
    const activePromotions = await PromotionalFeature.countDocuments({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    console.log('🔍 Active promotions count:', activePromotions);

    // Get unique active artisans
    console.log('🔍 Starting active artisans distinct query...');
    const activeArtisans = await PromotionalFeature.distinct('artisanId', {
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    console.log('🔍 Active artisans result:', activeArtisans);

    const stats = revenueStats[0] || { totalRevenue: 0, totalPromotions: 0 };
    const averageRevenuePerDay = days > 0 ? stats.totalRevenue / days : 0;

    const result = {
      totalRevenue: stats.totalRevenue,
      totalPromotions: stats.totalPromotions,
      activePromotions,
      activeArtisans: activeArtisans.length,
      averageRevenuePerDay
    };
    
    console.log('🔍 Final stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('🔍 Error fetching promotional stats:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching promotional statistics',
      error: error.message,
      stack: error.stack
    });
  }
});

// Get active promotions with details (paginated)
router.get('/active', requireAdmin, paginationMiddleware, async (req, res) => {
  try {
    console.log('🔍 Active promotions endpoint called');
    const { page, limit, skip } = req.pagination;
    console.log('🔍 Pagination params:', { page, limit, skip });
    
    console.log('🔍 Starting promotions query...');
    const promotions = await PromotionalFeature.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
    .populate('artisanId', 'firstName lastName email')
    .populate('productId', 'name price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance

    console.log('🔍 Found promotions:', promotions.length);

    // Get artisan details for each promotion
    console.log('🔍 Starting artisan lookup...');
    for (let promotion of promotions) {
      if (promotion.artisanId) {
        const artisan = await Artisan.findOne({ user: promotion.artisanId._id })
          .select('artisanName businessImage')
          .lean();
        promotion.artisan = artisan;
        console.log('🔍 Found artisan for promotion:', promotion._id, artisan ? artisan.artisanName : 'none');
      }
    }

    const total = await PromotionalFeature.countDocuments({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    res.json(paginatedResponse(promotions, total, req.pagination));
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    res.status(500).json({ message: 'Error fetching active promotions' });
  }
});

// Get promotional pricing configuration
router.get('/pricing', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Promotional pricing endpoint called');
    const pricing = await PromotionalPricing.find({ isActive: true }).sort({ featureType: 1 });
    console.log('🔍 Pricing found:', pricing.length, 'items');
    res.json(pricing);
  } catch (error) {
    console.error('🔍 Error fetching promotional pricing:', error);
    console.error('🔍 Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching promotional pricing',
      error: error.message,
      stack: error.stack
    });
  }
});

// Update promotional pricing
router.put('/pricing', requireAdmin, validate(promotionalPricingSchema), async (req, res) => {
  try {
    const { featureType, name, description, basePrice, pricePerDay, benefits } = req.body;
    const adminUser = req.user;

    // Check if pricing exists
    let pricing = await PromotionalPricing.findOne({ featureType });
    
    if (pricing) {
      // Update existing pricing
      const oldData = {
        name: pricing.name,
        basePrice: pricing.basePrice,
        pricePerDay: pricing.pricePerDay
      };

      pricing.name = name;
      pricing.description = description;
      pricing.basePrice = basePrice;
      pricing.pricePerDay = pricePerDay;
      pricing.benefits = benefits;
      pricing.lastUpdatedBy = adminUser._id;
      
      await pricing.save();

      // Log admin action
      await logAdminAction({
        adminUser,
        action: 'promotional_pricing_updated',
        targetType: 'promotional_pricing',
        targetId: pricing._id,
        targetName: pricing.name,
        changes: {
          field: 'pricing',
          oldValue: oldData,
          newValue: { name, basePrice, pricePerDay }
        },
        description: `Updated promotional pricing for ${name}`,
        req
      });

      res.json({ message: 'Pricing updated successfully', pricing });
    } else {
      // Create new pricing
      pricing = new PromotionalPricing({
        featureType,
        name,
        description,
        basePrice,
        pricePerDay,
        benefits,
        lastUpdatedBy: adminUser._id
      });

      await pricing.save();

      // Log admin action
      await logAdminAction({
        adminUser,
        action: 'promotional_pricing_created',
        targetType: 'promotional_pricing',
        targetId: pricing._id,
        targetName: pricing.name,
        changes: {
          field: 'pricing',
          oldValue: null,
          newValue: { name, basePrice, pricePerDay }
        },
        description: `Created promotional pricing for ${name}`,
        req
      });

      res.status(201).json({ message: 'Pricing created successfully', pricing });
    }
  } catch (error) {
    console.error('Error updating promotional pricing:', error);
    res.status(500).json({ message: 'Error updating promotional pricing' });
  }
});

// Get promotional feature analytics (paginated)
router.get('/analytics', requireAdmin, paginationMiddleware, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Feature type distribution
    const featureTypeStats = await PromotionalFeature.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$featureType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$price' }
        }
      }
    ]);

    // Daily revenue trend
    const dailyRevenue = await PromotionalFeature.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: { $dayOfMonth: '$paymentDate' }
          },
          revenue: { $sum: '$price' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Top performing artisans (paginated)
    const { page, limit, skip } = req.pagination;
    const topArtisans = await PromotionalFeature.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$artisanId',
          totalSpent: { $sum: '$price' },
          promotionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'artisans',
          localField: '_id',
          foreignField: 'user',
          as: 'artisan'
        }
      },
      {
        $unwind: '$artisan'
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    // Get total count for pagination
    const totalArtisans = await PromotionalFeature.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paymentDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$artisanId'
        }
      },
      {
        $count: 'total'
      }
    ]);

    res.json({
      featureTypeStats,
      dailyRevenue,
      topArtisans: paginatedResponse(topArtisans, totalArtisans[0]?.total || 0, req.pagination)
    });
  } catch (error) {
    console.error('Error fetching promotional analytics:', error);
    res.status(500).json({ message: 'Error fetching promotional analytics' });
  }
});

// Initialize default promotional pricing if none exists
router.post('/pricing/initialize', requireAdmin, async (req, res) => {
  try {
    const adminUser = req.user;
    
    const defaultPricing = [
      {
        featureType: 'featured_product',
        name: 'Featured Product',
        description: 'Highlight your product on the homepage and at the top of search results',
        basePrice: 5,
        pricePerDay: 5,
        benefits: [
          'Featured placement on homepage',
          'Higher search ranking',
          'Featured badge on product',
          'Increased visibility to customers'
        ],
        lastUpdatedBy: adminUser._id
      },
      {
        featureType: 'sponsored_product',
        name: 'Sponsored Product',
        description: 'Promote your product with sponsored placement in search results and category pages',
        basePrice: 10,
        pricePerDay: 10,
        benefits: [
          'Sponsored placement in search results',
          'Enhanced visibility in product category',
          'Sponsored label on product',
          'Priority ranking in search'
        ],
        lastUpdatedBy: adminUser._id
      },
      {
        featureType: 'artisan_spotlight',
        name: 'Artisan Spotlight',
        description: 'Feature your artisan profile prominently on the platform',
        basePrice: 25,
        pricePerDay: 25,
        benefits: [
          'Featured artisan profile',
          'Priority placement in artisan listings',
          'Spotlight badge on profile',
          'Enhanced visibility to customers'
        ],
        lastUpdatedBy: adminUser._id
      }
    ];

    const createdPricing = [];
    for (const pricing of defaultPricing) {
      const existing = await PromotionalPricing.findOne({ featureType: pricing.featureType });
      if (!existing) {
        const newPricing = new PromotionalPricing(pricing);
        await newPricing.save();
        createdPricing.push(newPricing);
      }
    }

    res.json({ 
      message: 'Default pricing initialized', 
      created: createdPricing.length,
      pricing: createdPricing 
    });
  } catch (error) {
    console.error('Error initializing promotional pricing:', error);
    res.status(500).json({ message: 'Error initializing promotional pricing' });
  }
});

module.exports = router;
