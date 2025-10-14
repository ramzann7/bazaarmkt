/**
 * Timeline Routes
 * API endpoints for order timeline and production queue management
 * Phase 1 Implementation
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware');
const { createOrderTimelineService } = require('../../services');

// ============================================================================
// ORDER TIMELINE ENDPOINTS
// ============================================================================

/**
 * Calculate timeline for a specific order
 * POST /api/orders/:orderId/timeline/calculate
 */
router.post('/orders/:orderId/timeline/calculate', auth.verifyJWT, async (req, res) => {
  try {
    console.log('🕐 Calculating timeline for order:', req.params.orderId);
    
    const orderTimelineService = await createOrderTimelineService();
    const { includeCapacity } = req.body;
    
    // Get order from database first
    const order = await orderTimelineService.findById('orders', req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization (order owner or artisan)
    const isOrderOwner = order.userId && order.userId.toString() === req.user.userId;
    
    // For artisan check, we need to look up the artisan profile since JWT doesn't include artisanId
    let isArtisan = false;
    if (order.artisan && !isOrderOwner) {
      try {
        const artisan = await orderTimelineService.getCollection('artisans').findOne({ 
          user: orderTimelineService.createObjectId(req.user.userId) 
        });
        if (artisan) {
          isArtisan = order.artisan.toString() === artisan._id.toString();
          console.log('🔍 Auth check - artisan found:', artisan._id.toString(), 'order artisan:', order.artisan.toString(), 'match:', isArtisan);
        }
      } catch (artisanLookupError) {
        console.warn('⚠️ Failed to lookup artisan profile:', artisanLookupError.message);
      }
    }
    
    if (!isOrderOwner && !isArtisan) {
      console.log('❌ Authorization failed - userId:', req.user.userId, 'order.userId:', order.userId?.toString(), 'order.artisan:', order.artisan?.toString());
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order timeline'
      });
    }
    
    // Calculate timeline
    const timeline = await orderTimelineService.calculateOrderTimeline(
      order, 
      includeCapacity
    );
    
    // Add lastUpdated timestamp to timeline before saving
    timeline.lastUpdated = new Date();
    
    // Save timeline to order
    await orderTimelineService.getCollection('orders').updateOne(
      { _id: orderTimelineService.createObjectId(req.params.orderId) },
      { 
        $set: { 
          timeline: timeline
        }
      }
    );
    
    res.json({
      success: true,
      data: timeline,
      message: 'Timeline calculated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error calculating order timeline:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate timeline'
    });
  }
});

/**
 * Get customer completion estimate
 * GET /api/orders/:orderId/timeline/estimate
 */
router.get('/orders/:orderId/timeline/estimate', auth.verifyJWT, async (req, res) => {
  try {
    console.log('📅 Getting completion estimate for order:', req.params.orderId);
    
    const orderTimelineService = await createOrderTimelineService();
    
    // Get order and verify access
    const order = await orderTimelineService.findById('orders', req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const isOrderOwner = order.userId && order.userId.toString() === req.user.userId;
    
    // For artisan check, we need to look up the artisan profile since JWT doesn't include artisanId
    let isArtisan = false;
    if (order.artisan && !isOrderOwner) {
      try {
        const artisan = await orderTimelineService.getCollection('artisans').findOne({ 
          user: orderTimelineService.createObjectId(req.user.userId) 
        });
        if (artisan) {
          isArtisan = order.artisan.toString() === artisan._id.toString();
        }
      } catch (artisanLookupError) {
        console.warn('⚠️ Failed to lookup artisan profile:', artisanLookupError.message);
      }
    }
    
    if (!isOrderOwner && !isArtisan) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    const estimate = await orderTimelineService.getCustomerCompletionEstimate(req.params.orderId);
    
    res.json({
      success: true,
      data: estimate
    });
    
  } catch (error) {
    console.error('❌ Error getting completion estimate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get completion estimate'
    });
  }
});

/**
 * Update timeline with production events
 * POST /api/orders/:orderId/timeline/update
 */
router.post('/orders/:orderId/timeline/update', auth.verifyJWT, async (req, res) => {
  try {
    console.log('🔄 Updating timeline for order:', req.params.orderId);
    
    const orderTimelineService = await createOrderTimelineService();
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Events array is required'
      });
    }
    
    // Verify order exists and user has access
    const order = await orderTimelineService.findById('orders', req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Only artisan can update production events - lookup artisan profile
    let isArtisan = false;
    if (order.artisan) {
      try {
        const artisan = await orderTimelineService.getCollection('artisans').findOne({ 
          user: orderTimelineService.createObjectId(req.user.userId) 
        });
        if (artisan) {
          isArtisan = order.artisan.toString() === artisan._id.toString();
        }
      } catch (artisanLookupError) {
        console.warn('⚠️ Failed to lookup artisan profile:', artisanLookupError.message);
      }
    }
    
    if (!isArtisan) {
      return res.status(403).json({
        success: false,
        message: 'Only the artisan can update production timeline'
      });
    }
    
    const updatedTimeline = await orderTimelineService.updateTimelineEstimates(
      req.params.orderId, 
      events
    );
    
    res.json({
      success: true,
      data: updatedTimeline,
      message: 'Timeline updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating timeline:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update timeline'
    });
  }
});

// ============================================================================
// SIMPLIFIED ORDER MANAGEMENT
// Production queue removed - artisans work directly with order status
// ============================================================================

module.exports = router;
