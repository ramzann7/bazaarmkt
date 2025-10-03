/**
 * Spotlight Service - Microservices Foundation
 * Handles spotlight subscriptions, promotional visibility, and premium features
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class SpotlightService {
  constructor() {
    this.serviceName = 'spotlight-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Spotlight Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Spotlight Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Spotlight Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Spotlight Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Spotlight Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Spotlight Service cache connected');

      this.isInitialized = true;
      console.log('✅ Spotlight Service initialized successfully');
    } catch (error) {
      console.error('❌ Spotlight Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get spotlight status for an artisan
   */
  async getSpotlightStatus(artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      
      const spotlight = await spotlightCollection.findOne({
        artisanId: new ObjectId(artisanId),
        isActive: true,
        endDate: { $gt: new Date() }
      });
      
      await client.close();
      
      const hasActiveSpotlight = !!spotlight;
      const daysRemaining = spotlight ? Math.ceil((spotlight.endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      
      return {
        success: true,
        data: {
          hasActiveSpotlight,
          daysRemaining,
          startDate: spotlight?.startDate || null,
          endDate: spotlight?.endDate || null,
          planType: spotlight?.planType || null,
          price: spotlight?.price || null
        }
      };
    } catch (error) {
      console.error('Spotlight Service - Get spotlight status error:', error);
      throw error;
    }
  }

  /**
   * Purchase spotlight subscription
   */
  async purchaseSpotlight(artisanId, days, paymentMethod = 'card') {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      const paymentsCollection = db.collection('payments');
      
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Calculate pricing (example: $5 per day)
          const pricePerDay = 5;
          const totalPrice = days * pricePerDay;
          
          // Create payment record
          const payment = {
            artisanId: new ObjectId(artisanId),
            type: 'spotlight_purchase',
            amount: totalPrice,
            currency: 'USD',
            paymentMethod: paymentMethod,
            status: 'completed',
            description: `Spotlight subscription for ${days} days`,
            createdAt: new Date(),
            isActive: true
          };
          
          const paymentResult = await paymentsCollection.insertOne(payment, { session });
          
          // Create spotlight subscription
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000));
          
          const spotlight = {
            artisanId: new ObjectId(artisanId),
            paymentId: paymentResult.insertedId,
            planType: 'spotlight',
            startDate: startDate,
            endDate: endDate,
            days: days,
            price: totalPrice,
            status: 'active',
            isActive: true,
            createdAt: new Date()
          };
          
          await spotlightCollection.insertOne(spotlight, { session });
        });
        
        await client.close();
        
        return {
          success: true,
          message: `Spotlight subscription purchased for ${days} days`,
          data: {
            days: days,
            endDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000))
          }
        };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error('Spotlight Service - Purchase spotlight error:', error);
      throw error;
    }
  }

  /**
   * Extend spotlight subscription
   */
  async extendSpotlight(artisanId, additionalDays) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      
      const currentSpotlight = await spotlightCollection.findOne({
        artisanId: new ObjectId(artisanId),
        isActive: true
      });
      
      if (!currentSpotlight) {
        throw new Error('No active spotlight subscription found');
      }
      
      // Extend the end date
      const newEndDate = new Date(currentSpotlight.endDate.getTime() + (additionalDays * 24 * 60 * 60 * 1000));
      
      await spotlightCollection.updateOne(
        { _id: currentSpotlight._id },
        { 
          $set: { 
            endDate: newEndDate,
            days: currentSpotlight.days + additionalDays,
            updatedAt: new Date()
          }
        }
      );
      
      await client.close();
      
      return {
        success: true,
        message: `Spotlight subscription extended by ${additionalDays} days`,
        data: {
          newEndDate: newEndDate,
          totalDays: currentSpotlight.days + additionalDays
        }
      };
    } catch (error) {
      console.error('Spotlight Service - Extend spotlight error:', error);
      throw error;
    }
  }

  /**
   * Cancel spotlight subscription
   */
  async cancelSpotlight(artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      
      const result = await spotlightCollection.updateOne(
        { 
          artisanId: new ObjectId(artisanId),
          isActive: true
        },
        { 
          $set: { 
            isActive: false,
            cancelledAt: new Date(),
            status: 'cancelled'
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('No active spotlight subscription found');
      }
      
      return {
        success: true,
        message: 'Spotlight subscription cancelled successfully'
      };
    } catch (error) {
      console.error('Spotlight Service - Cancel spotlight error:', error);
      throw error;
    }
  }

  /**
   * Get all active spotlight subscriptions
   */
  async getActiveSpotlights(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'endDate',
        sortOrder = 'desc'
      } = options;
      
      const skip = (page - 1) * limit;
      const query = {
        isActive: true,
        endDate: { $gt: new Date() }
      };
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [spotlights, totalCount] = await Promise.all([
        spotlightCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        spotlightCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        spotlights: spotlights,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Spotlight Service - Get active spotlights error:', error);
      throw error;
    }
  }

  /**
   * Get spotlight statistics
   */
  async getSpotlightStats() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const spotlightCollection = db.collection('spotlight_subscriptions');
      
      const stats = await spotlightCollection.aggregate([
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$endDate', new Date()] }] },
                  1,
                  0
                ]
              }
            },
            totalRevenue: { $sum: '$price' },
            averageDuration: { $avg: '$days' }
          }
        }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        stats: stats[0] || {
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          averageDuration: 0
        }
      };
    } catch (error) {
      console.error('Spotlight Service - Get spotlight stats error:', error);
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
        'GET /api/spotlight/status',
        'POST /api/spotlight/purchase',
        'POST /api/spotlight/extend',
        'DELETE /api/spotlight/cancel',
        'GET /api/spotlight/active',
        'GET /api/spotlight/stats'
      ]
    };
  }
}

module.exports = new SpotlightService();
