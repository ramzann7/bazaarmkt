/**
 * Community Service
 * Handles community posts, comments, likes, leaderboards, and engagement
 */

const BaseService = require('./BaseService');
const { ENGAGEMENT_SCORES } = require('../config/constants');

class CommunityService extends BaseService {
  constructor(db) {
    super(db);
    this.collection = 'communityposts';
    this.commentsCollection = 'communitycomments';
    this.artisansCollection = 'artisans';
    this.usersCollection = 'users';
  }

  /**
   * Get community posts with filtering and population
   */
  async getPosts(options = {}) {
    const { type, category, limit = 20, offset = 0, populate } = options;
    
    // Build query with filters
    const matchQuery = { status: 'published' };
    if (type && type !== 'all') matchQuery.type = type;
    if (category) matchQuery.category = category;

    // Build pipeline
    const pipeline = [
      { $match: matchQuery },
      { $sort: { createdAt: -1, isPinned: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    ];

    // Always populate artisan information (this is the post author)
    pipeline.push({
      $lookup: {
        from: this.artisansCollection,
        localField: 'artisan',
        foreignField: '_id',
        as: 'artisanInfo',
        pipeline: [
          { $project: { artisanName: 1, businessName: 1, type: 1, profileImage: 1, user: 1 } },
          // Get the user info for the artisan
          {
            $lookup: {
              from: this.usersCollection,
              localField: 'user',
              foreignField: '_id',
              as: 'userInfo',
              pipeline: [
                { $project: { firstName: 1, lastName: 1, profilePicture: 1 } }
              ]
            }
          },
          { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } }
        ]
      }
    });
    pipeline.push({ $unwind: { path: '$artisanInfo', preserveNullAndEmptyArrays: true } });

    // Add likes count
    if (populate && populate.includes('likes')) {
      pipeline.push({
        $addFields: {
          likesCount: { $size: '$likes' }
        }
      });
    }

    // Populate comments if requested
    if (populate && populate.includes('comments')) {
      pipeline.push({
        $lookup: {
          from: this.commentsCollection,
          localField: 'comments',
          foreignField: '_id',
          as: 'commentsData',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: this.usersCollection,
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo',
                pipeline: [
                  { $project: { firstName: 1, lastName: 1, profilePicture: 1 } }
                ]
              }
            },
            { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
            { $addFields: { author: '$authorInfo' } }
          ]
        }
      });
      pipeline.push({
        $addFields: {
          commentsCount: { $size: '$comments' }
        }
      });
    }

    const posts = await this.aggregate(this.collection, pipeline);
    
    // Transform for frontend - artisan IS the post author
    const transformedPosts = posts.map((post) => ({
      ...post,
      // Frontend expects artisan info in the artisan field
      artisan: post.artisanInfo || post.artisan,
      // Also provide author info for any components that might need it
      author: post.artisanInfo || post.artisan,
      comments: post.commentsData || post.comments,
      likes: post.likes || []
    }));

    return {
      posts: transformedPosts,
      count: transformedPosts.length
    };
  }

  /**
   * Create a new community post
   */
  async createPost(postData, userId) {
    const post = {
      ...postData,
      author: this.createObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      status: 'published'
    };
    
    const result = await this.create(this.collection, post);
    return { ...post, _id: result.insertedId };
  }

  /**
   * Update a community post
   */
  async updatePost(postId, updateData, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    const result = await this.getCollection(this.collection).updateOne(
      { _id: this.createObjectId(postId), author: this.createObjectId(userId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Post not found or unauthorized');
    }
    
    return result;
  }

  /**
   * Delete a community post
   */
  async deletePost(postId, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    const result = await this.getCollection(this.collection).deleteOne({
      _id: this.createObjectId(postId),
      author: this.createObjectId(userId)
    });
    
    if (result.deletedCount === 0) {
      throw new Error('Post not found or unauthorized');
    }
    
    return result;
  }

  /**
   * Like/unlike a community post
   */
  async likePost(postId, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    const post = await this.findById(this.collection, postId);
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    const userLike = post.likes?.find(like => like.user.toString() === userId.toString());
    
    if (userLike) {
      // Unlike - remove from likes array
      await this.getCollection(this.collection).updateOne(
        { _id: this.createObjectId(postId) },
        { 
          $pull: { likes: { user: this.createObjectId(userId) } },
          $set: { updatedAt: new Date() }
        }
      );
      
      return { liked: false, message: 'Post unliked' };
    } else {
      // Like - add to likes array
      const newLike = {
        user: this.createObjectId(userId),
        _id: this.createObjectId(),
        likedAt: new Date()
      };
      
      await this.getCollection(this.collection).updateOne(
        { _id: this.createObjectId(postId) },
        { 
          $push: { likes: newLike },
          $set: { updatedAt: new Date() }
        }
      );
      
      return { liked: true, message: 'Post liked' };
    }
  }

  /**
   * Get comments for a community post
   */
  async getComments(postId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    const comments = await this.aggregate(this.commentsCollection, [
      { $match: { post: this.createObjectId(postId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: this.usersCollection,
          localField: 'author',
          foreignField: '_id',
          as: 'authorInfo',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profilePicture: 1 } }
          ]
        }
      },
      { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
      { $addFields: { author: '$authorInfo' } }
    ]);
    
    return { comments, count: comments.length };
  }

  /**
   * Create a comment on a community post
   */
  async createComment(postId, content, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }
    
    const comment = {
      post: this.createObjectId(postId),
      author: this.createObjectId(userId),
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: [],
      status: 'active'
    };
    
    const result = await this.create(this.commentsCollection, comment);
    
    // Add comment ID to post's comments array
    await this.getCollection(this.collection).updateOne(
      { _id: this.createObjectId(postId) },
      { $push: { comments: result.insertedId } }
    );
    
    // Populate the comment with author data
    const populatedComment = await this.aggregate(this.commentsCollection, [
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: this.usersCollection,
          localField: 'author',
          foreignField: '_id',
          as: 'authorInfo',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profilePicture: 1 } }
          ]
        }
      },
      { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
      { $addFields: { author: '$authorInfo' } }
    ]);
    
    return populatedComment[0] || { _id: result.insertedId, ...comment };
  }

  /**
   * Get engagement leaderboard
   */
  async getEngagementLeaderboard(options = {}) {
    const { limit = 10, period = 'all' } = options;
    
    // Calculate engagement scores for ARTISANS based on their posts, likes, and comments
    const pipeline = [
      // Start with artisans collection
      {
        $lookup: {
          from: this.collection,
          localField: '_id',
          foreignField: 'artisan', // Posts reference artisan directly
          as: 'posts'
        }
      },
      {
        $lookup: {
          from: this.commentsCollection,
          localField: '_id',
          foreignField: 'artisan', // Comments reference artisan directly
          as: 'comments'
        }
      },
      // Calculate likes from posts (likes are embedded in posts)
      {
        $addFields: {
          totalLikes: {
            $reduce: {
              input: '$posts',
              initialValue: 0,
              in: { $add: ['$$value', { $size: { $ifNull: ['$$this.likes', []] } }] }
            }
          }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$posts' }, ENGAGEMENT_SCORES.POST] }, // Posts worth 10 points
              { $multiply: ['$totalLikes', ENGAGEMENT_SCORES.LIKE] },        // Likes worth 2 points
              { $multiply: [{ $size: '$comments' }, ENGAGEMENT_SCORES.COMMENT] } // Comments worth 5 points
            ]
          },
          postsCount: { $size: '$posts' },
          likesCount: '$totalLikes',
          commentsCount: { $size: '$comments' }
        }
      },
      {
        $match: {
          engagementScore: { $gt: 0 } // Only include artisans with some engagement
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      // Populate user information for artisan
      {
        $lookup: {
          from: this.usersCollection,
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profilePicture: 1 } }
          ]
        }
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          artisanName: 1,
          businessName: 1,
          type: 1,
          profileImage: 1,
          user: '$userData',
          engagementScore: 1,
          postsCount: 1,
          likesCount: 1,
          commentsCount: 1
        }
      }
    ];

    const leaderboard = await this.aggregate(this.artisansCollection, pipeline);
    
    return { leaderboard, count: leaderboard.length };
  }

  /**
   * Get community stats
   */
  async getCommunityStats() {
    const [postsCount, commentsCount, activeUsers] = await Promise.all([
      this.count(this.collection, { status: 'published' }),
      this.count(this.commentsCollection),
      this.getCollection(this.collection).distinct('author').then(ids => ids.length)
    ]);

    return {
      totalPosts: postsCount,
      totalComments: commentsCount,
      activeUsers: activeUsers
    };
  }

  /**
   * Get community incentives
   */
  async getIncentives() {
    return await this.find('communityincentives', { active: true });
  }

  /**
   * Redeem community incentive
   */
  async redeemIncentive(rewardId, userId) {
    // For now, return a simple success response
    return {
      success: true,
      message: 'Reward redemption feature coming soon',
      data: { rewardId, userId }
    };
  }

  /**
   * Get community badges
   */
  async getBadges() {
    return await this.find('communitybadges', {});
  }

  /**
   * Get user community points
   */
  async getPoints(userId) {
    // For now, return a simple response
    return {
      userId,
      totalPoints: 0,
      level: 1,
      nextLevelPoints: 100
    };
  }

  /**
   * RSVP to a community event
   */
  async rsvpToEvent(postId, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    // For now, return a simple success response
    return {
      success: true,
      message: 'RSVP feature coming soon',
      data: { postId, userId }
    };
  }

  /**
   * Cancel RSVP to a community event
   */
  async cancelRsvp(postId, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    // For now, return a simple success response
    return {
      success: true,
      message: 'RSVP cancellation feature coming soon',
      data: { postId, userId }
    };
  }

  /**
   * Get RSVPs for a community event
   */
  async getEventRsvps(postId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    // For now, return empty array
    return { rsvps: [], count: 0 };
  }

  /**
   * Vote on a community poll
   */
  async voteOnPoll(postId, option, userId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    // For now, return a simple success response
    return {
      success: true,
      message: 'Poll voting feature coming soon',
      data: { postId, userId, option }
    };
  }

  /**
   * Get poll results
   */
  async getPollResults(postId) {
    if (!this.isValidObjectId(postId)) {
      throw new Error('Invalid post ID format');
    }
    
    // For now, return empty results
    return {
      postId,
      totalVotes: 0,
      options: []
    };
  }
}

module.exports = CommunityService;
