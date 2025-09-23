const mongoose = require('mongoose');
const Order = require('../models/order');
const Revenue = require('../models/revenue');
const WalletTransaction = require('../models/walletTransaction');

class DeliveryRevenueService {
  /**
   * Get delivery revenue summary for an artisan
   * @param {string} artisanId - The artisan ID
   * @param {string} period - Time period ('week', 'month', 'year', 'all')
   * @returns {Promise<Object>} Delivery revenue summary
   */
  static async getDeliveryRevenueSummary(artisanId, period = 'month') {
    try {
      console.log(`📊 Getting delivery revenue summary for artisan ${artisanId} (${period})`);
      
      // Calculate date range based on period
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
        default:
          startDate = new Date(0); // Beginning of time
          break;
      }

      // Get completed orders with delivery fees
      const completedOrders = await Order.find({
        artisan: artisanId,
        status: { $in: ['delivered', 'picked_up', 'completed'] },
        deliveryFee: { $gt: 0 },
        createdAt: { $gte: startDate }
      }).populate('patron', 'firstName lastName email');

      // Calculate delivery revenue breakdown
      let personalDeliveryRevenue = 0;
      let professionalDeliveryRevenue = 0;
      let personalDeliveryCount = 0;
      let professionalDeliveryCount = 0;
      let totalDeliveryFees = 0;

      completedOrders.forEach(order => {
        totalDeliveryFees += order.deliveryFee || 0;
        
        if (order.deliveryMethod === 'personalDelivery') {
          personalDeliveryRevenue += order.deliveryFee || 0;
          personalDeliveryCount++;
        } else if (order.deliveryMethod === 'professionalDelivery') {
          professionalDeliveryRevenue += order.deliveryFee || 0;
          professionalDeliveryCount++;
        }
      });

      // Get wallet transactions related to delivery revenue
      const deliveryTransactions = await WalletTransaction.find({
        artisanId: artisanId,
        type: 'revenue',
        'metadata.deliveryMethod': { $in: ['personalDelivery', 'professionalDelivery'] },
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 });

      // Calculate actual wallet credits from delivery
      const deliveryWalletCredits = deliveryTransactions.reduce((sum, transaction) => {
        if (transaction.metadata?.deliveryMethod === 'personalDelivery') {
          return sum + transaction.amount;
        }
        return sum; // Professional delivery fees don't go to artisan wallet
      }, 0);

      // Get recent delivery orders for detailed breakdown
      const recentDeliveryOrders = completedOrders
        .filter(order => order.deliveryMethod !== 'pickup')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(order => ({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.patron 
            ? `${order.patron.firstName} ${order.patron.lastName}`
            : order.guestInfo 
              ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
              : 'Guest',
          deliveryMethod: order.deliveryMethod,
          deliveryFee: order.deliveryFee,
          totalAmount: order.totalAmount,
          status: order.status,
          completedAt: order.actualDeliveryDate || order.actualReadyDate || order.updatedAt,
          distance: order.deliveryDistance
        }));

      const summary = {
        period,
        dateRange: {
          start: startDate,
          end: now
        },
        totals: {
          totalDeliveryFees: totalDeliveryFees,
          personalDeliveryRevenue: personalDeliveryRevenue,
          professionalDeliveryRevenue: professionalDeliveryRevenue,
          deliveryWalletCredits: deliveryWalletCredits,
          totalOrders: completedOrders.length,
          personalDeliveryOrders: personalDeliveryCount,
          professionalDeliveryOrders: professionalDeliveryCount
        },
        breakdown: {
          personalDelivery: {
            revenue: personalDeliveryRevenue,
            orders: personalDeliveryCount,
            averageFee: personalDeliveryCount > 0 ? personalDeliveryRevenue / personalDeliveryCount : 0,
            walletCredits: deliveryWalletCredits, // 100% of personal delivery fees go to artisan
            description: 'Personal delivery fees - 100% goes to your wallet'
          },
          professionalDelivery: {
            revenue: professionalDeliveryRevenue,
            orders: professionalDeliveryCount,
            averageFee: professionalDeliveryCount > 0 ? professionalDeliveryRevenue / professionalDeliveryCount : 0,
            walletCredits: 0, // Professional delivery fees go to platform to pay Uber
            description: 'Professional delivery fees - goes to platform to pay delivery service'
          }
        },
        recentOrders: recentDeliveryOrders,
        insights: {
          mostPopularMethod: personalDeliveryCount > professionalDeliveryCount ? 'personalDelivery' : 'professionalDelivery',
          averageDeliveryFee: completedOrders.length > 0 ? totalDeliveryFees / completedOrders.length : 0,
          deliveryRevenuePercentage: completedOrders.length > 0 ? (totalDeliveryFees / completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)) * 100 : 0
        }
      };

      console.log(`✅ Delivery revenue summary calculated for artisan ${artisanId}:`, {
        totalDeliveryFees: summary.totals.totalDeliveryFees,
        personalDeliveryRevenue: summary.totals.personalDeliveryRevenue,
        deliveryWalletCredits: summary.totals.deliveryWalletCredits
      });

      return summary;
    } catch (error) {
      console.error('❌ Error getting delivery revenue summary:', error);
      throw error;
    }
  }

  /**
   * Get delivery revenue trends over time
   * @param {string} artisanId - The artisan ID
   * @param {string} period - Time period ('week', 'month', 'year')
   * @returns {Promise<Array>} Array of daily/weekly/monthly revenue data
   */
  static async getDeliveryRevenueTrends(artisanId, period = 'month') {
    try {
      console.log(`📈 Getting delivery revenue trends for artisan ${artisanId} (${period})`);
      
      const now = new Date();
      let startDate, groupBy;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          groupBy = 'month';
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = 'day';
      }

      // Aggregate delivery revenue by time period
      const pipeline = [
        {
          $match: {
            artisan: new mongoose.Types.ObjectId(artisanId),
            status: { $in: ['delivered', 'picked_up', 'completed'] },
            deliveryFee: { $gt: 0 },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: groupBy === 'day' 
              ? { 
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                }
              : {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
            totalDeliveryFees: { $sum: '$deliveryFee' },
            personalDeliveryRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$deliveryMethod', 'personalDelivery'] },
                  '$deliveryFee',
                  0
                ]
              }
            },
            professionalDeliveryRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$deliveryMethod', 'professionalDelivery'] },
                  '$deliveryFee',
                  0
                ]
              }
            },
            orderCount: { $sum: 1 },
            personalDeliveryCount: {
              $sum: {
                $cond: [
                  { $eq: ['$deliveryMethod', 'personalDelivery'] },
                  1,
                  0
                ]
              }
            },
            professionalDeliveryCount: {
              $sum: {
                $cond: [
                  { $eq: ['$deliveryMethod', 'professionalDelivery'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ];

      const trends = await Order.aggregate(pipeline);

      // Format the results
      const formattedTrends = trends.map(trend => {
        const date = groupBy === 'day' 
          ? new Date(trend._id.year, trend._id.month - 1, trend._id.day)
          : new Date(trend._id.year, trend._id.month - 1, 1);
        
        return {
          date: date.toISOString().split('T')[0],
          totalDeliveryFees: trend.totalDeliveryFees,
          personalDeliveryRevenue: trend.personalDeliveryRevenue,
          professionalDeliveryRevenue: trend.professionalDeliveryRevenue,
          orderCount: trend.orderCount,
          personalDeliveryCount: trend.personalDeliveryCount,
          professionalDeliveryCount: trend.professionalDeliveryCount,
          averageDeliveryFee: trend.orderCount > 0 ? trend.totalDeliveryFees / trend.orderCount : 0
        };
      });

      console.log(`✅ Delivery revenue trends calculated for artisan ${artisanId}: ${formattedTrends.length} data points`);
      return formattedTrends;
    } catch (error) {
      console.error('❌ Error getting delivery revenue trends:', error);
      throw error;
    }
  }

  /**
   * Get delivery performance metrics for an artisan
   * @param {string} artisanId - The artisan ID
   * @param {string} period - Time period ('week', 'month', 'year', 'all')
   * @returns {Promise<Object>} Delivery performance metrics
   */
  static async getDeliveryPerformanceMetrics(artisanId, period = 'month') {
    try {
      console.log(`📊 Getting delivery performance metrics for artisan ${artisanId} (${period})`);
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
        default:
          startDate = new Date(0);
          break;
      }

      // Get all orders in the period
      const allOrders = await Order.find({
        artisan: artisanId,
        createdAt: { $gte: startDate }
      });

      const deliveryOrders = allOrders.filter(order => order.deliveryMethod !== 'pickup');
      const completedDeliveryOrders = deliveryOrders.filter(order => 
        ['delivered', 'picked_up', 'completed'].includes(order.status)
      );

      // Calculate metrics
      const totalOrders = allOrders.length;
      const deliveryOrderCount = deliveryOrders.length;
      const completedDeliveryCount = completedDeliveryOrders.length;
      const deliveryAdoptionRate = totalOrders > 0 ? (deliveryOrderCount / totalOrders) * 100 : 0;
      const deliveryCompletionRate = deliveryOrderCount > 0 ? (completedDeliveryCount / deliveryOrderCount) * 100 : 0;

      // Calculate average delivery distance and fee
      const personalDeliveryOrders = completedDeliveryOrders.filter(order => order.deliveryMethod === 'personalDelivery');
      const averageDeliveryDistance = personalDeliveryOrders.length > 0 
        ? personalDeliveryOrders.reduce((sum, order) => sum + (order.deliveryDistance || 0), 0) / personalDeliveryOrders.length
        : 0;
      
      const averageDeliveryFee = completedDeliveryOrders.length > 0
        ? completedDeliveryOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0) / completedDeliveryOrders.length
        : 0;

      const metrics = {
        period,
        dateRange: {
          start: startDate,
          end: now
        },
        overview: {
          totalOrders,
          deliveryOrders: deliveryOrderCount,
          completedDeliveryOrders: completedDeliveryCount,
          deliveryAdoptionRate: Math.round(deliveryAdoptionRate * 100) / 100,
          deliveryCompletionRate: Math.round(deliveryCompletionRate * 100) / 100
        },
        averages: {
          deliveryFee: Math.round(averageDeliveryFee * 100) / 100,
          deliveryDistance: Math.round(averageDeliveryDistance * 100) / 100
        },
        breakdown: {
          pickup: totalOrders - deliveryOrderCount,
          personalDelivery: personalDeliveryOrders.length,
          professionalDelivery: completedDeliveryOrders.length - personalDeliveryOrders.length
        }
      };

      console.log(`✅ Delivery performance metrics calculated for artisan ${artisanId}:`, {
        deliveryAdoptionRate: metrics.overview.deliveryAdoptionRate,
        deliveryCompletionRate: metrics.overview.deliveryCompletionRate,
        averageDeliveryFee: metrics.averages.deliveryFee
      });

      return metrics;
    } catch (error) {
      console.error('❌ Error getting delivery performance metrics:', error);
      throw error;
    }
  }
}

module.exports = DeliveryRevenueService;
