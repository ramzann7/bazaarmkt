const mongoose = require('mongoose');
const BrevoService = require('./brevoService');

class NotificationService {
  /**
   * Send pickup confirmation notification to buyer
   */
  static async sendPickupConfirmationNotification(order) {
    try {
      console.log(`📱 Sending pickup confirmation notification for order ${order._id}`);
      
      // Get buyer email
      const buyerEmail = order.patron?.email || order.guestInfo?.email;
      if (!buyerEmail) {
        throw new Error('Buyer email not found');
      }

      // Prepare order details for notification
      const orderDetails = {
        orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
        customerName: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                      order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Customer',
        artisanName: order.artisan?.artisanName || 'Your artisan',
        orderTotal: order.totalAmount,
        orderDate: order.orderDate,
        deliveryMethod: order.deliveryMethod,
        orderItems: order.items.map(item => ({
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          totalPrice: item.totalPrice
        })),
        completionDeadline: order.confirmation.pickup.completionDeadline
      };

      // Send email notification via Brevo
      await BrevoService.sendOrderNotificationEmail('pickup_confirmation', buyerEmail, orderDetails, order._id);
      
      console.log(`✅ Pickup confirmation notification sent to buyer for order ${order._id}`);
      
      return {
        success: true,
        message: 'Pickup confirmation notification sent'
      };
    } catch (error) {
      console.error('❌ Error sending pickup confirmation notification:', error);
      throw error;
    }
  }

  /**
   * Send delivery confirmation notification to buyer
   */
  static async sendDeliveryConfirmationNotification(order) {
    try {
      console.log(`📱 Sending delivery confirmation notification for order ${order._id}`);
      
      // Get buyer email
      const buyerEmail = order.patron?.email || order.guestInfo?.email;
      if (!buyerEmail) {
        throw new Error('Buyer email not found');
      }

      // Prepare order details for notification
      const orderDetails = {
        orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
        customerName: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                      order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Customer',
        artisanName: order.artisan?.artisanName || 'Your artisan',
        orderTotal: order.totalAmount,
        orderDate: order.orderDate,
        deliveryMethod: order.deliveryMethod,
        orderItems: order.items.map(item => ({
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          totalPrice: item.totalPrice
        })),
        completionDeadline: order.confirmation.delivery.completionDeadline,
        deliveryProof: order.confirmation.delivery.artisanConfirmed.deliveryProof
      };

      // Send email notification via Brevo
      await BrevoService.sendOrderNotificationEmail('delivery_confirmation', buyerEmail, orderDetails, order._id);
      
      console.log(`✅ Delivery confirmation notification sent to buyer for order ${order._id}`);
      
      return {
        success: true,
        message: 'Delivery confirmation notification sent'
      };
    } catch (error) {
      console.error('❌ Error sending delivery confirmation notification:', error);
      throw error;
    }
  }

  /**
   * Send dispute notification to admin
   */
  static async sendDisputeNotification(order) {
    try {
      console.log(`📱 Sending dispute notification for order ${order._id}`);
      
      // Get admin email from environment or use default
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@bazaarmkt.ca';
      
      // Prepare dispute details for notification
      const disputeDetails = {
        orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
        disputeType: order.dispute.disputeType,
        disputeReason: order.dispute.disputeReason,
        disputeDetails: order.dispute.disputeDetails,
        reportedBy: order.dispute.reportedBy,
        reportedAt: order.dispute.reportedAt,
        customerName: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                      order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Guest Customer',
        artisanName: order.artisan?.artisanName || 'Unknown Artisan',
        orderTotal: order.totalAmount,
        orderDate: order.orderDate,
        orderItems: order.items.map(item => ({
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          totalPrice: item.totalPrice
        }))
      };

      // Send email notification via Brevo
      await BrevoService.sendOrderNotificationEmail('dispute_reported', adminEmail, disputeDetails, order._id);
      
      console.log(`✅ Dispute notification sent to admin for order ${order._id}`);
      
      return {
        success: true,
        message: 'Dispute notification sent to admin'
      };
    } catch (error) {
      console.error('❌ Error sending dispute notification:', error);
      throw error;
    }
  }

  /**
   * Send dispute status update notification
   */
  static async sendDisputeStatusUpdateNotification(order, previousStatus, newStatus) {
    try {
      console.log(`📱 Sending dispute status update notification for order ${order._id}`);
      
      // Get relevant parties' emails
      const buyerEmail = order.patron?.email || order.guestInfo?.email;
      const artisanEmail = order.artisan?.email;
      
      // Prepare notification details
      const updateDetails = {
        orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
        disputeType: order.dispute.disputeType,
        previousStatus,
        newStatus,
        customerName: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                      order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Customer',
        artisanName: order.artisan?.artisanName || 'Artisan',
        adminNotes: order.dispute.adminNotes
      };

      // Send notifications to both parties
      const notifications = [];
      
      if (buyerEmail) {
        try {
          await BrevoService.sendOrderNotificationEmail('dispute_status_update_buyer', buyerEmail, updateDetails, order._id);
          notifications.push('buyer');
        } catch (error) {
          console.error('❌ Failed to send dispute status update to buyer:', error);
        }
      }
      
      if (artisanEmail) {
        try {
          await BrevoService.sendOrderNotificationEmail('dispute_status_update_artisan', artisanEmail, updateDetails, order._id);
          notifications.push('artisan');
        } catch (error) {
          console.error('❌ Failed to send dispute status update to artisan:', error);
        }
      }
      
      console.log(`✅ Dispute status update notification sent for order ${order._id}: ${previousStatus} → ${newStatus} to: ${notifications.join(', ')}`);
      
      return {
        success: true,
        message: `Dispute status update notification sent to: ${notifications.join(', ')}`
      };
    } catch (error) {
      console.error('❌ Error sending dispute status update notification:', error);
      throw error;
    }
  }

  /**
   * Send dispute resolution notification
   */
  static async sendDisputeResolutionNotification(order, resolution) {
    try {
      console.log(`📱 Sending dispute resolution notification for order ${order._id}`);
      
      // Get relevant parties' emails
      const buyerEmail = order.patron?.email || order.guestInfo?.email;
      const artisanEmail = order.artisan?.email;
      
      // Prepare resolution details
      const resolutionDetails = {
        orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
        disputeType: order.dispute.disputeType,
        resolution,
        resolutionNotes: order.dispute.resolutionNotes,
        customerName: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                      order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Customer',
        artisanName: order.artisan?.artisanName || 'Artisan',
        resolvedAt: order.dispute.resolvedAt
      };

      // Send notifications to both parties
      const notifications = [];
      
      if (buyerEmail) {
        try {
          await BrevoService.sendOrderNotificationEmail('dispute_resolved_buyer', buyerEmail, resolutionDetails, order._id);
          notifications.push('buyer');
        } catch (error) {
          console.error('❌ Failed to send dispute resolution to buyer:', error);
        }
      }
      
      if (artisanEmail) {
        try {
          await BrevoService.sendOrderNotificationEmail('dispute_resolved_artisan', artisanEmail, resolutionDetails, order._id);
          notifications.push('artisan');
        } catch (error) {
          console.error('❌ Failed to send dispute resolution to artisan:', error);
        }
      }
      
      console.log(`✅ Dispute resolution notification sent for order ${order._id}: ${resolution} to: ${notifications.join(', ')}`);
      
      return {
        success: true,
        message: `Dispute resolution notification sent to: ${notifications.join(', ')}`
      };
    } catch (error) {
      console.error('❌ Error sending dispute resolution notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
