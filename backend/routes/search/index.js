/**
 * Search Analytics Routes
 * Handles search tracking and analytics
 */

const express = require('express');
const router = express.Router();
const SearchAnalyticsService = require('../../services/searchAnalyticsService');
const searchPerformanceMonitor = require('../../services/searchPerformanceMonitor');

/**
 * Track a search query
 * POST /api/search/analytics
 */
const trackSearch = async (req, res) => {
  try {
    const searchAnalyticsService = new SearchAnalyticsService(req.db);
    
    const searchData = {
      query: req.body.query,
      userId: req.body.userId || null,
      resultsCount: req.body.resultsCount || 0,
      responseTime: req.body.responseTime || 0,
      filters: req.body.filters || {},
      sessionId: req.body.sessionId || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    const result = await searchAnalyticsService.trackSearch(searchData);
    
    res.json(result);
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search',
      error: error.message
    });
  }
};

/**
 * Track a search result click
 * POST /api/search/analytics/:analyticsId/click
 */
const trackClick = async (req, res) => {
  try {
    const searchAnalyticsService = new SearchAnalyticsService(req.db);
    const { analyticsId } = req.params;
    
    const clickData = {
      productId: req.body.productId,
      position: req.body.position || 0
    };

    const result = await searchAnalyticsService.trackClick(analyticsId, clickData);
    
    res.json(result);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message
    });
  }
};

/**
 * Get search insights (admin only)
 * GET /api/search/insights
 */
const getInsights = async (req, res) => {
  try {
    const searchAnalyticsService = new SearchAnalyticsService(req.db);
    const { timeRange = '7d' } = req.query;
    
    const insights = await searchAnalyticsService.getInsights(timeRange);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error getting search insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get insights',
      error: error.message
    });
  }
};

/**
 * Get popular searches
 * GET /api/search/popular
 */
const getPopularSearches = async (req, res) => {
  try {
    const searchAnalyticsService = new SearchAnalyticsService(req.db);
    const { limit = 10, timeRange = '7d' } = req.query;
    
    const popularSearches = await searchAnalyticsService.getPopularSearches(
      parseInt(limit),
      timeRange
    );
    
    res.json({
      success: true,
      data: popularSearches
    });
  } catch (error) {
    console.error('Error getting popular searches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
      error: error.message
    });
  }
};

/**
 * Clean up old analytics (admin only, manual trigger)
 * DELETE /api/search/analytics/cleanup
 */
const cleanupOldAnalytics = async (req, res) => {
  try {
    const searchAnalyticsService = new SearchAnalyticsService(req.db);
    const { daysToKeep = 90 } = req.query;
    
    const result = await searchAnalyticsService.cleanupOldAnalytics(parseInt(daysToKeep));
    
    res.json(result);
  } catch (error) {
    console.error('Error cleaning up analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup analytics',
      error: error.message
    });
  }
};

/**
 * Get performance report (admin only)
 * GET /api/search/performance
 */
const getPerformanceReport = async (req, res) => {
  try {
    const { timeRange = 60 } = req.query; // Default 60 minutes
    
    const report = searchPerformanceMonitor.generatePerformanceReport(parseInt(timeRange));
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting performance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance report',
      error: error.message
    });
  }
};

/**
 * Get current performance stats
 * GET /api/search/performance/stats
 */
const getPerformanceStats = async (req, res) => {
  try {
    const { timeRange = 60 } = req.query;
    
    const stats = searchPerformanceMonitor.getPerformanceStats(parseInt(timeRange));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance stats',
      error: error.message
    });
  }
};

// Routes
router.post('/analytics', trackSearch);
router.post('/analytics/:analyticsId/click', trackClick);
router.get('/insights', getInsights);
router.get('/popular', getPopularSearches);
router.get('/performance', getPerformanceReport);
router.get('/performance/stats', getPerformanceStats);
router.delete('/analytics/cleanup', cleanupOldAnalytics);

module.exports = router;

