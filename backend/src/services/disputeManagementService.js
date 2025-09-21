const mongoose = require('mongoose');
const Order = require('../models/order');
const User = require('../models/user');
const Artisan = require('../models/artisan');
const WalletService = require('./walletService');
const NotificationService = require('./notificationService');
const { logAdminAction } = require('../utils/adminAuditLogger');

class DisputeManagementService {
  /**
   * Get all disputes with filtering and pagination
   */
  static async getDisputes(filters = {}, pagination = {}) {
    try {
      console.log(`🔍 Fetching disputes with filters:`, filters);
      
      const {
        status = null,
        disputeType = null,
        reportedBy = null,
        dateFrom = null,
        dateTo = null
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'reportedAt',
        sortOrder = 'desc'
      } = pagination;

      // Build query
      const query = {
        'dispute.isDisputed': true
      };

      if (status) {
        query['dispute.status'] = status;
      }

      if (disputeType) {
        query['dispute.disputeType'] = disputeType;
      }

      if (reportedBy) {
        query['dispute.reportedBy'] = reportedBy;
      }

      if (dateFrom || dateTo) {
        query['dispute.reportedAt'] = {};
        if (dateFrom) query['dispute.reportedAt'].$gte = new Date(dateFrom);
        if (dateTo) query['dispute.reportedAt'].$lte = new Date(dateTo);
      }

      // Execute query with population
      const disputes = await Order.find(query)
        .populate('patron artisan')
        .populate('items.product')
        .sort({ [`dispute.${sortBy}`]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // Get total count
      const totalCount = await Order.countDocuments(query);

      // Transform data for response
      const disputesData = disputes.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        dispute: {
          type: order.dispute.disputeType,
          reason: order.dispute.disputeReason,
          details: order.dispute.disputeDetails,
          status: order.dispute.status,
          reportedBy: order.dispute.reportedBy,
          reportedAt: order.dispute.reportedAt,
          adminNotes: order.dispute.adminNotes,
          resolution: order.dispute.resolution,
          resolutionNotes: order.dispute.resolutionNotes,
          resolvedAt: order.dispute.resolvedAt,
          evidence: order.dispute.evidence
        },
        order: {
          id: order._id,
          status: order.status,
          deliveryMethod: order.deliveryMethod,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderDate: order.orderDate,
          items: order.items.map(item => ({
            productName: item.product?.name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }))
        },
        buyer: {
          id: order.patron?._id || null,
          name: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Guest',
          email: order.patron?.email || order.guestInfo?.email || 'Unknown'
        },
        artisan: {
          id: order.artisan?._id || null,
          name: order.artisan?.artisanName || 'Unknown Artisan',
          email: order.artisan?.email || 'Unknown'
        }
      }));

      return {
        success: true,
        disputes: disputesData,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching disputes:', error);
      throw error;
    }
  }

  /**
   * Get dispute details by order ID
   */
  static async getDisputeDetails(orderId) {
    try {
      console.log(`🔍 Fetching dispute details for order ${orderId}`);
      
      const order = await Order.findById(orderId)
        .populate('patron artisan')
        .populate('items.product');

      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.dispute.isDisputed) {
        throw new Error('Order does not have a dispute');
      }

      return {
        success: true,
        dispute: {
          id: order._id,
          orderNumber: order.orderNumber,
          dispute: order.dispute,
          order: {
            id: order._id,
            status: order.status,
            deliveryMethod: order.deliveryMethod,
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            orderDate: order.orderDate,
            items: order.items.map(item => ({
              productName: item.product?.name || 'Unknown Product',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            })),
            confirmation: order.confirmation
          },
          buyer: {
            id: order.patron?._id || null,
            name: order.patron ? `${order.patron.firstName} ${order.patron.lastName}` : 
                  order.guestInfo ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}` : 'Guest',
            email: order.patron?.email || order.guestInfo?.email || 'Unknown',
            phone: order.patron?.phone || order.guestInfo?.phone || null
          },
          artisan: {
            id: order.artisan?._id || null,
            name: order.artisan?.artisanName || 'Unknown Artisan',
            email: order.artisan?.email || 'Unknown',
            phone: order.artisan?.phone || null
          }
        }
      };
    } catch (error) {
      console.error('❌ Error fetching dispute details:', error);
      throw error;
    }
  }

  /**
   * Update dispute status (admin only)
   */
  static async updateDisputeStatus(orderId, adminUserId, status, adminNotes = '') {
    try {
      console.log(`🔧 Admin updating dispute status for order ${orderId} to ${status}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.dispute.isDisputed) {
        throw new Error('Order does not have a dispute');
      }

      const previousStatus = order.dispute.status;
      order.dispute.status = status;
      order.dispute.adminNotes = adminNotes;

      if (status === 'resolved' || status === 'closed') {
        order.dispute.resolvedAt = new Date();
        order.dispute.resolvedBy = adminUserId;
      }

      await order.save();

      // Log admin action
      await logAdminAction({
        adminUser: { _id: adminUserId },
        action: 'dispute_status_updated',
        targetType: 'order',
        targetId: orderId,
        targetName: `Order ${order.orderNumber}`,
        changes: {
          field: 'dispute_status',
          oldValue: previousStatus,
          newValue: status
        },
        description: `Updated dispute status from ${previousStatus} to ${status}`,
        req: null
      });

      // Notify relevant parties
      await NotificationService.sendDisputeStatusUpdateNotification(order, previousStatus, status);

      console.log(`✅ Dispute status updated to ${status}`);
      
      return {
        success: true,
        message: `Dispute status updated to ${status}`
      };
    } catch (error) {
      console.error('❌ Error updating dispute status:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute with financial action (admin only)
   */
  static async resolveDispute(orderId, adminUserId, resolution, resolutionNotes = '') {
    try {
      console.log(`💰 Admin resolving dispute for order ${orderId} with resolution: ${resolution}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.dispute.isDisputed) {
        throw new Error('Order does not have a dispute');
      }

      // Update dispute resolution
      order.dispute.resolution = resolution;
      order.dispute.resolutionNotes = resolutionNotes;
      order.dispute.status = 'resolved';
      order.dispute.resolvedAt = new Date();
      order.dispute.resolvedBy = adminUserId;

      // Handle financial resolution
      switch (resolution) {
        case 'buyer_refunded':
          // Refund buyer and mark payment as refunded
          order.paymentStatus = 'refunded';
          // TODO: Implement actual refund logic with payment processor
          break;

        case 'artisan_paid':
          // Complete order and pay artisan
          order.paymentStatus = 'paid';
          order.status = order.deliveryMethod === 'pickup' ? 'picked_up' : 'delivered';
          await WalletService.creditOrderRevenue(orderId);
          break;

        case 'partial_refund':
          // Handle partial refund (complex logic needed)
          // For now, mark as resolved and let admin handle manually
          break;

        case 'no_action_needed':
          // Complete order normally
          order.paymentStatus = 'paid';
          order.status = order.deliveryMethod === 'pickup' ? 'picked_up' : 'delivered';
          await WalletService.creditOrderRevenue(orderId);
          break;
      }

      await order.save();

      // Log admin action
      await logAdminAction({
        adminUser: { _id: adminUserId },
        action: 'dispute_resolved',
        targetType: 'order',
        targetId: orderId,
        targetName: `Order ${order.orderNumber}`,
        changes: {
          field: 'dispute_resolution',
          oldValue: null,
          newValue: resolution
        },
        description: `Resolved dispute with resolution: ${resolution}`,
        req: null
      });

      // Notify relevant parties
      await NotificationService.sendDisputeResolutionNotification(order, resolution);

      console.log(`✅ Dispute resolved with resolution: ${resolution}`);
      
      return {
        success: true,
        message: `Dispute resolved with resolution: ${resolution}`
      };
    } catch (error) {
      console.error('❌ Error resolving dispute:', error);
      throw error;
    }
  }

  /**
   * Add evidence to dispute
   */
  static async addDisputeEvidence(orderId, uploadedBy, evidenceType, url, description = '') {
    try {
      console.log(`📎 Adding evidence to dispute for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (!order.dispute.isDisputed) {
        throw new Error('Order does not have a dispute');
      }

      // Add evidence
      order.dispute.evidence.push({
        type: evidenceType,
        url,
        description,
        uploadedBy,
        uploadedAt: new Date()
      });

      await order.save();

      console.log(`✅ Evidence added to dispute`);
      
      return {
        success: true,
        message: 'Evidence added successfully'
      };
    } catch (error) {
      console.error('❌ Error adding dispute evidence:', error);
      throw error;
    }
  }

  /**
   * Get dispute statistics
   */
  static async getDisputeStatistics(period = '30') {
    try {
      console.log(`📊 Fetching dispute statistics for ${period} days`);
      
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get dispute counts by status
      const disputeStats = await Order.aggregate([
        {
          $match: {
            'dispute.isDisputed': true,
            'dispute.reportedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$dispute.status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get dispute counts by type
      const disputeTypeStats = await Order.aggregate([
        {
          $match: {
            'dispute.isDisputed': true,
            'dispute.reportedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$dispute.disputeType',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get dispute counts by reporter
      const reporterStats = await Order.aggregate([
        {
          $match: {
            'dispute.isDisputed': true,
            'dispute.reportedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$dispute.reportedBy',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get total disputes and resolution time
      const totalDisputes = await Order.countDocuments({
        'dispute.isDisputed': true,
        'dispute.reportedAt': { $gte: startDate }
      });

      const resolvedDisputes = await Order.aggregate([
        {
          $match: {
            'dispute.isDisputed': true,
            'dispute.status': 'resolved',
            'dispute.reportedAt': { $gte: startDate }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$dispute.resolvedAt', '$dispute.reportedAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averageResolutionTime: { $avg: '$resolutionTime' },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        success: true,
        statistics: {
          period: `${days} days`,
          totalDisputes,
          statusBreakdown: disputeStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          typeBreakdown: disputeTypeStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          reporterBreakdown: reporterStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          averageResolutionTime: resolvedDisputes[0]?.averageResolutionTime || 0,
          resolvedCount: resolvedDisputes[0]?.count || 0
        }
      };
    } catch (error) {
      console.error('❌ Error fetching dispute statistics:', error);
      throw error;
    }
  }
}

module.exports = DisputeManagementService;
