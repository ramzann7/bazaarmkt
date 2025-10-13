/**
 * Products Routes
 * Handles product catalog, search, and product-related operations
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const imageUploadService = require('../../services/imageUploadService');
const searchCacheService = require('../../services/searchCacheService');

// Helper function to validate inventory values
const validateInventoryValue = (value, fieldName) => {
  if (value !== undefined && (typeof value !== 'number' || value < 0 || !Number.isInteger(value))) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
};

// Helper function to get inventory field based on product type
const getInventoryField = (productType) => {
  switch (productType) {
    case 'ready_to_ship':
      return 'stock';
    case 'made_to_order':
      return 'remainingCapacity';
    case 'scheduled_order':
      return 'availableQuantity';
    default:
      return 'availableQuantity';
  }
};

// Helper function to check inventory availability
const checkInventoryAvailability = (product, quantity) => {
  const field = getInventoryField(product.productType);
  const available = product[field] || 0;
  
  return {
    hasEnough: available >= quantity,
    available: available,
    field: field,
    error: available < quantity ? `Insufficient ${field}. Only ${available} available.` : null
  };
};

// Get all products with optional filters
const getProducts = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = searchCacheService.generateKey(req.query.search, {
      category: req.query.category,
      subcategory: req.query.subcategory,
      artisan: req.query.artisan,
      limit: req.query.limit
    });
    
    const cachedResults = searchCacheService.get(cacheKey);
    if (cachedResults) {
      console.log('✅ Returning cached search results');
      return res.json(cachedResults);
    }
    
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Build base query with inventory-aware filtering
    const inventoryConditions = {
      isActive: { $ne: false },
      $or: [
        // ready_to_ship: has stock
        { productType: 'ready_to_ship', stock: { $gt: 0 } },
        // made_to_order: has remaining capacity
        { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
        // scheduled_order: has available quantity
        { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
        // Legacy products without productType: check availableQuantity or stock
        { 
          productType: { $exists: false },
          $or: [
            { availableQuantity: { $gt: 0 } },
            { stock: { $gt: 0 } }
          ]
        }
      ]
    };
    
    // Start with inventory conditions
    const query = { ...inventoryConditions };
    
    // Build $and array for combining conditions
    const andConditions = [];
    
    if (req.query.category) {
      andConditions.push({ category: req.query.category });
    }
    if (req.query.subcategory) {
      andConditions.push({ subcategory: req.query.subcategory });
    }
    if (req.query.search) {
      // Use native MongoDB text search for better performance
      andConditions.push({
        $text: { 
          $search: req.query.search,
          $caseSensitive: false,
          $diacriticSensitive: false
        }
      });
    }
    if (req.query.artisan) {
      andConditions.push({ artisan: req.query.artisan });
    }
    
    // Combine all conditions with $and if we have additional filters
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    // Debug logging for search queries
    if (req.query.search) {
      console.log('🔍 Search query constructed:', JSON.stringify(query, null, 2));
    }
    
    // Get products with artisan population
    const pipeline = [
      { $match: query }
    ];
    
    // Add text score for sorting if search query exists
    if (req.query.search) {
      pipeline.push({
        $addFields: {
          searchScore: { $meta: "textScore" }
        }
      });
      pipeline.push({ $sort: { searchScore: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }
    
    pipeline.push({ $limit: parseInt(req.query.limit) || 50 });
    
    const products = await productsCollection.aggregate([
      ...pipeline,
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
    
    // Debug logging for search results
    if (req.query.search) {
      console.log(`📦 Found ${products.length} products for search: "${req.query.search}"`);
      products.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} - Type: ${p.productType}, Stock: ${p.stock}, Capacity: ${p.remainingCapacity}, Qty: ${p.availableQuantity}`);
      });
    }
    
    const response = {
      success: true,
      products: products,
      count: products.length
    };
    
    // Cache the results
    searchCacheService.set(cacheKey, response);
    
    res.json(response);
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
    // Filter based on actual inventory per product type, not just status field
    const popularProducts = await productsCollection.aggregate([
      { 
        $match: { 
          isActive: { $ne: false },
          $or: [
            // ready_to_ship: has stock
            { productType: 'ready_to_ship', stock: { $gt: 0 } },
            // made_to_order: has remaining capacity
            { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
            // scheduled_order: has available quantity
            { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
            // Legacy products without productType: check availableQuantity or stock
            { 
              productType: { $exists: false },
              $or: [
                { availableQuantity: { $gt: 0 } },
                { stock: { $gt: 0 } }
              ]
            }
          ]
        } 
      },
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
    // Filter based on actual inventory per product type, not just status field
    const featuredProducts = await productsCollection.aggregate([
      { 
        $match: { 
          isFeatured: true,
          isActive: { $ne: false },
          $or: [
            // ready_to_ship: has stock
            { productType: 'ready_to_ship', stock: { $gt: 0 } },
            // made_to_order: has remaining capacity
            { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
            // scheduled_order: has available quantity
            { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
            // Legacy products without productType: check availableQuantity or stock
            { 
              productType: { $exists: false },
              $or: [
                { availableQuantity: { $gt: 0 } },
                { stock: { $gt: 0 } }
              ]
            }
          ]
        } 
      },
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
    // Check cache first
    const cacheKey = searchCacheService.generateKey(req.query.search, {
      category: req.query.category,
      limit: req.query.limit,
      enhanced: true
    });
    
    const cachedResults = searchCacheService.get(cacheKey);
    if (cachedResults) {
      console.log('✅ Returning cached enhanced search results');
      return res.json(cachedResults);
    }
    
    const db = req.db; // Use shared connection from middleware
    const productsCollection = db.collection('products');
    
    // Build base query with inventory-aware filtering
    const inventoryConditions = {
      isActive: { $ne: false },
      $or: [
        // ready_to_ship: has stock
        { productType: 'ready_to_ship', stock: { $gt: 0 } },
        // made_to_order: has remaining capacity
        { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
        // scheduled_order: has available quantity
        { productType: 'scheduled_order', availableQuantity: { $gt: 0 } },
        // Legacy products without productType: check availableQuantity or stock
        { 
          productType: { $exists: false },
          $or: [
            { availableQuantity: { $gt: 0 } },
            { stock: { $gt: 0 } }
          ]
        }
      ]
    };
    
    // Start with inventory conditions
    const query = { ...inventoryConditions };
    
    // Build $and array for combining conditions
    const andConditions = [];
    
    if (req.query.category) {
      andConditions.push({ category: req.query.category });
    }
    if (req.query.search) {
      // Use native MongoDB text search for better performance
      andConditions.push({
        $text: { 
          $search: req.query.search,
          $caseSensitive: false,
          $diacriticSensitive: false
        }
      });
    }
    
    // Combine all conditions with $and if we have additional filters
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    // Get products with artisan population using aggregation
    const pipeline = [
      { $match: query }
    ];
    
    // Add text score for relevance ranking if search query exists
    if (req.query.search) {
      pipeline.push({
        $addFields: {
          searchScore: { $meta: "textScore" }
        }
      });
      pipeline.push({ $sort: { searchScore: -1 } });
    }
    
    pipeline.push({ $limit: parseInt(req.query.limit) || 20 });
    
    const products = await productsCollection.aggregate([
      ...pipeline,
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
    
    const response = {
      success: true,
      products: products,
      count: products.length
    };
    
    // Cache the results
    searchCacheService.set(cacheKey, response);
    
    res.json(response);
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
    
    // Get product with artisan population - don't filter by status for single product view
    const products = await productsCollection.aggregate([
      { $match: { _id: new ObjectId(req.params.id), isActive: { $ne: false } } },
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
    
    // Process and upload product images to Vercel Blob
    if (productData.images && Array.isArray(productData.images)) {
      const processedImages = [];
      for (let i = 0; i < productData.images.length; i++) {
        const image = productData.images[i];
        if (typeof image === 'string' && image.startsWith('data:image')) {
          console.log(`📸 Processing product image ${i + 1}/${productData.images.length}...`);
          try {
            const uploadedUrl = await imageUploadService.handleImageUpload(
              image,
              'product',
              `product-${artisan._id}-${Date.now()}-${i}.jpg`
            );
            processedImages.push(uploadedUrl);
            console.log(`✅ Product image ${i + 1} uploaded to Vercel Blob`);
          } catch (uploadError) {
            console.error(`⚠️ Product image ${i + 1} upload failed:`, uploadError.message);
            processedImages.push(image); // Fallback to original
          }
        } else {
          // Already a URL, keep as is
          processedImages.push(image);
        }
      }
      productData.images = processedImages;
    }
    
    // Also handle single 'image' field if present
    if (productData.image && typeof productData.image === 'string' && productData.image.startsWith('data:image')) {
      console.log('📸 Processing single product image...');
      try {
        productData.image = await imageUploadService.handleImageUpload(
          productData.image,
          'product',
          `product-${artisan._id}-${Date.now()}.jpg`
        );
        console.log('✅ Single product image uploaded to Vercel Blob');
      } catch (uploadError) {
        console.error('⚠️ Single product image upload failed:', uploadError.message);
      }
    }
    
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
    
    // Process and upload product images to Vercel Blob
    if (updateData.images && Array.isArray(updateData.images)) {
      const processedImages = [];
      for (let i = 0; i < updateData.images.length; i++) {
        const image = updateData.images[i];
        if (typeof image === 'string' && image.startsWith('data:image')) {
          console.log(`📸 Processing product image ${i + 1}/${updateData.images.length}...`);
          try {
            const uploadedUrl = await imageUploadService.handleImageUpload(
              image,
              'product',
              `product-${artisan._id}-${Date.now()}-${i}.jpg`
            );
            processedImages.push(uploadedUrl);
            console.log(`✅ Product image ${i + 1} uploaded to Vercel Blob`);
          } catch (uploadError) {
            console.error(`⚠️ Product image ${i + 1} upload failed:`, uploadError.message);
            processedImages.push(image); // Fallback to original
          }
        } else {
          // Already a URL, keep as is
          processedImages.push(image);
        }
      }
      updateData.images = processedImages;
    }
    
    // Also handle single 'image' field if present
    if (updateData.image && typeof updateData.image === 'string' && updateData.image.startsWith('data:image')) {
      console.log('📸 Processing single product image...');
      try {
        updateData.image = await imageUploadService.handleImageUpload(
          updateData.image,
          'product',
          `product-${artisan._id}-${Date.now()}.jpg`
        );
        console.log('✅ Single product image uploaded to Vercel Blob');
      } catch (uploadError) {
        console.error('⚠️ Single product image upload failed:', uploadError.message);
      }
    }
    
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
    
    // Get current product to validate and maintain consistency
    const currentProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id),
      artisan: artisan._id
    });
    
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const { stock, totalCapacity, remainingCapacity, availableQuantity, quantity, action } = req.body;
    
    // Validate input values using helper function
    try {
      validateInventoryValue(stock, 'Stock');
      validateInventoryValue(totalCapacity, 'Total capacity');
      validateInventoryValue(remainingCapacity, 'Remaining capacity');
      validateInventoryValue(availableQuantity, 'Available quantity');
      validateInventoryValue(quantity, 'Quantity');
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    // Handle frontend format: { quantity: newStock, action: 'set' }
    if (quantity !== undefined && action === 'set') {
      console.log('🔍 Inventory update - Product type:', currentProduct.productType);
      console.log('🔍 Inventory update - Current product data:', {
        stock: currentProduct.stock,
        totalCapacity: currentProduct.totalCapacity,
        remainingCapacity: currentProduct.remainingCapacity,
        availableQuantity: currentProduct.availableQuantity
      });
      console.log('🔍 Inventory update - Requested quantity:', quantity);
      
      // Handle different product types appropriately
      if (currentProduct.productType === 'ready_to_ship') {
        updateData.stock = quantity;
        updateData.availableQuantity = quantity;
        console.log('🔍 Ready-to-ship update - Setting stock and availableQuantity to:', quantity);
      } else if (currentProduct.productType === 'made_to_order') {
        // For made-to-order, quantity represents totalCapacity
        updateData.totalCapacity = quantity;
        // Recalculate remaining capacity based on current usage
        const usedCapacity = (currentProduct.totalCapacity || 0) - (currentProduct.remainingCapacity || 0);
        updateData.remainingCapacity = Math.max(0, quantity - usedCapacity);
        console.log('🔍 Made-to-order update - Setting totalCapacity to:', quantity);
        console.log('🔍 Made-to-order update - Used capacity:', usedCapacity);
        console.log('🔍 Made-to-order update - New remaining capacity:', updateData.remainingCapacity);
      } else if (currentProduct.productType === 'scheduled_order') {
        // For scheduled order, quantity represents availableQuantity
        updateData.availableQuantity = quantity;
        console.log('🔍 Scheduled order update - Setting availableQuantity to:', quantity);
      } else {
        // Fallback for unknown types
        updateData.stock = quantity;
        updateData.availableQuantity = quantity;
        console.log('🔍 Unknown type update - Setting stock and availableQuantity to:', quantity);
      }
    }
    
    // Handle backend format: { stock, totalCapacity, remainingCapacity, availableQuantity }
    if (stock !== undefined) {
      updateData.stock = stock;
      // Keep availableQuantity in sync for ready-to-ship products
      if (currentProduct.productType === 'ready_to_ship') {
        updateData.availableQuantity = stock;
      }
    }
    
    if (totalCapacity !== undefined) {
      updateData.totalCapacity = totalCapacity;
      // Recalculate remaining capacity if not explicitly set
      if (remainingCapacity === undefined) {
        const usedCapacity = (currentProduct.totalCapacity || 0) - (currentProduct.remainingCapacity || 0);
        updateData.remainingCapacity = Math.max(0, totalCapacity - usedCapacity);
      }
    }
    
    if (remainingCapacity !== undefined) {
      updateData.remainingCapacity = remainingCapacity;
      // Ensure remaining capacity doesn't exceed total capacity
      const maxCapacity = totalCapacity !== undefined ? totalCapacity : (currentProduct.totalCapacity || 0);
      if (remainingCapacity > maxCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Remaining capacity cannot exceed total capacity'
        });
      }
    }
    
    if (availableQuantity !== undefined) {
      updateData.availableQuantity = availableQuantity;
    }
    
    // Ensure data consistency based on product type
    if (currentProduct.productType === 'ready_to_ship') {
      // For ready-to-ship, stock and availableQuantity should be the same
      if (updateData.stock !== undefined && updateData.availableQuantity === undefined) {
        updateData.availableQuantity = updateData.stock;
      } else if (updateData.availableQuantity !== undefined && updateData.stock === undefined) {
        updateData.stock = updateData.availableQuantity;
      }
    } else if (currentProduct.productType === 'made_to_order') {
      // For made-to-order, ensure remainingCapacity is consistent
      if (updateData.totalCapacity !== undefined && updateData.remainingCapacity === undefined) {
        const usedCapacity = (currentProduct.totalCapacity || 0) - (currentProduct.remainingCapacity || 0);
        updateData.remainingCapacity = Math.max(0, updateData.totalCapacity - usedCapacity);
      }
    }
    
    // Update product status based on inventory levels
    const finalStock = updateData.stock !== undefined ? updateData.stock : currentProduct.stock;
    const finalRemainingCapacity = updateData.remainingCapacity !== undefined ? updateData.remainingCapacity : currentProduct.remainingCapacity;
    const finalAvailableQuantity = updateData.availableQuantity !== undefined ? updateData.availableQuantity : currentProduct.availableQuantity;
    
    let newStatus = currentProduct.status;
    if (currentProduct.productType === 'ready_to_ship') {
      newStatus = (finalStock || 0) > 0 ? 'active' : 'out_of_stock';
    } else if (currentProduct.productType === 'made_to_order') {
      newStatus = (finalRemainingCapacity || 0) > 0 ? 'active' : 'out_of_stock';
    } else if (currentProduct.productType === 'scheduled_order') {
      newStatus = (finalAvailableQuantity || 0) > 0 ? 'active' : 'out_of_stock';
    }
    
    if (newStatus !== currentProduct.status) {
      updateData.status = newStatus;
      console.log(`🔄 Product status updated from ${currentProduct.status} to ${newStatus} based on inventory`);
    }
    
    console.log('💾 Inventory update - Final update data being saved:', updateData);
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id
      },
      { $set: updateData }
    );
    
    console.log('💾 Inventory update - MongoDB update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const updatedProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    console.log('✅ Inventory update complete - Returning product:', {
      _id: updatedProduct._id,
      name: updatedProduct.name,
      productType: updatedProduct.productType,
      stock: updatedProduct.stock,
      totalCapacity: updatedProduct.totalCapacity,
      remainingCapacity: updatedProduct.remainingCapacity,
      availableQuantity: updatedProduct.availableQuantity,
      status: updatedProduct.status
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
    
    // Get current product to validate and maintain consistency
    const currentProduct = await productsCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id),
      artisan: artisan._id
    });
    
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }
    
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }
    
    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative integer'
      });
    }
    
    const updateData = {
      stock: quantity,
      updatedAt: new Date()
    };
    
    // For ready-to-ship products, also update availableQuantity to maintain consistency
    if (currentProduct.productType === 'ready_to_ship') {
      updateData.availableQuantity = quantity;
    }
    
    // Update product status based on inventory levels
    if (currentProduct.productType === 'ready_to_ship') {
      const newStatus = quantity > 0 ? 'active' : 'out_of_stock';
      if (newStatus !== currentProduct.status) {
        updateData.status = newStatus;
        console.log(`🔄 Product status updated from ${currentProduct.status} to ${newStatus} based on stock`);
      }
    }
    
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
    
    // Validate quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
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
    
    // Check inventory availability using helper function
    const inventoryCheck = checkInventoryAvailability(product, quantity);
    
    if (!inventoryCheck.hasEnough) {
      return res.status(400).json({
        success: false,
        message: inventoryCheck.error
      });
    }
    
    // Prepare update fields based on product type
    const updateFields = {
      soldCount: quantity,
      updatedAt: new Date()
    };
    
    // Update the appropriate inventory field
    if (product.productType === 'ready_to_ship') {
      updateFields.stock = inventoryCheck.available - quantity;
      updateFields.availableQuantity = inventoryCheck.available - quantity;
    } else if (product.productType === 'made_to_order') {
      updateFields.remainingCapacity = inventoryCheck.available - quantity;
    } else if (product.productType === 'scheduled_order') {
      updateFields.availableQuantity = inventoryCheck.available - quantity;
    } else {
      // Fallback for unknown types
      updateFields.availableQuantity = inventoryCheck.available - quantity;
      if (product.productType === 'ready_to_ship') {
        updateFields.stock = inventoryCheck.available - quantity;
      }
    }
    
    // Update product status based on remaining inventory
    const remainingStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                          product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                          product.productType === 'scheduled_order' ? updateFields.availableQuantity : 0;
    
    const newStatus = remainingStock > 0 ? 'active' : 'out_of_stock';
    if (newStatus !== product.status) {
      updateFields.status = newStatus;
      console.log(`🔄 Product status updated from ${product.status} to ${newStatus} after inventory reduction`);
    }
    
    const result = await productsCollection.updateOne(
      { 
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: artisan._id
      },
      { 
        $inc: { soldCount: quantity },
        $set: updateFields
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

// Test inventory functionality (for development/testing)
const testInventoryFunctionality = async (req, res) => {
  try {
    const db = req.db;
    const productsCollection = db.collection('products');
    
    // Get a sample product to test with
    const sampleProduct = await productsCollection.findOne({ status: 'active' });
    
    if (!sampleProduct) {
      return res.status(404).json({
        success: false,
        message: 'No active products found for testing'
      });
    }
    
    // Test the helper functions
    const inventoryField = getInventoryField(sampleProduct.productType);
    const inventoryCheck = checkInventoryAvailability(sampleProduct, 1);
    
    res.json({
      success: true,
      message: 'Inventory functionality test',
      data: {
        productId: sampleProduct._id,
        productType: sampleProduct.productType,
        inventoryField: inventoryField,
        currentInventory: {
          stock: sampleProduct.stock || 0,
          availableQuantity: sampleProduct.availableQuantity || 0,
          totalCapacity: sampleProduct.totalCapacity || 0,
          remainingCapacity: sampleProduct.remainingCapacity || 0
        },
        inventoryCheck: inventoryCheck,
        helperFunctions: {
          validateInventoryValue: typeof validateInventoryValue,
          getInventoryField: typeof getInventoryField,
          checkInventoryAvailability: typeof checkInventoryAvailability
        }
      }
    });
  } catch (error) {
    console.error('Error testing inventory functionality:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing inventory functionality',
      error: error.message
    });
  }
};

// Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ 
        success: true,
        suggestions: [] 
      });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    
    // Get product name suggestions using text search
    const productSuggestions = await productsCollection
      .find(
        { 
          $text: { $search: query },
          isActive: { $ne: false }
        },
        { score: { $meta: "textScore" } }
      )
      .project({ name: 1, category: 1, subcategory: 1 })
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .toArray();
    
    // Get category suggestions
    const categorySuggestions = await productsCollection
      .distinct('category', {
        category: { $regex: query, $options: 'i' },
        isActive: { $ne: false }
      });
    
    // Combine and format suggestions
    const suggestions = [
      ...productSuggestions.map(p => ({
        type: 'product',
        text: p.name,
        category: p.category,
        subcategory: p.subcategory
      })),
      ...categorySuggestions.slice(0, 3).map(cat => ({
        type: 'category',
        text: cat
      }))
    ];
    
    res.json({ 
      success: true,
      suggestions 
    });
    
  } catch (error) {
    console.error('Search suggestions error:', error);
    // Return empty suggestions on error to avoid breaking the UI
    res.json({ 
      success: true,
      suggestions: [] 
    });
  }
};

// Routes
// IMPORTANT: Specific routes must come BEFORE parameterized routes (/:id)
// Otherwise /:id will catch everything
router.get('/popular', getPopularProducts);
router.get('/featured', getFeaturedProducts);
router.get('/enhanced-search', enhancedSearch);
router.get('/suggestions', getSearchSuggestions);
router.get('/categories/list', getCategories);
router.get('/my-products', getMyProducts);
router.get('/test-inventory', testInventoryFunctionality); // Test endpoint
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.put('/:id/inventory', updateInventory); // Frontend uses PUT
router.patch('/:id/inventory', updateInventory); // Also support PATCH
router.patch('/:id/stock', updateStock);
router.patch('/:id/reduce-inventory', reduceInventory);
router.get('/:id', getProductById); // This must be LAST - catches everything else
router.get('/', getProducts); // Base route

module.exports = router;
