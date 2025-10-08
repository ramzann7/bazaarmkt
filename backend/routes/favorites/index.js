/**
 * Favorites/Wishlist System - Serverless Implementation
 */

const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// Add product to favorites
const addToFavorites = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId } = req.body;

    if (!productId || !ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const favoritesCollection = db.collection('favorites');
    const productsCollection = db.collection('products');

    // Check if product exists
    const product = await productsCollection.findOne({
      _id: new ObjectId(productId),
      status: 'active'
    });

    if (!product) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already in favorites
    const existingFavorite = await favoritesCollection.findOne({
      userId: new ObjectId(decoded.userId),
      productId: new ObjectId(productId)
    });

    if (existingFavorite) {
      // Connection managed by middleware - no close needed
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    // Add to favorites
    const favorite = {
      userId: new ObjectId(decoded.userId),
      productId: new ObjectId(productId),
      createdAt: new Date()
    };

    const result = await favoritesCollection.insertOne(favorite);
    // Connection managed by middleware - no close needed

    res.status(201).json({
      success: true,
      message: 'Product added to favorites',
      data: {
        favoriteId: result.insertedId,
        productId: productId
      }
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites',
      error: error.message
    });
  }
};

// Remove product from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId } = req.params;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const favoritesCollection = db.collection('favorites');

    const result = await favoritesCollection.deleteOne({
      userId: new ObjectId(decoded.userId),
      productId: new ObjectId(productId)
    });

    if (result.deletedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Product not found in favorites'
      });
    }

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      message: 'Product removed from favorites'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites',
      error: error.message
    });
  }
};

// Get user's favorite products
const getUserFavorites = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const db = req.db; // Use shared connection from middleware
    const favoritesCollection = db.collection('favorites');

    // Get favorites with product details
    const favorites = await favoritesCollection.aggregate([
      { $match: { userId: new ObjectId(decoded.userId) } },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            { $match: { status: 'active' } } // Only include active products
          ]
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'artisans',
          localField: 'product.artisan',
          foreignField: '_id',
          as: 'artisan',
          pipeline: [
            { $project: { artisanName: 1, businessName: 1 } }
          ]
        }
      },
      { $unwind: { path: '$artisan', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    // Get total count
    const totalCount = await favoritesCollection.countDocuments({
      userId: new ObjectId(decoded.userId)
    });

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: {
        favorites: favorites.map(fav => ({
          favoriteId: fav._id,
          product: fav.product,
          artisan: fav.artisan,
          addedAt: fav.createdAt
        })),
        totalCount,
        hasMore: offset + favorites.length < totalCount
      }
    });
  } catch (error) {
    console.error('Get user favorites error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get favorites',
      error: error.message
    });
  }
};

// Check if product is in user's favorites
const checkFavoriteStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { productId } = req.params;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const db = req.db; // Use shared connection from middleware
    const favoritesCollection = db.collection('favorites');

    const favorite = await favoritesCollection.findOne({
      userId: new ObjectId(decoded.userId),
      productId: new ObjectId(productId)
    });

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favoriteId: favorite ? favorite._id : null
      }
    });
  } catch (error) {
    console.error('Check favorite status error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status',
      error: error.message
    });
  }
};

// Get favorite products with filtering
const getFavoritesWithFilters = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { category, subcategory, search, sortBy = 'recent' } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const db = req.db; // Use shared connection from middleware
    const favoritesCollection = db.collection('favorites');

    // Build match pipeline
    const matchPipeline = [
      { $match: { userId: new ObjectId(decoded.userId) } }
    ];

    // Add product lookup and filtering
    const pipeline = [
      ...matchPipeline,
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            { $match: { status: 'active' } }
          ]
        }
      },
      { $unwind: '$product' }
    ];

    // Add category filter
    if (category) {
      pipeline.push({ $match: { 'product.category': category } });
    }

    // Add subcategory filter
    if (subcategory) {
      pipeline.push({ $match: { 'product.subcategory': subcategory } });
    }

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'product.name': { $regex: search, $options: 'i' } },
            { 'product.description': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting
    const sortOptions = {
      recent: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { 'product.name': 1 },
      price_low: { 'product.price': 1 },
      price_high: { 'product.price': -1 }
    };

    pipeline.push({ $sort: sortOptions[sortBy] || sortOptions.recent });
    pipeline.push({ $skip: offset });
    pipeline.push({ $limit: limit });

    // Add artisan lookup
    pipeline.push({
      $lookup: {
        from: 'artisans',
        localField: 'product.artisan',
        foreignField: '_id',
        as: 'artisan',
        pipeline: [
          { $project: { artisanName: 1, businessName: 1 } }
        ]
      }
    });
    pipeline.push({ $unwind: { path: '$artisan', preserveNullAndEmptyArrays: true } });

    const favorites = await favoritesCollection.aggregate(pipeline).toArray();

    // Connection managed by middleware - no close needed

    res.json({
      success: true,
      data: {
        favorites: favorites.map(fav => ({
          favoriteId: fav._id,
          product: fav.product,
          artisan: fav.artisan,
          addedAt: fav.createdAt
        })),
        count: favorites.length
      }
    });
  } catch (error) {
    console.error('Get favorites with filters error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get filtered favorites',
      error: error.message
    });
  }
};

// Routes
router.post('/', addToFavorites);
router.delete('/:productId', removeFromFavorites);
router.get('/', getUserFavorites);
router.get('/check/:productId', checkFavoriteStatus);
router.get('/filtered', getFavoritesWithFilters);

module.exports = router;
