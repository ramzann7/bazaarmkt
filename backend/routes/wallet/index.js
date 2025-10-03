/**
 * Wallet Routes
 * Handles wallet balance and transactions
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware');
const handlers = require('./handlers');

// ============================================================================
// WALLET ENDPOINTS
// ============================================================================

// Get wallet balance (authenticated users)
router.get('/balance', auth.verifyJWT, handlers.getWalletBalance);

module.exports = router;
