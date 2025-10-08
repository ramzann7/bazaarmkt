/**
 * Promotional Service - Microservices Foundation
 * Handles promotional campaigns, featured products, and marketing features
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class PromotionalService {
  constructor() {
    this.serviceName = 'promotional-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Promotional Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Promotional Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Promotional Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Promotional Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Promotional Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Promotional Service cache connected');

      this.isInitialized = true;
      console.log('✅ Promotional Service initialized successfully');
    } catch (error) {
      console.error('❌ Promotional Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const { 
        page = 1, 
        limit = 10, 
        category,
        location
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { 
        status: 'active',
        featured: true
      };
      
      if (category) query.category = category;
      if (location) query.location = { $regex: location, $options: 'i' };
      
      const [products, totalCount] = await Promise.all([
        productsCollection.find(query)
          .sort({ featuredPriority: -1, createdAt: -1 })
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
      console.error('Promotional Service - Get featured products error:', error);
      throw error;
    }
  }

  /**
   * Get sponsored products
   */
  async getSponsoredProducts(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const { 
        page = 1, 
        limit = 10, 
        category,
        location
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { 
        status: 'active',
        sponsored: true,
        sponsorshipEndDate: { $gt: new Date() }
      };
      
      if (category) query.category = category;
      if (location) query.location = { $regex: location, $options: 'i' };
      
      const [products, totalCount] = await Promise.all([
        productsCollection.find(query)
          .sort({ sponsorshipPriority: -1, createdAt: -1 })
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
      console.error('Promotional Service - Get sponsored products error:', error);
      throw error;
    }
  }

  /**
   * Get promotional pricing
   */
  async getPromotionalPricing(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      
      const { 
        page = 1, 
        limit = 20,
        category,
        active = true
      } = options;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      if (active) {
        query.status = 'active';
        query.startDate = { $lte: new Date() };
        query.endDate = { $gte: new Date() };
      }
      
      if (category) query.category = category;
      
      const [promotions, totalCount] = await Promise.all([
        promotionsCollection.find(query)
          .sort({ priority: -1, startDate: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        promotionsCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        promotions: promotions,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Promotional Service - Get promotional pricing error:', error);
      throw error;
    }
  }

  /**
   * Create a promotion
   */
  async createPromotion(promotionData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      
      const promotion = {
        ...promotionData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };
      
      const result = await promotionsCollection.insertOne(promotion);
      await client.close();
      
      return {
        success: true,
        promotionId: result.insertedId,
        message: 'Promotion created successfully'
      };
    } catch (error) {
      console.error('Promotional Service - Create promotion error:', error);
      throw error;
    }
  }

  /**
   * Update a promotion
   */
  async updatePromotion(promotionId, updateData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      
      const update = {
        ...updateData,
        updatedAt: new Date()
      };
      
      const result = await promotionsCollection.updateOne(
        { _id: new ObjectId(promotionId) },
        { $set: update }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Promotion not found');
      }
      
      return {
        success: true,
        message: 'Promotion updated successfully'
      };
    } catch (error) {
      console.error('Promotional Service - Update promotion error:', error);
      throw error;
    }
  }

  /**
   * Delete a promotion
   */
  async deletePromotion(promotionId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      
      const result = await promotionsCollection.updateOne(
        { _id: new ObjectId(promotionId) },
        { $set: { status: 'deleted', deletedAt: new Date() } }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Promotion not found');
      }
      
      return {
        success: true,
        message: 'Promotion deleted successfully'
      };
    } catch (error) {
      console.error('Promotional Service - Delete promotion error:', error);
      throw error;
    }
  }

  /**
   * Get promotion by ID
   */
  async getPromotionById(promotionId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      
      const promotion = await promotionsCollection.findOne({
        _id: new ObjectId(promotionId),
        status: { $ne: 'deleted' }
      });
      
      await client.close();
      
      if (!promotion) {
        throw new Error('Promotion not found');
      }
      
      return {
        success: true,
        promotion: promotion
      };
    } catch (error) {
      console.error('Promotional Service - Get promotion by ID error:', error);
      throw error;
    }
  }

  /**
   * Apply promotion to product
   */
  async applyPromotionToProduct(productId, promotionId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      const promotionsCollection = db.collection('promotions');
      
      // Get promotion details
      const promotion = await promotionsCollection.findOne({
        _id: new ObjectId(promotionId),
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      
      if (!promotion) {
        throw new Error('Promotion not found or not active');
      }
      
      // Apply promotion to product
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { 
          $set: { 
            promotionId: new ObjectId(promotionId),
            promotionalPrice: promotion.discountType === 'percentage' 
              ? { $multiply: ['$price', (100 - promotion.discountValue) / 100] }
              : { $subtract: ['$price', promotion.discountValue] },
            promotionAppliedAt: new Date()
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: 'Promotion applied to product successfully'
      };
    } catch (error) {
      console.error('Promotional Service - Apply promotion to product error:', error);
      throw error;
    }
  }

  /**
   * Remove promotion from product
   */
  async removePromotionFromProduct(productId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { 
          $unset: { 
            promotionId: '',
            promotionalPrice: '',
            promotionAppliedAt: ''
          }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: 'Promotion removed from product successfully'
      };
    } catch (error) {
      console.error('Promotional Service - Remove promotion from product error:', error);
      throw error;
    }
  }

  /**
   * Get promotional statistics
   */
  async getPromotionalStats() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const promotionsCollection = db.collection('promotions');
      const productsCollection = db.collection('products');
      
      const [promotionsStats, featuredProducts, sponsoredProducts] = await Promise.all([
        promotionsCollection.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]).toArray(),
        
        productsCollection.countDocuments({ featured: true, status: 'active' }),
        
        productsCollection.countDocuments({ 
          sponsored: true, 
          status: 'active',
          sponsorshipEndDate: { $gt: new Date() }
        })
      ]);
      
      await client.close();
      
      return {
        success: true,
        stats: {
          promotions: promotionsStats,
          featuredProducts: featuredProducts,
          sponsoredProducts: sponsoredProducts,
          totalPromotions: promotionsStats.reduce((sum, stat) => sum + stat.count, 0)
        }
      };
    } catch (error) {
      console.error('Promotional Service - Get promotional stats error:', error);
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
        'GET /api/promotional/products/featured',
        'GET /api/promotional/products/sponsored',
        'GET /api/promotional/pricing',
        'POST /api/promotional/promotions',
        'PUT /api/promotional/promotions/:id',
        'DELETE /api/promotional/promotions/:id',
        'GET /api/promotional/promotions/:id',
        'POST /api/promotional/products/:productId/apply',
        'DELETE /api/promotional/products/:productId/remove',
        'GET /api/promotional/stats'
      ]
    };
  }
}

module.exports = new PromotionalService();
