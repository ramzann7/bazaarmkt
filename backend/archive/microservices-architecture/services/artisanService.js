/**
 * Artisan Service - Microservices Foundation
 * Handles artisan management, profiles, and artisan-related operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class ArtisanService {
  constructor() {
    this.serviceName = 'artisan-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Artisan Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Artisan Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Artisan Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Artisan Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Artisan Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Artisan Service cache connected');

      this.isInitialized = true;
      console.log('✅ Artisan Service initialized successfully');
    } catch (error) {
      console.error('❌ Artisan Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all artisans
   */
  async getArtisans(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        category,
        location,
        verified
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { isActive: true };
      
      if (category) query.category = category;
      if (location) query.location = { $regex: location, $options: 'i' };
      if (verified !== undefined) query.verified = verified;
      
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
      console.error('Artisan Service - Get artisans error:', error);
      throw error;
    }
  }

  /**
   * Create a new artisan profile
   */
  async createArtisan(artisanData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const artisan = {
        ...artisanData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        verified: false,
        rating: 0,
        totalSales: 0,
        totalOrders: 0
      };
      
      const result = await artisansCollection.insertOne(artisan);
      await client.close();
      
      return {
        success: true,
        artisanId: result.insertedId,
        message: 'Artisan profile created successfully'
      };
    } catch (error) {
      console.error('Artisan Service - Create artisan error:', error);
      throw error;
    }
  }

  /**
   * Get artisan by ID
   */
  async getArtisanById(artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const artisan = await artisansCollection.findOne({
        _id: new ObjectId(artisanId),
        isActive: true
      });
      
      await client.close();
      
      if (!artisan) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        artisan: artisan
      };
    } catch (error) {
      console.error('Artisan Service - Get artisan by ID error:', error);
      throw error;
    }
  }

  /**
   * Update artisan profile
   */
  async updateArtisan(artisanId, updateData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const update = {
        ...updateData,
        updatedAt: new Date()
      };
      
      const result = await artisansCollection.updateOne(
        { _id: new ObjectId(artisanId), isActive: true },
        { $set: update }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        message: 'Artisan profile updated successfully'
      };
    } catch (error) {
      console.error('Artisan Service - Update artisan error:', error);
      throw error;
    }
  }

  /**
   * Delete artisan profile
   */
  async deleteArtisan(artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const result = await artisansCollection.updateOne(
        { _id: new ObjectId(artisanId) },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        message: 'Artisan profile deleted successfully'
      };
    } catch (error) {
      console.error('Artisan Service - Delete artisan error:', error);
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
        { _id: new ObjectId(artisanId), isActive: true },
        { $set: { verified: verified, verificationDate: new Date() } }
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
      console.error('Artisan Service - Verify artisan error:', error);
      throw error;
    }
  }

  /**
   * Update artisan statistics
   */
  async updateArtisanStats(artisanId, stats) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const updateFields = {};
      if (stats.rating !== undefined) updateFields.rating = stats.rating;
      if (stats.totalSales !== undefined) updateFields.totalSales = stats.totalSales;
      if (stats.totalOrders !== undefined) updateFields.totalOrders = stats.totalOrders;
      
      updateFields.updatedAt = new Date();
      
      const result = await artisansCollection.updateOne(
        { _id: new ObjectId(artisanId), isActive: true },
        { $set: updateFields }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        message: 'Artisan statistics updated successfully'
      };
    } catch (error) {
      console.error('Artisan Service - Update artisan stats error:', error);
      throw error;
    }
  }

  /**
   * Get artisan statistics
   */
  async getArtisanStats(artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      const productsCollection = db.collection('products');
      const ordersCollection = db.collection('orders');
      
      const [artisan, products, orders] = await Promise.all([
        artisansCollection.findOne({
          _id: new ObjectId(artisanId),
          isActive: true
        }),
        productsCollection.countDocuments({
          artisan: new ObjectId(artisanId),
          status: 'active'
        }),
        ordersCollection.countDocuments({
          'items.artisanId': new ObjectId(artisanId),
          status: { $in: ['completed', 'delivered'] }
        })
      ]);
      
      await client.close();
      
      if (!artisan) {
        throw new Error('Artisan not found');
      }
      
      return {
        success: true,
        stats: {
          artisanId: artisan._id,
          artisanName: artisan.artisanName,
          businessName: artisan.businessName,
          rating: artisan.rating || 0,
          totalSales: artisan.totalSales || 0,
          totalOrders: artisan.totalOrders || 0,
          activeProducts: products,
          completedOrders: orders,
          verified: artisan.verified || false,
          joinDate: artisan.createdAt
        }
      };
    } catch (error) {
      console.error('Artisan Service - Get artisan stats error:', error);
      throw error;
    }
  }

  /**
   * Search artisans
   */
  async searchArtisans(searchQuery, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const artisansCollection = db.collection('artisans');
      
      const { 
        page = 1, 
        limit = 20, 
        category,
        location,
        verified
      } = options;
      
      const skip = (page - 1) * limit;
      
      const query = {
        isActive: true,
        $or: [
          { artisanName: { $regex: searchQuery, $options: 'i' } },
          { businessName: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { location: { $regex: searchQuery, $options: 'i' } }
        ]
      };
      
      if (category) query.category = category;
      if (location) query.location = { $regex: location, $options: 'i' };
      if (verified !== undefined) query.verified = verified;
      
      const [artisans, totalCount] = await Promise.all([
        artisansCollection.find(query)
          .sort({ rating: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        artisansCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        artisans: artisans,
        searchQuery: searchQuery,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Artisan Service - Search artisans error:', error);
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
        'GET /api/artisans',
        'POST /api/artisans',
        'GET /api/artisans/:id',
        'PUT /api/artisans/:id',
        'DELETE /api/artisans/:id',
        'PUT /api/artisans/:id/verify',
        'PUT /api/artisans/:id/stats',
        'GET /api/artisans/:id/stats',
        'GET /api/artisans/search'
      ]
    };
  }
}

module.exports = new ArtisanService();
