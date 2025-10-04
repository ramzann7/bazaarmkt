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

// Get artisan's own products
const getMyProducts = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    // Get artisan's products
    const products = await productsCollection
      .find({ artisan: artisan._id })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      data: products,
      products: products, // Frontend compatibility
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching artisan products:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error fetching artisan products',
      error: error.message
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const productData = {
      ...req.body,
      artisan: artisan._id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      soldCount: 0
    };
    
    const result = await productsCollection.insertOne(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { _id: result.insertedId, ...productData }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id // Ensure artisan can only update their own products
      },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const updatedProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const result = await productsCollection.deleteOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      artisan: artisan._id // Ensure artisan can only delete their own products
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Update product inventory
const updateInventory = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const { stock, totalCapacity, remainingCapacity, availableQuantity } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (stock !== undefined) updateData.stock = stock;
    if (totalCapacity !== undefined) updateData.totalCapacity = totalCapacity;
    if (remainingCapacity !== undefined) updateData.remainingCapacity = remainingCapacity;
    if (availableQuantity !== undefined) updateData.availableQuantity = availableQuantity;
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id
      },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const updatedProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating inventory',
      error: error.message
    });
  }
};

// Update product stock
const updateStock = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id
      },
      { 
        $set: { 
          stock: quantity,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const updatedProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: error.message
    });
  }
};

// Reduce product inventory
const reduceInventory = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }
    
    const product = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id),
      artisan: artisan._id
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    if (product.availableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient inventory'
      });
    }
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id
      },
      { 
        $inc: { 
          availableQuantity: -quantity,
          soldCount: quantity
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
    
    const updatedProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    res.json({
      success: true,
      message: 'Inventory reduced successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error reducing inventory:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error reducing inventory',
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
router.get('/my-products', getMyProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/inventory', updateInventory);
router.patch('/:id/stock', updateStock);
router.patch('/:id/reduce-inventory', reduceInventory);
router.get('/:id', getProductById); // This must be LAST - catches everything else
router.get('/', getProducts); // Base route

module.exports = router;
