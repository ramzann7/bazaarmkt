/**
 * Reviews Service - Microservices Foundation
 * Handles review management, ratings, and review-related operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class ReviewsService {
  constructor() {
    this.serviceName = 'reviews-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Reviews Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Reviews Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Reviews Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Reviews Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Reviews Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Reviews Service cache connected');

      this.isInitialized = true;
      console.log('✅ Reviews Service initialized successfully');
    } catch (error) {
      console.error('❌ Reviews Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new review
   */
  async createReview(reviewData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const review = {
        ...reviewData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };
      
      const result = await reviewsCollection.insertOne(review);
      await client.close();
      
      return {
        success: true,
        reviewId: result.insertedId,
        message: 'Review created successfully'
      };
    } catch (error) {
      console.error('Reviews Service - Create review error:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(productId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      
      const query = {
        productId: new ObjectId(productId),
        isActive: true
      };
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [reviews, totalCount] = await Promise.all([
        reviewsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        reviewsCollection.countDocuments(query)
      ]);
      
      // Calculate average rating
      const avgRatingResult = await reviewsCollection.aggregate([
        { $match: query },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
      ]).toArray();
      
      const avgRating = avgRatingResult[0]?.avgRating || 0;
      const totalReviews = avgRatingResult[0]?.totalReviews || 0;
      
      await client.close();
      
      return {
        success: true,
        reviews: reviews,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        stats: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: totalReviews
        }
      };
    } catch (error) {
      console.error('Reviews Service - Get product reviews error:', error);
      throw error;
    }
  }

  /**
   * Get reviews for an artisan
   */
  async getArtisanReviews(artisanId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      
      const query = {
        artisanId: new ObjectId(artisanId),
        isActive: true
      };
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [reviews, totalCount] = await Promise.all([
        reviewsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        reviewsCollection.countDocuments(query)
      ]);
      
      // Calculate average rating
      const avgRatingResult = await reviewsCollection.aggregate([
        { $match: query },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
      ]).toArray();
      
      const avgRating = avgRatingResult[0]?.avgRating || 0;
      const totalReviews = avgRatingResult[0]?.totalReviews || 0;
      
      await client.close();
      
      return {
        success: true,
        reviews: reviews,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        stats: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews: totalReviews
        }
      };
    } catch (error) {
      console.error('Reviews Service - Get artisan reviews error:', error);
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(reviewId, updateData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const update = {
        ...updateData,
        updatedAt: new Date()
      };
      
      const result = await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId), isActive: true },
        { $set: update }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Review not found');
      }
      
      return {
        success: true,
        message: 'Review updated successfully'
      };
    } catch (error) {
      console.error('Reviews Service - Update review error:', error);
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const result = await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Review not found');
      }
      
      return {
        success: true,
        message: 'Review deleted successfully'
      };
    } catch (error) {
      console.error('Reviews Service - Delete review error:', error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(productId = null, artisanId = null) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const reviewsCollection = db.collection('reviews');
      
      const query = { isActive: true };
      if (productId) query.productId = new ObjectId(productId);
      if (artisanId) query.artisanId = new ObjectId(artisanId);
      
      const stats = await reviewsCollection.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]).toArray();
      
      if (stats.length === 0) {
        return {
          success: true,
          stats: {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          }
        };
      }
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stats[0].ratingDistribution.forEach(rating => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
      
      await client.close();
      
      return {
        success: true,
        stats: {
          totalReviews: stats[0].totalReviews,
          averageRating: Math.round(stats[0].averageRating * 10) / 10,
          ratingDistribution: ratingDistribution
        }
      };
    } catch (error) {
      console.error('Reviews Service - Get review stats error:', error);
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
        'POST /api/reviews',
        'GET /api/reviews/product/:productId',
        'GET /api/reviews/artisan/:artisanId',
        'PUT /api/reviews/:reviewId',
        'DELETE /api/reviews/:reviewId',
        'GET /api/reviews/stats'
      ]
    };
  }
}

module.exports = new ReviewsService();
