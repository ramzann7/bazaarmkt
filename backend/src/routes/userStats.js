const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');
const Order = require('../models/order');
const Artisan = require('../models/artisan');

// Get user statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's orders
    const orders = await Order.find({ userId }).populate('artisanId');
    
    // Calculate statistics
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate average rating from reviews
    const userReviews = await Order.find({ 
      userId, 
      'reviews.rating': { $exists: true } 
    });
    const totalRating = userReviews.reduce((sum, order) => sum + (order.reviews?.rating || 0), 0);
    const averageRating = userReviews.length > 0 ? totalRating / userReviews.length : 0;
    
    // Get favorite artisans count
    const user = await User.findById(userId);
    const favoriteArtisans = user.favoriteArtisans ? user.favoriteArtisans.length : 0;
    
    // Calculate this month's stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = orders.filter(order => 
      new Date(order.createdAt) >= startOfMonth
    ).length;
    const spentThisMonth = orders.filter(order => 
      new Date(order.createdAt) >= startOfMonth
    ).reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Get last order date
    const lastOrder = orders.length > 0 ? 
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : 
      null;
    const lastOrderDate = lastOrder ? lastOrder.createdAt : null;

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalSpent,
        favoriteArtisans,
        averageRating,
        ordersThisMonth,
        spentThisMonth,
        lastOrderDate
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's recent orders
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, page = 1 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const orders = await Order.find({ userId })
      .populate('artisanId')
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments({ userId });
    
    res.json({
      success: true,
      orders: orders,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific order details
router.get('/orders/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    
    const order = await Order.findOne({ _id: orderId, userId })
      .populate('artisanId')
      .populate('items.productId');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's favorite artisans with details
router.get('/favorites/artisans', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).populate('favoriteArtisans');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const favorites = user.favoriteArtisans || [];
    
    res.json({
      success: true,
      favorites: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Error fetching favorite artisans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's order history with filtering
router.get('/orders/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, startDate, endDate, artisanId, page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { userId };
    
    if (status) {
      filter.status = status;
    }
    
    if (artisanId) {
      filter.artisanId = artisanId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    const orders = await Order.find(filter)
      .populate('artisanId')
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.json({
      success: true,
      orders: orders,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
