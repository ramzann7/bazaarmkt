/**
 * Community Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');
const { ENGAGEMENT_SCORES } = require('../../config/constants');

// ============================================================================
// COMMUNITY POSTS HANDLERS
// ============================================================================

/**
 * Get community posts with filtering and population
 */
const getPosts = catchAsync(async (req, res) => {
  const { type, category, limit = 20, offset = 0, populate } = req.query;
  
  const db = req.db;
  const postsCollection = db.collection('communityposts');

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
      from: 'artisans',
      localField: 'artisan',
      foreignField: '_id',
      as: 'artisanInfo',
      pipeline: [
        { $project: { artisanName: 1, businessName: 1, type: 1, profileImage: 1, user: 1 } },
        // Get the user info for the artisan
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
        from: 'communitycomments',
        localField: 'comments',
        foreignField: '_id',
        as: 'commentsData',
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
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

  const posts = await postsCollection.aggregate(pipeline).toArray();
  
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

  res.json({
    success: true,
    data: transformedPosts,
    count: transformedPosts.length
  });
});

/**
 * Create a new community post
 */
const createPost = catchAsync(async (req, res) => {
  const db = req.db;
  const postData = {
    ...req.body,
    author: ObjectId(req.user.userId),
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    status: 'published'
  };
  
  const result = await db.collection('communityposts').insertOne(postData);
  res.json({
    success: true,
    data: { ...postData, _id: result.insertedId }
  });
});

/**
 * Update a community post
 */
const updatePost = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const updateData = {
    ...req.body,
    updatedAt: new Date()
  };
  
  const result = await db.collection('communityposts').updateOne(
    { _id: ObjectId(req.params.id), author: ObjectId(req.user.userId) },
    { $set: updateData }
  );
  
  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Post not found or unauthorized'
    });
  }
  
  res.json({
    success: true,
    message: 'Post updated successfully'
  });
});

/**
 * Delete a community post
 */
const deletePost = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const result = await db.collection('communityposts').deleteOne({
    _id: ObjectId(req.params.id),
    author: ObjectId(req.user.userId)
  });
  
  if (result.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Post not found or unauthorized'
    });
  }
  
  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

/**
 * Like/unlike a community post
 */
const likePost = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const postId = ObjectId(req.params.id);
  const userId = ObjectId(req.user.userId);
  
  // Check if user already liked this post
  const post = await db.collection('communityposts').findOne({ _id: postId });
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }
  
  const userLike = post.likes?.find(like => like.user.toString() === userId.toString());
  
  if (userLike) {
    // Unlike - remove from likes array
    await db.collection('communityposts').updateOne(
      { _id: postId },
      { 
        $pull: { likes: { user: userId } },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.json({
      success: true,
      message: 'Post unliked',
      liked: false
    });
  } else {
    // Like - add to likes array
    const newLike = {
      user: userId,
      _id: new ObjectId(),
      likedAt: new Date()
    };
    
    await db.collection('communityposts').updateOne(
      { _id: postId },
      { 
        $push: { likes: newLike },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.json({
      success: true,
      message: 'Post liked',
      liked: true
    });
  }
});

/**
 * Get comments for a community post
 */
const getComments = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const postId = ObjectId(req.params.id);
  
  const comments = await db.collection('communitycomments').aggregate([
    { $match: { post: postId } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
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
  ]).toArray();
  
  res.json({
    success: true,
    data: comments,
    count: comments.length
  });
});

/**
 * Create a comment on a community post
 */
const createComment = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const postId = ObjectId(req.params.id);
  const userId = ObjectId(req.user.userId);
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  const comment = {
    post: postId,
    author: userId,
    content: content.trim(),
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: [],
    status: 'active'
  };
  
  const result = await db.collection('communitycomments').insertOne(comment);
  
  // Add comment ID to post's comments array
  await db.collection('communityposts').updateOne(
    { _id: postId },
    { $push: { comments: result.insertedId } }
  );
  
  // Populate the comment with author data
  const populatedComment = await db.collection('communitycomments').aggregate([
    { $match: { _id: result.insertedId } },
    {
      $lookup: {
        from: 'users',
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
  ]).toArray();
  
  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    data: populatedComment[0] || { _id: result.insertedId, ...comment }
  });
});

// ============================================================================
// COMMUNITY LEADERBOARD HANDLERS
// ============================================================================

/**
 * Get engagement leaderboard
 */
const getEngagementLeaderboard = catchAsync(async (req, res) => {
  const db = req.db;
  const { limit = 10, period = 'all' } = req.query;
  
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
  
  res.json({
    success: true,
    data: leaderboard,
    count: leaderboard.length
  });
});

/**
 * Get community stats
 */
const getCommunityStats = catchAsync(async (req, res) => {
  const db = req.db;

  const [postsCount, commentsCount, activeUsers] = await Promise.all([
    db.collection('communityposts').countDocuments({ status: 'published' }),
    db.collection('communitycomments').countDocuments(),
    db.collection('communityposts').distinct('author').then(ids => ids.length)
  ]);

  res.json({
    success: true,
    data: {
      totalPosts: postsCount,
      totalComments: commentsCount,
      activeUsers: activeUsers
    }
  });
});

// ============================================================================
// COMMUNITY INCENTIVES HANDLERS
// ============================================================================

/**
 * Get community incentives
 */
const getIncentives = catchAsync(async (req, res) => {
  const db = req.db;
  const incentives = await db.collection('communityincentives').find({ active: true }).toArray();
  
  res.json({
    success: true,
    data: incentives
  });
});

/**
 * Redeem community incentive
 */
const redeemIncentive = catchAsync(async (req, res) => {
  const db = req.db;
  const { rewardId } = req.body;
  
  // For now, return a simple success response
  res.json({
    success: true,
    message: 'Reward redemption feature coming soon',
    data: { rewardId, userId: req.user.userId }
  });
});

/**
 * Get community badges
 */
const getBadges = catchAsync(async (req, res) => {
  const db = req.db;
  const badges = await db.collection('communitybadges').find({}).toArray();
  
  res.json({
    success: true,
    data: badges
  });
});

/**
 * Get user community points
 */
const getPoints = catchAsync(async (req, res) => {
  const db = req.db;
  
  // For now, return a simple response
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      totalPoints: 0,
      level: 1,
      nextLevelPoints: 100
    }
  });
});

// ============================================================================
// COMMUNITY EVENT HANDLERS
// ============================================================================

/**
 * RSVP to a community event
 */
const rsvpToEvent = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  
  // For now, return a simple success response
  res.json({
    success: true,
    message: 'RSVP feature coming soon',
    data: { postId: req.params.id, userId: req.user.userId }
  });
});

/**
 * Cancel RSVP to a community event
 */
const cancelRsvp = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  
  // For now, return a simple success response
  res.json({
    success: true,
    message: 'RSVP cancellation feature coming soon',
    data: { postId: req.params.id, userId: req.user.userId }
  });
});

/**
 * Get RSVPs for a community event
 */
const getEventRsvps = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  
  // For now, return empty array
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

// ============================================================================
// COMMUNITY POLL HANDLERS
// ============================================================================

/**
 * Vote on a community poll
 */
const voteOnPoll = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  const { option } = req.body;
  
  // For now, return a simple success response
  res.json({
    success: true,
    message: 'Poll voting feature coming soon',
    data: { postId: req.params.id, userId: req.user.userId, option }
  });
});

/**
 * Get poll results
 */
const getPollResults = catchAsync(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID format'
    });
  }
  
  const db = req.db;
  
  // For now, return empty results
  res.json({
    success: true,
    data: {
      postId: req.params.id,
      totalVotes: 0,
      options: []
    }
  });
});

module.exports = {
  // Posts
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  getComments,
  createComment,
  
  // Leaderboard
  getEngagementLeaderboard,
  getCommunityStats,
  
  // Incentives
  getIncentives,
  redeemIncentive,
  getBadges,
  getPoints,
  
  // Events
  rsvpToEvent,
  cancelRsvp,
  getEventRsvps,
  
  // Polls
  voteOnPoll,
  getPollResults
};
