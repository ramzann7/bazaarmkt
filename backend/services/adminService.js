/**
 * Admin Service - Microservices Foundation
 * Handles admin operations, statistics, and administrative functions
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class AdminService {
  constructor() {
    this.serviceName = 'admin-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Admin Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Admin Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Admin Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Admin Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Admin Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Admin Service cache connected');

      this.isInitialized = true;
      console.log('✅ Admin Service initialized successfully');
    } catch (error) {
      console.error('❌ Admin Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const usersCollection = db.collection('users');
      const artisansCollection = db.collection('artisans');
      const productsCollection = db.collection('products');
      const ordersCollection = db.collection('orders');
      
      const { 
        startDate,
        endDate
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      // Get basic counts
      const [totalUsers, totalArtisans, totalProducts, totalOrders] = await Promise.all([
        usersCollection.countDocuments({ isActive: true }),
        artisansCollection.countDocuments({ isActive: true }),
        productsCollection.countDocuments({ status: 'active' }),
        ordersCollection.countDocuments()
      ]);
      
      // Get recent activity
      const recentActivityFilter = dateFilter;
      if (Object.keys(recentActivityFilter).length === 0) {
        recentActivityFilter.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      }
      
      const [newUsers, newArtisans, newProducts, newOrders] = await Promise.all([
        usersCollection.countDocuments({ createdAt: recentActivityFilter }),
        artisansCollection.countDocuments({ createdAt: recentActivityFilter }),
        productsCollection.countDocuments({ createdAt: recentActivityFilter }),
        ordersCollection.countDocuments({ createdAt: recentActivityFilter })
      ]);
      
      // Get revenue stats
      const revenueStats = await ordersCollection.aggregate([
        { $match: { status: { $in: ['completed', 'delivered'] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            totalOrders: { $sum: 1 }
          }
        }
      ]).toArray();
      
      // Get user growth over time
      const userGrowth = await usersCollection.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]).toArray();
      
      await client.close();
      
      const revenue = revenueStats[0] || {
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0
      };
      
      return {
        success: true,
        stats: {
          overview: {
            totalUsers,
            totalArtisans,
            totalProducts,
            totalOrders
          },
          recent: {
            newUsers,
            newArtisans,
            newProducts,
            newOrders
          },
          revenue: {
            totalRevenue: revenue.totalRevenue,
            averageOrderValue: revenue.averageOrderValue,
            totalOrders: revenue.totalOrders,
            platformFee: revenue.totalRevenue * 0.1 // 10% platform fee
          },
          growth: userGrowth,
          period: {
            startDate: startDate,
            endDate: endDate
          }
        }
      };
    } catch (error) {
      console.error('Admin Service - Get admin stats error:', error);
      throw error;
    }
  }

  /**
   * Get all users with admin details
   */
  async getAllUsers(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const usersCollection = db.collection('users');
      
      const { 
        page = 1, 
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        role,
        isActive
      } = options;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [users, totalCount] = await Promise.all([
        usersCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        usersCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        users: users,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Admin Service - Get all users error:', error);
      throw error;
    }
  }

  /**
   * Get all products with admin details
   */
  async getAllProducts(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const { 
        page = 1, 
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        category
      } = options;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      if (status) query.status = status;
      if (category) query.category = category;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [products, totalCount] = await Promise.all([
        productsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        productsCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        products: products,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Admin Service - Get all products error:', error);
      throw error;
    }
  }

  /**
   * Get all artisans with admin details
   */
  async getAllArtisans(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const { 
        page = 1, 
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        verified,
        isActive
      } = options;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      if (verified !== undefined) query.verified = verified;
      if (isActive !== undefined) query.isActive = isActive;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [artisans, totalCount] = await Promise.all([
        artisansCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        artisansCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        artisans: artisans,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Admin Service - Get all artisans error:', error);
      throw error;
    }
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(userId, isActive) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const usersCollection = db.collection('users');
      
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            isActive: isActive,
            updatedAt: new Date()
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return {
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Admin Service - Update user status error:', error);
      throw error;
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(productId, status) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { 
          $set: { 
            status: status,
            updatedAt: new Date()
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: `Product status updated to ${status} successfully`
      };
    } catch (error) {
      console.error('Admin Service - Update product status error:', error);
      throw error;
    }
  }

  /**
   * Verify artisan
   */
  async verifyArtisan(artisanId, verified = true) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const result = await artisansCollection.updateOne(
        { _id: new ObjectId(artisanId) },
        { 
          $set: { 
            verified: verified,
            verificationDate: new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        message: `Artisan ${verified ? 'verified' : 'unverified'} successfully`
      };
    } catch (error) {
      console.error('Admin Service - Verify artisan error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        status: 'healthy',
        version: this.version,
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'GET /api/admin/stats',
        'GET /api/admin/users',
        'GET /api/admin/products',
        'GET /api/admin/artisans',
        'PUT /api/admin/users/:id/status',
        'PUT /api/admin/products/:id/status',
        'PUT /api/admin/artisans/:id/verify'
      ]
    };
  }
}

module.exports = new AdminService();
