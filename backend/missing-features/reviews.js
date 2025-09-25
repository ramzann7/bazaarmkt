/**
 * Reviews and Ratings System - Serverless Implementation
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// Create a new review
const createReview = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId, artisanId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reviewsCollection = db.collection('reviews');

    // Check if user already reviewed this artisan (reviews are for artisans, not products)
    const existingReview = await reviewsCollection.findOne({
      user: new ObjectId(decoded.userId),
      artisan: new ObjectId(artisanId)
    });

    if (existingReview) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    const review = {
      user: new ObjectId(decoded.userId),
      artisan: artisanId ? new ObjectId(artisanId) : null,
      rating: parseInt(rating),
      title: '', // Based on schema, reviews have title field
      comment: comment || '',
      helpful: [],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await reviewsCollection.insertOne(review);
    await client.close();

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        reviewId: result.insertedId,
        ...review
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error.message
    });
  }
};

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reviewsCollection = db.collection('reviews');
    const usersCollection = db.collection('users');

    // Get reviews with user information
    const reviews = await reviewsCollection.aggregate([
      { $match: { productId: new ObjectId(productId) } },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }]
        }
      },
      { $unwind: '$user' }
    ]).toArray();

    // Calculate average rating
    const avgResult = await reviewsCollection.aggregate([
      { $match: { productId: new ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = avgResult.length > 0 ? avgResult[0] : { averageRating: 0, totalReviews: 0 };

    await client.close();

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          averageRating: Math.round(stats.averageRating * 10) / 10,
          totalReviews: stats.totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: error.message
    });
  }
};

// Get reviews for an artisan
const getArtisanReviews = async (req, res) => {
  try {
    const { artisanId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!ObjectId.isValid(artisanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artisan ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reviewsCollection = db.collection('reviews');

    const reviews = await reviewsCollection.aggregate([
      { $match: { artisanId: new ObjectId(artisanId) } },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }]
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: '$product' }
    ]).toArray();

    // Calculate average rating for artisan
    const avgResult = await reviewsCollection.aggregate([
      { $match: { artisanId: new ObjectId(artisanId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = avgResult.length > 0 ? avgResult[0] : { averageRating: 0, totalReviews: 0 };

    await client.close();

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          averageRating: Math.round(stats.averageRating * 10) / 10,
          totalReviews: stats.totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get artisan reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan reviews',
      error: error.message
    });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reviewsCollection = db.collection('reviews');

    const updateData = { updatedAt: new Date() };
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      updateData.rating = parseInt(rating);
    }
    if (comment !== undefined) updateData.comment = comment;

    const result = await reviewsCollection.updateOne(
      {
        _id: new ObjectId(reviewId),
        userId: new ObjectId(decoded.userId)
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Update review error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { reviewId } = req.params;

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const reviewsCollection = db.collection('reviews');

    const result = await reviewsCollection.deleteOne({
      _id: new ObjectId(reviewId),
      userId: new ObjectId(decoded.userId)
    });

    if (result.deletedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Review not found or unauthorized'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getArtisanReviews,
  updateReview,
  deleteReview
};
