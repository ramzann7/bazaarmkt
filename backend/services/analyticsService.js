/**
 * Analytics Service - Microservices Foundation
 * Handles user behavior tracking, sales analytics, and performance metrics
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class AnalyticsService {
  constructor() {
    this.serviceName = 'analytics-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Analytics Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Analytics Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Analytics Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Analytics Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Analytics Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Analytics Service cache connected');

      this.isInitialized = true;
      console.log('✅ Analytics Service initialized successfully');
    } catch (error) {
      console.error('❌ Analytics Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Track user behavior
   */
  async trackUserBehavior(userId, action, data = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const analyticsCollection = db.collection('user_analytics');
      
      const event = {
        userId: userId,
        action: action,
        data: data,
        timestamp: new Date(),
        userAgent: data.userAgent || null,
        ip: data.ip || null,
        sessionId: data.sessionId || null
      };
      
      await analyticsCollection.insertOne(event);
      await client.close();
      
      return {
        success: true,
        message: 'User behavior tracked successfully'
      };
    } catch (error) {
      console.error('Analytics Service - Track user behavior error:', error);
      throw error;
    }
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(period = '30d') {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }
      
      // Get sales data
      const salesData = await ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'delivered'] }
        }},
        { $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }}
      ]).toArray();
      
      // Get daily sales breakdown
      const dailySales = await ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'delivered'] }
        }},
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailySales: { $sum: '$totalAmount' },
          dailyOrders: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Get top products
      const topProducts = await ordersCollection.aggregate([
        { $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'delivered'] }
        }},
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }},
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        period: period,
        summary: salesData[0] || {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0
        },
        dailySales: dailySales,
        topProducts: topProducts
      };
    } catch (error) {
      console.error('Analytics Service - Sales analytics error:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(period = '30d') {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const usersCollection = db.collection('users');
      const analyticsCollection = db.collection('user_analytics');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      // Get user registration data
      const userStats = await usersCollection.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } }},
        { $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          newUsers: { $sum: 1 }
        }}
      ]).toArray();
      
      // Get user activity
      const userActivity = await analyticsCollection.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } }},
        { $group: {
          _id: '$action',
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        period: period,
        userStats: userStats[0] || { totalUsers: 0, newUsers: 0 },
        userActivity: userActivity
      };
    } catch (error) {
      console.error('Analytics Service - User analytics error:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      
      // Get database stats
      const dbStats = await db.stats();
      
      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        const stats = await db.collection(collection.name).stats();
        collectionStats[collection.name] = {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize
        };
      }
      
      await client.close();
      
      return {
        success: true,
        database: {
          name: dbStats.db,
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes
        },
        collections: collectionStats
      };
    } catch (error) {
      console.error('Analytics Service - Performance metrics error:', error);
      throw error;
    }
  }

  /**
   * Generate reports
   */
  async generateReport(type, period = '30d') {
    try {
      let report;
      
      switch (type) {
        case 'sales':
          report = await this.getSalesAnalytics(period);
          break;
        case 'users':
          report = await this.getUserAnalytics(period);
          break;
        case 'performance':
          report = await this.getPerformanceMetrics();
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      return {
        success: true,
        reportType: type,
        period: period,
        data: report,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Analytics Service - Generate report error:', error);
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
        'POST /api/analytics/track',
        'GET /api/analytics/sales',
        'GET /api/analytics/users',
        'GET /api/analytics/performance',
        'GET /api/analytics/reports'
      ]
    };
  }
}

module.exports = new AnalyticsService();
