const mongoose = require('mongoose');
const Order = require('../models/order');
const Revenue = require('../models/revenue');
const WalletService = require('./walletService');
const NotificationService = require('./notificationService');

class OrderConfirmationService {
  /**
   * Confirm pickup by artisan
   */
  static async confirmPickupByArtisan(orderId, artisanId, notes = '') {
    try {
      console.log(`📦 Artisan confirming pickup for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.artisan.toString() !== artisanId) {
        throw new Error('Unauthorized: Not your order');
      }

      if (order.deliveryMethod !== 'pickup') {
        throw new Error('Order is not a pickup order');
      }

      // Update artisan confirmation
      order.confirmation.pickup.artisanConfirmed = {
        confirmed: true,
        confirmedAt: new Date(),
        notes
      };

      // Set completion deadline (24 hours from now)
      order.confirmation.pickup.completionDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await order.save();

      // Notify buyer that pickup is ready and they need to confirm within 24h
      await NotificationService.sendPickupConfirmationNotification(order);

      console.log(`✅ Pickup confirmed by artisan. Buyer has 24h to confirm.`);
      
      return {
        success: true,
        message: 'Pickup confirmed successfully. Buyer has 24 hours to confirm pickup.',
        completionDeadline: order.confirmation.pickup.completionDeadline
      };
    } catch (error) {
      console.error('❌ Error confirming pickup by artisan:', error);
      throw error;
    }
  }

  /**
   * Confirm pickup by buyer
   */
  static async confirmPickupByBuyer(orderId, buyerId, notes = '') {
    try {
      console.log(`📦 Buyer confirming pickup for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if buyer is authorized (either patron or guest)
      const isAuthorized = (order.patron && order.patron.toString() === buyerId) ||
                          (order.guestInfo && order.guestInfo.email === buyerId);
      
      if (!isAuthorized) {
        throw new Error('Unauthorized: Not your order');
      }

      if (order.deliveryMethod !== 'pickup') {
        throw new Error('Order is not a pickup order');
      }

      // Update buyer confirmation
      order.confirmation.pickup.buyerConfirmed = {
        confirmed: true,
        confirmedAt: new Date(),
        notes
      };

      await order.save();

      // Complete the order and process payment
      await this.completeOrder(orderId);

      console.log(`✅ Pickup confirmed by buyer. Order completed.`);
      
      return {
        success: true,
        message: 'Pickup confirmed successfully. Order completed.'
      };
    } catch (error) {
      console.error('❌ Error confirming pickup by buyer:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery by artisan
   */
  static async confirmDeliveryByArtisan(orderId, artisanId, notes = '', deliveryProof = []) {
    try {
      console.log(`🚚 Artisan confirming delivery for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.artisan.toString() !== artisanId) {
        throw new Error('Unauthorized: Not your order');
      }

      if (order.deliveryMethod === 'pickup') {
        throw new Error('Order is not a delivery order');
      }

      // Update artisan confirmation
      order.confirmation.delivery.artisanConfirmed = {
        confirmed: true,
        confirmedAt: new Date(),
        notes,
        deliveryProof
      };

      // Set completion deadline (24 hours from now)
      order.confirmation.delivery.completionDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await order.save();

      // Notify buyer that delivery is complete and they need to confirm within 24h
      await NotificationService.sendDeliveryConfirmationNotification(order);

      console.log(`✅ Delivery confirmed by artisan. Buyer has 24h to confirm.`);
      
      return {
        success: true,
        message: 'Delivery confirmed successfully. Buyer has 24 hours to confirm receipt.',
        completionDeadline: order.confirmation.delivery.completionDeadline
      };
    } catch (error) {
      console.error('❌ Error confirming delivery by artisan:', error);
      throw error;
    }
  }

  /**
   * Confirm delivery by buyer
   */
  static async confirmDeliveryByBuyer(orderId, buyerId, notes = '') {
    try {
      console.log(`🚚 Buyer confirming delivery for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if buyer is authorized
      const isAuthorized = (order.patron && order.patron.toString() === buyerId) ||
                          (order.guestInfo && order.guestInfo.email === buyerId);
      
      if (!isAuthorized) {
        throw new Error('Unauthorized: Not your order');
      }

      if (order.deliveryMethod === 'pickup') {
        throw new Error('Order is not a delivery order');
      }

      // Update buyer confirmation
      order.confirmation.delivery.buyerConfirmed = {
        confirmed: true,
        confirmedAt: new Date(),
        notes
      };

      await order.save();

      // Complete the order and process payment
      await this.completeOrder(orderId);

      console.log(`✅ Delivery confirmed by buyer. Order completed.`);
      
      return {
        success: true,
        message: 'Delivery confirmed successfully. Order completed.'
      };
    } catch (error) {
      console.error('❌ Error confirming delivery by buyer:', error);
      throw error;
    }
  }

  /**
   * Report dispute
   */
  static async reportDispute(orderId, reportedBy, disputeType, disputeReason, disputeDetails = '', evidence = []) {
    try {
      console.log(`⚠️ Reporting dispute for order ${orderId} by ${reportedBy}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user is authorized to report dispute
      const isAuthorized = (reportedBy === 'artisan' && order.artisan.toString() === orderId) ||
                          (reportedBy === 'buyer' && (
                            (order.patron && order.patron.toString() === orderId) ||
                            (order.guestInfo && order.guestInfo.email === orderId)
                          ));
      
      if (!isAuthorized) {
        throw new Error('Unauthorized: Cannot report dispute for this order');
      }

      // Update dispute information
      order.dispute = {
        isDisputed: true,
        disputeType,
        disputeReason,
        disputeDetails,
        reportedBy,
        reportedAt: new Date(),
        status: 'open',
        evidence
      };

      // Hold payment during dispute
      order.paymentStatus = 'held_in_dispute';

      await order.save();

      // Notify admin about new dispute
      await NotificationService.sendDisputeNotification(order);

      console.log(`✅ Dispute reported successfully. Payment held.`);
      
      return {
        success: true,
        message: 'Dispute reported successfully. Payment has been held pending resolution.',
        disputeId: order._id
      };
    } catch (error) {
      console.error('❌ Error reporting dispute:', error);
      throw error;
    }
  }

  /**
   * Complete order and process payment
   */
  static async completeOrder(orderId) {
    try {
      console.log(`💰 Completing order ${orderId} and processing payment`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      order.status = order.deliveryMethod === 'pickup' ? 'picked_up' : 'delivered';
      order.paymentStatus = 'paid';
      order.actualDeliveryDate = new Date();

      await order.save();

      // Process revenue and credit artisan wallet
      await WalletService.creditOrderRevenue(orderId);

      console.log(`✅ Order completed and payment processed.`);
      
      return {
        success: true,
        message: 'Order completed successfully and payment processed.'
      };
    } catch (error) {
      console.error('❌ Error completing order:', error);
      throw error;
    }
  }

  /**
   * Auto-complete orders after 24 hours (called by scheduled job)
   */
  static async autoCompleteOrders() {
    try {
      console.log(`⏰ Running auto-completion job for orders`);
      
      const now = new Date();
      
      // Find pickup orders where artisan confirmed but buyer hasn't confirmed within 24h
      const pickupOrders = await Order.find({
        'deliveryMethod': 'pickup',
        'confirmation.pickup.artisanConfirmed.confirmed': true,
        'confirmation.pickup.buyerConfirmed.confirmed': false,
        'confirmation.pickup.completionDeadline': { $lte: now },
        'confirmation.pickup.autoCompletedAt': { $exists: false },
        'dispute.isDisputed': false
      });

      // Find delivery orders where artisan confirmed but buyer hasn't confirmed within 24h
      const deliveryOrders = await Order.find({
        'deliveryMethod': { $in: ['personalDelivery', 'professionalDelivery'] },
        'confirmation.delivery.artisanConfirmed.confirmed': true,
        'confirmation.delivery.buyerConfirmed.confirmed': false,
        'confirmation.delivery.completionDeadline': { $lte: now },
        'confirmation.delivery.autoCompletedAt': { $exists: false },
        'dispute.isDisputed': false
      });

      const autoCompletedOrders = [...pickupOrders, ...deliveryOrders];

      console.log(`Found ${autoCompletedOrders.length} orders to auto-complete`);

      for (const order of autoCompletedOrders) {
        try {
          // Mark as auto-completed
          if (order.deliveryMethod === 'pickup') {
            order.confirmation.pickup.autoCompletedAt = new Date();
          } else {
            order.confirmation.delivery.autoCompletedAt = new Date();
          }

          await order.save();

          // Complete the order
          await this.completeOrder(order._id);

          console.log(`✅ Auto-completed order ${order._id}`);
        } catch (error) {
          console.error(`❌ Error auto-completing order ${order._id}:`, error);
        }
      }

      return {
        success: true,
        autoCompletedCount: autoCompletedOrders.length,
        message: `Auto-completed ${autoCompletedOrders.length} orders`
      };
    } catch (error) {
      console.error('❌ Error in auto-completion job:', error);
      throw error;
    }
  }

  /**
   * Get order confirmation status
   */
  static async getOrderConfirmationStatus(orderId) {
    try {
      const order = await Order.findById(orderId).populate('patron artisan');
      if (!order) {
        throw new Error('Order not found');
      }

      const isPickup = order.deliveryMethod === 'pickup';
      const confirmation = isPickup ? order.confirmation.pickup : order.confirmation.delivery;

      return {
        orderId: order._id,
        deliveryMethod: order.deliveryMethod,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isDisputed: order.dispute.isDisputed,
        confirmation: {
          artisanConfirmed: confirmation.artisanConfirmed.confirmed,
          artisanConfirmedAt: confirmation.artisanConfirmed.confirmedAt,
          buyerConfirmed: confirmation.buyerConfirmed.confirmed,
          buyerConfirmedAt: confirmation.buyerConfirmed.confirmedAt,
          completionDeadline: confirmation.completionDeadline,
          autoCompletedAt: confirmation.autoCompletedAt
        },
        dispute: order.dispute.isDisputed ? {
          type: order.dispute.disputeType,
          reason: order.dispute.disputeReason,
          status: order.dispute.status,
          reportedBy: order.dispute.reportedBy,
          reportedAt: order.dispute.reportedAt
        } : null
      };
    } catch (error) {
      console.error('❌ Error getting order confirmation status:', error);
      throw error;
    }
  }
}

module.exports = OrderConfirmationService;
