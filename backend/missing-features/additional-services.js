/**
 * Additional Services - Serverless Implementation
 * Handles spotlight, wallet, geocoding, and other miscellaneous endpoints
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// ============================================================================
// SPOTLIGHT ENDPOINTS
// ============================================================================

// Get spotlight status
const getSpotlightStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const spotlightCollection = db.collection('spotlight_subscriptions');

    const subscription = await spotlightCollection.findOne({
      userId: new ObjectId(decoded.userId),
      status: 'active'
    });

    await client.close();

    res.json({
      success: true,
      data: {
        hasActiveSpotlight: !!subscription,
        subscription: subscription || null
      }
    });
  } catch (error) {
    console.error('Get spotlight status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spotlight status',
      error: error.message
    });
  }
};

// ============================================================================
// WALLET ENDPOINTS
// ============================================================================

// Get wallet balance
const getWalletBalance = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const walletsCollection = db.collection('wallets');

    // First check if user is an artisan to get their wallet
    const artisan = await db.collection('artisans').findOne({
      user: new ObjectId(decoded.userId)
    });

    let wallet = null;
    if (artisan) {
      wallet = await walletsCollection.findOne({
        artisanId: artisan._id
      });
    }

    // Create wallet if it doesn't exist
    if (!wallet && artisan) {
      try {
        wallet = {
          artisanId: artisan._id, // Wallet is linked to artisan, not user directly
          balance: 0,
          currency: 'CAD',
          isActive: true,
          stripeCustomerId: null,
          stripeAccountId: null,
          payoutSettings: {
            enabled: false,
            schedule: 'weekly',
            minimumPayout: 50,
            lastPayoutDate: null,
            nextPayoutDate: null
          },
          metadata: {
            totalEarnings: 0,
            totalSpent: 0,
            totalPayouts: 0,
            platformFees: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await walletsCollection.insertOne(wallet);
      } catch (insertError) {
        // If insert fails (e.g., due to duplicate key), try to find the existing wallet
        if (insertError.code === 11000) {
          wallet = await walletsCollection.findOne({
            artisanId: artisan._id
          });
        } else {
          throw insertError;
        }
      }
    }

    await client.close();

    res.json({
      success: true,
      data: {
        balance: wallet.balance || 0,
        currency: wallet.currency || 'CAD',
        lastUpdated: wallet.updatedAt
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message
    });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const transactionsCollection = db.collection('wallet_transactions');

    // Get artisan first to find their transactions
    const artisan = await db.collection('artisans').findOne({
      user: new ObjectId(decoded.userId)
    });

    const transactions = artisan ? await transactionsCollection
      .find({ artisanId: artisan._id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray() : [];

    await client.close();

    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet transactions',
      error: error.message
    });
  }
};

// ============================================================================
// GEOCODING ENDPOINTS
// ============================================================================

// Geocode address
const geocodeAddress = async (req, res) => {
  try {
    const { address, components } = req.body;

    if (!address && !components) {
      return res.status(400).json({
        success: false,
        message: 'Address or components are required'
      });
    }

    // For now, return mock coordinates
    // In production, this would integrate with Google Maps Geocoding API
    const mockCoordinates = {
      lat: 43.6532 + (Math.random() - 0.5) * 0.1, // Toronto area with some variance
      lng: -79.3832 + (Math.random() - 0.5) * 0.1,
      formatted_address: address || 'Toronto, ON, Canada',
      components: components || {}
    };

    res.json({
      success: true,
      data: {
        coordinates: mockCoordinates,
        address: address
      }
    });
  } catch (error) {
    console.error('Geocode address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
};

// ============================================================================
// REVENUE ENDPOINTS
// ============================================================================

// Get artisan revenue data
const getArtisanRevenue = async (req, res) => {
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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      await client.close();
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
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Aggregate revenue data - orders have direct artisan field
    const revenueData = await ordersCollection.aggregate([
      {
        $match: {
          artisan: artisan._id,
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'preparing', 'ready', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]).toArray();

    const stats = revenueData.length > 0 ? revenueData[0] : {
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0
    };

    await client.close();

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        totalRevenue: stats.totalRevenue || 0,
        orderCount: stats.orderCount || 0,
        avgOrderValue: stats.avgOrderValue || 0
      }
    });
  } catch (error) {
    console.error('Get artisan revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue data',
      error: error.message
    });
  }
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// Get admin dashboard stats
const getAdminStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin (you might want to add admin role check)
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();

    const [usersCount, artisansCount, productsCount, ordersCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('artisans').countDocuments(),
      db.collection('products').countDocuments({ status: 'active' }),
      db.collection('orders').countDocuments()
    ]);

    await client.close();

    res.json({
      success: true,
      data: {
        totalUsers: usersCount,
        totalArtisans: artisansCount,
        totalProducts: productsCount,
        totalOrders: ordersCount
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin stats',
      error: error.message
    });
  }
};

// ============================================================================
// SEARCH & DISCOVERY ENDPOINTS
// ============================================================================

// Enhanced search with location
const enhancedSearch = async (req, res) => {
  try {
    const { query, category, location, radius = 50, limit = 20 } = req.query;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');

    // Build search pipeline
    const pipeline = [
      {
        $match: {
          status: 'active',
          ...(query && {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $in: [new RegExp(query, 'i')] } }
            ]
          }),
          ...(category && { category })
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisan',
          pipeline: [
            {
              $project: {
                artisanName: 1,
                businessName: 1,
                address: 1,
                location: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$artisan', preserveNullAndEmptyArrays: true } },
      { $limit: parseInt(limit) }
    ];

    const results = await productsCollection.aggregate(pipeline).toArray();

    await client.close();

    res.json({
      success: true,
      data: {
        products: results,
        count: results.length,
        searchParams: { query, category, location, radius }
      }
    });
  } catch (error) {
    console.error('Enhanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

// ============================================================================
// BUSINESS ANALYTICS ENDPOINTS
// ============================================================================

// Get business analytics
const getBusinessAnalytics = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    // Get analytics data
    const [topProducts, recentOrders, monthlyStats] = await Promise.all([
      // Top selling products - using simplified approach since orders have direct artisan field
      productsCollection.find({ artisan: artisan._id, status: 'active' })
        .sort({ soldCount: -1 })
        .limit(5)
        .toArray(),

      // Recent orders
      ordersCollection.find({ artisan: artisan._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),

      // Monthly stats
      ordersCollection.aggregate([
        {
          $match: {
            artisan: artisan._id,
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]).toArray()
    ]);

    await client.close();

    const monthStats = monthlyStats.length > 0 ? monthlyStats[0] : {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    };

    res.json({
      success: true,
      data: {
        topProducts,
        recentOrders,
        monthlyStats: monthStats,
        period: 'current_month'
      }
    });
  } catch (error) {
    console.error('Get business analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business analytics',
      error: error.message
    });
  }
};

module.exports = {
  getSpotlightStatus,
  getWalletBalance,
  getWalletTransactions,
  geocodeAddress,
  getArtisanRevenue,
  getAdminStats,
  enhancedSearch,
  getBusinessAnalytics
};
