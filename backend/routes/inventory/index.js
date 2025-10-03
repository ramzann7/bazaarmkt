/**
 * Inventory Routes
 * Handles inventory restoration and management
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware');
const handlers = require('./handlers');
const validation = require('./validation');

// ============================================================================
// INVENTORY ENDPOINTS
// ============================================================================

// Manual inventory restoration (authenticated users)
router.post('/restore', auth.verifyJWT, handlers.restoreInventory);

// Check restoration status for specific product (authenticated users)
router.get('/restore/status/:productId', auth.verifyJWT, validation.validateProductId, handlers.checkRestorationStatus);

module.exports = router;
