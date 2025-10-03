/**
 * Community System - Serverless Implementation
 * Handles posts, comments, likes, leaderboards, and community engagement
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware');
const handlers = require('./handlers');
const validation = require('./validation');

// ============================================================================
// COMMUNITY POSTS ENDPOINTS
// ============================================================================

// Get community posts
const getPosts = async (req, res) => {
  try {
    const { type, category, limit = 20, offset = 0, populate } = req.query;
    
    // Get current user ID if authenticated (optional for public viewing)
    let currentUserId = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch (err) {
        // Token invalid or expired, continue as guest
      }
    }
    
    const db = req.db; // Use shared connection from middleware
    const postsCollection = db.collection('communityposts');

    // Build query
    const query = { status: 'published' };
    if (type && type !== 'all') query.type = type;
    if (category) query.category = category;

    // Get posts with aggregation for population
    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1, isPinned: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    ];

    // Always populate author (user) information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorData',
        pipeline: [
          { $project: { firstName: 1, lastName: 1, role: 1, profilePicture: 1 } }
        ]
      }
    });
    pipeline.push({ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } });

    // Add population stages if requested
    if (populate && populate.includes('artisan')) {
      
      // Populate artisan information directly from artisans collection
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanData',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1, type: 1, profileImage: 1, businessImage: 1, user: 1 } },
            // Also get the artisan's user data
            {
              $lookup: {
                from: 'users',
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
      pipeline.push({ $unwind: { path: '$artisanData', preserveNullAndEmptyArrays: true } });
    }

    if (populate && populate.includes('likes')) {
      // Likes are embedded in posts, just add count and data
      pipeline.push({
        $addFields: {
          likesCount: { $size: '$likes' },
          likesData: '$likes'
        }
      });
    }

    if (populate && populate.includes('comments')) {
      // Comments are referenced by ObjectId array - populate them with full author data
      pipeline.push({
        $lookup: {
          from: 'communitycomments',
          localField: 'comments',
          foreignField: '_id',
          as: 'commentsData',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 }, // Get more comments for full display
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorInfo',
                pipeline: [
                  { $project: { firstName: 1, lastName: 1, profilePicture: 1, role: 1 } }
                ]
              }
            },
            { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
            {
              $addFields: {
                author: '$authorInfo' // Replace author ObjectId with author object
              }
            }
          ]
        }
      });
      pipeline.push({
        $addFields: {
          commentsCount: { $size: '$comments' },
          commentsPreview: '$commentsData'
        }
      });
    }

    const posts = await postsCollection.aggregate(pipeline).toArray();
    
    // Transform posts to match frontend expectations
    const transformedPosts = posts.map((post) => {
      const likes = post.likesData || post.likes || [];
      const isLiked = currentUserId ? likes.some(like => like.user.toString() === currentUserId) : false;
      
      return {
        ...post,
        // Frontend expects populated data directly in these fields
        author: post.authorData || post.author,
        artisan: post.artisanData || post.artisan,
        comments: post.commentsData || post.commentsPreview || post.comments,
        likes: likes,
        likeCount: likes.length,
        isLiked: isLiked
      };
    });
    
    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: transformedPosts,
      count: transformedPosts.length
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get posts',
      error: error.message
    });
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const postData = req.body;

    const db = req.db; // Use shared connection from middleware
    const postsCollection = db.collection('communityposts');
    const artisansCollection = db.collection('artisans');

    // Check if user is an artisan to set artisan field
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    const post = {
      author: new ObjectId(decoded.userId),
      artisan: artisan ? artisan._id : null, // Set artisan ID if user is artisan
      title: postData.title,
      content: postData.content,
      type: postData.type || 'story',
      category: postData.category || 'community',
      tags: postData.tags || [],
      images: postData.images || [],
      comments: [], // Array of comment ObjectIds
      likes: [], // Embedded likes array
      isPinned: false,
      isFeatured: false,
      visibility: 'public',
      engagement: {
        views: 0,
        shares: 0,
        saves: 0
      },
      status: 'published',
      moderation: {
        isModerated: false
      },
      
      // Type-specific fields
      recipe: postData.recipe || null,
      event: postData.event || null,
      product: postData.product || null,
      poll: postData.poll || null,
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await postsCollection.insertOne(post);
    
    // Fetch the created post with populated artisan data
    const createdPost = await postsCollection.aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanData',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1, type: 1, profileImage: 1, businessImage: 1 } }
          ]
        }
      },
      { $unwind: { path: '$artisanData', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          artisan: '$artisanData'
        }
      }
    ]).toArray();
    
    // Add likeCount and isLiked to the newly created post
    const responseData = createdPost[0] || { postId: result.insertedId, ...post };
    responseData.likeCount = 0;
    responseData.isLiked = false;
    
    // Connection managed by middleware - no close needed

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Create post error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { postId } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const postsCollection = db.collection('communityposts');

    const update = {
      ...updateData,
      isEdited: true,
      updatedAt: new Date()
    };

    const result = await postsCollection.updateOne(
      {
        _id: new ObjectId(postId),
        author: new ObjectId(decoded.userId)
      },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Post not found or unauthorized'
      });
    }

    // Fetch the updated post with populated artisan data
    const updatedPost = await postsCollection.aggregate([
      { $match: { _id: new ObjectId(postId) } },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanData',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1, type: 1, profileImage: 1, businessImage: 1 } }
          ]
        }
      },
      { $unwind: { path: '$artisanData', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          artisan: '$artisanData'
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost[0]
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { postId } = req.params;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const postsCollection = db.collection('communityposts');

    const result = await postsCollection.deleteOne({
      _id: new ObjectId(postId),
      author: new ObjectId(decoded.userId)
    });

    if (result.deletedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Post not found or unauthorized'
      });
    }

    // Also delete related comments
    await db.collection('communitycomments').deleteMany({ post: new ObjectId(postId) });

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Like/Unlike post
const likePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { postId } = req.params;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const postsCollection = db.collection('communityposts');

    // Check if user already liked this post (likes are embedded in post)
    const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
    
    if (!post) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const userLike = post.likes?.find(like => like.user.toString() === decoded.userId);

    if (userLike) {
      // Unlike - remove from embedded likes array
      await postsCollection.updateOne(
        { _id: new ObjectId(postId) },
        { 
          $pull: { likes: { user: new ObjectId(decoded.userId) } },
          $set: { updatedAt: new Date() }
        }
      );
      
      // Get updated like count
      const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });
      const likeCount = updatedPost.likes?.length || 0;
      
      // Connection managed by middleware - no close needed
      return res.json({
        success: true,
        message: 'Post unliked',
        liked: false,
        likeCount: likeCount
      });
    } else {
      // Like - add to embedded likes array
      const newLike = {
        user: new ObjectId(decoded.userId),
        _id: new ObjectId(),
        likedAt: new Date()
      };
      
      await postsCollection.updateOne(
        { _id: new ObjectId(postId) },
        { 
          $push: { likes: newLike },
          $set: { updatedAt: new Date() }
        }
      );
      
      // Get updated like count
      const updatedPost = await postsCollection.findOne({ _id: new ObjectId(postId) });
      const likeCount = updatedPost.likes?.length || 0;
      
      // Connection managed by middleware - no close needed
      return res.json({
        success: true,
        message: 'Post liked',
        liked: true,
        likeCount: likeCount
      });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like post',
      error: error.message
    });
  }
};

// ============================================================================
// COMMENTS ENDPOINTS
// ============================================================================

// Get comments for a post
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Temporarily bypass ObjectId validation for debugging
    // if (!ObjectId.isValid(postId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid post ID'
    //   });
    // }

    const db = req.db; // Use shared connection from middleware
    const commentsCollection = db.collection('communitycomments');

    const comments = await commentsCollection.aggregate([
      { $match: { post: new ObjectId(postId) } },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorData',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profileImage: 1 } }
          ]
        }
      },
      { $unwind: '$authorData' }
    ]).toArray();

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments',
      error: error.message
    });
  }
};

// Create comment
const createComment = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { postId } = req.params;
    const { content } = req.body;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const commentsCollection = db.collection('communitycomments');
    const postsCollection = db.collection('communityposts');
    const artisansCollection = db.collection('artisans');

    // Check if user is an artisan
    const artisan = await artisansCollection.findOne({
      user: new ObjectId(decoded.userId)
    });

    const comment = {
      post: new ObjectId(postId),
      author: new ObjectId(decoded.userId),
      artisan: artisan ? artisan._id : null, // Set artisan ID if user is artisan
      content: content.trim(),
      parentComment: null,
      replies: [],
      mentions: [],
      isEdited: false,
      status: 'active',
      moderation: {
        isModerated: false
      },
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await commentsCollection.insertOne(comment);
    
    // Add comment ID to post's comments array
    await postsCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $push: { comments: result.insertedId } }
    );

    // Populate the comment with author and artisan data
    const populatedComment = await commentsCollection.aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorData',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profileImage: 1 } }
          ]
        }
      },
      { $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanData',
          pipeline: [
            { $project: { artisanName: 1, profileImage: 1, businessImage: 1 } }
          ]
        }
      },
      { $unwind: { path: '$artisanData', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          author: '$authorData',
          artisan: '$artisanData'
        }
      }
    ]).toArray();

    // Connection managed by middleware - no close needed

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: populatedComment[0] || {
        _id: result.insertedId,
        ...comment
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

// ============================================================================
// LEADERBOARD ENDPOINTS
// ============================================================================

// Get engagement leaderboard
const getEngagementLeaderboard = async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    const db = req.db; // Use shared connection from middleware

    // Calculate engagement scores for ARTISANS based on their posts, likes, and comments
    const pipeline = [
      // Start with artisans collection
      {
        $lookup: {
          from: 'communityposts',
          localField: '_id',
          foreignField: 'artisan', // Posts reference artisan directly
          as: 'posts'
        }
      },
      {
        $lookup: {
          from: 'communitycomments',
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
              { $multiply: [{ $size: '$posts' }, 10] }, // Posts worth 10 points
              { $multiply: ['$totalLikes', 2] },        // Likes worth 2 points
              { $multiply: [{ $size: '$comments' }, 5] } // Comments worth 5 points
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
          from: 'users',
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

    const leaderboard = await db.collection('artisans').aggregate(pipeline).toArray();
    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length
    });
  } catch (error) {
    console.error('Get engagement leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get engagement leaderboard',
      error: error.message
    });
  }
};

// Get community stats
const getCommunityStats = async (req, res) => {
  try {
    const db = req.db; // Use shared connection from middleware

    const [postsCount, commentsCount, activeUsers] = await Promise.all([
      db.collection('communityposts').countDocuments({ status: 'published' }),
      db.collection('communitycomments').countDocuments(),
      db.collection('communityposts').distinct('author').then(ids => ids.length)
    ]);

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: {
        totalPosts: postsCount,
        totalComments: commentsCount,
        activeUsers: activeUsers
      }
    });
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get community stats',
      error: error.message
    });
  }
};

// ============================================================================
// ROUTES
// ============================================================================

// Posts
router.get('/posts', validation.validatePostsQuery, handlers.getPosts);
router.post('/posts', auth.verifyJWT, validation.validateCreatePost, handlers.createPost);
router.put('/posts/:id', auth.verifyJWT, validation.validateUpdatePost, handlers.updatePost);
router.delete('/posts/:id', auth.verifyJWT, validation.validateObjectId('id'), handlers.deletePost);
router.post('/posts/:id/like', auth.verifyJWT, validation.validateObjectId('id'), handlers.likePost);
router.get('/posts/:id/comments', validation.validateObjectId('id'), handlers.getComments);
router.post('/posts/:id/comments', auth.verifyJWT, validation.validateCreateComment, handlers.createComment);

// Leaderboard
router.get('/leaderboard/engagement', validation.validateLeaderboardQuery, handlers.getEngagementLeaderboard);
router.get('/stats', handlers.getCommunityStats);

// Incentives
router.get('/incentives', handlers.getIncentives);
router.post('/incentives/redeem', auth.verifyJWT, validation.validateRedeemIncentive, handlers.redeemIncentive);
router.get('/badges', handlers.getBadges);
router.get('/points', auth.verifyJWT, handlers.getPoints);

// Events
router.post('/posts/:id/rsvp', auth.verifyJWT, validation.validateObjectId('id'), handlers.rsvpToEvent);
router.delete('/posts/:id/rsvp', auth.verifyJWT, validation.validateObjectId('id'), handlers.cancelRsvp);
router.get('/posts/:id/rsvps', validation.validateObjectId('id'), handlers.getEventRsvps);

// Polls
router.post('/posts/:id/poll/vote', auth.verifyJWT, validation.validatePollVote, handlers.voteOnPoll);
router.get('/posts/:id/poll/results', validation.validateObjectId('id'), handlers.getPollResults);

module.exports = router;
