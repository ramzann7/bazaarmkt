/**
 * Additional Services - Serverless Implementation
 * Handles spotlight, wallet, geocoding, and other miscellaneous endpoints
 */

const express = require('express');
const router = express.Router();
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

    const db = req.db; // Use shared connection from middleware
    const spotlightCollection = db.collection('spotlight_subscriptions');

    const subscription = await spotlightCollection.findOne({
      userId: new ObjectId(decoded.userId),
      status: 'active'
    });

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

    const db = req.db; // Use shared connection
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

    // Connection managed by middleware

    res.json({
      success: true,
      data: {
        balance: wallet.balance || 0,
        pendingBalance: wallet.pendingBalance || 0,
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

    const db = req.db; // Use shared connection
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

    // Connection managed by middleware

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
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Aggregate revenue data - orders have artisan field at root level
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

    // Connection managed by middleware

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
    const db = req.db; // Use shared connection

    const [usersCount, artisansCount, productsCount, ordersCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('artisans').countDocuments(),
      db.collection('products').countDocuments({ status: 'active' }),
      db.collection('orders').countDocuments()
    ]);

    // Connection managed by middleware

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

    const db = req.db; // Use shared connection
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

    // Connection managed by middleware

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

    const db = req.db; // Use shared connection
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
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

    // Connection managed by middleware

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

// ============================================================================
// WALLET TOP-UP ENDPOINTS
// ============================================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe payment intent for wallet top-up
 * POST /api/admin/wallet/top-up/create-payment-intent
 */
const createTopUpPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'CAD' } = req.body;
    const userId = req.userId;

    if (!amount || amount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum top-up amount is $10'
      });
    }

    if (amount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum top-up amount is $10,000'
      });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId.toString(),
        type: 'wallet_top_up'
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

/**
 * Confirm wallet top-up after successful payment
 * POST /api/admin/wallet/top-up/confirm
 */
const confirmTopUp = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.userId;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    if (paymentIntent.metadata.userId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const db = req.db; // Use shared connection
    const walletsCollection = db.collection('wallets');
    const transactionsCollection = db.collection('wallet_transactions');
    const artisansCollection = db.collection('artisans');

    // Get artisan
    const artisan = await artisansCollection.findOne({ user: new ObjectId(userId) });
    if (!artisan) {
      // Connection managed by middleware
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }

    const amount = paymentIntent.amount / 100; // Convert from cents

    // Update wallet balance
    await walletsCollection.updateOne(
      { artisanId: artisan._id },
      {
        $inc: { balance: amount },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    // Create transaction record
    const transaction = {
      artisanId: artisan._id,
      type: 'top_up',
      amount: amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'completed',
      description: 'Wallet top-up via Stripe',
      paymentIntentId: paymentIntentId,
      metadata: {
        stripePaymentIntentId: paymentIntentId,
        stripeAmount: paymentIntent.amount,
        stripeCurrency: paymentIntent.currency
      },
      createdAt: new Date()
    };

    await transactionsCollection.insertOne(transaction);

    // Get updated wallet balance
    const wallet = await walletsCollection.findOne({ artisanId: artisan._id });

    // Connection managed by middleware

    res.json({
      success: true,
      data: {
        transaction,
        newBalance: wallet.balance,
        message: 'Wallet topped up successfully'
      }
    });
  } catch (error) {
    console.error('Confirm top-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm top-up',
      error: error.message
    });
  }
};

/**
 * Update payout settings
 * PUT /api/admin/wallet/payout-settings
 */
const updatePayoutSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      enabled = true,
      schedule = 'weekly', // 'weekly', 'monthly', 'manual'
      minimumPayout = 50,
      bankName,
      accountHolderName,
      accountNumber,
      routingNumber,
      transitNumber,
      institutionNumber
    } = req.body;

    const db = req.db; // Use shared connection
    const walletsCollection = db.collection('wallets');
    const artisansCollection = db.collection('artisans');

    // Get artisan
    const artisan = await artisansCollection.findOne({ user: new ObjectId(userId) });
    if (!artisan) {
      // Connection managed by middleware
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }

    // Calculate next payout date based on schedule
    const now = new Date();
    let nextPayoutDate;
    
    if (schedule === 'weekly') {
      // Next Friday
      nextPayoutDate = new Date(now);
      nextPayoutDate.setDate(now.getDate() + ((5 + 7 - now.getDay()) % 7 || 7));
    } else if (schedule === 'monthly') {
      // First day of next month
      nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      // Manual - no automatic payout
      nextPayoutDate = null;
    }

    // Update payout settings in wallet
    const payoutSettings = {
      enabled,
      schedule,
      minimumPayout,
      bankInfo: {
        bankName,
        accountHolderName,
        accountNumber: accountNumber ? `****${accountNumber.slice(-4)}` : null, // Store last 4 digits only
        routingNumber,
        transitNumber,
        institutionNumber,
        // In production, encrypt the full account number
        encryptedAccountNumber: accountNumber // TODO: Encrypt this in production
      },
      lastPayoutDate: null,
      nextPayoutDate,
      updatedAt: new Date()
    };

    await walletsCollection.updateOne(
      { artisanId: artisan._id },
      {
        $set: { payoutSettings },
        $setOnInsert: { 
          balance: 0,
          pendingBalance: 0,
          currency: 'CAD',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Connection managed by middleware

    res.json({
      success: true,
      data: {
        payoutSettings: {
          ...payoutSettings,
          bankInfo: {
            ...payoutSettings.bankInfo,
            encryptedAccountNumber: undefined // Don't send back to frontend
          }
        },
        message: 'Payout settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Update payout settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payout settings',
      error: error.message
    });
  }
};

// Routes
router.get('/spotlight', getSpotlightStatus);
router.get('/wallet/balance', getWalletBalance);
router.get('/wallet/transactions', getWalletTransactions);
router.post('/wallet/top-up/create-payment-intent', createTopUpPaymentIntent);
router.post('/wallet/top-up/confirm', confirmTopUp);
router.put('/wallet/payout-settings', updatePayoutSettings);
router.post('/geocoding', geocodeAddress);
router.get('/revenue', getArtisanRevenue);
router.get('/stats', getAdminStats);
router.get('/search', enhancedSearch);
router.get('/analytics', getBusinessAnalytics);

module.exports = router;
