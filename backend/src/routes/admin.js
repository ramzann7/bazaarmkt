const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const Artisan = require('../models/artisan');
const Order = require('../models/order');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const verifyToken = require('../middleware/authMiddleware');

// Admin middleware to check if user is admin
const requireAdmin = [auth, adminAuth];

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password') // Exclude password
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update user status (admin only)
router.patch('/users/:userId/status', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (userId === adminUser._id.toString()) {
      return res.status(400).json({ message: 'Cannot modify your own status' });
    }

    // Set isActive field, creating it if it doesn't exist
    user.set('isActive', isActive);
    await user.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) ${isActive ? 'activated' : 'deactivated'} user ${user.email} (${user._id}) at ${new Date().toISOString()}`);

    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'} successfully`, user });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Update user role (admin only)
router.patch('/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminUser = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (userId === adminUser._id.toString()) {
      return res.status(400).json({ message: 'Cannot modify your own role' });
    }

    // Validate role
    const validRoles = ['patron', 'artisan', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    user.role = role;
    await user.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) changed role of user ${user.email} (${user._id}) from ${user.role} to ${role} at ${new Date().toISOString()}`);

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Get all products (admin only)
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('artisan', 'artisanName email')
      .sort({ createdAt: -1 });
    
    res.json(products);
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Update product status (admin only)
router.patch('/products/:productId/status', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Set isActive field, creating it if it doesn't exist
    product.set('isActive', isActive);
    await product.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) ${isActive ? 'activated' : 'deactivated'} product ${product.name} (${product._id}) at ${new Date().toISOString()}`);

    res.json({ message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`, product });
  } catch (error) {
    console.error('Admin update product status error:', error);
    res.status(500).json({ message: 'Error updating product status' });
  }
});

// Toggle product featured status (admin only)
router.patch('/products/:productId/featured', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { isFeatured } = req.body;
    const adminUser = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Set isFeatured field, creating it if it doesn't exist
    product.set('isFeatured', isFeatured);
    await product.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) ${isFeatured ? 'featured' : 'unfeatured'} product ${product.name} (${product._id}) at ${new Date().toISOString()}`);

    res.json({ message: `Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`, product });
  } catch (error) {
    console.error('Admin update product featured status error:', error);
    res.status(500).json({ message: 'Error updating product featured status' });
  }
});

// Delete product (admin only)
router.delete('/products/:productId', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const adminUser = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(productId);

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) deleted product ${product.name} (${product._id}) at ${new Date().toISOString()}`);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Get all artisans (admin only)
router.get('/artisans', requireAdmin, async (req, res) => {
  try {
    const artisans = await Artisan.find({})
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(artisans);
  } catch (error) {
    console.error('Admin get artisans error:', error);
    res.status(500).json({ message: 'Error fetching artisans' });
  }
});

// Update artisan status (admin only)
router.patch('/artisans/:artisanId/status', requireAdmin, async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { isActive } = req.body;
    const adminUser = req.user;

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // Set isActive field, creating it if it doesn't exist
    artisan.set('isActive', isActive);
    await artisan.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) ${isActive ? 'activated' : 'deactivated'} artisan ${artisan.artisanName} (${artisan._id}) at ${new Date().toISOString()}`);

    res.json({ message: `Artisan ${isActive ? 'activated' : 'deactivated'} successfully`, artisan });
  } catch (error) {
    console.error('Admin update artisan status error:', error);
    res.status(500).json({ message: 'Error updating artisan status' });
  }
});

// Toggle artisan verification (admin only)
router.patch('/artisans/:artisanId/verification', requireAdmin, async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { isVerified } = req.body;
    const adminUser = req.user;

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // Set isVerified field, creating it if it doesn't exist
    artisan.set('isVerified', isVerified);
    await artisan.save();

    // Log the admin action
    console.log(`[ADMIN ACTION] User ${adminUser.email} (${adminUser._id}) ${isVerified ? 'verified' : 'unverified'} artisan ${artisan.artisanName} (${artisan._id}) at ${new Date().toISOString()}`);

    res.json({ message: `Artisan ${isVerified ? 'verified' : 'unverified'} successfully`, artisan });
  } catch (error) {
    console.error('Admin update artisan verification error:', error);
    res.status(500).json({ message: 'Error updating artisan verification' });
  }
});

// Get comprehensive analytics data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Basic stats
    const basicStats = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Artisan.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments({ isFeatured: true })
    ]);

    // Order analytics
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
            }
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Product sales analytics
    const productSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$productInfo.category',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          productCount: { $addToSet: '$productInfo._id' }
        }
      },
      {
        $project: {
          category: '$_id',
          totalSold: 1,
          totalRevenue: 1,
          uniqueProducts: { $size: '$productCount' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$productInfo._id',
          productName: { $first: '$productInfo.name' },
          category: { $first: '$productInfo.category' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          averagePrice: { $avg: '$items.unitPrice' }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Order status distribution
    const orderStatusDistribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Daily order trends
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Artisan performance
    const artisanPerformance = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $unwind: '$artisanInfo'
      },
      {
        $group: {
          _id: '$artisan',
          artisanName: { $first: '$artisanInfo.firstName' },
          artisanEmail: { $first: '$artisanInfo.email' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Payment method distribution
    const paymentMethods = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentMethod: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      period: days,
      basicStats: {
        totalUsers: basicStats[0],
        totalProducts: basicStats[1],
        totalArtisans: basicStats[2],
        totalOrders: basicStats[3],
        featuredProducts: basicStats[4]
      },
      orderStats: orderStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        cancelledOrders: 0
      },
      productSales,
      topProducts,
      orderStatusDistribution,
      dailyOrders,
      artisanPerformance,
      paymentMethods
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
});

// Get admin dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Artisan.countDocuments(),
      Product.countDocuments({ isFeatured: true }),
      User.countDocuments({ role: 'patron' }),
      User.countDocuments({ role: 'artisan' }),
      User.countDocuments({ role: 'admin' })
    ]);

    res.json({
      totalUsers: stats[0],
      totalProducts: stats[1],
      totalArtisans: stats[2],
      featuredProducts: stats[3],
      patrons: stats[4],
      artisans: stats[5],
      admins: stats[6]
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    res.status(500).json({ message: 'Error fetching admin stats' });
  }
});

// Get financial dashboard data
router.get('/financial-dashboard', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get orders in date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: now },
      status: { $in: ['completed', 'delivered'] }
    }).populate('buyer seller');

    // Calculate financial metrics
    let gmv = 0;
    let platformRevenue = 0;
    let netPayouts = 0;
    const commissionRate = 0.05; // 5%
    const buyerFee = 0.02; // 2%

    orders.forEach(order => {
      const orderTotal = order.totalAmount || 0;
      gmv += orderTotal;
      
      // Platform revenue = commission + buyer fee
      const commission = orderTotal * commissionRate;
      const buyerFeeAmount = orderTotal * buyerFee;
      platformRevenue += commission + buyerFeeAmount;
      
      // Net payouts = order total - platform revenue
      netPayouts += orderTotal - commission - buyerFeeAmount;
    });

    // Get pending balance (orders in processing/shipping status)
    const pendingOrders = await Order.find({
      status: { $in: ['processing', 'shipped'] }
    });
    
    let pendingBalance = 0;
    pendingOrders.forEach(order => {
      const orderTotal = order.totalAmount || 0;
      const commission = orderTotal * commissionRate;
      const buyerFeeAmount = orderTotal * buyerFee;
      pendingBalance += orderTotal - commission - buyerFeeAmount;
    });

    // Get top categories
    const products = await Product.find({
      createdAt: { $gte: startDate, $lte: now }
    });

    const categoryRevenue = {};
    products.forEach(product => {
      const category = product.category;
      if (!categoryRevenue[category]) {
        categoryRevenue[category] = { revenue: 0, orders: 0 };
      }
      // This is simplified - in reality you'd need to calculate actual revenue per product
      categoryRevenue[category].revenue += product.price || 0;
      categoryRevenue[category].orders += 1;
    });

    const topCategories = Object.entries(categoryRevenue)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        orders: data.orders
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Get recent transactions (simplified - in reality this would come from Stripe)
    const recentTransactions = orders.slice(0, 5).map(order => ({
      id: order._id.toString().slice(-6).toUpperCase(),
      artisan: order.seller?.firstName ? `${order.seller.firstName} ${order.seller.lastName}` : 'Unknown Artisan',
      amount: order.totalAmount || 0,
      type: 'payout',
      status: order.status === 'completed' ? 'completed' : 'pending',
      date: order.createdAt.toISOString().split('T')[0]
    }));

    // Calculate additional metrics
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? gmv / totalOrders : 0;
    
    // Get active artisans (artisans with orders in the period)
    const activeArtisanIds = [...new Set(orders.map(order => order.seller?.toString()))];
    const activeArtisans = activeArtisanIds.length;

    // Calculate growth (simplified - would need historical data)
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousOrders = await Order.find({
      createdAt: { $gte: previousPeriodStart, $lt: startDate },
      status: { $in: ['completed', 'delivered'] }
    });
    
    const previousGmv = previousOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const monthlyGrowth = previousGmv > 0 ? ((gmv - previousGmv) / previousGmv) * 100 : 0;

    const dashboardData = {
      gmv,
      platformRevenue,
      netPayouts,
      pendingBalance,
      commissionRate,
      buyerFee,
      totalOrders,
      activeArtisans,
      averageOrderValue,
      monthlyGrowth,
      topCategories,
      recentTransactions
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching financial dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching financial dashboard data' 
    });
  }
});

// Get detailed transaction history
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('buyer seller')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    const transactions = orders.map(order => ({
      id: order._id.toString().slice(-6).toUpperCase(),
      artisan: order.seller?.firstName ? `${order.seller.firstName} ${order.seller.lastName}` : 'Unknown Artisan',
      buyer: order.buyer?.firstName ? `${order.buyer.firstName} ${order.buyer.lastName}` : 'Unknown Buyer',
      amount: order.totalAmount || 0,
      type: 'payout',
      status: order.status,
      date: order.createdAt.toISOString().split('T')[0],
      orderId: order._id
    }));

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching transactions' 
    });
  }
});

// Get payout schedule
router.get('/payouts', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get orders eligible for payout (completed orders not yet paid out)
    const eligibleOrders = await Order.find({
      status: 'completed',
      payoutStatus: { $ne: 'paid' }
    }).populate('seller');

    // Group by artisan
    const artisanPayouts = {};
    eligibleOrders.forEach(order => {
      const artisanId = order.seller?._id.toString();
      if (!artisanPayouts[artisanId]) {
        artisanPayouts[artisanId] = {
          artisan: order.seller,
          totalAmount: 0,
          orderCount: 0,
          orders: []
        };
      }
      
      const orderTotal = order.totalAmount || 0;
      const commission = orderTotal * 0.05; // 5% commission
      const buyerFee = orderTotal * 0.02; // 2% buyer fee
      const payoutAmount = orderTotal - commission - buyerFee;
      
      artisanPayouts[artisanId].totalAmount += payoutAmount;
      artisanPayouts[artisanId].orderCount += 1;
      artisanPayouts[artisanId].orders.push({
        orderId: order._id,
        amount: payoutAmount,
        date: order.createdAt
      });
    });

    const payouts = Object.values(artisanPayouts).map(payout => ({
      artisanId: payout.artisan._id,
      artisanName: payout.artisan.firstName ? `${payout.artisan.firstName} ${payout.artisan.lastName}` : 'Unknown Artisan',
      totalAmount: payout.totalAmount,
      orderCount: payout.orderCount,
      orders: payout.orders,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    }));

    res.json({
      success: true,
      data: payouts
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payouts' 
    });
  }
});

module.exports = router;
