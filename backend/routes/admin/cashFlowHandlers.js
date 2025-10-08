/**
 * Admin Service - Cash Flow Endpoint
 * Track platform revenues from all sources
 * Uses existing collections: orders, artisanspotlight, promotional_features
 */

const { ObjectId } = require('mongodb');

/**
 * Get platform cash flow data
 */
const getPlatformCashFlow = async (req, res) => {
  try {
    const { timeRange = '30' } = req.query;
    const db = req.app.locals.db;
    
    // Calculate date range
    const startDate = timeRange === 'all' 
      ? new Date(0) 
      : new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
    
    console.log('📊 Loading platform cash flow for time range:', timeRange, 'days');
    
    // Get platform revenues from multiple EXISTING sources
    const [
      orderCommissions,
      spotlightSubscriptions,
      promotionalFeatures,
      stripeTransfers
    ] = await Promise.all([
      // Order commissions (10% of completed orders)
      db.collection('orders').aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'captured',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalGMV: { $sum: '$totalAmount' },
            totalCommissions: { $sum: '$platformFee' }
          }
        }
      ]).toArray(),
      
      // Spotlight subscriptions - USE EXISTING COLLECTION: artisanspotlight (no underscore)
      db.collection('artisanspotlight').aggregate([
        {
          $match: {
            'payment.status': 'paid',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            totalRevenue: { $sum: '$payment.amount' }
          }
        }
      ]).toArray(),
      
      // Promotional features - USE EXISTING COLLECTION: promotional_features
      db.collection('promotional_features').aggregate([
        {
          $match: {
            status: 'active',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPromotions: { $sum: 1 },
            totalRevenue: { $sum: '$payment.amount' }
          }
        }
      ]).toArray(),
      
      // Get recent Stripe transfers for audit - USE EXISTING COLLECTION: orders
      db.collection('orders').find({
        stripeTransferId: { $exists: true },
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 }).limit(100).toArray()
    ]);
    
    // Calculate summary
    const orderData = orderCommissions[0] || { totalOrders: 0, totalGMV: 0, totalCommissions: 0 };
    const spotlightData = spotlightSubscriptions[0] || { totalSubscriptions: 0, totalRevenue: 0 };
    const promotionalData = promotionalFeatures[0] || { totalPromotions: 0, totalRevenue: 0 };
    
    const summary = {
      totalRevenue: orderData.totalCommissions + spotlightData.totalRevenue + promotionalData.totalRevenue,
      orderCommissions: orderData.totalCommissions,
      promotionalRevenue: promotionalData.totalRevenue,
      spotlightRevenue: spotlightData.totalRevenue,
      totalOrders: orderData.totalOrders,
      totalGMV: orderData.totalGMV,
      // Estimate Stripe fees (2.9% + $0.30 per transaction)
      estimatedStripeFees: orderData.totalGMV * 0.029 + (orderData.totalOrders * 0.30),
      netRevenue: 0 // Will calculate after Stripe fees
    };
    
    summary.netRevenue = summary.totalRevenue - summary.estimatedStripeFees;
    
    // Format transactions for display
    const transactions = [];
    
    // Add order commission transactions
    for (const order of stripeTransfers.slice(0, 20)) {
      transactions.push({
        _id: order._id,
        type: 'order_commission',
        amount: order.platformFee || (order.totalAmount * 0.10),
        description: `10% commission from order #${order._id.toString().slice(-8)}`,
        orderId: order._id,
        artisanId: order.artisan,
        totalAmount: order.totalAmount,
        artisanAmount: order.artisanAmount,
        createdAt: order.paymentCapturedAt || order.createdAt,
        metadata: {
          orderNumber: order._id.toString().slice(-8),
          paymentIntentId: order.paymentIntentId,
          stripeTransferId: order.stripeTransferId
        }
      });
    }
    
    // Add spotlight subscriptions - USE EXISTING COLLECTION: artisanspotlight (no underscore)
    const recentSpotlight = await db.collection('artisanspotlight').find({
      'payment.status': 'paid',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    for (const spotlight of recentSpotlight) {
      transactions.push({
        _id: spotlight._id,
        type: 'spotlight_subscription',
        amount: spotlight.payment.amount,
        description: `Artisan Spotlight subscription - ${spotlight.duration} days`,
        artisanId: spotlight.artisanId,
        createdAt: spotlight.createdAt,
        metadata: {
          duration: spotlight.duration,
          subscriptionType: spotlight.type
        }
      });
    }
    
    // Sort all transactions by date
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log('✅ Platform cash flow loaded:', {
      totalRevenue: summary.totalRevenue,
      transactionCount: transactions.length
    });
    
    res.json({
      success: true,
      data: {
        summary,
        transactions: transactions.slice(0, 50) // Limit to 50 most recent
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting platform cash flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load cash flow data: ' + error.message
    });
  }
};

module.exports = {
  getPlatformCashFlow
};



