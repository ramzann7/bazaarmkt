const express = require('express');
const router = express.Router();
const RevenueService = require('../services/revenueService');
const PromotionalFeature = require('../models/promotionalFeature');
const verifyToken = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Get artisan revenue summary (for artisans)
router.get('/artisan/summary', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan role required.' });
    }

    const { period = 'month' } = req.query;
    const summary = await RevenueService.getArtisanRevenueSummary(req.user._id, period);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting artisan revenue summary:', error);
    res.status(500).json({ message: 'Error retrieving revenue summary' });
  }
});

// Get detailed revenue breakdown for an order (transparency)
router.get('/breakdown/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if user is the artisan or patron for this order
    const breakdown = await RevenueService.getRevenueBreakdown(orderId);
    
    // Verify user has access to this order
    if (req.user.role !== 'admin' && 
        breakdown.artisan.id !== req.user._id.toString() && 
        breakdown.patron.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error getting revenue breakdown:', error);
    res.status(500).json({ message: 'Error retrieving revenue breakdown' });
  }
});

// Get available promotional features
router.get('/promotional/features', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan role required.' });
    }

    const features = await RevenueService.getAvailablePromotionalFeatures();
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting promotional features:', error);
    res.status(500).json({ message: 'Error retrieving promotional features' });
  }
});

// Purchase promotional feature
router.post('/promotional/purchase', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan role required.' });
    }

    const {
      featureType,
      productId,
      startDate,
      endDate,
      price,
      paymentMethod,
      specifications
    } = req.body;

    const featureData = {
      artisanId: req.user._id,
      productId,
      featureType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      price,
      paymentMethod,
      specifications,
      status: 'pending_approval'
    };

    const feature = await RevenueService.createPromotionalFeature(featureData);
    
    res.status(201).json({
      success: true,
      message: 'Promotional feature purchase request submitted',
      data: feature
    });
  } catch (error) {
    console.error('Error purchasing promotional feature:', error);
    res.status(500).json({ message: 'Error processing promotional feature purchase' });
  }
});

// Get artisan's promotional features
router.get('/promotional/artisan-features', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan role required.' });
    }

    const features = await PromotionalFeature.find({ artisanId: req.user._id })
      .populate('productId', 'name price')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting artisan promotional features:', error);
    res.status(500).json({ message: 'Error retrieving promotional features' });
  }
});

// Admin routes for revenue management
router.get('/admin/platform-summary', adminAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const summary = await RevenueService.getPlatformRevenueSummary(period);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting platform revenue summary:', error);
    res.status(500).json({ message: 'Error retrieving platform revenue summary' });
  }
});

// Admin: Approve/reject promotional features
router.patch('/admin/promotional/:featureId', adminAuth, async (req, res) => {
  try {
    const { featureId } = req.params;
    const { status, rejectionReason } = req.body;

    const feature = await PromotionalFeature.findById(featureId);
    if (!feature) {
      return res.status(404).json({ message: 'Promotional feature not found' });
    }

    feature.status = status;
    if (status === 'approved') {
      feature.approvedBy = req.user._id;
      feature.approvedAt = new Date();
    } else if (status === 'rejected') {
      feature.rejectionReason = rejectionReason;
    }

    await feature.save();
    
    res.json({
      success: true,
      message: `Promotional feature ${status}`,
      data: feature
    });
  } catch (error) {
    console.error('Error updating promotional feature:', error);
    res.status(500).json({ message: 'Error updating promotional feature' });
  }
});

// Admin: Get all promotional features
router.get('/admin/promotional/all', adminAuth, async (req, res) => {
  try {
    const features = await PromotionalFeature.find()
      .populate('artisanId', 'firstName lastName artisanName')
      .populate('productId', 'name price')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting all promotional features:', error);
    res.status(500).json({ message: 'Error retrieving promotional features' });
  }
});

// Revenue transparency information
router.get('/transparency', async (req, res) => {
  try {
    const transparencyInfo = {
      commissionStructure: {
        platformCommission: '10%',
        artisanEarnings: '90%',
        description: 'For every sale, artisans receive 90% of the total amount while 10% goes to platform maintenance and development.'
      },
      promotionalFeatures: {
        description: 'Artisans can purchase additional promotional features to increase visibility and sales.',
        availableFeatures: [
          'Featured Product ($25/7 days)',
          'Sponsored Product ($50/14 days)',
          'Artisan Spotlight ($100/30 days)',
          'Search Boost ($35/21 days)'
        ]
      },
      paymentProcessing: {
        description: 'All payments are processed securely through Stripe with transparent fee structure.',
        processingFees: 'Standard Stripe processing fees apply (2.9% + 30¢ per transaction)'
      },
      settlement: {
        description: 'Artisan earnings are settled weekly via direct deposit or PayPal.',
        minimumPayout: '$25',
        processingTime: '3-5 business days'
      }
    };
    
    res.json({
      success: true,
      data: transparencyInfo
    });
  } catch (error) {
    console.error('Error getting transparency information:', error);
    res.status(500).json({ message: 'Error retrieving transparency information' });
  }
});

module.exports = router;
