const mongoose = require('mongoose');
const Revenue = require('../models/revenue');
const Order = require('../models/order');
const PlatformExpense = require('../models/platformExpense');
const PromotionalFeature = require('../models/promotionalFeature');
const ArtisanSpotlight = require('../models/artisanSpotlight');
const User = require('../models/user');
const PlatformSettingsService = require('./platformSettingsService');

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

      // Get platform fee percentage from settings
      const platformFeePercentage = await PlatformSettingsService.getPlatformFeePercentage();
      
      // Separate product amount from delivery fees
      const productAmount = order.totalAmount; // Total amount is just products
      const deliveryFee = order.deliveryFee || 0; // Delivery fee is separate
      
      // Platform commission only applies to products, NOT delivery fees
      const platformCommission = (productAmount * platformFeePercentage) / 100;
      
      // Calculate delivery revenue based on delivery method
      let deliveryRevenue = {
        personalDeliveryFee: 0,
        professionalDeliveryFee: 0,
        professionalDeliveryExpense: 0,
        deliveryMethod: order.deliveryMethod || 'pickup',
        deliveryProfit: 0
      };
      
      // For personal delivery, artisan keeps 100% of the delivery fee (no platform commission)
      if (order.deliveryMethod === 'personalDelivery') {
        deliveryRevenue.personalDeliveryFee = deliveryFee;
      }
      
      // For professional delivery, track both fee charged and expense to Uber
      if (order.deliveryMethod === 'professionalDelivery') {
        deliveryRevenue.professionalDeliveryFee = deliveryFee;
        deliveryRevenue.uberDirectId = order.delivery?.uberDirectId;
        
        // Professional delivery expense will be updated when we get Uber's charge
        // For now, we'll estimate based on the quote or actual Uber charge
        if (order.delivery?.actualUberCharge) {
          deliveryRevenue.professionalDeliveryExpense = order.delivery.actualUberCharge;
        } else {
          // Use estimated charge (will be updated later)
          deliveryRevenue.professionalDeliveryExpense = deliveryFee ? deliveryFee * 0.8 : 0; // Estimate 80% goes to Uber
        }
        
        deliveryRevenue.deliveryProfit = deliveryRevenue.professionalDeliveryFee - deliveryRevenue.professionalDeliveryExpense;
      }
      
      // Calculate artisan earnings:
      // - Product revenue minus platform commission
      // - Plus 100% of personal delivery fee (no commission on delivery)
      // - Professional delivery fee goes to platform (to pay Uber), so artisan gets 0% of it
      let artisanEarnings = productAmount - platformCommission;
      if (order.deliveryMethod === 'personalDelivery') {
        artisanEarnings += deliveryRevenue.personalDeliveryFee; // Artisan keeps 100% of personal delivery fee
      }
      
      // Total gross amount includes both products and delivery fees
      const grossAmount = productAmount + deliveryFee;

      // Create revenue record with 'completed' status since this is only called when order is delivered/picked up
      const revenueData = {
        orderId: order._id,
        artisanId: order.artisan,
        grossAmount,
        platformCommission,
        artisanEarnings,
        commissionRate: platformFeePercentage / 100, // Store as decimal (e.g., 0.10 for 10%)
        platformFeePercentage,
        deliveryRevenue,
        paymentProcessor: 'stripe', // Default, can be updated
        status: 'completed', // Revenue is only recognized when order is completed
        paymentDate: new Date(), // Set payment date to now since order is completed
        settlementStatus: 'pending' // Settlement will be handled by wallet service
      };

      // Add patron or guest info based on order type
      if (order.patron) {
        revenueData.patronId = order.patron;
      } else if (order.guestInfo) {
        revenueData.guestInfo = order.guestInfo;
      }

      const revenue = new Revenue(revenueData);

      await revenue.save();
      
      // Create platform expense record for professional delivery
      if (order.deliveryMethod === 'professionalDelivery' && deliveryRevenue.professionalDeliveryExpense > 0) {
        await PlatformExpense.createDeliveryExpense({
          orderId: order._id,
          revenueId: revenue._id,
          artisanId: order.artisan,
          amount: deliveryRevenue.professionalDeliveryExpense,
          deliveryDetails: {
            uberDirectId: order.delivery?.uberDirectId,
            pickupAddress: order.artisan?.address ? 
              `${order.artisan.address.street}, ${order.artisan.address.city}` : 'Artisan Location',
            dropoffAddress: order.deliveryAddress ? 
              `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'Customer Address',
            distance: order.deliveryDistance || 0,
            deliveryStatus: order.delivery?.status || 'delivered'
          },
          status: order.delivery?.actualUberCharge ? 'paid' : 'pending',
          description: `Uber Direct delivery for order ${order.orderNumber || order._id}`,
          paymentDate: order.delivery?.actualUberCharge ? new Date() : null
        });
        
        console.log(`✅ Platform expense record created for professional delivery: ${deliveryRevenue.professionalDeliveryExpense} CAD`);
      }

      // Update order with revenue information
      const commissionRate = platformCommission / productAmount; // Commission rate only on products
      order.revenue = {
        grossAmount,
        productAmount,
        deliveryFee,
        platformCommission,
        artisanEarnings,
        commissionRate,
        deliveryRevenue
      };
      await order.save();

      return {
        success: true,
        revenue: {
          orderId: order._id,
          grossAmount,
          productAmount,
          deliveryFee,
          platformCommission,
          artisanEarnings,
          commissionRate,
          deliveryRevenue,
          breakdown: {
            productCommissionPercentage: `${(platformCommission / productAmount * 100).toFixed(1)}%`,
            deliveryCommissionPercentage: '0%', // No commission on delivery fees
            artisanProductEarnings: productAmount - platformCommission,
            artisanDeliveryEarnings: deliveryRevenue.personalDeliveryFee || 0,
            totalArtisanEarnings: artisanEarnings
          }
        }
      };
    } catch (error) {
      console.error('Error calculating order revenue:', error);
      throw error;
    }
  }

  // Update revenue settlement status when wallet is credited
  static async updateRevenueSettlement(orderId, settlementStatus = 'paid', settlementReference = null) {
    try {
      const revenue = await Revenue.findOne({ orderId });
      if (!revenue) {
        throw new Error('Revenue record not found for order');
      }

      revenue.settlementStatus = settlementStatus;
      revenue.settlementDate = new Date();
      if (settlementReference) {
        revenue.settlementReference = settlementReference;
      }

      await revenue.save();
      console.log(`✅ Updated revenue settlement status for order ${orderId}: ${settlementStatus}`);

      return revenue;
    } catch (error) {
      console.error('Error updating revenue settlement:', error);
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
    try {
      const PromotionalPricing = require('../models/promotionalPricing');
      const pricing = await PromotionalPricing.find({ isActive: true });
      
      // If no pricing exists, return default values
      if (pricing.length === 0) {
        return [
          {
            type: 'product_featured',
            name: 'Featured Product',
            description: 'Highlight your product on the homepage and at the top of search results',
            basePrice: 5,
            pricePerDay: 5,
            duration: 'Daily rate',
            benefits: [
              'Featured placement on homepage',
              'Higher search ranking',
              'Featured badge on product',
              'Increased visibility to customers',
              'Distance-based ranking for relevance',
              '$5 per day or $25 for 7 days'
            ]
          },
          {
            type: 'product_sponsored',
            name: 'Sponsored Product',
            description: 'Promote your product with sponsored placement in search results and category pages',
            basePrice: 10,
            pricePerDay: 10,
            duration: 'Daily rate',
            benefits: [
              'Sponsored placement in search results',
              'Enhanced visibility in product category',
              'Sponsored label on product',
              'Priority ranking in search',
              'Auto-generated keywords from product name and tags',
              'Category and subcategory boost',
              'Product-specific search enhancement',
              '$10 per day'
            ]
          }
        ];
      }
      
      // Convert database pricing to frontend format
      return pricing.map(p => ({
        type: p.featureType,
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        pricePerDay: p.pricePerDay,
        duration: 'Daily rate',
        benefits: p.benefits
      }));
    } catch (error) {
      console.error('Error fetching promotional pricing:', error);
      // Return default values on error
      return [
        {
          type: 'product_featured',
          name: 'Featured Product',
          description: 'Highlight your product on the homepage and at the top of search results',
          basePrice: 5,
          pricePerDay: 5,
          duration: 'Daily rate',
          benefits: [
            'Featured placement on homepage',
            'Higher search ranking',
            'Featured badge on product',
            'Increased visibility to customers'
          ]
        }
      ];
    }
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

  // Add spotlight revenue tracking
  static async addSpotlightRevenue(amount, spotlightId) {
    try {
      const revenueData = {
        type: 'spotlight',
        spotlightId: spotlightId,
        grossAmount: amount,
        platformCommission: amount, // 100% platform revenue for spotlight
        artisanEarnings: 0,
        commissionRate: 1.0,
        paymentProcessor: 'stripe',
        status: 'completed',
        description: 'Artisan Spotlight Subscription'
      };

      const revenue = new Revenue(revenueData);
      await revenue.save();

      console.log(`✅ Spotlight revenue recorded: $${amount} for spotlight ${spotlightId}`);
      return revenue;
    } catch (error) {
      console.error('Error recording spotlight revenue:', error);
      throw error;
    }
  }

  // Get spotlight revenue stats
  static async getSpotlightRevenueStats(period = '30') {
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await Revenue.aggregate([
        {
          $match: {
            type: 'spotlight',
            createdAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grossAmount' },
            totalSubscriptions: { $sum: 1 },
            averageAmount: { $avg: '$grossAmount' }
          }
        }
      ]);

      const dailyRevenue = await Revenue.aggregate([
        {
          $match: {
            type: 'spotlight',
            createdAt: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$grossAmount' },
            subscriptions: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);

      return {
        period: `${days} days`,
        stats: stats[0] || {
          totalRevenue: 0,
          totalSubscriptions: 0,
          averageAmount: 0
        },
        dailyRevenue
      };
    } catch (error) {
      console.error('Error getting spotlight revenue stats:', error);
      throw error;
    }
  }

  // Update professional delivery expense with actual Uber charge
  static async updateDeliveryExpense(orderId, actualUberCharge, uberTransactionId = null) {
    try {
      console.log(`💰 Updating delivery expense for order ${orderId} with actual charge: ${actualUberCharge} CAD`);
      
      // Update the revenue record
      const revenue = await Revenue.findOne({ orderId });
      if (revenue && revenue.deliveryRevenue) {
        revenue.deliveryRevenue.professionalDeliveryExpense = actualUberCharge;
        revenue.deliveryRevenue.deliveryProfit = 
          (revenue.deliveryRevenue.professionalDeliveryFee || 0) - actualUberCharge;
        await revenue.save();
        
        console.log(`✅ Revenue record updated with actual delivery expense`);
      }
      
      // Update the platform expense record
      const expense = await PlatformExpense.findOne({ orderId, type: 'delivery' });
      if (expense) {
        expense.amount = actualUberCharge;
        expense.status = 'paid';
        expense.transactionId = uberTransactionId;
        expense.paymentDate = new Date();
        expense.settlementStatus = 'settled';
        expense.settlementDate = new Date();
        await expense.save();
        
        console.log(`✅ Platform expense record updated with actual charge`);
      }
      
      // Update the order record
      await Order.findByIdAndUpdate(orderId, {
        'delivery.actualUberCharge': actualUberCharge,
        'delivery.uberTransactionId': uberTransactionId,
        updatedAt: Date.now()
      });
      
      return {
        success: true,
        actualCharge: actualUberCharge,
        deliveryProfit: revenue?.deliveryRevenue?.deliveryProfit || 0
      };
    } catch (error) {
      console.error('❌ Error updating delivery expense:', error);
      throw error;
    }
  }

  // Get delivery revenue summary for artisan dashboard
  static async getDeliveryRevenueSummary(artisanId, startDate = null, endDate = null) {
    try {
      const match = { 
        artisanId: new mongoose.Types.ObjectId(artisanId),
        status: 'completed'
      };
      
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }
      
      const summary = await Revenue.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$deliveryRevenue.deliveryMethod',
            totalRevenue: { $sum: '$grossAmount' },
            totalDeliveryFee: { 
              $sum: {
                $add: [
                  '$deliveryRevenue.personalDeliveryFee',
                  '$deliveryRevenue.professionalDeliveryFee'
                ]
              }
            },
            personalDeliveryFee: { $sum: '$deliveryRevenue.personalDeliveryFee' },
            professionalDeliveryFee: { $sum: '$deliveryRevenue.professionalDeliveryFee' },
            orderCount: { $sum: 1 }
          }
        }
      ]);
      
      return summary;
    } catch (error) {
      console.error('❌ Error getting delivery revenue summary:', error);
      throw error;
    }
  }

  // Get platform delivery expense summary for admin dashboard
  static async getPlatformDeliveryExpenseSummary(startDate = null, endDate = null) {
    try {
      const match = { type: 'delivery' };
      
      if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
      }
      
      const summary = await PlatformExpense.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$subtype',
            totalExpense: { $sum: '$amount' },
            deliveryCount: { $sum: 1 },
            averageExpense: { $avg: '$amount' },
            byStatus: {
              $push: {
                status: '$status',
                amount: '$amount'
              }
            }
          }
        }
      ]);
      
      // Also get corresponding revenue for profit calculation
      const revenueMatch = { 
        'deliveryRevenue.deliveryMethod': 'professionalDelivery',
        status: 'completed'
      };
      
      if (startDate || endDate) {
        revenueMatch.createdAt = {};
        if (startDate) revenueMatch.createdAt.$gte = new Date(startDate);
        if (endDate) revenueMatch.createdAt.$lte = new Date(endDate);
      }
      
      const revenueData = await Revenue.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            totalProfessionalDeliveryRevenue: { $sum: '$deliveryRevenue.professionalDeliveryFee' },
            totalDeliveryProfit: { $sum: '$deliveryRevenue.deliveryProfit' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      return {
        expenses: summary,
        revenue: revenueData[0] || { 
          totalProfessionalDeliveryRevenue: 0, 
          totalDeliveryProfit: 0, 
          count: 0 
        }
      };
    } catch (error) {
      console.error('❌ Error getting platform delivery expense summary:', error);
      throw error;
    }
  }
}

module.exports = RevenueService;
