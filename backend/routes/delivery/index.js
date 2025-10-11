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

    console.log('🚛 Received Uber Direct quote request:', {
      pickup: pickupLocation.address,
      dropoff: dropoffLocation.address,
      hasPickupCoords: !!(pickupLocation.latitude && pickupLocation.longitude),
      hasDropoffCoords: !!(dropoffLocation.latitude && dropoffLocation.longitude)
    });

    // Use provided coordinates if available, otherwise try geocoding
    let pickup = { ...pickupLocation };
    let dropoff = { ...dropoffLocation };

    // Only geocode if coordinates are missing
    if (!pickup.latitude || !pickup.longitude) {
      console.log('📍 Geocoding pickup address:', pickup.address);
      try {
        const pickupCoords = await geocodingService.geocodeAddress(pickup.address);
        if (pickupCoords && pickupCoords.latitude && pickupCoords.longitude) {
          pickup.latitude = pickupCoords.latitude;
          pickup.longitude = pickupCoords.longitude;
        } else {
          console.warn('⚠️ Could not geocode pickup address, using fallback');
          // For fallback, we'll still try to get a quote with just the address
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding pickup failed:', geocodeError.message);
      }
    }

    if (!dropoff.latitude || !dropoff.longitude) {
      console.log('📍 Geocoding dropoff address:', dropoff.address);
      try {
        const dropoffCoords = await geocodingService.geocodeAddress(dropoff.address);
        if (dropoffCoords && dropoffCoords.latitude && dropoffCoords.longitude) {
          dropoff.latitude = dropoffCoords.latitude;
          dropoff.longitude = dropoffCoords.longitude;
        } else {
          console.warn('⚠️ Could not geocode dropoff address, using fallback');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding dropoff failed:', geocodeError.message);
      }
    }

    // Get quote from Uber Direct (or fallback)
    const quote = await uberDirectService.getDeliveryQuote(
      pickup,
      dropoff,
      packageDetails || {}
    );

    console.log('✅ Uber Direct quote response:', {
      success: quote.success,
      fee: quote.fee || quote.fallback?.fee,
      fallback: quote.fallback || false
    });

    res.json(quote);
  } catch (error) {
    console.error('❌ Error getting delivery quote:', error);
    
    // Return fallback quote on any error
    try {
      const fallbackQuote = uberDirectService.getFallbackQuote(
        pickupLocation,
        dropoffLocation,
        packageDetails || {}
      );
      res.json(fallbackQuote);
    } catch (fallbackError) {
      console.error('❌ Fallback quote also failed:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery quote',
        error: error.message
      });
    }
  }
});

/**
 * Get delivery quote with buffer for surge protection
 * POST /api/delivery/uber-direct/quote-with-buffer
 */
router.post('/uber-direct/quote-with-buffer', async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, packageDetails, bufferPercentage } = req.body;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff locations are required'
      });
    }

    console.log('🚛 Received Uber Direct quote with buffer request:', {
      pickup: pickupLocation.address,
      dropoff: dropoffLocation.address,
      bufferPercentage: bufferPercentage || 20,
      hasPickupCoords: !!(pickupLocation.latitude && pickupLocation.longitude),
      hasDropoffCoords: !!(dropoffLocation.latitude && dropoffLocation.longitude)
    });

    // Use provided coordinates if available, otherwise try geocoding
    let pickup = { ...pickupLocation };
    let dropoff = { ...dropoffLocation };

    // Only geocode if coordinates are missing
    if (!pickup.latitude || !pickup.longitude) {
      console.log('📍 Geocoding pickup address:', pickup.address);
      try {
        const pickupCoords = await geocodingService.geocodeAddress(pickup.address);
        if (pickupCoords && pickupCoords.latitude && pickupCoords.longitude) {
          pickup.latitude = pickupCoords.latitude;
          pickup.longitude = pickupCoords.longitude;
        } else {
          console.warn('⚠️ Could not geocode pickup address, will use fallback');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding pickup failed:', geocodeError.message);
      }
    }

    if (!dropoff.latitude || !dropoff.longitude) {
      console.log('📍 Geocoding dropoff address:', dropoff.address);
      try {
        const dropoffCoords = await geocodingService.geocodeAddress(dropoff.address);
        if (dropoffCoords && dropoffCoords.latitude && dropoffCoords.longitude) {
          dropoff.latitude = dropoffCoords.latitude;
          dropoff.longitude = dropoffCoords.longitude;
        } else {
          console.warn('⚠️ Could not geocode dropoff address, will use fallback');
        }
      } catch (geocodeError) {
        console.warn('⚠️ Geocoding dropoff failed:', geocodeError.message);
      }
    }

    // Get quote with buffer from Uber Direct
    const quoteWithBuffer = await uberDirectService.getQuoteWithBuffer(
      pickup,
      dropoff,
      packageDetails || {},
      bufferPercentage || 20
    );

    console.log('✅ Uber Direct quote with buffer response:', {
      success: quoteWithBuffer.success,
      estimatedFee: quoteWithBuffer.estimatedFee,
      buffer: quoteWithBuffer.buffer,
      chargedAmount: quoteWithBuffer.chargedAmount
    });

    res.json(quoteWithBuffer);
  } catch (error) {
    console.error('❌ Error getting delivery quote with buffer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get delivery quote with buffer',
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

