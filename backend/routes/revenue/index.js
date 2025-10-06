/**
 * Revenue Management - Serverless Implementation
 * Handles revenue summaries, breakdowns, and transparency
 */

const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// ============================================================================
// ARTISAN REVENUE ENDPOINTS
// ============================================================================

// Get artisan revenue summary
const getArtisanRevenueSummary = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { period = 'month' } = req.query;

    const db = req.db; // Use shared connection
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      // Connection managed by middleware
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

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
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all completed orders for this artisan in the period (orders that have revenue recognized)
    const orders = await ordersCollection.find({
      artisan: artisan._id,
      createdAt: { $gte: startDate },
      status: { $in: ['completed'] }
    }).sort({ createdAt: 1 }).toArray();

    // Get revenue records from the new revenue recognition system
    const revenuesCollection = db.collection('revenues');
    const revenueRecords = await revenuesCollection.find({
      artisanId: artisan._id,
      createdAt: { $gte: startDate },
      status: 'completed'
    }).sort({ createdAt: 1 }).toArray();

    // Track product sales for top products analysis
    const productSales = new Map();
    const trendData = new Map();
    let totalProductsSold = 0;

    // Calculate revenue breakdown using actual revenue records
    const summary = revenueRecords.reduce((acc, revenueRecord) => {
      // Get the actual revenue breakdown from the revenue recognition system
      const revenue = revenueRecord.revenue || {};
      const fees = revenueRecord.fees || {};
      
      // Product revenue
      const productGross = revenue.subtotal || 0;
      const platformCommission = fees.platformFeeAmount || 0;
      const productEarnings = revenue.netEarnings || 0;
      
      // Delivery revenue (100% to artisan, no commission)
      const deliveryFee = revenue.deliveryFee || 0;
      const deliveryEarnings = deliveryFee;
      
      // Find corresponding order for delivery method info
      const order = orders.find(o => o._id.toString() === revenueRecord.orderId.toString());
      const isPersonalDelivery = order && ((order.deliveryMethod === 'personalDelivery' || 
                                          order.deliveryMethod === 'personal_delivery') && deliveryFee > 0);
      const isProfessionalDelivery = order && (order.deliveryMethod === 'professionalDelivery' || 
                                             order.deliveryMethod === 'professional_delivery');
      const isPickup = !order || !order.deliveryMethod || order.deliveryMethod === 'pickup';
      
      // Track product sales
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          // Handle both old and new order formats
          const productId = item.product?._id?.toString() || item.productId?.toString();
          const productName = item.product?.name || item.name || 'Unknown Product';
          const imageUrl = item.product?.imageUrl || item.imageUrl || item.product?.images?.[0] || '';
          const quantity = item.quantity || 1;
          
          // Price can be in different places depending on order format
          const itemPrice = item.price || item.product?.price || 0;
          const itemRevenue = itemPrice * quantity;
          
          totalProductsSold += quantity;
          
          if (productId) {
            if (!productSales.has(productId)) {
              productSales.set(productId, {
                productId,
                productName,
                imageUrl,
                revenue: 0,
                quantitySold: 0,
                orderCount: 0
              });
            }
            
            const productData = productSales.get(productId);
            productData.revenue += itemRevenue;
            productData.quantitySold += quantity;
            productData.orderCount += 1;
          }
        });
      }
      
      // Track trends (group by time period) using revenue record date
      const revenueDate = new Date(revenueRecord.createdAt);
      let trendKey;
      
      if (period === 'week') {
        // Daily grouping for week
        trendKey = revenueDate.toISOString().split('T')[0];
      } else if (period === 'month') {
        // Weekly grouping for month
        const weekNum = Math.floor((revenueDate.getDate() - 1) / 7);
        trendKey = `${revenueDate.getFullYear()}-${revenueDate.getMonth() + 1}-W${weekNum + 1}`;
      } else if (period === 'quarter' || period === 'year') {
        // Monthly grouping for quarter/year
        trendKey = `${revenueDate.getFullYear()}-${String(revenueDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (trendKey) {
        if (!trendData.has(trendKey)) {
          trendData.set(trendKey, {
            date: trendKey,
            productRevenue: 0,
            deliveryRevenue: 0,
            totalRevenue: 0,
            orders: 0
          });
        }
        
        const trend = trendData.get(trendKey);
        trend.productRevenue += productGross;
        trend.deliveryRevenue += deliveryFee;
        trend.totalRevenue += productGross + deliveryFee;
        trend.orders += 1;
      }
      
      return {
        // Order counts
        orderCount: acc.orderCount + 1,
        
        // Product revenue
        productGross: acc.productGross + productGross,
        platformCommission: acc.platformCommission + platformCommission,
        productEarnings: acc.productEarnings + productEarnings,
        
        // Delivery revenue
        deliveryGross: acc.deliveryGross + deliveryFee,
        deliveryEarnings: acc.deliveryEarnings + deliveryEarnings,
        deliveryCommission: 0, // Always 0
        
        // Totals
        totalGross: acc.totalGross + productGross + deliveryFee,
        totalCommission: acc.totalCommission + platformCommission,
        totalEarnings: acc.totalEarnings + productEarnings + deliveryEarnings,
        
        // Delivery method counts
        pickupOrders: acc.pickupOrders + (isPickup ? 1 : 0),
        personalDeliveryOrders: acc.personalDeliveryOrders + (isPersonalDelivery ? 1 : 0),
        professionalDeliveryOrders: acc.professionalDeliveryOrders + (isProfessionalDelivery ? 1 : 0)
      };
    }, {
      orderCount: 0,
      productGross: 0,
      platformCommission: 0,
      productEarnings: 0,
      deliveryGross: 0,
      deliveryEarnings: 0,
      deliveryCommission: 0,
      totalGross: 0,
      totalCommission: 0,
      totalEarnings: 0,
      pickupOrders: 0,
      personalDeliveryOrders: 0,
      professionalDeliveryOrders: 0
    });

    // Get top products (sorted by revenue)
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((product, index) => ({
        ...product,
        rank: index + 1
      }));

    // Get trends sorted by date
    const trends = Array.from(trendData.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Connection managed by middleware

    // Format response to match frontend component expectations
    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        
        // Main revenue data (frontend expects 'revenue' object)
        revenue: {
          // Totals (using frontend expected field names)
          totalGrossAmount: summary.totalGross,
          totalEarnings: summary.totalEarnings,
          totalCommission: summary.totalCommission,
          orderCount: summary.orderCount,
          
          // Product breakdown
          productRevenue: summary.productGross,
          productEarnings: summary.productEarnings,
          productCommission: summary.platformCommission,
          
          // Delivery breakdown
          deliveryRevenue: summary.deliveryGross,
          deliveryEarnings: summary.deliveryEarnings,
          deliveryCommission: 0,
          
          // Delivery method breakdown
          pickupOrders: summary.pickupOrders,
          personalDeliveryOrders: summary.personalDeliveryOrders,
          professionalDeliveryOrders: summary.professionalDeliveryOrders,
          
          // Product sales statistics
          totalProductsSold: totalProductsSold,
          averageItemsPerOrder: summary.orderCount > 0 
            ? totalProductsSold / summary.orderCount 
            : 0
        },
        
        // Top selling products
        topProducts: topProducts,
        
        // Revenue trends over time
        trends: trends,
        
        // Delivery breakdown for display
        deliveryBreakdown: {
          pickup: {
            count: summary.pickupOrders,
            revenue: 0
          },
          personal: {
            count: summary.personalDeliveryOrders,
            revenue: summary.deliveryGross
          },
          professional: {
            count: summary.professionalDeliveryOrders,
            revenue: 0
          }
        },
        
        // Additional metrics (get from platform settings)
        commissionRate: revenueRecords.length > 0 ? 
          (revenueRecords[0].fees?.platformFeeRate || 0.15) : 0.15,
        platformFeePercentage: revenueRecords.length > 0 ? 
          ((revenueRecords[0].fees?.platformFeeRate || 0.15) * 100) : 15,
        averageOrderValue: summary.orderCount > 0 
          ? summary.totalGross / summary.orderCount 
          : 0,
        averageEarnings: summary.orderCount > 0
          ? summary.totalEarnings / summary.orderCount
          : 0
      }
    });
  } catch (error) {
    console.error('Get artisan revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue summary',
      error: error.message
    });
  }
};

// Get revenue transparency information (public)
const getRevenueTransparency = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        platformCommissionRate: 10,
        artisanEarningsRate: 90,
        deliveryFeePolicy: 'Artisans receive 100% of delivery fees',
        model: {
          products: {
            commission: '10% to platform',
            earnings: '90% to artisan',
            description: 'Platform commission funds development, security, and operations'
          },
          delivery: {
            commission: '0% to platform',
            earnings: '100% to artisan',
            description: 'Personal delivery fees go directly to artisans without any deduction'
          },
          professionalDelivery: {
            description: 'Professional delivery services handle their own fees separately'
          }
        },
        transparency: {
          title: 'Fair Compensation for Artisans',
          description: 'We believe in fair compensation and transparency. Artisans receive 90% of product sales and 100% of personal delivery fees.',
          breakdown: 'Platform commission funds ongoing development, security, payment processing, and customer support.',
          support: 'Every purchase directly supports local artisans and helps sustain the platform.'
        },
        examples: [
          {
            scenario: '$100 product sale (pickup)',
            breakdown: {
              productTotal: 100,
              platformFee: 10,
              artisanEarnings: 90,
              deliveryFee: 0,
              totalToArtisan: 90
            }
          },
          {
            scenario: '$100 product sale + $7 personal delivery',
            breakdown: {
              productTotal: 100,
              platformFee: 10,
              artisanEarnings: 90,
              deliveryFee: 7,
              deliveryToArtisan: 7,
              totalToArtisan: 97
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get transparency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transparency info',
      error: error.message
    });
  }
};

// Routes
router.get('/artisan/summary', getArtisanRevenueSummary);
router.get('/transparency', getRevenueTransparency);

module.exports = router;

