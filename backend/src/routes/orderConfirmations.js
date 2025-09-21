const express = require('express');
const router = express.Router();
const OrderConfirmationService = require('../services/orderConfirmationService');
const verifyToken = require('../middleware/authmiddleware');

// Artisan confirms pickup
router.post('/pickup/artisan/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;
    const artisanId = req.user._id;

    const result = await OrderConfirmationService.confirmPickupByArtisan(orderId, artisanId, notes);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in pickup confirmation by artisan:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Buyer confirms pickup
router.post('/pickup/buyer/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, buyerId } = req.body;

    const result = await OrderConfirmationService.confirmPickupByBuyer(orderId, buyerId, notes);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in pickup confirmation by buyer:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Artisan confirms delivery
router.post('/delivery/artisan/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, deliveryProof } = req.body;
    const artisanId = req.user._id;

    const result = await OrderConfirmationService.confirmDeliveryByArtisan(
      orderId, 
      artisanId, 
      notes, 
      deliveryProof
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in delivery confirmation by artisan:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Buyer confirms delivery
router.post('/delivery/buyer/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, buyerId } = req.body;

    const result = await OrderConfirmationService.confirmDeliveryByBuyer(orderId, buyerId, notes);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in delivery confirmation by buyer:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Report dispute
router.post('/dispute/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      reportedBy, 
      disputeType, 
      disputeReason, 
      disputeDetails, 
      evidence = [] 
    } = req.body;

    const result = await OrderConfirmationService.reportDispute(
      orderId,
      reportedBy,
      disputeType,
      disputeReason,
      disputeDetails,
      evidence
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error reporting dispute:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get order confirmation status
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await OrderConfirmationService.getOrderConfirmationStatus(orderId);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error getting order confirmation status:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Run auto-completion job (admin only)
router.post('/auto-complete', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await OrderConfirmationService.autoCompleteOrders();
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error in auto-completion job:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
