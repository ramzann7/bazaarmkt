/**
 * Community Service - Microservices Foundation
 * Handles community posts, comments, likes, and social interactions
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class CommunityService {
  constructor() {
    this.serviceName = 'community-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Community Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Community Service already initialized');
      return;
    }

    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Community Service Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ Community Service: ${warning}`));
      }

      await dbManager.connect();
      console.log('✅ Community Service database connected');

      await CacheService.healthCheck();
      console.log('✅ Community Service cache connected');

      this.isInitialized = true;
      console.log('✅ Community Service initialized successfully');
    } catch (error) {
      console.error('❌ Community Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a community post
   */
  async createPost(postData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      
      const post = {
        ...postData,
        createdAt: new Date(),
        updatedAt: new Date(),
        likesCount: 0,
        commentsCount: 0,
        isActive: true
      };
      
      const result = await postsCollection.insertOne(post);
      await client.close();
      
      return {
        success: true,
        postId: result.insertedId,
        message: 'Post created successfully'
      };
    } catch (error) {
      console.error('Community Service - Create post error:', error);
      throw error;
    }
  }

  /**
   * Get community posts
   */
  async getPosts(options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        category,
        userId
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { isActive: true };
      
      if (category) query.category = category;
      if (userId) query.userId = new ObjectId(userId);
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [posts, totalCount] = await Promise.all([
        postsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        postsCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        posts: posts,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Community Service - Get posts error:', error);
      throw error;
    }
  }

  /**
   * Update a community post
   */
  async updatePost(postId, updateData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      
      const update = {
        ...updateData,
        updatedAt: new Date()
      };
      
      const result = await postsCollection.updateOne(
        { _id: new ObjectId(postId), isActive: true },
        { $set: update }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Post not found');
      }
      
      return {
        success: true,
        message: 'Post updated successfully'
      };
    } catch (error) {
      console.error('Community Service - Update post error:', error);
      throw error;
    }
  }

  /**
   * Delete a community post
   */
  async deletePost(postId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      
      const result = await postsCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Post not found');
      }
      
      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      console.error('Community Service - Delete post error:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a post
   */
  async likePost(postId, userId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      const likesCollection = db.collection('community_likes');
      
      // Check if user already liked this post
      const existingLike = await likesCollection.findOne({
        postId: new ObjectId(postId),
        userId: new ObjectId(userId),
        isActive: true
      });
      
      if (existingLike) {
        // Unlike the post
        await likesCollection.updateOne(
          { _id: existingLike._id },
          { $set: { isActive: false, unlikedAt: new Date() } }
        );
        
        await postsCollection.updateOne(
          { _id: new ObjectId(postId) },
          { $inc: { likesCount: -1 } }
        );
        
        await client.close();
        
        return {
          success: true,
          liked: false,
          message: 'Post unliked'
        };
      } else {
        // Like the post
        const like = {
          postId: new ObjectId(postId),
          userId: new ObjectId(userId),
          createdAt: new Date(),
          isActive: true
        };
        
        await likesCollection.insertOne(like);
        
        await postsCollection.updateOne(
          { _id: new ObjectId(postId) },
          { $inc: { likesCount: 1 } }
        );
        
        await client.close();
        
        return {
          success: true,
          liked: true,
          message: 'Post liked'
        };
      }
    } catch (error) {
      console.error('Community Service - Like post error:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const commentsCollection = db.collection('community_comments');
      
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'asc' } = options;
      const skip = (page - 1) * limit;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [comments, totalCount] = await Promise.all([
        commentsCollection.find({
          postId: new ObjectId(postId),
          isActive: true
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
        commentsCollection.countDocuments({
          postId: new ObjectId(postId),
          isActive: true
        })
      ]);
      
      await client.close();
      
      return {
        success: true,
        comments: comments,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Community Service - Get comments error:', error);
      throw error;
    }
  }

  /**
   * Create a comment on a post
   */
  async createComment(postId, commentData) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const commentsCollection = db.collection('community_comments');
      const postsCollection = db.collection('community_posts');
      
      const comment = {
        ...commentData,
        postId: new ObjectId(postId),
        createdAt: new Date(),
        isActive: true
      };
      
      const result = await commentsCollection.insertOne(comment);
      
      // Update post comments count
      await postsCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $inc: { commentsCount: 1 } }
      );
      
      await client.close();
      
      return {
        success: true,
        commentId: result.insertedId,
        message: 'Comment created successfully'
      };
    } catch (error) {
      console.error('Community Service - Create comment error:', error);
      throw error;
    }
  }

  /**
   * Get community statistics
   */
  async getCommunityStats() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      const commentsCollection = db.collection('community_comments');
      const likesCollection = db.collection('community_likes');
      
      const [postsStats, commentsStats, likesStats] = await Promise.all([
        postsCollection.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              totalPosts: { $sum: 1 },
              totalLikes: { $sum: '$likesCount' },
              totalComments: { $sum: '$commentsCount' }
            }
          }
        ]).toArray(),
        
        commentsCollection.countDocuments({ isActive: true }),
        
        likesCollection.countDocuments({ isActive: true })
      ]);
      
      await client.close();
      
      return {
        success: true,
        stats: {
          totalPosts: postsStats[0]?.totalPosts || 0,
          totalComments: commentsStats,
          totalLikes: likesStats,
          totalEngagement: (postsStats[0]?.totalLikes || 0) + commentsStats
        }
      };
    } catch (error) {
      console.error('Community Service - Get community stats error:', error);
      throw error;
    }
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(options = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const postsCollection = db.collection('community_posts');
      
      const { limit = 10 } = options;
      
      const leaderboard = await postsCollection.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$userId',
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: '$likesCount' },
            totalComments: { $sum: '$commentsCount' },
            engagementScore: { $sum: { $add: ['$likesCount', '$commentsCount'] } }
          }
        },
        { $sort: { engagementScore: -1 } },
        { $limit: limit }
      ]).toArray();
      
      await client.close();
      
      return {
        success: true,
        leaderboard: leaderboard,
        limit: limit
      };
    } catch (error) {
      console.error('Community Service - Get engagement leaderboard error:', error);
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
        'POST /api/community/posts',
        'GET /api/community/posts',
        'PUT /api/community/posts/:postId',
        'DELETE /api/community/posts/:postId',
        'POST /api/community/posts/:postId/like',
        'DELETE /api/community/posts/:postId/like',
        'GET /api/community/posts/:postId/comments',
        'POST /api/community/posts/:postId/comments',
        'GET /api/community/stats',
        'GET /api/community/leaderboard'
      ]
    };
  }
}

module.exports = new CommunityService();
