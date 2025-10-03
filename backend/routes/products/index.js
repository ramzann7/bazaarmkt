/**
 * Products Routes
 * Handles product catalog, search, and product-related operations
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// Get all products with optional filters
const getProducts = async (req, res) => {
  try {
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Build query from filters
    const query = { status: 'active' };
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.subcategory) {
      query.subcategory = req.query.subcategory;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.artisan) {
      query.artisan = req.query.artisan;
    }
    
    // Get products with artisan population
    const products = await productsCollection.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $limit: parseInt(req.query.limit) || 50 },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0,
          'artisan.__v': 0
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// Get popular products
const getPopularProducts = async (req, res) => {
  console.log('🔥 GET /api/products/popular - Handler called');
  try {
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Get popular products with artisan population
    const popularProducts = await productsCollection.aggregate([
      { $match: { status: 'active' } },
      { $sort: { soldCount: -1, views: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: popularProducts,
      products: popularProducts, // Frontend compatibility
      count: popularProducts.length
    });
  } catch (error) {
    console.error('Error fetching popular products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular products',
      error: error.message
    });
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Get featured products with artisan population
    const featuredProducts = await productsCollection.aggregate([
      { $match: { status: 'active', isFeatured: true } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: featuredProducts,
      products: featuredProducts, // Frontend compatibility
      count: featuredProducts.length
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};

// Enhanced search endpoint with location-based filtering
const enhancedSearch = async (req, res) => {
  try {
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Build query
    const query = { status: 'active' };
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get products with artisan population using aggregation
    const products = await productsCollection.aggregate([
      { $match: query },
      { $limit: parseInt(req.query.limit) || 20 },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error in enhanced search:', error);
    res.status(500).json({
      success: false,
      message: 'Error in enhanced search',
      error: error.message
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  console.log('🔥 GET /api/products/:id - Handler called with ID:', req.params.id);
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Validate ObjectId before using it
    if (!ObjectId.isValid(req.params.id)) {
      console.log('❌ Invalid product ID format:', req.params.id);
      // Connection managed by middleware - no close needed
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID format' 
      });
    }
    
    // Get product with artisan population
    const products = await productsCollection.aggregate([
      { $match: { _id: new ObjectId(req.params.id), status: 'active' } },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      {
        $project: {
          artisanInfo: 0,
          'artisan.user': 0,
          'artisan.createdAt': 0,
          'artisan.updatedAt': 0
        }
      }
    ]).toArray();
    
    // Connection managed by middleware - no close needed
    
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: products[0]
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Get product categories
const getCategories = async (req, res) => {
  try {
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Get unique categories
    const categories = await productsCollection.distinct('category', { status: 'active' });
    const subcategories = await productsCollection.distinct('subcategory', { status: 'active' });
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: {
        categories: categories,
        subcategories: subcategories
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Routes
// IMPORTANT: Specific routes must come BEFORE parameterized routes (/:id)
// Otherwise /:id will catch everything
router.get('/popular', getPopularProducts);
router.get('/featured', getFeaturedProducts);
router.get('/enhanced-search', enhancedSearch);
router.get('/categories/list', getCategories);
router.get('/:id', getProductById); // This must be LAST - catches everything else
router.get('/', getProducts); // Base route

module.exports = router;
