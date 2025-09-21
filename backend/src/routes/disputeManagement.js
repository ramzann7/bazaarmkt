const express = require('express');
const router = express.Router();
const DisputeManagementService = require('../services/disputeManagementService');
const verifyToken = require('../middleware/authmiddleware');

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Get all disputes with filtering and pagination (admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      status,
      disputeType,
      reportedBy,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'reportedAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      status,
      disputeType,
      reportedBy,
      dateFrom,
      dateTo
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await DisputeManagementService.getDisputes(filters, pagination);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get dispute details by order ID (admin only)
router.get('/:orderId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await DisputeManagementService.getDisputeDetails(orderId);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching dispute details:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update dispute status (admin only)
router.put('/:orderId/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNotes } = req.body;
    const adminUserId = req.user._id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const result = await DisputeManagementService.updateDisputeStatus(
      orderId, 
      adminUserId, 
      status, 
      adminNotes
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error updating dispute status:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Resolve dispute with financial action (admin only)
router.put('/:orderId/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolution, resolutionNotes } = req.body;
    const adminUserId = req.user._id;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution is required'
      });
    }

    const validResolutions = ['buyer_refunded', 'artisan_paid', 'partial_refund', 'no_action_needed'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type'
      });
    }

    const result = await DisputeManagementService.resolveDispute(
      orderId, 
      adminUserId, 
      resolution, 
      resolutionNotes
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error resolving dispute:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Add evidence to dispute
router.post('/:orderId/evidence', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { uploadedBy, type, url, description } = req.body;

    if (!uploadedBy || !type || !url) {
      return res.status(400).json({
        success: false,
        message: 'uploadedBy, type, and url are required'
      });
    }

    const validTypes = ['image', 'document', 'message'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid evidence type'
      });
    }

    const result = await DisputeManagementService.addDisputeEvidence(
      orderId,
      uploadedBy,
      type,
      url,
      description
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error adding dispute evidence:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get dispute statistics (admin only)
router.get('/stats/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const result = await DisputeManagementService.getDisputeStatistics(period);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching dispute statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
