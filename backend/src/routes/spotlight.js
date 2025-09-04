const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ArtisanSpotlight = require('../models/artisanSpotlight');
const Artisan = require('../models/artisan');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const RevenueService = require('../services/revenueService');

// Get current spotlight status for artisan
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const spotlight = await ArtisanSpotlight.getArtisanSpotlight(artisan._id);
    
    if (spotlight) {
      return res.json({
        hasActiveSpotlight: true,
        spotlight: {
          id: spotlight._id,
          startDate: spotlight.startDate,
          endDate: spotlight.endDate,
          remainingDays: spotlight.remainingDays,
          amount: spotlight.amount,
          status: spotlight.status
        }
      });
    }

    res.json({ hasActiveSpotlight: false });
  } catch (error) {
    console.error('Error getting spotlight status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Purchase spotlight
router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Spotlight Purchase Request:', {
      body: req.body,
      user: req.user ? { id: req.user._id, email: req.user.email } : 'No user'
    });
    
    const { days, paymentMethod } = req.body;
    
    if (!days || days < 1 || days > 30) {
      console.log('❌ Invalid days:', days);
      return res.status(400).json({ message: 'Days must be between 1 and 30' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    console.log('🔍 Artisan lookup result:', artisan ? { id: artisan._id, name: artisan.artisanName } : 'No artisan found');
    
    if (!artisan) {
      console.log('❌ No artisan profile found for user:', req.user._id);
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Check if artisan already has active spotlight
    const existingSpotlight = await ArtisanSpotlight.getArtisanSpotlight(artisan._id);
    console.log('🔍 Existing spotlight check:', existingSpotlight ? { id: existingSpotlight._id, endDate: existingSpotlight.endDate } : 'No existing spotlight');
    
    if (existingSpotlight) {
      console.log('❌ Artisan already has active spotlight');
      return res.status(400).json({ 
        message: 'You already have an active spotlight subscription',
        existingSpotlight: {
          endDate: existingSpotlight.endDate,
          remainingDays: existingSpotlight.remainingDays
        }
      });
    }

    const amount = days * 10; // $10 per day
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    // Generate payment ID (in real implementation, this would be from payment processor)
    const paymentId = `spotlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create spotlight subscription
    const spotlight = new ArtisanSpotlight({
      artisan: artisan._id,
      user: req.user._id,
      startDate,
      endDate,
      amount,
      paymentId,
      paymentMethod: paymentMethod || 'card'
    });

    console.log('🔍 Creating spotlight subscription:', {
      artisan: artisan._id,
      user: req.user._id,
      amount,
      days,
      startDate,
      endDate
    });

    await spotlight.save();
    console.log('✅ Spotlight subscription created:', spotlight._id);

    // Record revenue
    console.log('🔍 Recording revenue for spotlight:', spotlight._id);
    await RevenueService.addSpotlightRevenue(amount, spotlight._id);
    console.log('✅ Revenue recorded successfully');

    res.json({
      message: 'Spotlight subscription activated successfully',
      spotlight: {
        id: spotlight._id,
        startDate: spotlight.startDate,
        endDate: spotlight.endDate,
        days,
        amount,
        paymentId
      }
    });
  } catch (error) {
    console.error('❌ Error purchasing spotlight:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Extend existing spotlight
router.post('/extend', authMiddleware, async (req, res) => {
  try {
    const { days } = req.body;
    
    if (!days || days < 1 || days > 30) {
      return res.status(400).json({ message: 'Days must be between 1 and 30' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const existingSpotlight = await ArtisanSpotlight.getArtisanSpotlight(artisan._id);
    if (!existingSpotlight) {
      return res.status(400).json({ message: 'No active spotlight subscription found' });
    }

    const additionalAmount = days * 10;
    const newEndDate = new Date(existingSpotlight.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    // Update existing spotlight
    existingSpotlight.endDate = newEndDate;
    existingSpotlight.amount += additionalAmount;
    existingSpotlight.updatedAt = new Date();

    await existingSpotlight.save();

    // Record additional revenue for extension
    await RevenueService.addSpotlightRevenue(additionalAmount, existingSpotlight._id);

    res.json({
      message: 'Spotlight subscription extended successfully',
      spotlight: {
        id: existingSpotlight._id,
        startDate: existingSpotlight.startDate,
        endDate: existingSpotlight.endDate,
        remainingDays: existingSpotlight.remainingDays,
        totalAmount: existingSpotlight.amount
      }
    });
  } catch (error) {
    console.error('Error extending spotlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel spotlight (admin only or if not started yet)
router.post('/cancel/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const spotlight = await ArtisanSpotlight.findById(id);
    if (!spotlight) {
      return res.status(404).json({ message: 'Spotlight subscription not found' });
    }

    // Check if user owns this spotlight or is admin
    if (spotlight.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this subscription' });
    }

    // Only allow cancellation if it hasn't started yet or just started
    const now = new Date();
    const timeDiff = now - spotlight.startDate;
    const hoursSinceStart = timeDiff / (1000 * 60 * 60);

    if (hoursSinceStart > 24) {
      return res.status(400).json({ 
        message: 'Cannot cancel spotlight subscription after 24 hours of activation' 
      });
    }

    spotlight.status = 'cancelled';
    spotlight.updatedAt = new Date();
    await spotlight.save();

    res.json({ message: 'Spotlight subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling spotlight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get spotlight history for artisan
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const spotlights = await ArtisanSpotlight.find({ artisan: artisan._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      spotlights: spotlights.map(spotlight => ({
        id: spotlight._id,
        startDate: spotlight.startDate,
        endDate: spotlight.endDate,
        amount: spotlight.amount,
        status: spotlight.status,
        paymentId: spotlight.paymentId,
        createdAt: spotlight.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting spotlight history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public route - Get all active spotlights (for display purposes)
router.get('/active', async (req, res) => {
  try {
    // Check if we can connect to the database
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        spotlights: []
      });
    }
    
    const activeSpotlights = await ArtisanSpotlight.getActiveSpotlights();
    
    res.json({
      spotlights: activeSpotlights.map(spotlight => ({
        id: spotlight._id,
        artisan: {
          id: spotlight.artisan._id,
          name: spotlight.artisan.businessName || `${spotlight.artisan.firstName} ${spotlight.artisan.lastName}`,
          location: spotlight.artisan.location
        },
        startDate: spotlight.startDate,
        endDate: spotlight.endDate,
        remainingDays: spotlight.remainingDays,
        amount: spotlight.amount,
        status: spotlight.status
      }))
    });
  } catch (error) {
    console.error('Error getting active spotlights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route - Get all active spotlights
router.get('/admin/active', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const activeSpotlights = await ArtisanSpotlight.getActiveSpotlights();
    
    res.json({
      spotlights: activeSpotlights.map(spotlight => ({
        id: spotlight._id,
        artisan: {
          id: spotlight.artisan._id,
          name: spotlight.artisan.businessName || `${spotlight.artisan.firstName} ${spotlight.artisan.lastName}`,
          location: spotlight.artisan.location
        },
        user: {
          id: spotlight.user._id,
          name: `${spotlight.user.firstName} ${spotlight.user.lastName}`,
          email: spotlight.user.email
        },
        startDate: spotlight.startDate,
        endDate: spotlight.endDate,
        remainingDays: spotlight.remainingDays,
        amount: spotlight.amount,
        status: spotlight.status
      }))
    });
  } catch (error) {
    console.error('Error getting active spotlights:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin route - Get spotlight revenue stats
router.get('/admin/revenue', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get revenue stats
    const revenueStats = await ArtisanSpotlight.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalSubscriptions: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get daily revenue breakdown
    const dailyRevenue = await ArtisanSpotlight.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          subscriptions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      period: `${days} days`,
      stats: revenueStats[0] || {
        totalRevenue: 0,
        totalSubscriptions: 0,
        averageAmount: 0
      },
      dailyRevenue
    });
  } catch (error) {
    console.error('Error getting spotlight revenue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
