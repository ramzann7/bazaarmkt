/**
 * Community System - Serverless Implementation
 * Handles posts, comments, likes, leaderboards, and community engagement
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// ============================================================================
// COMMUNITY POSTS ENDPOINTS
// ============================================================================

// Get community posts
const getPosts = async (req, res) => {
  try {
    const { type, category, limit = 20, offset = 0, populate } = req.query;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
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

    // Add population stages if requested
    if (populate && populate.includes('artisan')) {
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1, profileImage: 1 } }
          ]
        }
      });
      pipeline.push({ $unwind: { path: '$author', preserveNullAndEmptyArrays: true } });
    }

    if (populate && populate.includes('likes')) {
      pipeline.push({
        $lookup: {
          from: 'community_likes',
          localField: '_id',
          foreignField: 'postId',
          as: 'likesData'
        }
      });
      pipeline.push({
        $addFields: {
          likesCount: { $size: '$likesData' },
          likes: { $map: { input: '$likesData', as: 'like', in: '$$like.userId' } }
        }
      });
    }

    if (populate && populate.includes('comments')) {
      pipeline.push({
        $lookup: {
          from: 'communitycomments',
          localField: 'comments',
          foreignField: '_id',
          as: 'commentsData',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 3 } // Only get latest 3 comments for preview
          ]
        }
      });
      pipeline.push({
        $addFields: {
          commentsCount: { $size: '$comments' },
          commentsData: '$commentsData'
        }
      });
    }

    const posts = await postsCollection.aggregate(pipeline).toArray();
    await client.close();

    res.json({
      success: true,
      data: posts,
      count: posts.length
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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const postsCollection = db.collection('communityposts');

    const post = {
      author: new ObjectId(decoded.userId),
      artisan: null, // Will be populated if user is artisan
      title: postData.title,
      content: postData.content,
      type: postData.type || 'story',
      category: postData.category || 'community',
      tags: postData.tags || [],
      images: postData.images || [],
      comments: [], // Array of comment ObjectIds
      isPinned: false,
      isFeatured: false,
      views: 0,
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
    await client.close();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        postId: result.insertedId,
        ...post
      }
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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const postsCollection = db.collection('communityposts');

    const update = {
      ...updateData,
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
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Post not found or unauthorized'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Post updated successfully'
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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const postsCollection = db.collection('communityposts');

    const result = await postsCollection.deleteOne({
      _id: new ObjectId(postId),
      author: new ObjectId(decoded.userId)
    });

    if (result.deletedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Post not found or unauthorized'
      });
    }

    // Also delete related likes and comments
    await db.collection('community_likes').deleteMany({ postId: new ObjectId(postId) });
    await db.collection('communitycomments').deleteMany({ postId: new ObjectId(postId) });

    await client.close();

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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const likesCollection = db.collection('community_likes');
    const postsCollection = db.collection('communityposts');

    // Check if already liked
    const existingLike = await likesCollection.findOne({
      postId: new ObjectId(postId),
      userId: new ObjectId(decoded.userId)
    });

    if (existingLike) {
      // Unlike
      await likesCollection.deleteOne({ _id: existingLike._id });
      
      await client.close();
      return res.json({
        success: true,
        message: 'Post unliked',
        liked: false
      });
    } else {
      // Like
      await likesCollection.insertOne({
        postId: new ObjectId(postId),
        userId: new ObjectId(decoded.userId),
        createdAt: new Date()
      });
      
      await client.close();
      return res.json({
        success: true,
        message: 'Post liked',
        liked: true
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

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
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

    await client.close();

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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const commentsCollection = db.collection('communitycomments');
    const postsCollection = db.collection('communityposts');

    const comment = {
      post: new ObjectId(postId),
      author: new ObjectId(decoded.userId),
      artisan: null, // Will be populated if user is artisan
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

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: {
        commentId: result.insertedId,
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

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();

    // Calculate engagement scores based on posts, likes, and comments
    const pipeline = [
      {
        $lookup: {
          from: 'communityposts',
          localField: '_id',
          foreignField: 'authorId',
          as: 'posts'
        }
      },
      {
        $lookup: {
          from: 'community_likes',
          localField: '_id',
          foreignField: 'userId',
          as: 'likes'
        }
      },
      {
        $lookup: {
          from: 'communitycomments',
          localField: '_id',
          foreignField: 'authorId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$posts' }, 10] }, // Posts worth 10 points
              { $multiply: [{ $size: '$likes' }, 2] },  // Likes worth 2 points
              { $multiply: [{ $size: '$comments' }, 5] } // Comments worth 5 points
            ]
          },
          postsCount: { $size: '$posts' },
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' }
        }
      },
      {
        $match: {
          engagementScore: { $gt: 0 } // Only include users with some engagement
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'artisans',
          localField: '_id',
          foreignField: 'user',
          as: 'artisan',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1, profileImage: 1 } }
          ]
        }
      },
      {
        $unwind: { path: '$artisan', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          engagementScore: 1,
          postsCount: 1,
          likesCount: 1,
          commentsCount: 1,
          artisan: 1
        }
      }
    ];

    const leaderboard = await db.collection('users').aggregate(pipeline).toArray();
    await client.close();

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
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();

    const [postsCount, commentsCount, likesCount, activeUsers] = await Promise.all([
      db.collection('communityposts').countDocuments({ status: 'published' }),
      db.collection('communitycomments').countDocuments(),
      db.collection('community_likes').countDocuments(),
      db.collection('communityposts').distinct('authorId').then(ids => ids.length)
    ]);

    await client.close();

    res.json({
      success: true,
      data: {
        totalPosts: postsCount,
        totalComments: commentsCount,
        totalLikes: likesCount,
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

module.exports = {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  getComments,
  createComment,
  getEngagementLeaderboard,
  getCommunityStats
};
