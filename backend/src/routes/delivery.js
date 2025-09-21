const express = require('express');
const router = express.Router();
const uberDirectService = require('../services/uberDirectService');
const verifyToken = require('../middleware/authmiddleware');
const Order = require('../models/order');
const Artisan = require('../models/artisan');

// Get delivery quote from Uber Direct
router.post('/uber-direct/quote', async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, packageDetails } = req.body;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        error: 'Pickup and dropoff locations are required'
      });
    }

    // Get quote from Uber Direct
    const quote = await uberDirectService.createQuote(
      pickupLocation,
      dropoffLocation,
      packageDetails
    );

    res.json(quote);
  } catch (error) {
    console.error('❌ Error getting Uber Direct quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get delivery quote'
    });
  }
});

// Create delivery request
router.post('/uber-direct/create', verifyToken, async (req, res) => {
  try {
    const { quoteId, orderDetails, pickupLocation, dropoffLocation } = req.body;

    // Validate required fields
    if (!quoteId || !orderDetails || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        error: 'Quote ID, order details, and locations are required'
      });
    }

    // Create delivery request
    const delivery = await uberDirectService.createDelivery(
      quoteId,
      orderDetails,
      pickupLocation,
      dropoffLocation
    );

    // If delivery was created successfully, update the order
    if (delivery.success && orderDetails.orderId) {
      try {
        await Order.findByIdAndUpdate(orderDetails.orderId, {
          'delivery.uberDirectId': delivery.delivery.id,
          'delivery.status': 'requested',
          'delivery.trackingUrl': delivery.delivery.tracking_url,
          'delivery.pickupEta': delivery.delivery.pickup_eta,
          'delivery.dropoffEta': delivery.delivery.dropoff_eta,
          updatedAt: Date.now()
        });
      } catch (updateError) {
        console.error('❌ Error updating order with delivery info:', updateError);
      }
    }

    res.json(delivery);
  } catch (error) {
    console.error('❌ Error creating Uber Direct delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create delivery request'
    });
  }
});

// Get delivery tracking information
router.get('/uber-direct/tracking/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;

    // Get tracking info from Uber Direct
    const tracking = await uberDirectService.getDeliveryStatus(deliveryId);

    res.json(tracking);
  } catch (error) {
    console.error('❌ Error getting delivery tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tracking information'
    });
  }
});

// Cancel delivery
router.post('/uber-direct/cancel/:deliveryId', verifyToken, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { reason } = req.body;

    // Cancel delivery with Uber Direct
    const result = await uberDirectService.cancelDelivery(deliveryId, reason);

    // Update order status if cancellation was successful
    if (result.success) {
      try {
        await Order.updateOne(
          { 'delivery.uberDirectId': deliveryId },
          {
            'delivery.status': 'cancelled',
            'delivery.cancelledAt': new Date(),
            'delivery.cancelReason': reason,
            updatedAt: Date.now()
          }
        );
      } catch (updateError) {
        console.error('❌ Error updating order after delivery cancellation:', updateError);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error cancelling delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel delivery'
    });
  }
});

// Check Uber Direct availability
router.post('/uber-direct/availability', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({
        available: false,
        error: 'Location is required'
      });
    }

    const availability = await uberDirectService.checkAvailability(location);
    res.json(availability);
  } catch (error) {
    console.error('❌ Error checking Uber Direct availability:', error);
    res.status(500).json({
      available: false,
      error: 'Failed to check availability'
    });
  }
});

// Webhook endpoint for Uber Direct status updates
router.post('/uber-direct/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-uber-signature'];
    const timestamp = req.headers['x-uber-timestamp'];
    const payload = req.body.toString();

    // Validate webhook signature
    if (!uberDirectService.validateWebhook(payload, signature, timestamp)) {
      console.error('❌ Invalid Uber Direct webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    console.log('🔔 Uber Direct webhook received:', event);

    // Handle different event types
    switch (event.event_type) {
      case 'delivery.status_updated':
        await handleDeliveryStatusUpdate(event);
        break;
      case 'delivery.courier_assigned':
        await handleCourierAssigned(event);
        break;
      case 'delivery.picked_up':
        await handleDeliveryPickedUp(event);
        break;
      case 'delivery.delivered':
        await handleDeliveryCompleted(event);
        break;
      case 'delivery.cancelled':
        await handleDeliveryCancelled(event);
        break;
      default:
        console.log('ℹ️ Unhandled Uber Direct event type:', event.event_type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Error processing Uber Direct webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to handle delivery status updates
async function handleDeliveryStatusUpdate(event) {
  try {
    const { delivery_id, status, pickup_eta, dropoff_eta, live_location } = event.data;

    // Update order with new status
    const updateData = {
      'delivery.status': status,
      'delivery.pickupEta': pickup_eta,
      'delivery.dropoffEta': dropoff_eta,
      'delivery.liveLocation': live_location,
      updatedAt: Date.now()
    };

    await Order.updateOne(
      { 'delivery.uberDirectId': delivery_id },
      updateData
    );

    console.log(`✅ Updated delivery status for ${delivery_id}: ${status}`);
  } catch (error) {
    console.error('❌ Error handling delivery status update:', error);
  }
}

// Helper function to handle courier assignment
async function handleCourierAssigned(event) {
  try {
    const { delivery_id, courier } = event.data;

    await Order.updateOne(
      { 'delivery.uberDirectId': delivery_id },
      {
        'delivery.courier': courier,
        'delivery.status': 'courier_assigned',
        updatedAt: Date.now()
      }
    );

    console.log(`✅ Courier assigned to delivery ${delivery_id}`);
  } catch (error) {
    console.error('❌ Error handling courier assignment:', error);
  }
}

// Helper function to handle delivery pickup
async function handleDeliveryPickedUp(event) {
  try {
    const { delivery_id, pickup_time } = event.data;

    await Order.updateOne(
      { 'delivery.uberDirectId': delivery_id },
      {
        'delivery.status': 'picked_up',
        'delivery.pickupTime': new Date(pickup_time),
        status: 'out_for_delivery',
        updatedAt: Date.now()
      }
    );

    console.log(`✅ Delivery ${delivery_id} picked up`);
  } catch (error) {
    console.error('❌ Error handling delivery pickup:', error);
  }
}

// Helper function to handle delivery completion
async function handleDeliveryCompleted(event) {
  try {
    const { delivery_id, dropoff_time, final_charge } = event.data;

    // Update order status
    const order = await Order.findOneAndUpdate(
      { 'delivery.uberDirectId': delivery_id },
      {
        'delivery.status': 'delivered',
        'delivery.dropoffTime': new Date(dropoff_time),
        'delivery.actualUberCharge': final_charge,
        status: 'delivered',
        actualDeliveryTime: new Date(dropoff_time),
        updatedAt: Date.now()
      },
      { new: true }
    );

    // Update revenue and expense records with actual Uber charge
    if (order && final_charge) {
      const RevenueService = require('../services/revenueService');
      await RevenueService.updateDeliveryExpense(
        order._id,
        final_charge,
        delivery_id
      );
    }

    console.log(`✅ Delivery ${delivery_id} completed with final charge: ${final_charge}`);
  } catch (error) {
    console.error('❌ Error handling delivery completion:', error);
  }
}

// Helper function to handle delivery cancellation
async function handleDeliveryCancelled(event) {
  try {
    const { delivery_id, reason } = event.data;

    await Order.updateOne(
      { 'delivery.uberDirectId': delivery_id },
      {
        'delivery.status': 'cancelled',
        'delivery.cancelledAt': new Date(),
        'delivery.cancelReason': reason,
        updatedAt: Date.now()
      }
    );

    console.log(`✅ Delivery ${delivery_id} cancelled: ${reason}`);
  } catch (error) {
    console.error('❌ Error handling delivery cancellation:', error);
  }
}

module.exports = router;
