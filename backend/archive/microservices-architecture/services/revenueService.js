/**
 * Revenue Service - Microservices Foundation
 * Handles revenue tracking, analytics, and financial reporting
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class RevenueService {
  constructor() {
    this.serviceName = 'revenue-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Revenue Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Revenue Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Revenue Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Revenue Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Revenue Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Revenue Service cache connected');

      this.isInitialized = true;
      console.log('✅ Revenue Service initialized successfully');
    } catch (error) {
      console.error('❌ Revenue Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get artisan revenue
   */
  async getArtisanRevenue(artisanId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      const revenueCollection = db.collection('revenue_records');
      
      const { 
        startDate,
        endDate,
        period = 'month' // day, week, month, year
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      const query = {
        'items.artisanId': new ObjectId(artisanId),
        status: { $in: ['completed', 'delivered'] }
      };
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      
      // Get orders and calculate revenue
      const orders = await ordersCollection.find(query).toArray();
      
      let totalRevenue = 0;
      let totalOrders = 0;
      let totalItems = 0;
      
      orders.forEach(order => {
        order.items.forEach(item => {
          if (item.artisanId.toString() === artisanId) {
            totalRevenue += item.price * item.quantity;
            totalItems += item.quantity;
          }
        });
        totalOrders++;
      });
      
      // Calculate platform fee (assuming 10% commission)
      const platformFee = totalRevenue * 0.1;
      const artisanEarnings = totalRevenue - platformFee;
      
      await client.close();
      
      return {
        success: true,
        revenue: {
          artisanId: artisanId,
          totalRevenue: totalRevenue,
          platformFee: platformFee,
          artisanEarnings: artisanEarnings,
          totalOrders: totalOrders,
          totalItems: totalItems,
          period: period,
          startDate: startDate,
          endDate: endDate
        }
      };
    } catch (error) {
      console.error('Revenue Service - Get artisan revenue error:', error);
      throw error;
    }
  }

  /**
   * Get platform revenue
   */
  async getPlatformRevenue(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      
      const { 
        startDate,
        endDate,
        period = 'month'
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      const query = {
        status: { $in: ['completed', 'delivered'] }
      };
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      
      // Calculate platform revenue
      const revenueStats = await ordersCollection.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalItems: { $sum: { $sum: '$items.quantity' } },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]).toArray();
      
      const stats = revenueStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalItems: 0,
        averageOrderValue: 0
      };
      
      // Calculate platform fee (10% commission)
      const platformFee = stats.totalRevenue * 0.1;
      const artisanPayouts = stats.totalRevenue - platformFee;
      
      await client.close();
      
      return {
        success: true,
        revenue: {
          totalRevenue: stats.totalRevenue,
          platformFee: platformFee,
          artisanPayouts: artisanPayouts,
          totalOrders: stats.totalOrders,
          totalItems: stats.totalItems,
          averageOrderValue: stats.averageOrderValue,
          period: period,
          startDate: startDate,
          endDate: endDate
        }
      };
    } catch (error) {
      console.error('Revenue Service - Get platform revenue error:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      
      const { 
        startDate,
        endDate,
        groupBy = 'day' // day, week, month
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      const query = {
        status: { $in: ['completed', 'delivered'] }
      };
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      
      // Group by date
      let dateFormat;
      switch (groupBy) {
        case 'day':
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'week':
          dateFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
          break;
        case 'month':
          dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          break;
        default:
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      }
      
      const analytics = await ordersCollection.aggregate([
        { $match: query },
        {
          $group: {
            _id: dateFormat,
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            items: { $sum: { $sum: '$items.quantity' } },
            platformFee: { $sum: { $multiply: ['$totalAmount', 0.1] } }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        analytics: analytics,
        groupBy: groupBy,
        startDate: startDate,
        endDate: endDate
      };
    } catch (error) {
      console.error('Revenue Service - Get revenue analytics error:', error);
      throw error;
    }
  }

  /**
   * Create revenue record
   */
  async createRevenueRecord(revenueData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const revenueCollection = db.collection('revenue_records');
      
      const revenueRecord = {
        ...revenueData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await revenueCollection.insertOne(revenueRecord);
      await client.close();
      
      return {
        success: true,
        revenueRecordId: result.insertedId,
        message: 'Revenue record created successfully'
      };
    } catch (error) {
      console.error('Revenue Service - Create revenue record error:', error);
      throw error;
    }
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      
      const { 
        startDate,
        endDate
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      const query = {
        status: { $in: ['completed', 'delivered'] }
      };
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      
      const categoryRevenue = await ordersCollection.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.category',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orders: { $sum: 1 },
            items: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        categoryRevenue: categoryRevenue,
        startDate: startDate,
        endDate: endDate
      };
    } catch (error) {
      console.error('Revenue Service - Get revenue by category error:', error);
      throw error;
    }
  }

  /**
   * Get top performing artisans
   */
  async getTopPerformingArtisans(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const ordersCollection = db.collection('orders');
      const artisansCollection = db.collection('artisans');
      
      const { 
        startDate,
        endDate,
        limit = 10
      } = options;
      
      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      
      const query = {
        status: { $in: ['completed', 'delivered'] }
      };
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
      
      const topArtisans = await ordersCollection.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.artisanId',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orders: { $sum: 1 },
            items: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'artisans',
            localField: '_id',
            foreignField: '_id',
            as: 'artisanInfo',
            pipeline: [
              { $project: { artisanName: 1, businessName: 1, businessImage: 1 } }
            ]
          }
        },
        {
          $addFields: {
            artisan: { $arrayElemAt: ['$artisanInfo', 0] }
          }
        },
        { $unset: ['artisanInfo'] }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        topArtisans: topArtisans,
        limit: limit,
        startDate: startDate,
        endDate: endDate
      };
    } catch (error) {
      console.error('Revenue Service - Get top performing artisans error:', error);
      throw error;
    }
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary(options = {}) {
    try {
      const { 
        platformRevenue,
        artisanRevenue,
        categoryRevenue,
        topArtisans
      } = await Promise.all([
        this.getPlatformRevenue(options),
        this.getRevenueAnalytics(options),
        this.getRevenueByCategory(options),
        this.getTopPerformingArtisans({ ...options, limit: 5 })
      ]);
      
      return {
        success: true,
        summary: {
          platform: platformRevenue.revenue,
          analytics: artisanRevenue.analytics,
          categories: categoryRevenue.categoryRevenue,
          topArtisans: topArtisans.topArtisans
        }
      };
    } catch (error) {
      console.error('Revenue Service - Get revenue summary error:', error);
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
        'GET /api/revenue/artisan',
        'GET /api/revenue/platform',
        'GET /api/revenue/analytics',
        'POST /api/revenue/records',
        'GET /api/revenue/categories',
        'GET /api/revenue/top-artisans',
        'GET /api/revenue/summary'
      ]
    };
  }
}

module.exports = new RevenueService();
