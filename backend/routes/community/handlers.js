/**
 * Community Endpoints Handlers
 * Extracted from server-vercel.js inline endpoints
 * Updated to use service layer
 */

const { ObjectId } = require('mongodb');
const { catchAsync } = require('../../middleware/errorHandler');
const { createCommunityService } = require('../../services');

// ============================================================================
// COMMUNITY POSTS HANDLERS
// ============================================================================

/**
 * Get community posts with filtering and population
 */
const getPosts = catchAsync(async (req, res) => {
  const { type, category, limit = 20, offset = 0, populate } = req.query;
  
  const communityService = await createCommunityService();
  const result = await communityService.getPosts({
    type,
    category,
    limit: parseInt(limit),
    offset: parseInt(offset),
    populate: populate ? populate.split(',') : []
  });

  res.json({
    success: true,
    data: result.posts,
    count: result.count
  });
});

/**
 * Create a new community post
 */
const createPost = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const post = await communityService.createPost(req.body, req.user.userId);
  
  res.json({
    success: true,
    data: post
  });
});

/**
 * Update a community post
 */
const updatePost = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  await communityService.updatePost(req.params.id, req.body, req.user.userId);
  
  res.json({
    success: true,
    message: 'Post updated successfully'
  });
});

/**
 * Delete a community post
 */
const deletePost = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  await communityService.deletePost(req.params.id, req.user.userId);
  
  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

/**
 * Like/unlike a community post
 */
const likePost = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.likePost(req.params.id, req.user.userId);
  
  res.json({
    success: true,
    message: result.message,
    liked: result.liked
  });
});

/**
 * Get comments for a community post
 */
const getComments = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.getComments(req.params.id);
  
  res.json({
    success: true,
    data: result.comments,
    count: result.count
  });
});

/**
 * Create a comment on a community post
 */
const createComment = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const comment = await communityService.createComment(
    req.params.id, 
    req.body.content, 
    req.user.userId
  );
  
  res.status(201).json({
    success: true,
    message: 'Comment created successfully',
    data: comment
  });
});

// ============================================================================
// COMMUNITY LEADERBOARD HANDLERS
// ============================================================================

/**
 * Get engagement leaderboard
 */
const getEngagementLeaderboard = catchAsync(async (req, res) => {
  const { limit = 10, period = 'all' } = req.query;
  
  const communityService = await createCommunityService();
  const result = await communityService.getEngagementLeaderboard({
    limit: parseInt(limit),
    period
  });
  
  res.json({
    success: true,
    data: result.leaderboard,
    count: result.count
  });
});

/**
 * Get community stats
 */
const getCommunityStats = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const stats = await communityService.getCommunityStats();

  res.json({
    success: true,
    data: stats
  });
});

// ============================================================================
// COMMUNITY INCENTIVES HANDLERS
// ============================================================================

/**
 * Get community incentives
 */
const getIncentives = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const incentives = await communityService.getIncentives();
  
  res.json({
    success: true,
    data: incentives
  });
});

/**
 * Redeem community incentive
 */
const redeemIncentive = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.redeemIncentive(req.body.rewardId, req.user.userId);
  
  res.json({
    success: result.success,
    message: result.message,
    data: result.data
  });
});

/**
 * Get community badges
 */
const getBadges = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const badges = await communityService.getBadges();
  
  res.json({
    success: true,
    data: badges
  });
});

/**
 * Get user community points
 */
const getPoints = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const points = await communityService.getPoints(req.user.userId);
  
  res.json({
    success: true,
    data: points
  });
});

// ============================================================================
// COMMUNITY EVENT HANDLERS
// ============================================================================

/**
 * RSVP to a community event
 */
const rsvpToEvent = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.rsvpToEvent(req.params.id, req.user.userId);
  
  res.json({
    success: result.success,
    message: result.message,
    data: result.data
  });
});

/**
 * Cancel RSVP to a community event
 */
const cancelRsvp = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.cancelRsvp(req.params.id, req.user.userId);
  
  res.json({
    success: result.success,
    message: result.message,
    data: result.data
  });
});

/**
 * Get RSVPs for a community event
 */
const getEventRsvps = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.getEventRsvps(req.params.id);
  
  res.json({
    success: true,
    data: result.rsvps,
    count: result.count
  });
});

// ============================================================================
// COMMUNITY POLL HANDLERS
// ============================================================================

/**
 * Vote on a community poll
 */
const voteOnPoll = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.voteOnPoll(
    req.params.id, 
    req.body.option, 
    req.user.userId
  );
  
  res.json({
    success: result.success,
    message: result.message,
    data: result.data
  });
});

/**
 * Get poll results
 */
const getPollResults = catchAsync(async (req, res) => {
  const communityService = await createCommunityService();
  const result = await communityService.getPollResults(req.params.id);
  
  res.json({
    success: true,
    data: result
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
