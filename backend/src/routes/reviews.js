const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const Artisan = require('../models/artisan');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to ensure user is a patron (not guest, admin, or artisan)
const requirePatron = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is not a guest
    if (req.user.isGuest) {
      return res.status(403).json({ message: 'Guest users cannot leave reviews' });
    }

    // Check if user is not an admin
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Admin users cannot leave reviews' });
    }

    // Check if user is not an artisan (they can't review themselves or other artisans)
    if (req.user.role === 'artisan') {
      return res.status(403).json({ message: 'Artisan users cannot leave reviews' });
    }

    // User must be a patron
    if (req.user.role !== 'patron') {
      return res.status(403).json({ message: 'Only patrons can leave reviews' });
    }

    next();
  } catch (error) {
    console.error('Error in requirePatron middleware:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews for an artisan (public endpoint - no auth required)
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt' } = req.query;

    const reviews = await Review.find({ artisan: artisanId })
      .populate('user', 'firstName lastName')
      .sort({ [sort]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments({ artisan: artisanId });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching artisan reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Add a new review for an artisan (requires patron authentication)
router.post('/artisan/:artisanId', authMiddleware, requirePatron, async (req, res) => {
  try {
    const { artisanId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user._id; // Use _id from populated user object

    // Verify artisan exists
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // Check if user is trying to review their own artisan profile
    if (artisan.user && artisan.user.toString() === userId.toString()) {
      return res.status(403).json({ message: 'You cannot review your own artisan profile' });
    }

    // Check if user has already reviewed this artisan
    const existingReview = await Review.findOne({ 
      artisan: artisanId, 
      user: userId 
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this artisan' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Review title is required' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Review comment is required' });
    }

    // Create new review
    const review = new Review({
      artisan: artisanId,
      user: userId,
      rating,
      comment: comment.trim(),
      title: title.trim()
    });

    await review.save();

    // Update artisan's average rating
    await updateArtisanRating(artisanId);

    // Populate user info for response
    await review.populate('user', 'firstName lastName');

    res.status(201).json({
      message: 'Review added successfully',
      review
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
});

// Update an existing review (requires patron authentication)
router.put('/:reviewId', authMiddleware, requirePatron, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Review title is required' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Review comment is required' });
    }

    // Update review
    review.rating = rating;
    review.comment = comment.trim();
    review.title = title.trim();
    review.updatedAt = new Date();

    await review.save();

    // Update artisan's average rating
    await updateArtisanRating(review.artisan);

    // Populate user info for response
    await review.populate('user', 'firstName lastName');

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Error updating review' });
  }
});

// Delete a review (requires patron authentication)
router.delete('/:reviewId', authMiddleware, requirePatron, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    const artisanId = review.artisan;

    await Review.findByIdAndDelete(reviewId);

    // Update artisan's average rating
    await updateArtisanRating(artisanId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

// Get user's review for an artisan (requires authentication)
router.get('/artisan/:artisanId/user', authMiddleware, async (req, res) => {
  try {
    const { artisanId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOne({ 
      artisan: artisanId, 
      user: userId 
    }).populate('user', 'firstName lastName');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ message: 'Error fetching review' });
  }
});

// Get review statistics for an artisan (public endpoint)
router.get('/artisan/:artisanId/stats', async (req, res) => {
  try {
    const { artisanId } = req.params;

    const stats = await Review.aggregate([
      { $match: { artisan: require('mongoose').Types.ObjectId(artisanId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const stat = stats[0];
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    stat.ratingDistribution.forEach(rating => {
      ratingDistribution[rating]++;
    });

    res.json({
      averageRating: Math.round(stat.averageRating * 10) / 10,
      totalReviews: stat.totalReviews,
      ratingDistribution
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ message: 'Error fetching review statistics' });
  }
});

// Helper function to update artisan's average rating
async function updateArtisanRating(artisanId) {
  try {
    const stats = await Review.aggregate([
      { $match: { artisan: require('mongoose').Types.ObjectId(artisanId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      await Artisan.findByIdAndUpdate(artisanId, {
        'rating.average': Math.round(stat.averageRating * 10) / 10,
        'rating.count': stat.totalReviews
      });
    } else {
      // No reviews, reset to default
      await Artisan.findByIdAndUpdate(artisanId, {
        'rating.average': 0,
        'rating.count': 0
      });
    }
  } catch (error) {
    console.error('Error updating artisan rating:', error);
  }
}

module.exports = router;
