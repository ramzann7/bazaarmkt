/**
 * Favorites Service - Microservices Foundation
 * Handles favorites management and user preferences
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class FavoritesService {
  constructor() {
    this.serviceName = 'favorites-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Favorites Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Favorites Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Favorites Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Favorites Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Favorites Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Favorites Service cache connected');

      this.isInitialized = true;
      console.log('✅ Favorites Service initialized successfully');
    } catch (error) {
      console.error('❌ Favorites Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add product to favorites
   */
  async addToFavorites(userId, productId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      
      // Check if already in favorites
      const existingFavorite = await favoritesCollection.findOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        isActive: true
      });
      
      if (existingFavorite) {
        await client.close();
        return {
          success: true,
          message: 'Product already in favorites',
          isNew: false
        };
      }
      
      const favorite = {
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        createdAt: new Date(),
        isActive: true
      };
      
      const result = await favoritesCollection.insertOne(favorite);
      await client.close();
      
      return {
        success: true,
        favoriteId: result.insertedId,
        message: 'Product added to favorites',
        isNew: true
      };
    } catch (error) {
      console.error('Favorites Service - Add to favorites error:', error);
      throw error;
    }
  }

  /**
   * Remove product from favorites
   */
  async removeFromFavorites(userId, productId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      
      const result = await favoritesCollection.updateOne(
        {
          userId: new ObjectId(userId),
          productId: new ObjectId(productId),
          isActive: true
        },
        { $set: { isActive: false, removedAt: new Date() } }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Product not found in favorites'
        };
      }
      
      return {
        success: true,
        message: 'Product removed from favorites'
      };
    } catch (error) {
      console.error('Favorites Service - Remove from favorites error:', error);
      throw error;
    }
  }

  /**
   * Get user's favorites
   */
  async getUserFavorites(userId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      const productsCollection = db.collection('products');
      
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get favorites with product details
      const favorites = await favoritesCollection.aggregate([
        { $match: { userId: new ObjectId(userId), isActive: true } },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
            pipeline: [
              { $match: { status: 'active' } },
              {
                $lookup: {
                  from: 'artisans',
                  localField: 'artisan',
                  foreignField: '_id',
                  as: 'artisanInfo',
                  pipeline: [
                    { $project: { 
                      artisanName: 1, 
                      businessName: 1, 
                      businessImage: 1,
                      rating: 1
                    }}
                  ]
                }
              },
              {
                $addFields: {
                  artisan: { $arrayElemAt: ['$artisanInfo', 0] }
                }
              },
              { $unset: ['artisanInfo'] }
            ]
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $match: { product: { $ne: null } }
        }
      ]).toArray();
      
      // Get total count
      const totalCount = await favoritesCollection.countDocuments({
        userId: new ObjectId(userId),
        isActive: true
      });
      
      await client.close();
      
      return {
        success: true,
        favorites: favorites,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Favorites Service - Get user favorites error:', error);
      throw error;
    }
  }

  /**
   * Check if product is in favorites
   */
  async checkFavoriteStatus(userId, productId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      
      const favorite = await favoritesCollection.findOne({
        userId: new ObjectId(userId),
        productId: new ObjectId(productId),
        isActive: true
      });
      
      await client.close();
      
      return {
        success: true,
        isFavorite: !!favorite,
        favoriteId: favorite?._id || null
      };
    } catch (error) {
      console.error('Favorites Service - Check favorite status error:', error);
      throw error;
    }
  }

  /**
   * Get favorites with filters
   */
  async getFavoritesWithFilters(userId, filters = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      
      const { 
        page = 1, 
        limit = 20, 
        category,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;
      
      const skip = (page - 1) * limit;
      
      // Build product match criteria
      const productMatch = { status: 'active' };
      if (category) productMatch.category = category;
      if (minPrice || maxPrice) {
        productMatch.price = {};
        if (minPrice) productMatch.price.$gte = parseFloat(minPrice);
        if (maxPrice) productMatch.price.$lte = parseFloat(maxPrice);
      }
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const favorites = await favoritesCollection.aggregate([
        { $match: { userId: new ObjectId(userId), isActive: true } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
            pipeline: [
              { $match: productMatch },
              {
                $lookup: {
                  from: 'artisans',
                  localField: 'artisan',
                  foreignField: '_id',
                  as: 'artisanInfo',
                  pipeline: [
                    { $project: { 
                      artisanName: 1, 
                      businessName: 1, 
                      businessImage: 1,
                      rating: 1
                    }}
                  ]
                }
              },
              {
                $addFields: {
                  artisan: { $arrayElemAt: ['$artisanInfo', 0] }
                }
              },
              { $unset: ['artisanInfo'] }
            ]
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $match: { product: { $ne: null } }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        favorites: favorites,
        filters: filters,
        pagination: {
          page: page,
          limit: limit,
          total: favorites.length,
          pages: Math.ceil(favorites.length / limit)
        }
      };
    } catch (error) {
      console.error('Favorites Service - Get favorites with filters error:', error);
      throw error;
    }
  }

  /**
   * Get favorites statistics
   */
  async getFavoritesStats(userId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const favoritesCollection = db.collection('favorites');
      
      const stats = await favoritesCollection.aggregate([
        { $match: { userId: new ObjectId(userId), isActive: true } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: null,
            totalFavorites: { $sum: 1 },
            categories: { $addToSet: '$product.category' },
            averagePrice: { $avg: '$product.price' }
          }
        }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        stats: stats[0] || {
          totalFavorites: 0,
          categories: [],
          averagePrice: 0
        }
      };
    } catch (error) {
      console.error('Favorites Service - Get favorites stats error:', error);
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
        'POST /api/favorites',
        'DELETE /api/favorites/:productId',
        'GET /api/favorites',
        'GET /api/favorites/status/:productId',
        'GET /api/favorites/filtered',
        'GET /api/favorites/stats'
      ]
    };
  }
}

module.exports = new FavoritesService();
