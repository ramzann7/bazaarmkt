/**
 * Delivery Routes
 * Handles Uber Direct delivery integration
 */

const express = require('express');
const router = express.Router();
const uberDirectService = require('../../services/uberDirectService');
const geocodingService = require('../../services/geocodingService');

/**
 * Get delivery quote
 * POST /api/delivery/uber-direct/quote
 */
router.post('/uber-direct/quote', async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, packageDetails } = req.body;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff locations are required'
      });
    }

    // Geocode addresses if coordinates are missing
    let pickup = pickupLocation;
    let dropoff = dropoffLocation;

    if (!pickup.latitude || !pickup.longitude) {
      console.log('📍 Geocoding pickup address:', pickup.address);
      const pickupCoords = await geocodingService.geocodeAddress(pickup.address);
      if (pickupCoords) {
        pickup.latitude = pickupCoords.lat;
        pickup.longitude = pickupCoords.lng;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Could not geocode pickup address'
        });
      }
    }

    if (!dropoff.latitude || !dropoff.longitude) {
      console.log('📍 Geocoding dropoff address:', dropoff.address);
      const dropoffCoords = await geocodingService.geocodeAddress(dropoff.address);
      if (dropoffCoords) {
        dropoff.latitude = dropoffCoords.lat;
        dropoff.longitude = dropoffCoords.lng;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Could not geocode dropoff address'
        });
      }
    }

    // Get quote from Uber Direct
    const quote = await uberDirectService.getDeliveryQuote(
      pickup,
      dropoff,
      packageDetails || {}
    );

    res.json(quote);
  } catch (error) {
    console.error('❌ Error getting delivery quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery quote',
      error: error.message
    });
  }
});

/**
 * Create delivery request
 * POST /api/delivery/uber-direct/create
 */
router.post('/uber-direct/create', async (req, res) => {
  try {
    const { quoteId, orderDetails, pickupLocation, dropoffLocation } = req.body;

    // Validate required fields
    if (!quoteId || !orderDetails || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Quote ID, order details, and locations are required'
      });
    }

    // Geocode addresses if coordinates are missing
    let pickup = pickupLocation;
    let dropoff = dropoffLocation;

    if (!pickup.latitude || !pickup.longitude) {
      const pickupCoords = await geocodingService.geocodeAddress(pickup.address);
      if (pickupCoords) {
        pickup.latitude = pickupCoords.lat;
        pickup.longitude = pickupCoords.lng;
      }
    }

    if (!dropoff.latitude || !dropoff.longitude) {
      const dropoffCoords = await geocodingService.geocodeAddress(dropoff.address);
      if (dropoffCoords) {
        dropoff.latitude = dropoffCoords.lat;
        dropoff.longitude = dropoffCoords.lng;
      }
    }

    // Create delivery
    const delivery = await uberDirectService.createDelivery(
      quoteId,
      orderDetails,
      pickup,
      dropoff
    );

    res.json(delivery);
  } catch (error) {
    console.error('❌ Error creating delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery request',
      error: error.message
    });
  }
});

/**
 * Get delivery status
 * GET /api/delivery/uber-direct/status/:deliveryId
 */
router.get('/uber-direct/status/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery ID is required'
      });
    }

    const status = await uberDirectService.getDeliveryStatus(deliveryId);
    res.json(status);
  } catch (error) {
    console.error('❌ Error getting delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery status',
      error: error.message
    });
  }
});

/**
 * Cancel delivery
 * POST /api/delivery/uber-direct/cancel/:deliveryId
 */
router.post('/uber-direct/cancel/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery ID is required'
      });
    }

    const result = await uberDirectService.cancelDelivery(deliveryId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error cancelling delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel delivery',
      error: error.message
    });
  }
});

module.exports = router;

