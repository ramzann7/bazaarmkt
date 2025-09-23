const express = require('express');
const router = express.Router();
const DeliveryRevenueService = require('../services/deliveryRevenueService');
const verifyToken = require('../middleware/authMiddleware');

/**
 * @route GET /api/delivery-revenue/summary
 * @desc Get delivery revenue summary for authenticated artisan
 * @access Private (Artisan only)
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const artisanId = req.user.userId; // This should be the artisan profile ID

    console.log(`📊 Getting delivery revenue summary for artisan ${artisanId} (${period})`);

    const summary = await DeliveryRevenueService.getDeliveryRevenueSummary(artisanId, period);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Error getting delivery revenue summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery revenue summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/delivery-revenue/trends
 * @desc Get delivery revenue trends over time for authenticated artisan
 * @access Private (Artisan only)
 */
router.get('/trends', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const artisanId = req.user.userId; // This should be the artisan profile ID

    console.log(`📈 Getting delivery revenue trends for artisan ${artisanId} (${period})`);

    const trends = await DeliveryRevenueService.getDeliveryRevenueTrends(artisanId, period);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('❌ Error getting delivery revenue trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery revenue trends',
      error: error.message
    });
  }
});

/**
 * @route GET /api/delivery-revenue/performance
 * @desc Get delivery performance metrics for authenticated artisan
 * @access Private (Artisan only)
 */
router.get('/performance', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const artisanId = req.user.userId; // This should be the artisan profile ID

    console.log(`📊 Getting delivery performance metrics for artisan ${artisanId} (${period})`);

    const metrics = await DeliveryRevenueService.getDeliveryPerformanceMetrics(artisanId, period);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('❌ Error getting delivery performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery performance metrics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/delivery-revenue/analytics
 * @desc Get comprehensive delivery revenue analytics for authenticated artisan
 * @access Private (Artisan only)
 */
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const artisanId = req.user.userId; // This should be the artisan profile ID

    console.log(`📊 Getting comprehensive delivery revenue analytics for artisan ${artisanId} (${period})`);

    // Get all analytics data in parallel
    const [summary, trends, performance] = await Promise.all([
      DeliveryRevenueService.getDeliveryRevenueSummary(artisanId, period),
      DeliveryRevenueService.getDeliveryRevenueTrends(artisanId, period),
      DeliveryRevenueService.getDeliveryPerformanceMetrics(artisanId, period)
    ]);

    const analytics = {
      summary,
      trends,
      performance,
      period,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('❌ Error getting delivery revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery revenue analytics',
      error: error.message
    });
  }
});

module.exports = router;
