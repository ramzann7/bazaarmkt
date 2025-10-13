/**
 * Wallet Routes - Artisan Wallet Management
 * Handles wallet balance, transactions, and payment processing for artisans
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// ============================================================================
// WALLET ENDPOINTS FOR ARTISANS
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
    const db = req.db;
    
    if (!db) {
      console.error('❌ Database connection not available in wallet routes');
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    console.log('💰 Getting wallet balance for user:', decoded.userId);
    
    // Get platform settings for payout configuration
    const PlatformSettingsService = require('../../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    const platformSettings = await platformSettingsService.getPlatformSettings();
    
    // Get user's wallet from wallets collection
    const walletsCollection = db.collection('wallets');
    let wallet = await walletsCollection.findOne({ userId: new ObjectId(decoded.userId) });
    
    // If wallet doesn't exist, create it with platform payout settings
    if (!wallet) {
      console.log('🆕 Creating new wallet for user with platform payout settings');
      
      wallet = {
        userId: new ObjectId(decoded.userId),
        balance: 0,
        currency: platformSettings.currency || 'CAD',
        stripeCustomerId: null,
        stripeAccountId: null,
        payoutSettings: {
          enabled: false,
          method: 'bank_transfer',
          bankAccount: null,
          schedule: platformSettings.payoutSettings?.payoutFrequency || 'weekly',
          minimumPayout: platformSettings.payoutSettings?.minimumPayoutAmount || 25,
          payoutDelay: platformSettings.payoutSettings?.payoutDelay || 7,
          lastPayoutDate: null,
          nextPayoutDate: null
        },
        metadata: {
          totalEarnings: 0,
          totalSpent: 0,
          totalPayouts: 0,
          platformFees: 0
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await walletsCollection.insertOne(wallet);
      console.log('✅ Wallet created with platform payout settings:', {
        minimumPayout: wallet.payoutSettings.minimumPayout,
        schedule: wallet.payoutSettings.schedule
      });
    }

    // Get recent transaction summary
    const transactionsCollection = db.collection('wallettransactions');
    const recentTransactions = await transactionsCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Calculate wallet statistics
    const totalEarnings = await transactionsCollection.aggregate([
      { $match: { userId: new ObjectId(decoded.userId), type: { $in: ['order_revenue', 'order_completion', 'revenue'] }, amount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const totalWithdrawals = await transactionsCollection.aggregate([
      { $match: { userId: new ObjectId(decoded.userId), amount: { $lt: 0 } } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
    ]).toArray();

    res.json({
      success: true,
      data: {
        balance: wallet.balance || 0,
        currency: wallet.currency || 'CAD',
        stripeCustomerId: wallet.stripeCustomerId,
        stripeAccountId: wallet.stripeAccountId,
        payoutSettings: wallet.payoutSettings,
        lastUpdated: wallet.updatedAt || wallet.createdAt,
        statistics: {
          totalEarnings: totalEarnings[0]?.total || 0,
          totalWithdrawals: totalWithdrawals[0]?.total || 0,
          transactionCount: await transactionsCollection.countDocuments({ userId: new ObjectId(decoded.userId) })
        },
        recentTransactions: recentTransactions.map(transaction => ({
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('❌ Get wallet balance error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    
    // Handle JWT errors specifically
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get wallet transactions with pagination and filtering
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
    const db = req.db;
    
    const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { userId: new ObjectId(decoded.userId) };
    if (type) query.type = type;
    if (status) query.status = status;
    
    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Get transactions from wallettransactions collection
    const transactionsCollection = db.collection('wallettransactions');
    const transactions = await transactionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Get total count for pagination
    const totalCount = await transactionsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Calculate summary statistics
    const summaryStats = await transactionsCollection.aggregate([
      { $match: { userId: new ObjectId(decoded.userId) } },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
          totalDebits: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } },
          transactionCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = summaryStats[0] || { totalCredits: 0, totalDebits: 0, transactionCount: 0 };
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(transaction => ({
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          metadata: transaction.metadata,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        })),
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total: totalCount,
          limit: parseInt(limit)
        },
        summary: {
          totalCredits: stats.totalCredits,
          totalDebits: stats.totalDebits,
          netAmount: stats.totalCredits - stats.totalDebits,
          transactionCount: stats.transactionCount
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

// Get wallet analytics and insights
const getWalletAnalytics = async (req, res) => {
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
    
    const { period = 'month' } = req.query;
    
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

    const transactionsCollection = db.collection('wallettransactions');
    
    // Get earnings by transaction type
    const earningsByType = await transactionsCollection.aggregate([
      {
        $match: {
          userId: new ObjectId(decoded.userId),
          amount: { $gt: 0 },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          totalEarnings: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get monthly earnings trend
    const monthlyTrend = await transactionsCollection.aggregate([
      {
        $match: {
          userId: new ObjectId(decoded.userId),
          amount: { $gt: 0 },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          earnings: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();

    // Get top earning orders
    const topOrders = await transactionsCollection.aggregate([
      {
        $match: {
          userId: new ObjectId(decoded.userId),
          type: { $in: ['order_revenue', 'order_completion', 'revenue'] },
          amount: { $gt: 0 },
          createdAt: { $gte: startDate }
        }
      },
      { $sort: { amount: -1 } },
      { $limit: 10 }
    ]).toArray();

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        earningsByType,
        monthlyTrend: monthlyTrend.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          earnings: item.earnings,
          transactions: item.transactions
        })),
        topOrders: topOrders.map(order => ({
          id: order._id,
          amount: order.amount,
          description: order.description,
          orderId: order.metadata?.orderId,
          createdAt: order.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get wallet analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet analytics',
      error: error.message
    });
  }
};

// Routes
router.get('/balance', getWalletBalance);
router.get('/transactions', getWalletTransactions);
router.get('/analytics', getWalletAnalytics);

module.exports = router;