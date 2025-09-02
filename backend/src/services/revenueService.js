const mongoose = require('mongoose');
const Revenue = require('../models/revenue');
const Order = require('../models/order');
const PromotionalFeature = require('../models/promotionalFeature');
const User = require('../models/user');

class RevenueService {
  // Calculate revenue breakdown for an order
  static async calculateOrderRevenue(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('patron', 'firstName lastName email')
        .populate('artisan', 'artisanName type')
        .populate('items.product', 'name price');

      if (!order) {
        throw new Error('Order not found');
      }

      const commissionRate = 0.10; // 10% platform commission
      const grossAmount = order.totalAmount;
      const platformCommission = grossAmount * commissionRate;
      const artisanEarnings = grossAmount - platformCommission;

      // Create revenue record
      const revenue = new Revenue({
        orderId: order._id,
        artisanId: order.artisan,
        patronId: order.patron,
        grossAmount,
        platformCommission,
        artisanEarnings,
        commissionRate,
        paymentProcessor: 'stripe', // Default, can be updated
        status: 'pending'
      });

      await revenue.save();

      // Update order with revenue information
      order.revenue = {
        grossAmount,
        platformCommission,
        artisanEarnings,
        commissionRate
      };
      await order.save();

      return {
        success: true,
        revenue: {
          orderId: order._id,
          grossAmount,
          platformCommission,
          artisanEarnings,
          commissionRate,
          breakdown: {
            platformPercentage: `${(commissionRate * 100).toFixed(1)}%`,
            artisanPercentage: `${((1 - commissionRate) * 100).toFixed(1)}%`
          }
        }
      };
    } catch (error) {
      console.error('Error calculating order revenue:', error);
      throw error;
    }
  }

  // Get artisan revenue summary
  static async getArtisanRevenueSummary(artisanId, period = 'month') {
    try {
      const startDate = this.getPeriodStartDate(period);
      
      const revenueData = await Revenue.aggregate([
        {
          $match: {
            artisanId: new mongoose.Types.ObjectId(artisanId),
            createdAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalGrossAmount: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$platformCommission' },
            totalEarnings: { $sum: '$artisanEarnings' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$grossAmount' }
          }
        }
      ]);

      const promotionalRevenue = await PromotionalFeature.aggregate([
        {
          $match: {
            artisanId: new mongoose.Types.ObjectId(artisanId),
            paymentStatus: 'paid',
            paymentDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$price' },
            featureCount: { $sum: 1 }
          }
        }
      ]);

      const result = {
        period,
        startDate,
        revenue: revenueData[0] || {
          totalGrossAmount: 0,
          totalCommission: 0,
          totalEarnings: 0,
          orderCount: 0,
          averageOrderValue: 0
        },
        promotional: promotionalRevenue[0] || {
          totalSpent: 0,
          featureCount: 0
        },
        summary: {
          netEarnings: 0,
          commissionRate: '10%',
          transparency: {
            platformCommission: '10% of each sale',
            artisanEarnings: '90% of each sale',
            promotionalCosts: 'Additional marketing features available'
          }
        }
      };

      result.summary.netEarnings = result.revenue.totalEarnings - result.promotional.totalSpent;

      return result;
    } catch (error) {
      console.error('Error getting artisan revenue summary:', error);
      throw error;
    }
  }

  // Get platform revenue summary (admin only)
  static async getPlatformRevenueSummary(period = 'month') {
    try {
      const startDate = this.getPeriodStartDate(period);
      
      const revenueData = await Revenue.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalGrossAmount: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$platformCommission' },
            totalArtisanEarnings: { $sum: '$artisanEarnings' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$grossAmount' }
          }
        }
      ]);

      const promotionalRevenue = await PromotionalFeature.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            paymentDate: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            featureCount: { $sum: 1 }
          }
        }
      ]);

      return {
        period,
        startDate,
        commissionRevenue: revenueData[0] || {
          totalGrossAmount: 0,
          totalCommission: 0,
          totalArtisanEarnings: 0,
          orderCount: 0,
          averageOrderValue: 0
        },
        promotionalRevenue: promotionalRevenue[0] || {
          totalRevenue: 0,
          featureCount: 0
        },
        totalPlatformRevenue: 0
      };
    } catch (error) {
      console.error('Error getting platform revenue summary:', error);
      throw error;
    }
  }

  // Get detailed revenue breakdown for transparency
  static async getRevenueBreakdown(orderId) {
    try {
      const revenue = await Revenue.findOne({ orderId })
        .populate('orderId', 'items totalAmount status')
        .populate('artisanId', 'firstName lastName artisanName')
        .populate('patronId', 'firstName lastName');

      if (!revenue) {
        throw new Error('Revenue record not found');
      }

      return {
        orderId: revenue.orderId._id,
        artisan: {
          id: revenue.artisanId._id,
          name: revenue.artisanId.artisanName || `${revenue.artisanId.firstName} ${revenue.artisanId.lastName}`
        },
        patron: {
          id: revenue.patronId._id,
          name: `${revenue.patronId.firstName} ${revenue.patronId.lastName}`
        },
        financialBreakdown: {
          grossAmount: revenue.grossAmount,
          platformCommission: revenue.platformCommission,
          artisanEarnings: revenue.artisanEarnings,
          commissionRate: `${(revenue.commissionRate * 100).toFixed(1)}%`
        },
        transparency: {
          platformCommission: '10% of sale goes to platform maintenance and development',
          artisanEarnings: '90% of sale goes directly to the artisan',
          calculation: `$${revenue.grossAmount} × ${(revenue.commissionRate * 100).toFixed(1)}% = $${revenue.platformCommission}`
        },
        status: revenue.status,
        createdAt: revenue.createdAt
      };
    } catch (error) {
      console.error('Error getting revenue breakdown:', error);
      throw error;
    }
  }

  // Create promotional feature purchase
  static async createPromotionalFeature(featureData) {
    try {
      const feature = new PromotionalFeature(featureData);
      await feature.save();
      return feature;
    } catch (error) {
      console.error('Error creating promotional feature:', error);
      throw error;
    }
  }

  // Get available promotional features (product-level only)
  static async getAvailablePromotionalFeatures() {
    return [
      {
        type: 'product_featured',
        name: 'Featured Product',
        description: 'Highlight your product on the homepage and at the top of search results for 7 days',
        price: 25,
        duration: '7 days',
        benefits: [
          'Featured placement on homepage',
          'Higher search ranking',
          'Featured badge on product',
          'Increased visibility to customers'
        ]
      },
      {
        type: 'product_sponsored',
        name: 'Sponsored Product',
        description: 'Promote your product with sponsored placement in search results for 14 days',
        price: 50,
        duration: '14 days',
        benefits: [
          'Sponsored placement in search results',
          'Sponsored label on product',
          'Priority ranking in search',
          'Enhanced product visibility'
        ]
      }
    ];
  }

  // Helper method to get period start date
  static getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}

module.exports = RevenueService;
