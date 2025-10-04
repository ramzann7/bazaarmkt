/**
 * Spotlight Routes
 * Handles spotlight subscription management for artisans
 */

const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// ============================================================================
// SPOTLIGHT ENDPOINTS
// ============================================================================

// Get spotlight status (artisan only)
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
    const db = req.db;
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

// Purchase spotlight subscription (artisan only)
const purchaseSpotlight = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { days, paymentMethod = 'wallet' } = req.body;

    if (!days || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 1 and 365'
      });
    }

    const db = req.db;
    const spotlightCollection = db.collection('artisanspotlight');
    const artisansCollection = db.collection('artisans');
    const walletsCollection = db.collection('wallets');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    // Calculate cost (assuming $15/day)
    const costPerDay = 15;
    const totalCost = days * costPerDay;

    // Check wallet balance if using wallet payment
    if (paymentMethod === 'wallet') {
      const wallet = await walletsCollection.findOne({
        artisanId: artisan._id
      });

      if (!wallet || wallet.balance < totalCost) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }

      // Deduct from wallet
      await walletsCollection.updateOne(
        { artisanId: artisan._id },
        { 
          $inc: { balance: -totalCost },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    // Create or update spotlight subscription
    const spotlightData = {
      userId: new ObjectId(decoded.userId),
      artisanId: artisan._id,
      startDate,
      endDate,
      days,
      cost: totalCost,
      paymentMethod,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if there's an existing active subscription
    const existingSubscription = await spotlightCollection.findOne({
      userId: new ObjectId(decoded.userId),
      status: 'active'
    });

    if (existingSubscription) {
      // Extend existing subscription
      await spotlightCollection.updateOne(
        { _id: existingSubscription._id },
        { 
          $set: {
            endDate,
            days: existingSubscription.days + days,
            cost: existingSubscription.cost + totalCost,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Create new subscription
      await spotlightCollection.insertOne(spotlightData);
    }

    res.json({
      success: true,
      message: `Spotlight activated for ${days} day${days > 1 ? 's' : ''}`,
      data: {
        days,
        cost: totalCost,
        endDate
      }
    });
  } catch (error) {
    console.error('Purchase spotlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase spotlight',
      error: error.message
    });
  }
};

// Extend spotlight subscription
const extendSpotlight = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { days } = req.body;

    if (!days || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 1 and 365'
      });
    }

    const db = req.db;
    const spotlightCollection = db.collection('artisanspotlight');
    const walletsCollection = db.collection('wallets');
    const artisansCollection = db.collection('artisans');

    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    // Find active subscription
    const subscription = await spotlightCollection.findOne({
      userId: new ObjectId(decoded.userId),
      status: 'active'
    });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'No active spotlight subscription found'
      });
    }

    // Calculate cost
    const costPerDay = 15;
    const totalCost = days * costPerDay;

    // Check wallet balance
    const wallet = await walletsCollection.findOne({
      artisanId: artisan._id
    });

    if (!wallet || wallet.balance < totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct from wallet
    await walletsCollection.updateOne(
      { artisanId: artisan._id },
      { 
        $inc: { balance: -totalCost },
        $set: { updatedAt: new Date() }
      }
    );

    // Extend subscription
    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    await spotlightCollection.updateOne(
      { _id: subscription._id },
      { 
        $set: {
          endDate: newEndDate,
          days: subscription.days + days,
          cost: subscription.cost + totalCost,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Spotlight extended by ${days} day${days > 1 ? 's' : ''}`,
      data: {
        days,
        cost: totalCost,
        newEndDate
      }
    });
  } catch (error) {
    console.error('Extend spotlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend spotlight',
      error: error.message
    });
  }
};

// Cancel spotlight subscription
const cancelSpotlight = async (req, res) => {
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
    const spotlightCollection = db.collection('artisanspotlight');

    const result = await spotlightCollection.updateOne(
      { 
        _id: new ObjectId(id),
        userId: new ObjectId(decoded.userId)
      },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spotlight subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Spotlight subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel spotlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel spotlight',
      error: error.message
    });
  }
};

// Get spotlight history
const getSpotlightHistory = async (req, res) => {
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
    const spotlightCollection = db.collection('artisanspotlight');

    const history = await spotlightCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get spotlight history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spotlight history',
      error: error.message
    });
  }
};

// Get active public spotlights
const getActivePublicSpotlights = async (req, res) => {
  try {
    const db = req.db;
    const spotlightCollection = db.collection('artisanspotlight');
    const artisansCollection = db.collection('artisans');

    const activeSpotlights = await spotlightCollection.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisan', 0] }
        }
      },
      {
        $project: {
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
      data: activeSpotlights,
      count: activeSpotlights.length
    });
  } catch (error) {
    console.error('Get active public spotlights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active spotlights',
      error: error.message
    });
  }
};

// Admin: Get all active spotlights
const getAdminActiveSpotlights = async (req, res) => {
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
    const spotlightCollection = db.collection('artisanspotlight');
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');

    const activeSpotlights = await spotlightCollection.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanId',
          foreignField: '_id',
          as: 'artisan'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisan', 0] },
          user: { $arrayElemAt: ['$user', 0] }
        }
      },
      {
        $project: {
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
      data: activeSpotlights,
      count: activeSpotlights.length
    });
  } catch (error) {
    console.error('Get admin active spotlights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin active spotlights',
      error: error.message
    });
  }
};

// Admin: Get spotlight revenue stats
const getSpotlightRevenue = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { period = '30' } = req.query;
    const db = req.db;
    const spotlightCollection = db.collection('artisanspotlight');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));

    const revenueStats = await spotlightCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$cost' },
          totalSubscriptions: { $sum: 1 },
          avgCost: { $avg: '$cost' },
          avgDays: { $avg: '$days' }
        }
      }
    ]).toArray();

    const stats = revenueStats.length > 0 ? revenueStats[0] : {
      totalRevenue: 0,
      totalSubscriptions: 0,
      avgCost: 0,
      avgDays: 0
    };

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        ...stats
      }
    });
  } catch (error) {
    console.error('Get spotlight revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get spotlight revenue',
      error: error.message
    });
  }
};

// Routes
router.get('/status', getSpotlightStatus);
router.post('/purchase', purchaseSpotlight);
router.post('/extend', extendSpotlight);
router.post('/cancel/:id', cancelSpotlight);
router.get('/history', getSpotlightHistory);
router.get('/active-public', getActivePublicSpotlights);
router.get('/admin/active', getAdminActiveSpotlights);
router.get('/admin/revenue', getSpotlightRevenue);

module.exports = router;
