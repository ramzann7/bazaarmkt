const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const Artisan = require('../models/artisan');
const Order = require('../models/order');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

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

module.exports = router;
