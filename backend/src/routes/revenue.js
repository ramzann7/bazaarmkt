const express = require('express');
const router = express.Router();
const Revenue = require('../models/revenue');
const Order = require('../models/order');
const PromotionalFeature = require('../models/promotionalFeature');
const ArtisanSpotlight = require('../models/artisanSpotlight');
const Artisan = require('../models/artisan');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const RevenueService = require('../services/revenueService');

// Middleware to check if user is admin
const requireAdmin = [auth, adminAuth];

// Get artisan revenue summary
router.get('/artisan/summary', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const artisanId = req.user._id;

    const summary = await RevenueService.getArtisanRevenueSummary(artisanId, period);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting artisan revenue summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue summary'
    });
  }
});

// Get revenue breakdown for a specific order
router.get('/breakdown/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const breakdown = await RevenueService.getRevenueBreakdown(orderId);
    
    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error getting revenue breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue breakdown'
    });
  }
});

// Get available promotional features
router.get('/promotional/features', auth, async (req, res) => {
  try {
    const features = await RevenueService.getAvailablePromotionalFeatures();
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting promotional features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional features'
    });
  }
});

// Purchase promotional feature
router.post('/promotional/purchase', auth, async (req, res) => {
  try {
    const featureData = {
      ...req.body,
      artisanId: req.user._id
    };

    const feature = await RevenueService.createPromotionalFeature(featureData);
    
    res.json({
      success: true,
      data: feature,
      message: 'Promotional feature purchased successfully'
    });
  } catch (error) {
    console.error('Error purchasing promotional feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing promotional feature'
    });
  }
});

// Get artisan's promotional features
router.get('/promotional/artisan-features', auth, async (req, res) => {
  try {
    const artisanId = req.user._id;
    const features = await PromotionalFeature.find({ artisanId })
      .populate('productId', 'name price image')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting artisan promotional features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional features'
    });
  }
});

// Get transparency information
router.get('/transparency', async (req, res) => {
  try {
    const transparencyInfo = {
      commissionRate: '10%',
      platformCommission: '10% of each sale goes to platform maintenance and development',
      artisanEarnings: '90% of each sale goes directly to the artisan',
      promotionalFeatures: 'Additional revenue from marketing features like featured products and spotlight',
      transparency: 'Full breakdown available for every transaction'
    };
    
    res.json({
      success: true,
      data: transparencyInfo
    });
  } catch (error) {
    console.error('Error getting transparency info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transparency information'
    });
  }
});

// Admin routes

// Get platform revenue summary (admin only)
router.get('/admin/platform-summary', requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const summary = await RevenueService.getPlatformRevenueSummary(period);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting platform revenue summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform revenue summary'
    });
  }
});

// Get spotlight revenue stats (admin only)
router.get('/spotlight/stats', requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const stats = await RevenueService.getSpotlightRevenueStats(period);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting spotlight revenue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spotlight revenue stats'
    });
  }
});

// Get detailed revenue analytics (admin only)
router.get('/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get top performing artisans
    const topArtisans = await Revenue.aggregate([
      {
        $match: {
          type: 'order',
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$artisanId',
          totalRevenue: { $sum: '$grossAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$grossAmount' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: '_id',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $unwind: '$artisan'
      },
      {
        $project: {
          _id: 1,
          artisanName: '$artisan.artisanName',
          firstName: '$artisan.firstName',
          lastName: '$artisan.lastName',
          email: '$artisan.email',
          totalRevenue: 1,
          orderCount: 1,
          averageOrderValue: 1
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get top categories by revenue
    const topCategories = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: '$items.price' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get monthly trends
    const monthlyTrends = await Revenue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$platformCommission' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        topArtisans,
        topCategories,
        monthlyTrends,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics'
    });
  }
});

// Get all promotional features (admin only)
router.get('/admin/promotional/all', requireAdmin, async (req, res) => {
  try {
    const features = await PromotionalFeature.find({})
      .populate('artisanId', 'artisanName firstName lastName email')
      .populate('productId', 'name price image')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting all promotional features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional features'
    });
  }
});

// Approve/reject promotional feature (admin only)
router.patch('/admin/promotional/:featureId', requireAdmin, async (req, res) => {
  try {
    const { featureId } = req.params;
    const { status } = req.body;
    const adminUser = req.user;

    const feature = await PromotionalFeature.findById(featureId);
    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Promotional feature not found'
      });
    }

    feature.status = status;
    feature.approvedBy = adminUser._id;
    feature.approvedAt = new Date();
    await feature.save();

    res.json({
      success: true,
      data: feature,
      message: `Promotional feature ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating promotional feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating promotional feature'
    });
  }
});

// Get delivery revenue summary for artisan
router.get('/delivery-summary/:artisanId', async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { startDate, endDate } = req.query;

    const summary = await RevenueService.getDeliveryRevenueSummary(
      artisanId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting delivery revenue summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery revenue summary'
    });
  }
});

// Get platform delivery expense summary for admin
router.get('/platform-delivery-expenses', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await RevenueService.getPlatformDeliveryExpenseSummary(
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting platform delivery expense summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform delivery expense summary'
    });
  }
});

// Update delivery expense with actual Uber charge (webhook endpoint)
router.put('/delivery-expense/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { actualUberCharge, uberTransactionId } = req.body;

    if (!actualUberCharge || actualUberCharge <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid actual Uber charge is required'
      });
    }

    const result = await RevenueService.updateDeliveryExpense(
      orderId,
      actualUberCharge,
      uberTransactionId
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating delivery expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery expense'
    });
  }
});

module.exports = router;