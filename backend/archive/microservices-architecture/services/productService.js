/**
 * Product Service - Microservices Foundation
 * Handles product catalog, search, and product-related operations
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');
const EnvironmentConfig = require('../config/environment');

class ProductService {
  constructor() {
    this.serviceName = 'product-service';
    this.version = '1.0.0';
    this.isInitialized = false;
  }

  /**
   * Initialize Product Service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Product Service already initialized');
      return;
    }

    try {
      // Validate environment configuration
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log(`🔧 Environment: ${envInfo.nodeEnv} (Vercel: ${envInfo.isVercel})`);

      // Check for production warnings
      const warnings = EnvironmentConfig.getProductionWarnings();
      if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      }

      // Test database connection
      await dbManager.connect();
      console.log('✅ Product Service database connected');

      // Test cache connection
      await CacheService.healthCheck();
      console.log('✅ Product Service cache connected');

      this.isInitialized = true;
      console.log('✅ Product Service initialized successfully');
    } catch (error) {
      console.error('❌ Product Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get all products with pagination and filtering
   */
  async getProducts(filters = {}, pagination = {}) {
    try {
      const {
        category,
        subcategory,
        minPrice,
        maxPrice,
        status = 'active',
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const {
        page = 1,
        limit = 20
      } = pagination;

      // Build query
      const query = { status };
      
      if (category) query.category = category;
      if (subcategory) query.subcategory = subcategory;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get products from database
      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      
      const [products, totalCount] = await Promise.all([
        productsCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        productsCollection.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      console.log(`✅ Products retrieved: ${products.length}/${totalCount}`);
      return {
        success: true,
        data: {
          products,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit
          }
        }
      };
    } catch (error) {
      console.error('❌ Get products failed:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    try {
      // Check cache first
      const cacheKey = `product:${productId}`;
      let product = await CacheService.get(cacheKey);

      if (!product) {
        // Get from database
        const db = await dbManager.connect();
        const productsCollection = db.collection('products');
        product = await productsCollection.findOne({
          _id: require('mongodb').ObjectId(productId)
        });

        if (product) {
          // Cache product for 30 minutes
          await CacheService.set(cacheKey, product, 1800);
        }
      }

      if (!product) {
        throw new Error('Product not found');
      }

      console.log(`✅ Product retrieved: ${product.name}`);
      return {
        success: true,
        data: product
      };
    } catch (error) {
      console.error('❌ Get product by ID failed:', error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData, artisanId) {
    try {
      const {
        name,
        description,
        price,
        category,
        subcategory,
        availableQuantity,
        images = [],
        isFeatured = false
      } = productData;

      // Validate required fields
      if (!name || !price || !category || !artisanId) {
        throw new Error('Missing required fields: name, price, category, artisanId');
      }

      // Create product object
      const product = {
        name,
        description: description || '',
        price: parseFloat(price),
        category,
        subcategory: subcategory || '',
        availableQuantity: parseInt(availableQuantity) || 0,
        status: 'active',
        artisan: require('mongodb').ObjectId(artisanId),
        images,
        isFeatured,
        soldCount: 0,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      const result = await productsCollection.insertOne(product);

      if (!result.insertedId) {
        throw new Error('Failed to create product');
      }

      product._id = result.insertedId;

      console.log(`✅ Product created: ${name}`);
      return {
        success: true,
        message: 'Product created successfully',
        data: product
      };
    } catch (error) {
      console.error('❌ Create product failed:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, updateData, artisanId) {
    try {
      const allowedFields = [
        'name', 'description', 'price', 'category', 'subcategory',
        'availableQuantity', 'status', 'images', 'isFeatured'
      ];
      
      const updateFields = {};

      // Filter allowed fields
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      }

      if (Object.keys(updateFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.updatedAt = new Date();

      // Update in database
      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      const result = await productsCollection.updateOne(
        { 
          _id: require('mongodb').ObjectId(productId),
          artisan: require('mongodb').ObjectId(artisanId)
        },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        throw new Error('Product not found or not owned by artisan');
      }

      // Invalidate cache
      const cacheKey = `product:${productId}`;
      await CacheService.del(cacheKey);

      console.log(`✅ Product updated: ${productId}`);
      return {
        success: true,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('❌ Update product failed:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId, artisanId) {
    try {
      // Delete from database
      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      const result = await productsCollection.deleteOne({
        _id: require('mongodb').ObjectId(productId),
        artisan: require('mongodb').ObjectId(artisanId)
      });

      if (result.deletedCount === 0) {
        throw new Error('Product not found or not owned by artisan');
      }

      // Invalidate cache
      const cacheKey = `product:${productId}`;
      await CacheService.del(cacheKey);

      console.log(`✅ Product deleted: ${productId}`);
      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('❌ Delete product failed:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10) {
    try {
      const cacheKey = 'featured-products';
      let products = await CacheService.get(cacheKey);

      if (!products) {
        const db = await dbManager.connect();
        const productsCollection = db.collection('products');
        products = await productsCollection
          .find({ status: 'active', isFeatured: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        // Cache for 1 hour
        await CacheService.set(cacheKey, products, 3600);
      }

      console.log(`✅ Featured products retrieved: ${products.length}`);
      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('❌ Get featured products failed:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category, limit = 20) {
    try {
      const cacheKey = `products-category:${category}`;
      let products = await CacheService.get(cacheKey);

      if (!products) {
        const db = await dbManager.connect();
        const productsCollection = db.collection('products');
        products = await productsCollection
          .find({ status: 'active', category })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        // Cache for 30 minutes
        await CacheService.set(cacheKey, products, 1800);
      }

      console.log(`✅ Products by category retrieved: ${products.length}`);
      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('❌ Get products by category failed:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm, filters = {}) {
    try {
      const {
        category,
        minPrice,
        maxPrice,
        limit = 20
      } = filters;

      // Build search query
      const query = {
        status: 'active',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (category) query.category = category;
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      const products = await productsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      console.log(`✅ Search results: ${products.length} products for "${searchTerm}"`);
      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('❌ Search products failed:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getCategories() {
    try {
      const cacheKey = 'product-categories';
      let categories = await CacheService.get(cacheKey);

      if (!categories) {
        const db = await dbManager.connect();
        const productsCollection = db.collection('products');
        categories = await productsCollection.distinct('category', { status: 'active' });

        // Cache for 1 hour
        await CacheService.set(cacheKey, categories, 3600);
      }

      console.log(`✅ Categories retrieved: ${categories.length}`);
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      console.error('❌ Get categories failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Product Service
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Test database connection
      const db = await dbManager.connect();
      const productsCollection = db.collection('products');
      await productsCollection.findOne({}, { projection: { _id: 1 } });
      
      // Test cache
      const cacheKey = 'health-check:product-service';
      await CacheService.set(cacheKey, { test: true }, 60);
      const cached = await CacheService.get(cacheKey);
      await CacheService.del(cacheKey);
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: responseTime,
        metadata: {
          database: 'connected',
          cache: cached ? 'working' : 'failed',
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metadata: { timestamp: new Date().toISOString() }
      };
    }
  }

  /**
   * Get products by artisan (my-products)
   */
  async getMyProducts(artisanId, options = {}) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status
      } = options;
      
      const skip = (page - 1) * limit;
      const query = { artisan: new ObjectId(artisanId) };
      
      if (status) query.status = status;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [products, totalCount] = await Promise.all([
        productsCollection.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        productsCollection.countDocuments(query)
      ]);
      
      await client.close();
      
      return {
        success: true,
        products: products,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Product Service - Get my products error:', error);
      throw error;
    }
  }

  /**
   * Enhanced search with location-based filtering
   */
  async enhancedSearch(searchParams = {}) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      const { 
        query: searchTerm,
        category,
        minPrice,
        maxPrice,
        location,
        latitude,
        longitude,
        radius = 50, // km
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = searchParams;
      
      const skip = (page - 1) * limit;
      const filter = { status: 'active' };
      
      // Text search
      if (searchTerm) {
        filter.$text = { $search: searchTerm };
      }
      
      // Category filter
      if (category) {
        filter.category = category;
      }
      
      // Price range filter
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }
      
      // Location filter (basic implementation - in production, use geospatial queries)
      if (location) {
        filter.location = { $regex: location, $options: 'i' };
      }
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // If text search, prioritize text score
      if (searchTerm) {
        sort.score = { $meta: 'textScore' };
      }
      
      const [products, totalCount] = await Promise.all([
        productsCollection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        productsCollection.countDocuments(filter)
      ]);
      
      await client.close();
      
      return {
        success: true,
        products: products,
        searchParams: searchParams,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      console.error('Product Service - Enhanced search error:', error);
      throw error;
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(productId, inventoryData, artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      // Verify ownership
      const product = await productsCollection.findOne({
        _id: new ObjectId(productId),
        artisan: new ObjectId(artisanId)
      });
      
      if (!product) {
        await client.close();
        throw new Error('Product not found or access denied');
      }
      
      const updateData = {
        inventory: inventoryData.inventory,
        updatedAt: new Date()
      };
      
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateData }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: 'Inventory updated successfully'
      };
    } catch (error) {
      console.error('Product Service - Update inventory error:', error);
      throw error;
    }
  }

  /**
   * Reduce product inventory (for order fulfillment)
   */
  async reduceInventory(productId, quantity, artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      // Verify ownership and sufficient inventory
      const product = await productsCollection.findOne({
        _id: new ObjectId(productId),
        artisan: new ObjectId(artisanId)
      });
      
      if (!product) {
        await client.close();
        throw new Error('Product not found or access denied');
      }
      
      if (product.inventory < quantity) {
        await client.close();
        throw new Error('Insufficient inventory');
      }
      
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { 
          $inc: { 
            inventory: -quantity,
            soldCount: quantity
          },
          $set: { updatedAt: new Date() }
        }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: 'Inventory reduced successfully'
      };
    } catch (error) {
      console.error('Product Service - Reduce inventory error:', error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId, stockData, artisanId) {
    try {
      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      
      await client.connect();
      const db = client.db();
      const productsCollection = db.collection('products');
      
      // Verify ownership
      const product = await productsCollection.findOne({
        _id: new ObjectId(productId),
        artisan: new ObjectId(artisanId)
      });
      
      if (!product) {
        await client.close();
        throw new Error('Product not found or access denied');
      }
      
      const updateData = {
        inventory: stockData.stock || stockData.inventory,
        updatedAt: new Date()
      };
      
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: updateData }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        throw new Error('Product not found');
      }
      
      return {
        success: true,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      console.error('Product Service - Update stock error:', error);
      throw error;
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: this.serviceName,
      version: this.version,
      initialized: this.isInitialized,
      endpoints: [
        'GET /api/products',
        'GET /api/products/:id',
        'POST /api/products',
        'PUT /api/products/:id',
        'DELETE /api/products/:id',
        'GET /api/products/featured',
        'GET /api/products/category/:category',
        'GET /api/products/search',
        'GET /api/products/categories',
        'GET /api/products/my-products',
        'GET /api/products/enhanced-search',
        'PUT /api/products/:id/inventory',
        'PATCH /api/products/:id/inventory',
        'PATCH /api/products/:id/reduce-inventory',
        'PATCH /api/products/:id/stock'
      ]
    };
  }
}

// Export singleton instance
module.exports = new ProductService();
