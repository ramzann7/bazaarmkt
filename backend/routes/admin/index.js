/**
 * Additional Services - Serverless Implementation
 * Handles spotlight, wallet, geocoding, and other miscellaneous endpoints
 */

const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { verifyJWT, verifyAdminRole } = require('../../middleware/auth');
const { logAdminAction, getRecentActivity } = require('../../utils/adminAuditLogger');

// Import cash flow handlers
const cashFlowHandlers = require('./cashFlowHandlers');

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
    const spotlightCollection = db.collection('artisanspotlight');

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

// Process scheduled payouts
const processScheduledPayouts = async () => {
  try {
    console.log('🔄 Processing scheduled payouts...');
    
    const db = require('../config/database').getDb();
    const walletsCollection = db.collection('wallets');
    const transactionsCollection = db.collection('wallettransactions');
    const artisansCollection = db.collection('artisans');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find wallets with payouts due today
    const walletsDueForPayout = await walletsCollection.find({
      'payoutSettings.enabled': true,
      'payoutSettings.nextPayoutDate': {
        $lte: today
      },
      balance: {
        $gte: '$payoutSettings.minimumPayout'
      }
    }).toArray();
    
    console.log(`📊 Found ${walletsDueForPayout.length} wallets due for payout`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const wallet of walletsDueForPayout) {
      try {
        // Get artisan information
        const artisan = await artisansCollection.findOne({ _id: wallet.artisanId });
        if (!artisan) {
          console.error(`❌ Artisan not found for wallet ${wallet._id}`);
          errorCount++;
          continue;
        }
        
        // Check if payout amount meets minimum
        const payoutAmount = wallet.balance;
        const minimumPayout = wallet.payoutSettings.minimumPayout;
        
        if (payoutAmount < minimumPayout) {
          console.log(`⏭️ Skipping wallet ${wallet._id} - balance ${payoutAmount} below minimum ${minimumPayout}`);
          continue;
        }
        
        // For now, we'll simulate the payout since Stripe Connect requires proper setup
        // In production, this would use the StripeService to create actual payouts
        console.log(`💰 Processing payout for artisan ${artisan.artisanName}: $${payoutAmount}`);
        
        // Create payout transaction record
        const payoutTransaction = {
          artisanId: wallet.artisanId,
          type: 'payout',
          amount: -payoutAmount, // Negative for outgoing
          description: `Weekly payout - ${wallet.payoutSettings.schedule}`,
          status: 'completed',
          reference: `PAYOUT-${Date.now()}`,
          balanceAfter: 0, // Balance after payout
          metadata: {
            payoutDate: now,
            schedule: wallet.payoutSettings.schedule,
            originalBalance: payoutAmount
          },
          createdAt: now,
          updatedAt: now
        };
        
        await transactionsCollection.insertOne(payoutTransaction);
        
        // Calculate next payout date
        let nextPayoutDate;
        if (wallet.payoutSettings.schedule === 'weekly') {
          nextPayoutDate = new Date(now);
          nextPayoutDate.setDate(now.getDate() + 7);
        } else if (wallet.payoutSettings.schedule === 'monthly') {
          nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        
        // Update wallet balance and payout settings
        await walletsCollection.updateOne(
          { _id: wallet._id },
          {
            $set: {
              balance: 0,
              'payoutSettings.lastPayoutDate': now,
              'payoutSettings.nextPayoutDate': nextPayoutDate,
              'metadata.totalPayouts': (wallet.metadata?.totalPayouts || 0) + payoutAmount,
              updatedAt: now
            }
          }
        );
        
        processedCount++;
        console.log(`✅ Payout processed for artisan ${artisan.artisanName}: $${payoutAmount}`);
        
      } catch (error) {
        console.error(`❌ Error processing payout for wallet ${wallet._id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`🎉 Payout processing complete: ${processedCount} processed, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Error in processScheduledPayouts:', error);
  }
};

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
        // Calculate next payout date for new wallets
        const now = new Date();
        let nextPayoutDate;
        
        // Set next payout to next Friday at 9 AM
        const nextFriday = new Date(now);
        const daysUntilFriday = (5 + 7 - now.getDay()) % 7 || 7;
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        nextFriday.setHours(9, 0, 0, 0);
        nextPayoutDate = nextFriday;
        
        wallet = {
          artisanId: artisan._id, // Wallet is linked to artisan, not user directly
          balance: 0,
          currency: 'CAD',
          isActive: true,
          stripeCustomerId: null,
          stripeAccountId: null,
          payoutSettings: {
            enabled: true, // Enable payouts by default
            schedule: 'weekly',
            minimumPayout: 50,
            lastPayoutDate: null,
            nextPayoutDate: nextPayoutDate
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

    const responseData = {
      success: true,
      data: {
        balance: wallet.balance || 0,
        pendingBalance: wallet.pendingBalance || 0,
        currency: wallet.currency || 'CAD',
        lastUpdated: wallet.updatedAt,
        payoutSettings: wallet.payoutSettings || (() => {
          // Calculate next payout date for fallback
          const now = new Date();
          const nextFriday = new Date(now);
          const daysUntilFriday = (5 + 7 - now.getDay()) % 7 || 7;
          nextFriday.setDate(now.getDate() + daysUntilFriday);
          nextFriday.setHours(9, 0, 0, 0);
          
          return {
            enabled: true,
            schedule: 'weekly',
            minimumPayout: 50,
            lastPayoutDate: null,
            nextPayoutDate: nextFriday
          };
        })()
      }
    };

    res.json(responseData);
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
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    const status = req.query.status;

    const db = req.db; // Use shared connection
    const transactionsCollection = db.collection('wallettransactions');

    // Get artisan first to find their transactions
    const artisan = await db.collection('artisans').findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      return res.json({
        success: true,
        data: {
          transactions: [],
          count: 0,
          pagination: {
            current: page,
            pages: 0,
            total: 0
          }
        }
      });
    }

    // Build query filter
    const filter = { artisanId: artisan._id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Get total count for pagination
    const totalCount = await transactionsCollection.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    const transactions = await transactionsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Connection managed by middleware

    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        pagination: {
          current: page,
          pages: totalPages,
          total: totalCount
        }
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
          status: { $in: ['confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'picked_up', 'out_for_delivery', 'delivered', 'completed'] }
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

    // Active order statuses = all orders EXCEPT cancelled, completed, and declined
    // This matches the Orders.jsx component logic (line 143-146)
    const inactiveStatuses = ['cancelled', 'completed', 'declined'];

    const [usersCount, artisansCount, productsCount, totalOrdersCount, activeOrdersCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('artisans').countDocuments(),
      db.collection('products').countDocuments({ status: 'active' }),
      db.collection('orders').countDocuments(),
      db.collection('orders').countDocuments({ status: { $nin: inactiveStatuses } })
    ]);

    // Get recent admin activity (last 20 actions)
    const recentActivity = await getRecentActivity(db, 20);

    // Connection managed by middleware

    res.json({
      success: true,
      data: {
        totalUsers: usersCount,
        totalArtisans: artisansCount,
        totalProducts: productsCount,
        totalOrders: totalOrdersCount,
        activeOrders: activeOrdersCount,
        recentActivity: recentActivity
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

// Get all products for admin management
const getAdminProducts = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');

    // Get all products with artisan information
    const products = await productsCollection.aggregate([
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message
    });
  }
};

// Update product status
const updateProductStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const db = req.db;
    const productsCollection = db.collection('products');

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: isActive ? 'active' : 'inactive',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'product',
      resourceId: id,
      description: `${isActive ? 'Activated' : 'Deactivated'} product`,
      details: `Product status changed to ${isActive ? 'active' : 'inactive'}`
    });

    res.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product status',
      error: error.message
    });
  }
};

// Set featured product
const setFeaturedProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isFeatured must be a boolean'
      });
    }

    const db = req.db;
    const productsCollection = db.collection('products');

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isFeatured: isFeatured,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'product',
      resourceId: id,
      description: `${isFeatured ? 'Featured' : 'Unfeatured'} product`,
      details: `Product featured status changed to ${isFeatured}`
    });

    res.json({
      success: true,
      message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`
    });
  } catch (error) {
    console.error('Set featured product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured status',
      error: error.message
    });
  }
};

// Delete product
const deleteAdminProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;

    const db = req.db;
    const productsCollection = db.collection('products');

    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'delete',
      resource: 'product',
      resourceId: id,
      description: `Deleted product`,
      details: `Product permanently removed from database`
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Get all artisans for admin management
const getAdminArtisans = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');

    // Get all artisans with user information
    const artisans = await artisansCollection.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $addFields: {
          user: { $arrayElemAt: ['$userInfo', 0] }
        }
      },
      {
        $project: {
          userInfo: 0,
          'user.password': 0,
          'user.__v': 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    res.json({
      success: true,
      data: artisans,
      count: artisans.length
    });
  } catch (error) {
    console.error('Get admin artisans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get artisans',
      error: error.message
    });
  }
};

// Update artisan status
const updateArtisanStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const db = req.db;
    const artisansCollection = db.collection('artisans');

    const result = await artisansCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: isActive,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'artisan',
      resourceId: id,
      description: `${isActive ? 'Activated' : 'Deactivated'} artisan profile`,
      details: `Artisan status changed to ${isActive ? 'active' : 'inactive'}`
    });

    res.json({
      success: true,
      message: `Artisan ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update artisan status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update artisan status',
      error: error.message
    });
  }
};

// Update artisan verification
const updateArtisanVerification = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be a boolean'
      });
    }

    const db = req.db;
    const artisansCollection = db.collection('artisans');

    const result = await artisansCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isVerified: isVerified,
          verifiedAt: isVerified ? new Date() : null,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'artisan',
      resourceId: id,
      description: `${isVerified ? 'Verified' : 'Unverified'} artisan`,
      details: `Artisan verification status changed to ${isVerified ? 'verified' : 'unverified'}${isVerified ? ' at ' + new Date().toISOString() : ''}`
    });

    res.json({
      success: true,
      message: `Artisan ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Update artisan verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update artisan verification',
      error: error.message
    });
  }
};

// Get all users for admin management
const getAdminUsers = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db;
    const usersCollection = db.collection('users');

    // Get all users (excluding passwords)
    const users = await usersCollection.find({}, {
      projection: { password: 0, __v: 0 }
    }).sort({ createdAt: -1 }).toArray();

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const db = req.db;
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: isActive,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'user',
      resourceId: id,
      description: `${isActive ? 'Activated' : 'Deactivated'} user account`,
      details: `User status changed to ${isActive ? 'active' : 'inactive'}`
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'artisan', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    const db = req.db;
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          role: role,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log admin action
    await logAdminAction(db, {
      adminId: decoded.userId,
      action: 'update',
      resource: 'user',
      resourceId: id,
      description: `Changed user role to ${role}`,
      details: `User role updated from previous role to ${role}`
    });

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
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

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Create Stripe payment intent for wallet top-up
 * POST /api/admin/wallet/top-up/create-payment-intent
 */
const createTopUpPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

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
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

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
    const transactionsCollection = db.collection('wallettransactions');
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

// ============================================================================
// PROMOTIONAL ENDPOINTS (ADMIN)
// ============================================================================

/**
 * Get promotional statistics (admin only)
 * Aggregates revenue from promotional features
 */
const getPromotionalStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const db = req.db;
    
    // Calculate date range
    const now = new Date();
    const days = parseInt(period);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Get promotional features
    const promotionalCollection = db.collection('promotional_features');
    const features = await promotionalCollection.find({
      createdAt: { $gte: startDate }
    }).toArray();
    
    // Calculate statistics
    const stats = features.reduce((acc, feature) => {
      const isActive = feature.status === 'active' && new Date(feature.endDate) > now;
      
      return {
        totalRevenue: acc.totalRevenue + (feature.cost || 0),
        activePromotions: acc.activePromotions + (isActive ? 1 : 0),
        totalPromotions: acc.totalPromotions + 1
      };
    }, {
      totalRevenue: 0,
      activePromotions: 0,
      totalPromotions: 0
    });
    
    // Group by feature type for revenue breakdown
    const revenueByType = features.reduce((acc, feature) => {
      const type = feature.featureType || 'unknown';
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += feature.cost || 0;
      return acc;
    }, {});
    
    const revenueByFeatureType = Object.entries(revenueByType).map(([type, revenue]) => ({
      type,
      revenue
    }));
    
    res.json({
      success: true,
      data: {
        period: days,
        startDate,
        endDate: now,
        totalPromotionalRevenue: stats.totalRevenue,
        activePromotions: stats.activePromotions,
        totalPromotions: stats.totalPromotions,
        revenueByFeatureType
      }
    });
  } catch (error) {
    console.error('Get promotional stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get promotional stats',
      error: error.message
    });
  }
};

/**
 * Get active promotions (admin only)
 * Returns list of currently active promotional features
 */
const getActivePromotions = async (req, res) => {
  try {
    const db = req.db;
    const now = new Date();
    
    // Get active promotional features with artisan info
    const promotionalCollection = db.collection('promotional_features');
    const activeFeatures = await promotionalCollection.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: now }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          artisanId: 1,
          artisanName: '$artisan.artisanName',
          featureType: 1,
          startDate: 1,
          endDate: 1,
          cost: 1,
          status: 1,
          productId: 1
        }
      },
      {
        $sort: { startDate: -1 }
      }
    ]).toArray();
    
    // Also get active spotlight subscriptions
    const spotlightCollection = db.collection('artisanspotlight');
    const activeSpotlights = await spotlightCollection.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: now }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          artisanId: 1,
          artisanName: '$artisan.artisanName',
          featureType: { $literal: 'artisanspotlight' },
          startDate: 1,
          endDate: 1,
          cost: 1,
          status: 1
        }
      },
      {
        $sort: { startDate: -1 }
      }
    ]).toArray();
    
    // Combine both types
    const allPromotions = [...activeFeatures, ...activeSpotlights];
    
    res.json({
      success: true,
      data: allPromotions,
      count: allPromotions.length,
      pagination: {
        total: allPromotions.length,
        page: 1,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Get active promotions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active promotions',
      error: error.message
    });
  }
};

/**
 * Get platform-wide analytics (admin only)
 * Returns aggregated analytics across the entire platform
 */
const getPlatformAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const db = req.db;
    
    // Calculate date range
    const now = new Date();
    const days = parseInt(period);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Get orders for the period
    const ordersCollection = db.collection('orders');
    const orders = await ordersCollection.find({
      createdAt: { $gte: startDate }
    }).toArray();
    
    // Calculate order statistics
    const completedStatuses = ['completed', 'delivered', 'picked_up'];
    const orderStats = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      if (!acc.byStatus[status]) {
        acc.byStatus[status] = 0;
      }
      acc.byStatus[status]++;
      
      acc.totalRevenue += order.totalAmount || 0;
      acc.totalOrders++;
      
      if (completedStatuses.includes(status)) {
        acc.completedOrders++;
      }
      
      // Track payment methods
      const paymentMethod = order.paymentMethod || 'card';
      if (!acc.paymentMethods[paymentMethod]) {
        acc.paymentMethods[paymentMethod] = 0;
      }
      acc.paymentMethods[paymentMethod]++;
      
      return acc;
    }, {
      byStatus: {},
      paymentMethods: {},
      totalRevenue: 0,
      totalOrders: 0,
      completedOrders: 0
    });
    
    const ordersByStatus = Object.entries(orderStats.byStatus).map(([status, count]) => ({
      status,
      count,
      percentage: orderStats.totalOrders > 0 ? (count / orderStats.totalOrders) * 100 : 0
    }));
    
    const paymentMethodsArray = Object.entries(orderStats.paymentMethods).map(([method, count]) => ({
      method,
      count,
      percentage: orderStats.totalOrders > 0 ? (count / orderStats.totalOrders) * 100 : 0
    }));
    
    // Get user growth
    const usersCollection = db.collection('users');
    const newUsers = await usersCollection.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    // Get all users to calculate growth
    const totalUsers = await usersCollection.countDocuments();
    
    // Get product statistics - aggregate by category
    const productsCollection = db.collection('products');
    
    // Get top products by sales
    const topProducts = await productsCollection.aggregate([
      {
        $match: {
          status: 'active',
          soldCount: { $gt: 0 }
        }
      },
      {
        $sort: { soldCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 1,
          productName: '$name',
          category: 1,
          totalSold: '$soldCount',
          totalRevenue: { $multiply: ['$price', { $ifNull: ['$soldCount', 0] }] }
        }
      }
    ]).toArray();
    
    // Get category performance
    const productSales = await productsCollection.aggregate([
      {
        $match: {
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$category',
          totalSold: { $sum: { $ifNull: ['$soldCount', 0] } },
          totalRevenue: { 
            $sum: { 
              $multiply: ['$price', { $ifNull: ['$soldCount', 0] }] 
            } 
          },
          uniqueProducts: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalSold: 1,
          totalRevenue: 1,
          uniqueProducts: 1
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]).toArray();
    
    // Get artisan statistics  
    const artisansCollection = db.collection('artisans');
    const totalArtisans = await artisansCollection.countDocuments();
    
    // Get top performing artisans
    const artisanPerformance = await ordersCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'delivered', 'picked_up'] }
        }
      },
      {
        $group: {
          _id: '$artisan',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: '_id',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $unwind: { path: '$artisanInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          artisanName: '$artisanInfo.artisanName',
          orderCount: 1,
          totalRevenue: 1,
          avgOrderValue: { $divide: ['$totalRevenue', '$orderCount'] }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();
    
    // User growth trend (simplified for performance)
    const userGrowth = [];
    
    // Daily orders trend (for chart)
    const dailyOrdersMap = {};
    orders.forEach(order => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyOrdersMap[dateStr]) {
        dailyOrdersMap[dateStr] = { date: dateStr, count: 0, revenue: 0 };
      }
      dailyOrdersMap[dateStr].count++;
      dailyOrdersMap[dateStr].revenue += order.totalAmount || 0;
    });
    
    const dailyOrders = Object.values(dailyOrdersMap).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      success: true,
      data: {
        period: days,
        startDate,
        endDate: now,
        orderStats: {
          totalOrders: orderStats.totalOrders,
          totalRevenue: orderStats.totalRevenue,
          averageOrderValue: orderStats.totalOrders > 0 
            ? orderStats.totalRevenue / orderStats.totalOrders 
            : 0,
          completedOrders: orderStats.completedOrders
        },
        orderStatusDistribution: ordersByStatus || [], // Component expects orderStatusDistribution
        topProducts: topProducts || [],
        productSales: productSales || [],
        paymentMethods: paymentMethodsArray || [],
        artisanPerformance: artisanPerformance || [],
        dailyOrders: dailyOrders || [],
        userGrowth: userGrowth || [],
        totalUsers,
        newUsers,
        totalArtisans
      }
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform analytics',
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
router.post('/wallet/process-payouts', async (req, res) => {
  try {
    await processScheduledPayouts();
    res.json({
      success: true,
      message: 'Payout processing completed'
    });
  } catch (error) {
    console.error('Manual payout processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payouts',
      error: error.message
    });
  }
});

// Manual inventory restoration trigger
router.post('/inventory/restore-all', async (req, res) => {
  try {
    const InventoryRestorationService = require('../services/inventoryRestorationService');
    const inventoryService = new InventoryRestorationService(req.db);
    
    const result = await inventoryService.processAllRestorations();
    
    res.json({
      success: true,
      message: 'Inventory restoration completed',
      data: result
    });
  } catch (error) {
    console.error('Manual inventory restoration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process inventory restoration',
      error: error.message
    });
  }
});
router.post('/geocoding', geocodeAddress);
router.get('/revenue', getArtisanRevenue);
router.get('/stats', verifyJWT, verifyAdminRole, getAdminStats);
router.get('/search', enhancedSearch);
router.get('/analytics', verifyJWT, verifyAdminRole, getPlatformAnalytics);

// Admin management routes - Protected with admin middleware
router.get('/products', verifyJWT, verifyAdminRole, getAdminProducts);
router.patch('/products/:id/status', verifyJWT, verifyAdminRole, updateProductStatus);
router.patch('/products/:id/featured', verifyJWT, verifyAdminRole, setFeaturedProduct);
router.delete('/products/:id', verifyJWT, verifyAdminRole, deleteAdminProduct);
router.get('/artisans', verifyJWT, verifyAdminRole, getAdminArtisans);
router.patch('/artisans/:id/status', verifyJWT, verifyAdminRole, updateArtisanStatus);
router.patch('/artisans/:id/verification', verifyJWT, verifyAdminRole, updateArtisanVerification);
router.get('/users', verifyJWT, verifyAdminRole, getAdminUsers);
router.patch('/users/:id/status', verifyJWT, verifyAdminRole, updateUserStatus);
router.patch('/users/:id/role', verifyJWT, verifyAdminRole, updateUserRole);

// Admin promotional routes - Protected with admin middleware
router.get('/promotional/stats', verifyJWT, verifyAdminRole, getPromotionalStats);
router.get('/promotional/active', verifyJWT, verifyAdminRole, getActivePromotions);

// Admin cash flow routes - Protected with admin middleware
router.get('/cash-flow', verifyJWT, verifyAdminRole, cashFlowHandlers.getPlatformCashFlow);

module.exports = router;
