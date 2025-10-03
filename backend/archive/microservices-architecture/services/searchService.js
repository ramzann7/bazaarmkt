/**
 * Search Service - Microservices Foundation
 * Handles advanced search capabilities, filtering, and search analytics
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class SearchService {
  constructor() {
    this.serviceName = 'search-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Search Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Search Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Search Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Search Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Search Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Search Service cache connected');

      this.isInitialized = true;
      console.log('✅ Search Service initialized successfully');
    } catch (error) {
      console.error('❌ Search Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced search with multiple filters
   */
  async enhancedSearch(query, filters = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      // Build search query
      const searchQuery = { status: 'active' };
      
      // Text search
      if (query) {
        searchQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ];
      }
      
      // Category filter
      if (filters.category) {
        searchQuery.category = filters.category;
      }
      
      // Subcategory filter
      if (filters.subcategory) {
        searchQuery.subcategory = filters.subcategory;
      }
      
      // Price range filter
      if (filters.minPrice || filters.maxPrice) {
        searchQuery.price = {};
        if (filters.minPrice) searchQuery.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) searchQuery.price.$lte = parseFloat(filters.maxPrice);
      }
      
      // Location filter
      if (filters.location) {
        searchQuery['artisan.address.city'] = { $regex: filters.location, $options: 'i' };
      }
      
      // Rating filter
      if (filters.minRating) {
        searchQuery.rating = { $gte: parseFloat(filters.minRating) };
      }
      
      // Availability filter
      if (filters.available) {
        searchQuery.stock = { $gt: 0 };
      }
      
      // Sort options
      let sortOptions = { createdAt: -1 };
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_asc':
            sortOptions = { price: 1 };
            break;
          case 'price_desc':
            sortOptions = { price: -1 };
            break;
          case 'rating':
            sortOptions = { rating: -1 };
            break;
          case 'newest':
            sortOptions = { createdAt: -1 };
            break;
          case 'oldest':
            sortOptions = { createdAt: 1 };
            break;
        }
      }
      
      // Execute search with pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      const products = await productsCollection.aggregate([
        { $match: searchQuery },
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: limit },
        {
          $addFields: {
            artisanObjectId: { $toObjectId: '$artisan' }
          }
        },
        {
          $lookup: {
            from: 'artisans',
            localField: 'artisanObjectId',
            foreignField: '_id',
            as: 'artisanInfo',
            pipeline: [
              { $project: { 
                artisanName: 1, 
                businessName: 1, 
                type: 1, 
                address: 1, 
                deliveryOptions: 1, 
                pickupLocation: 1,
                pickupInstructions: 1,
                pickupHours: 1,
                deliveryInstructions: 1,
                rating: 1,
                businessImage: 1
              }}
            ]
          }
        },
        {
          $addFields: {
            artisan: { $arrayElemAt: ['$artisanInfo', 0] }
          }
        },
        { $unset: ['artisanInfo', 'artisanObjectId'] }
      ]).toArray();
      
      // Get total count for pagination
      const totalCount = await productsCollection.countDocuments(searchQuery);
      
      await client.close();
      
      return {
        success: true,
        products: products,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters: filters,
        query: query
      };
    } catch (error) {
      console.error('Search Service - Enhanced search error:', error);
      throw error;
    }
  }

  /**
   * Popular products search
   */
  async getPopularProducts(limit = 10) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const popularProducts = await productsCollection.aggregate([
        { $match: { status: 'active' } },
        { $sort: { views: -1, rating: -1, createdAt: -1 } },
        { $limit: limit },
        {
          $addFields: {
            artisanObjectId: { $toObjectId: '$artisan' }
          }
        },
        {
          $lookup: {
            from: 'artisans',
            localField: 'artisanObjectId',
            foreignField: '_id',
            as: 'artisanInfo',
            pipeline: [
              { $project: { 
                artisanName: 1, 
                businessName: 1, 
                type: 1, 
                address: 1, 
                deliveryOptions: 1, 
                pickupLocation: 1,
                pickupInstructions: 1,
                pickupHours: 1,
                deliveryInstructions: 1,
                rating: 1,
                businessImage: 1
              }}
            ]
          }
        },
        {
          $addFields: {
            artisan: { $arrayElemAt: ['$artisanInfo', 0] }
          }
        },
        { $unset: ['artisanInfo', 'artisanObjectId'] }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        products: popularProducts,
        count: popularProducts.length
      };
    } catch (error) {
      console.error('Search Service - Popular products error:', error);
      throw error;
    }
  }

  /**
   * Search suggestions
   */
  async getSearchSuggestions(query, limit = 5) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const suggestions = await productsCollection.aggregate([
        { $match: { status: 'active' } },
        { $match: { 
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { subcategory: { $regex: query, $options: 'i' } }
          ]
        }},
        { $group: { 
          _id: '$category',
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: limit }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        suggestions: suggestions.map(s => s._id)
      };
    } catch (error) {
      console.error('Search Service - Suggestions error:', error);
      throw error;
    }
  }

  /**
   * Search analytics
   */
  async trackSearch(query, filters = {}) {
    try {
      // In a real implementation, you would track search analytics
      // For now, we'll just log the search
      console.log(`Search tracked: "${query}" with filters:`, filters);
      
      return {
        success: true,
        message: 'Search tracked successfully'
      };
    } catch (error) {
      console.error('Search Service - Track search error:', error);
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
        'GET /api/search/enhanced',
        'GET /api/search/popular',
        'GET /api/search/suggestions',
        'POST /api/search/track'
      ]
    };
  }
}

module.exports = new SearchService();
