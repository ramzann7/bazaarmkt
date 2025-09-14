const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

// Optional token verification middleware
const optionalVerifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    verifyToken(req, res, next);
  } else {
    req.user = null;
    next();
  }
};
const CommunityPost = require('../models/communityPost');
const CommunityComment = require('../models/communityComment');
const ArtisanPoints = require('../models/artisanPoints');
const Badge = require('../models/badge');
const Reward = require('../models/reward');
const RewardRedemption = require('../models/rewardRedemption');
const Artisan = require('../models/artisan');
const User = require('../models/user');

// Community Posts Routes

// Get all posts with pagination and filtering
router.get('/posts', optionalVerifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      filter = 'all',
      type = 'all',
      category = 'all',
      search = ''
    } = req.query;

    const query = { status: 'published' };

    // Apply filters
    if (type !== 'all') {
      query.type = type;
    }
    if (category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const posts = await CommunityPost.find(query)
      .populate('author', 'firstName lastName profilePicture')
      .populate('artisan', 'artisanName businessImage')
      .populate({
        path: 'comments',
        populate: [
          {
            path: 'author',
            select: 'firstName lastName profilePicture'
          },
          {
            path: 'artisan',
            select: 'artisanName businessImage'
          }
        ]
      })
      .sort({ isPinned: -1, isFeatured: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CommunityPost.countDocuments(query);

    // Add likeCount, commentCount, and isLiked to each post
    const postsWithCounts = posts.map(post => {
      const postObj = post.toObject();
      const isLiked = req.user ? post.isLikedBy(req.user._id) : false;
      return {
        ...postObj,
        likeCount: post.likes ? post.likes.length : 0,
        commentCount: post.comments ? post.comments.length : 0,
        isLiked: isLiked
      };
    });

    res.json({
      success: true,
      data: postsWithCounts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new post
router.post('/posts', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const postData = {
      ...req.body,
      author: req.user._id,
      artisan: artisan._id
    };

    const post = new CommunityPost(postData);
    await post.save();

    // Add points for creating a post
    await addPoints(artisan._id, req.user._id, 10, 'community_post', 'Created a community post');

    // Populate the post before returning
    await post.populate([
      { path: 'author', select: 'firstName lastName profilePicture' },
      { path: 'artisan', select: 'artisanName businessImage' }
    ]);

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/Unlike a post
router.post('/posts/:postId/like', verifyToken, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.isLikedBy(req.user._id);
    
    if (isLiked) {
      await post.removeLike(req.user._id);
    } else {
      await post.addLike(req.user._id);
    }

    // Refresh the post to get updated like count
    const updatedPost = await CommunityPost.findById(req.params.postId);
    
    res.json({
      success: true,
      liked: !isLiked,
      likeCount: updatedPost.likes ? updatedPost.likes.length : 0
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get post comments
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await CommunityComment.find({ post: req.params.postId })
      .populate('author', 'firstName lastName profilePicture')
      .populate('artisan', 'artisanName businessImage')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a comment
router.post('/posts/:postId/comments', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find artisan profile if it exists (optional for patrons)
    const artisan = await Artisan.findOne({ user: req.user._id });

    const commentData = {
      ...req.body,
      post: req.params.postId,
      author: req.user._id,
      artisan: artisan ? artisan._id : null
    };

    const comment = new CommunityComment(commentData);
    await comment.save();

    // Add the comment to the post's comments array
    await CommunityPost.findByIdAndUpdate(
      req.params.postId,
      { $push: { comments: comment._id } }
    );

    // Add points for commenting (only if user is an artisan)
    if (artisan) {
      await addPoints(artisan._id, req.user._id, 5, 'community_comment', 'Commented on a community post');
    }

    // Populate the comment before returning
    await comment.populate([
      { path: 'author', select: 'firstName lastName profilePicture' },
      { path: 'artisan', select: 'artisanName businessImage' }
    ]);

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Community Stats
router.get('/stats', async (req, res) => {
  try {
    const totalPosts = await CommunityPost.countDocuments({ status: 'published' });
    const totalComments = await CommunityComment.countDocuments({ status: 'active' });
    const totalArtisans = await Artisan.countDocuments();
    const totalPoints = await ArtisanPoints.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPoints' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalPosts,
        totalComments,
        totalArtisans,
        totalPoints: totalPoints[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching community stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await ArtisanPoints.getLeaderboard(10);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get most engaged artisans (based on community activity)
router.get('/leaderboard/engagement', async (req, res) => {
  try {
    const engagementLeaderboard = await ArtisanPoints.aggregate([
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $unwind: '$artisanInfo'
      },
      {
        $project: {
          artisan: '$artisanInfo._id',
          artisanName: '$artisanInfo.artisanName',
          businessImage: '$artisanInfo.businessImage',
          totalPosts: '$statistics.communityPosts',
          totalComments: '$statistics.communityComments',
          totalLikes: '$statistics.communityLikes',
          engagementScore: {
            $add: [
              { $multiply: ['$statistics.communityPosts', 3] },
              { $multiply: ['$statistics.communityComments', 2] },
              '$statistics.communityLikes'
            ]
          }
        }
      },
      {
        $match: {
          engagementScore: { $gt: 0 }
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json({
      success: true,
      data: engagementLeaderboard
    });
  } catch (error) {
    console.error('Error fetching engagement leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Artisan Incentives
router.get('/incentives', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Get artisan points
    let artisanPoints = await ArtisanPoints.findOne({ artisan: artisan._id });
    if (!artisanPoints) {
      // Create initial points record
      artisanPoints = new ArtisanPoints({
        artisan: artisan._id,
        user: req.user._id,
        totalPoints: 0,
        currentLevel: 1,
        pointsToNextLevel: 100
      });
      await artisanPoints.save();
    }

    // Get available rewards
    const availableRewards = await Reward.getAvailable();

    // Get active redemptions
    const activeRedemptions = await RewardRedemption.getActive(artisan._id);

    // Get badges
    const badges = await Badge.find({ isActive: true, isVisible: true });

    res.json({
      success: true,
      data: {
        points: artisanPoints.totalPoints,
        level: artisanPoints.currentLevel,
        pointsToNextLevel: artisanPoints.pointsToNextLevel,
        levelProgress: artisanPoints.levelProgress,
        badges: artisanPoints.badges,
        availableRewards,
        activeRedemptions,
        allBadges: badges
      }
    });
  } catch (error) {
    console.error('Error fetching incentives:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Redeem Reward
router.post('/incentives/redeem', verifyToken, async (req, res) => {
  try {
    const { rewardId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Get artisan points
    let artisanPoints = await ArtisanPoints.findOne({ artisan: artisan._id });
    if (!artisanPoints) {
      return res.status(404).json({ message: 'Artisan points not found' });
    }

    // Check if user can redeem
    const canRedeem = reward.canRedeem(
      artisanPoints.currentLevel,
      artisanPoints.totalPoints,
      artisanPoints.badges
    );

    if (!canRedeem.canRedeem) {
      return res.status(400).json({ message: canRedeem.reason });
    }

    // Create redemption
    const redemption = new RewardRedemption({
      artisan: artisan._id,
      user: req.user._id,
      reward: reward._id,
      pointsSpent: reward.cost.points,
      delivery: {
        method: reward.delivery.method
      }
    });

    await redemption.save();

    // Deduct points
    artisanPoints.totalPoints -= reward.cost.points;
    await artisanPoints.save();

    // Update reward redemption count
    await reward.redeem();

    res.json({
      success: true,
      data: redemption
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to add points
async function addPoints(artisanId, userId, points, action, description, relatedId = null) {
  try {
    let artisanPoints = await ArtisanPoints.findOne({ artisan: artisanId });
    
    if (!artisanPoints) {
      artisanPoints = new ArtisanPoints({
        artisan: artisanId,
        user: userId,
        totalPoints: 0,
        currentLevel: 1,
        pointsToNextLevel: 100
      });
    }

    await artisanPoints.addPoints(points, action, description, relatedId);
    
    // Check for new badges
    await checkAndAwardBadges(artisanPoints);
  } catch (error) {
    console.error('Error adding points:', error);
  }
}

// Helper function to check and award badges
async function checkAndAwardBadges(artisanPoints) {
  try {
    const availableBadges = await Badge.getAvailableForArtisan(artisanPoints.statistics);
    
    for (const badge of availableBadges) {
      await artisanPoints.addBadge(badge._id);
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

module.exports = router;
