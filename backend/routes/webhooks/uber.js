/**
 * Uber Direct Webhook Handler
 * Receives real-time delivery status updates from Uber
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

/**
 * Verify Uber webhook signature
 * @param {string} payload - Request body as string
 * @param {string} signature - X-Uber-Signature header
 * @param {string} secret - Webhook secret from Uber
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.warn('⚠️ Missing signature or secret for webhook verification');
    return false;
  }

  try {
    // Uber uses HMAC SHA256 for signature verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Map Uber delivery status to order status
 */
function mapUberStatusToOrderStatus(uberStatus) {
  const statusMap = {
    'pending': 'out_for_delivery',
    'pickup': 'out_for_delivery',
    'pickup_complete': 'out_for_delivery',
    'dropoff': 'out_for_delivery',
    'delivered': 'delivered',
    'completed': 'delivered',
    'canceled': 'cancelled',
    'returned': 'cancelled'
  };

  return statusMap[uberStatus] || 'out_for_delivery';
}

/**
 * Handle Uber Direct webhook
 * POST /api/webhooks/uber-delivery
 */
router.post('/uber-delivery', async (req, res) => {
  const db = req.db;
  
  try {
    console.log('🚛 Uber webhook received:', {
      headers: req.headers,
      body: req.body
    });

    // Get webhook secret from environment
    const webhookSecret = process.env.UBER_DIRECT_WEBHOOK_SECRET || process.env.UBER_DIRECT_WEBHOOK;

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const signature = req.headers['x-uber-signature'];
      const rawBody = JSON.stringify(req.body);
      
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    } else {
      console.warn('⚠️ Webhook secret not configured - skipping signature verification');
    }

    // Extract webhook data
    const { 
      delivery_id, 
      status, 
      event_type,
      courier,
      tracking_url,
      dropoff_eta,
      pickup_eta,
      metadata 
    } = req.body;

    console.log('📦 Processing Uber webhook:', {
      deliveryId: delivery_id,
      status,
      eventType: event_type
    });

    // Find order by Uber delivery ID
    const ordersCollection = db.collection('orders');
    const order = await ordersCollection.findOne({
      'uberDelivery.deliveryId': delivery_id
    });

    if (!order) {
      console.warn('⚠️ Order not found for Uber delivery ID:', delivery_id);
      // Still return 200 to prevent Uber from retrying
      return res.status(200).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('✅ Found order:', order._id);

    // Update order with latest Uber delivery info
    const updateData = {
      'uberDelivery.status': status,
      'uberDelivery.updatedAt': new Date()
    };

    // Add courier info if available
    if (courier) {
      updateData['uberDelivery.courier'] = {
        name: courier.name,
        phone: courier.phone_number,
        vehicle: courier.vehicle_type,
        img: courier.img_href
      };
    }

    // Add tracking URL if available
    if (tracking_url) {
      updateData['uberDelivery.trackingUrl'] = tracking_url;
    }

    // Add ETAs if available
    if (dropoff_eta) {
      updateData['uberDelivery.dropoffEta'] = dropoff_eta;
    }
    if (pickup_eta) {
      updateData['uberDelivery.pickupEta'] = pickup_eta;
    }

    // Map Uber status to order status
    const newOrderStatus = mapUberStatusToOrderStatus(status);
    
    // Only update order status if it's a significant change
    if (['delivered', 'cancelled'].includes(newOrderStatus)) {
      updateData.status = newOrderStatus;
    }

    // Update order in database
    await ordersCollection.updateOne(
      { _id: order._id },
      { $set: updateData }
    );

    console.log('✅ Order updated:', {
      orderId: order._id,
      uberStatus: status,
      orderStatus: newOrderStatus
    });

    // Send notification to user
    if (status === 'delivered' || status === 'completed') {
      // Order delivered - notify buyer
      const usersCollection = db.collection('users');
      const userId = order.userId || order.user;
      
      if (userId) {
        const user = await usersCollection.findOne({ _id: userId });
        
        if (user) {
          const notificationService = require('../../services/notificationService');
          await notificationService.sendNotification({
            userId: userId,
            type: 'order_delivered',
            title: 'Order Delivered! 🎉',
            message: `Your order from ${order.artisan?.artisanName || 'the artisan'} has been delivered!`,
            data: {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8)
            },
            email: user.email
          }, db);
        }
      }
    } else if (status === 'pickup' || status === 'pickup_complete') {
      // Order picked up - notify buyer
      const usersCollection = db.collection('users');
      const userId = order.userId || order.user;
      
      if (userId) {
        const user = await usersCollection.findOne({ _id: userId });
        
        if (user) {
          const notificationService = require('../../services/notificationService');
          await notificationService.sendNotification({
            userId: userId,
            type: 'delivery_update',
            title: 'Order Picked Up! 🚛',
            message: `Your order is on the way! Track it in real-time.`,
            data: {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8),
              trackingUrl: tracking_url || order.uberDelivery?.trackingUrl
            },
            email: user.email
          }, db);
        }
      }
    }

    // Acknowledge webhook
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      orderId: order._id
    });

  } catch (error) {
    console.error('❌ Error processing Uber webhook:', error);
    
    // Return 200 to prevent Uber from retrying (we'll handle errors internally)
    res.status(200).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

/**
 * Health check endpoint for webhook
 * GET /api/webhooks/uber-delivery/health
 */
router.get('/uber-delivery/health', (req, res) => {
  res.json({
    success: true,
    message: 'Uber webhook endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

