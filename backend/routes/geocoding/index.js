/**
 * Geocoding Routes
 * Handles geocoding, reverse geocoding, distance calculations, and nearby artisans
 */

const express = require('express');
const router = express.Router();
const handlers = require('./handlers');
const validation = require('./validation');

// ============================================================================
// GEOCODING ENDPOINTS
// ============================================================================

// Geocode address to coordinates
router.post('/geocode', validation.validateGeocodeAddress, handlers.geocodeAddress);

// Reverse geocode coordinates to address
router.post('/reverse', validation.validateReverseGeocode, handlers.reverseGeocode);

// Calculate distance between two points
router.post('/distance', validation.validateDistanceCalculation, handlers.calculateDistance);

// Get nearby artisans
router.get('/nearby-artisans', validation.validateNearbyArtisans, handlers.getNearbyArtisans);

module.exports = router;
