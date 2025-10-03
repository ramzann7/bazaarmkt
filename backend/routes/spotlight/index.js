/**
 * Spotlight Routes
 * Handles spotlight subscription management for artisans
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware');
const handlers = require('./handlers');
const validation = require('./validation');

// ============================================================================
// SPOTLIGHT ENDPOINTS
// ============================================================================

// Get spotlight status (artisan only)
router.get('/status', auth.verifyJWT, auth.verifyArtisanRole, handlers.getSpotlightStatus);

// Purchase spotlight subscription (artisan only)
router.post('/purchase', auth.verifyJWT, auth.verifyArtisanRole, validation.validatePurchaseSpotlight, handlers.purchaseSpotlight);

// Get active public spotlights (public)
router.get('/active-public', handlers.getActivePublicSpotlights);

module.exports = router;
