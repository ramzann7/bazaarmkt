const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');

const app = express();

// Middleware
app.use(compression());
app.use(express.json({ limit: '4.5mb' }));
app.use(express.urlencoded({ extended: true, limit: '4.5mb' }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5180',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://bazaarmkt.ca',
  'https://www.bazaarmkt.ca',
  /^https:\/\/bazaarmkt-.*\.vercel\.app$/
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// IMMEDIATE DEBUG - Test if routes register at all
app.get('/api/debug/immediate', (req, res) => {
  res.json({
    success: true,
    message: 'Immediate debug endpoint working - routes are registering'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Debug endpoint working',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Use native MongoDB client instead of Mongoose
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Database connection successful (using native client)',
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message,
      errorType: error.name,
      errorCode: error.code,
      fullError: process.env.NODE_ENV === 'development' ? error.toString() : 'Error details hidden in production',
      timestamp: new Date().toISOString()
    });
  }
});

// Direct MongoDB connection test
app.get('/api/test-mongo', async (req, res) => {
  try {
    console.log('🧪 Direct MongoDB connection test...');
    
    // Test connection without mongoose
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ Direct MongoDB connection successful');
    
    // Test a simple operation
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Direct MongoDB connection successful',
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 Direct MongoDB test error:', error);
    res.status(500).json({
      success: false,
      message: 'Direct MongoDB connection failed',
      error: error.message,
      errorType: error.name,
      errorCode: error.code,
      fullError: process.env.NODE_ENV === 'development' ? error.toString() : 'Error details hidden in production',
      timestamp: new Date().toISOString()
    });
  }
});

// Environment check endpoint
app.get('/api/env-check', (req, res) => {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET (length: ' + process.env.MONGODB_URI.length + ')' : 'NOT SET',
      MONGODB_URI_PREVIEW: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET',
      BREVO_API_KEY: process.env.BREVO_API_KEY ? 'SET' : 'NOT SET',
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET'
    };
    
    res.json({
      success: true,
      message: 'Environment variables check',
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Environment check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// PRODUCT ENDPOINTS
// ============================================================================

// Get all products with optional filters
app.get('/api/products', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
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
        $addFields: {
          artisanObjectId: { $toObjectId: '$artisan' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanObjectId',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [
            { $project: { 
              artisanName: 1, 
              businessName: 1, 
              type: 1, 
              address: 1, 
              deliveryOptions: 1, 
              pickupLocation: 1,
              pickupInstructions: 1,
              pickupHours: 1,
              deliveryInstructions: 1,
              rating: 1,
              businessImage: 1
            }}
          ]
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      { $unset: ['artisanInfo', 'artisanObjectId'] }
    ]).toArray();
    
    await client.close();
    
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
});

// Get popular products
app.get('/api/products/popular', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get popular products with artisan population
    const popularProducts = await productsCollection.aggregate([
      { $match: { status: 'active' } },
      { $sort: { soldCount: -1, views: -1 } },
      { $limit: 8 },
      {
        $addFields: {
          artisanObjectId: { $toObjectId: '$artisan' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanObjectId',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [
            { $project: { 
              artisanName: 1, 
              businessName: 1, 
              type: 1, 
              address: 1, 
              deliveryOptions: 1, 
              pickupLocation: 1,
              pickupInstructions: 1,
              pickupHours: 1,
              deliveryInstructions: 1,
              rating: 1,
              businessImage: 1
            }}
          ]
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      { $unset: ['artisanInfo', 'artisanObjectId'] }
    ]).toArray();
    
    await client.close();
    
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
});

// Get featured products
app.get('/api/products/featured', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get featured products with artisan population
    const featuredProducts = await productsCollection.aggregate([
      { $match: { status: 'active', isFeatured: true } },
      { $limit: 6 },
      {
        $addFields: {
          artisanObjectId: { $toObjectId: '$artisan' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanObjectId',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [
            { $project: { 
              artisanName: 1, 
              businessName: 1, 
              type: 1, 
              address: 1, 
              deliveryOptions: 1, 
              pickupLocation: 1,
              pickupInstructions: 1,
              pickupHours: 1,
              deliveryInstructions: 1,
              rating: 1,
              businessImage: 1
            }}
          ]
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      { $unset: ['artisanInfo', 'artisanObjectId'] }
    ]).toArray();
    
    await client.close();
    
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
});

// Enhanced search endpoint with location-based filtering
app.get('/api/products/enhanced-search', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
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
        $addFields: {
          artisanObjectId: { $toObjectId: '$artisan' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanObjectId',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [
            { $project: { 
              artisanName: 1, 
              businessName: 1, 
              type: 1, 
              address: 1, 
              deliveryOptions: 1, 
              pickupLocation: 1,
              pickupInstructions: 1,
              pickupHours: 1,
              deliveryInstructions: 1,
              rating: 1,
              businessImage: 1
            }}
          ]
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      { $unset: ['artisanInfo', 'artisanObjectId'] }
    ]).toArray();
    
    await client.close();
    
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
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Validate ObjectId before using it
    if (!ObjectId.isValid(req.params.id)) {
      await client.close();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID format' 
      });
    }
    
    // Get product with artisan population
    const products = await productsCollection.aggregate([
      { $match: { _id: new ObjectId(req.params.id), status: 'active' } },
      {
        $addFields: {
          artisanObjectId: { $toObjectId: '$artisan' }
        }
      },
      {
        $lookup: {
          from: 'artisans',
          localField: 'artisanObjectId',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [
            { $project: { 
              artisanName: 1, 
              businessName: 1, 
              type: 1, 
              address: 1, 
              deliveryOptions: 1, 
              pickupLocation: 1,
              pickupInstructions: 1,
              pickupHours: 1,
              deliveryInstructions: 1,
              rating: 1,
              businessImage: 1
            }}
          ]
        }
      },
      {
        $addFields: {
          artisan: { $arrayElemAt: ['$artisanInfo', 0] }
        }
      },
      { $unset: ['artisanInfo', 'artisanObjectId'] }
    ]).toArray();
    
    await client.close();
    
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
});

// Get product categories
app.get('/api/products/categories/list', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get unique categories
    const categories = await productsCollection.distinct('category', { status: 'active' });
    const subcategories = await productsCollection.distinct('subcategory', { status: 'active' });
    
    await client.close();
    
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
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    const { email, password, firstName, lastName, phone, userType = 'customer' } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      role: userType, // Database uses 'role' field
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(user);
    const userId = result.insertedId;
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userId.toString(), email: user.email, userType: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await client.close();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.role, // Frontend expects userType
          isActive: user.isActive,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await client.close();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, userType: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.role, // Frontend expects userType
          isActive: user.isActive,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get user profile
app.get('/api/auth/profile', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await client.close();
    
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role, // Frontend expects role field
          userType: user.role, // Keep userType for backward compatibility
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// Update user profile
app.put('/api/auth/profile', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { firstName, lastName, phone } = req.body;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updatedUser = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    await client.close();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          userType: updatedUser.role, // Frontend expects userType
          isActive: updatedUser.isActive,
          isVerified: updatedUser.isVerified,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// ============================================================================
// ORDER MANAGEMENT ENDPOINTS
// ============================================================================

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    // Calculate total and validate items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const product = await productsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(item.productId),
        status: 'active'
      });
      
      if (!product) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or inactive`
        });
      }
      
      if (product.availableQuantity < item.quantity) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for product ${product.name}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
        itemTotal: itemTotal,
        artisanId: new (require('mongodb')).ObjectId(product.artisan)
      });
    }
    
    // Create order
    const order = {
      userId: new (require('mongodb')).ObjectId(decoded.userId),
      items: validatedItems,
      totalAmount,
      status: 'pending',
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(order);
    const orderId = result.insertedId;
    
    // Update product quantities
    for (const item of validatedItems) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: -item.quantity,
            soldCount: item.quantity
          }
        }
      );
    }
    
    await client.close();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          _id: orderId,
          ...order,
          totalAmount
        }
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Get user orders
app.get('/api/orders', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    const orders = await ordersCollection
      .find({ userId: new (require('mongodb')).ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: {
        orders,
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!order) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    await client.close();
    
    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
});

// Update order status (for artisans/admin)
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// Cancel order (patron only)
app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    // Find the order and verify ownership
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!order) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }
    
    // Update order status
    await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'cancelled',
          updatedAt: new Date()
        }
      }
    );
    
    // Restore product quantities
    for (const item of order.items) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: item.quantity,
            soldCount: -item.quantity
          }
        }
      );
    }
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
});

// Decline order (artisan only)
app.put('/api/orders/:id/decline', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Decline reason is required'
      });
    }
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    const artisansCollection = db.collection('artisans');
    
    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!artisan) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Find the order and verify it belongs to this artisan
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      artisan: artisan._id
    });
    
    if (!order) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be declined
    if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'declined') {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Order cannot be declined'
      });
    }
    
    // Update order status
    await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'declined',
          declineReason: reason.trim(),
          updatedAt: new Date()
        }
      }
    );
    
    // Restore product quantities
    for (const item of order.items) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: item.quantity,
            soldCount: -item.quantity
          }
        }
      );
    }
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Order declined successfully'
    });
  } catch (error) {
    console.error('Decline order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to decline order',
      error: error.message
    });
  }
});

// Update payment status
app.put('/api/orders/:id/payment', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          paymentStatus,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
});

// ============================================================================
// FILE UPLOAD ENDPOINTS
// ============================================================================

// Upload image (using Vercel Blob)
app.post('/api/upload', async (req, res) => {
  try {
    const { put } = require('@vercel/blob');
    const multer = require('multer');
    
    // Configure multer for memory storage
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
    
    // Use multer middleware
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = req.file.originalname.split('.').pop();
        const filename = `image-${timestamp}-${randomString}.${fileExtension}`;
        
        // Upload to Vercel Blob
        const blob = await put(filename, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype
        });
        
        res.json({
          success: true,
          message: 'File uploaded successfully',
          data: {
            url: blob.url,
            filename: filename,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      } catch (uploadError) {
        console.error('Blob upload error:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Failed to upload file',
          error: uploadError.message
        });
      }
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Upload multiple images
app.post('/api/upload/multiple', async (req, res) => {
  try {
    const { put } = require('@vercel/blob');
    const multer = require('multer');
    
    // Configure multer for memory storage
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // Maximum 10 files
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
    
    // Use multer middleware
    upload.array('images', 10)(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }
      
      try {
        const uploadPromises = req.files.map(async (file) => {
          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileExtension = file.originalname.split('.').pop();
          const filename = `image-${timestamp}-${randomString}.${fileExtension}`;
          
          // Upload to Vercel Blob
          const blob = await put(filename, file.buffer, {
            access: 'public',
            contentType: file.mimetype
          });
          
          return {
            url: blob.url,
            filename: filename,
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname
          };
        });
        
        const uploadedFiles = await Promise.all(uploadPromises);
        
        res.json({
          success: true,
          message: 'Files uploaded successfully',
          data: {
            files: uploadedFiles,
            count: uploadedFiles.length
          }
        });
      } catch (uploadError) {
        console.error('Blob upload error:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Failed to upload files',
          error: uploadError.message
        });
      }
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Delete uploaded file
app.delete('/api/upload/:filename', async (req, res) => {
  try {
    const { del } = require('@vercel/blob');
    
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }
    
    // Delete from Vercel Blob
    await del(filename);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

// ============================================================================
// ARTISAN ENDPOINTS
// ============================================================================

// Get all artisans
app.get('/api/artisans', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    // Build query - remove status filter to see all artisans
    const query = {};
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }
    if (req.query.search) {
      query.$or = [
        { artisanName: { $regex: req.query.search, $options: 'i' } },
        { businessName: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const artisans = await artisansCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: artisans,
      count: artisans.length
    });
  } catch (error) {
    console.error('Error fetching artisans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching artisans',
      error: error.message
    });
  }
});

// Create artisan profile
app.post('/api/artisans', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { artisanName, businessName, category, type, description, address, phone, email } = req.body;
    
    // Validate required fields
    if (!artisanName || !businessName || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Artisan name, business name, category, and type are required'
      });
    }
    
    // Validate userId format
    if (!decoded.userId || !(require('mongodb')).ObjectId.isValid(decoded.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if artisan profile already exists
    const existingArtisan = await artisansCollection.findOne({
      user: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (existingArtisan) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Artisan profile already exists'
      });
    }
    
    // Create artisan profile
    const artisan = {
      user: new (require('mongodb')).ObjectId(decoded.userId),
      artisanName,
      businessName,
      category,
      type,
      description: description || '',
      address: address || {},
      phone: phone || '',
      email: email || user.email,
      status: 'active',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await artisansCollection.insertOne(artisan);
    const artisanId = result.insertedId;
    
    // Update user role to artisan
    await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { 
        $set: { 
          role: 'artisan',
          updatedAt: new Date()
        }
      }
    );
    
    await client.close();
    
    res.status(201).json({
      success: true,
      message: 'Artisan profile created successfully',
      data: {
        artisan: {
          _id: artisanId,
          ...artisan
        }
      }
    });
  } catch (error) {
    console.error('Create artisan profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create artisan profile',
      error: error.message
    });
  }
});

// Get single artisan by ID
app.get('/api/artisans/:id', async (req, res) => {
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    const productsCollection = db.collection('products');
    
    // Validate ObjectId before using it
    if (!ObjectId.isValid(req.params.id)) {
      await client.close();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid artisan ID format' 
      });
    }
    
    const artisan = await artisansCollection.findOne({ 
      _id: new ObjectId(req.params.id)
      // Removed status filter since artisans have status: null
    });
    
    if (!artisan) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }
    
    // Get artisan's products if requested
    if (req.query.includeProducts === 'true') {
      const products = await productsCollection
        .find({ 
          artisan: new ObjectId(req.params.id),
          status: 'active'
        })
        .toArray();
      artisan.products = products;
    }
    
    await client.close();
    
    res.json({
      success: true,
      data: artisan
    });
  } catch (error) {
    console.error('Error fetching artisan:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching artisan',
      error: error.message
    });
  }
});

// ============================================================================
// PROMOTIONAL ENDPOINTS
// ============================================================================

// Get promotional featured products
app.get('/api/promotional/products/featured', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get promotional featured products
    const featuredProducts = await productsCollection
      .find({ status: 'active', isFeatured: true })
      .limit(parseInt(req.query.limit) || 6)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: featuredProducts,
      products: featuredProducts, // Frontend compatibility
      count: featuredProducts.length
    });
  } catch (error) {
    console.error('Error fetching promotional featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional featured products',
      error: error.message
    });
  }
});

// Get promotional sponsored products
app.get('/api/promotional/products/sponsored', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get sponsored products (products with promotional features)
    const sponsoredProducts = await productsCollection
      .find({ 
        status: 'active',
        'promotionalFeatures.0': { $exists: true }
      })
      .limit(parseInt(req.query.limit) || 3)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: sponsoredProducts,
      count: sponsoredProducts.length
    });
  } catch (error) {
    console.error('Error fetching sponsored products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sponsored products',
      error: error.message
    });
  }
});

// Get promotional pricing
app.get('/api/promotional/pricing', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db();
    const productsCollection = db.collection('products');
    
    // Get products with promotional pricing
    const promotionalProducts = await productsCollection.find({
      status: 'active',
      $or: [
        { 'promotionalFeatures.type': 'discount' },
        { 'promotionalFeatures.type': 'sale' },
        { 'promotionalFeatures.type': 'special_offer' }
      ]
    }).toArray();
    
    // Calculate promotional pricing
    const pricingData = promotionalProducts.map(product => {
      const basePrice = product.price || 0;
      let discountedPrice = basePrice;
      let discountPercentage = 0;
      
      if (product.promotionalFeatures && product.promotionalFeatures.length > 0) {
        const promo = product.promotionalFeatures[0];
        if (promo.type === 'discount' && promo.value) {
          discountPercentage = promo.value;
          discountedPrice = basePrice * (1 - discountPercentage / 100);
        } else if (promo.type === 'sale' && promo.salePrice) {
          discountedPrice = promo.salePrice;
          discountPercentage = ((basePrice - discountedPrice) / basePrice) * 100;
        }
      }
      
      return {
        productId: product._id,
        name: product.name,
        basePrice: basePrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discountPercentage: Math.round(discountPercentage * 100) / 100,
        savings: Math.round((basePrice - discountedPrice) * 100) / 100
      };
    });
    
    await client.close();
    
    res.json({
      success: true,
      pricing: pricingData,
      count: pricingData.length
    });
  } catch (error) {
    console.error('Error fetching promotional pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promotional pricing',
      error: error.message
    });
  }
});

// ============================================================================
// MISSING FEATURES - RESTORED
// ============================================================================

// Import missing feature modules
const reviewsFeatures = require('./missing-features/reviews');
const favoritesFeatures = require('./missing-features/favorites');
const notificationsFeatures = require('./missing-features/notifications');
const communityFeatures = require('./missing-features/community');
const profileFeatures = require('./missing-features/profile-management');
const additionalFeatures = require('./missing-features/additional-services');

// ============================================================================
// REVIEWS ENDPOINTS
// ============================================================================

// Create a review
app.post('/api/reviews', reviewsFeatures.createReview);

// Get reviews for a product
app.get('/api/reviews/product/:productId', reviewsFeatures.getProductReviews);

// Get reviews for an artisan
app.get('/api/reviews/artisan/:artisanId', reviewsFeatures.getArtisanReviews);

// Update a review
app.put('/api/reviews/:reviewId', reviewsFeatures.updateReview);

// Delete a review
app.delete('/api/reviews/:reviewId', reviewsFeatures.deleteReview);

// ============================================================================
// FAVORITES ENDPOINTS
// ============================================================================

// Add to favorites
app.post('/api/favorites', favoritesFeatures.addToFavorites);

// Remove from favorites
app.delete('/api/favorites/:productId', favoritesFeatures.removeFromFavorites);

// Get user favorites
app.get('/api/favorites', favoritesFeatures.getUserFavorites);

// Check favorite status
app.get('/api/favorites/status/:productId', favoritesFeatures.checkFavoriteStatus);

// Get favorites with filters
app.get('/api/favorites/filtered', favoritesFeatures.getFavoritesWithFilters);

// ============================================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================================

// Get user notifications
app.get('/api/notifications', notificationsFeatures.getUserNotifications);

// Mark notification as read
app.put('/api/notifications/:notificationId/read', notificationsFeatures.markAsRead);

// Mark all notifications as read
app.put('/api/notifications/read-all', notificationsFeatures.markAllAsRead);

// Delete notification
app.delete('/api/notifications/:notificationId', notificationsFeatures.deleteNotification);

// Send notification (admin/system use)
app.post('/api/notifications/send', notificationsFeatures.sendNotification);

// ============================================================================
// COMMUNITY ENDPOINTS
// ============================================================================

// Community posts - Direct implementation for reliability
app.get('/api/community/posts', async (req, res) => {
  try {
    const { type, category, limit = 20, offset = 0, populate } = req.query;
    
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const postsCollection = db.collection('communityposts');

    // Build pipeline
    const pipeline = [
      { $match: { status: 'published' } },
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
    
    await client.close();

    res.json({
      success: true,
      data: transformedPosts,
      count: transformedPosts.length
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get posts',
      error: error.message
    });
  }
});
app.post('/api/community/posts', communityFeatures.createPost);
app.put('/api/community/posts/:postId', communityFeatures.updatePost);
app.delete('/api/community/posts/:postId', communityFeatures.deletePost);
app.post('/api/community/posts/:postId/like', communityFeatures.likePost);
app.delete('/api/community/posts/:postId/like', communityFeatures.likePost); // Same handler toggles

// Community comments
app.get('/api/community/posts/:postId/comments', communityFeatures.getComments);
app.post('/api/community/posts/:postId/comments', communityFeatures.createComment);

// Community stats and leaderboards
app.get('/api/community/stats', communityFeatures.getCommunityStats);
app.get('/api/community/leaderboard', communityFeatures.getEngagementLeaderboard);
app.get('/api/community/leaderboard/engagement', communityFeatures.getEngagementLeaderboard);

// ============================================================================
// PROFILE MANAGEMENT ENDPOINTS
// ============================================================================

// Profile updates
app.put('/api/profile', profileFeatures.updateProfile);
app.put('/api/profile/addresses', profileFeatures.updateAddresses);
app.post('/api/profile/addresses', profileFeatures.addAddress);

// Guest user management
app.get('/api/auth/check-email/:email', profileFeatures.checkEmail);
app.post('/api/auth/guest', profileFeatures.createGuestProfile);
app.get('/api/auth/guest/:guestId', profileFeatures.getGuestProfile);
app.put('/api/auth/guest/:guestId', profileFeatures.updateGuestProfile);
app.post('/api/auth/guest/:guestId/convert', profileFeatures.convertGuestToUser);

// Order management
app.get('/api/orders/buyer', profileFeatures.getBuyerOrders);
app.get('/api/orders/artisan', profileFeatures.getArtisanOrders);
app.post('/api/orders/guest', profileFeatures.createGuestOrder);

// Test endpoint to check if the route is working
app.get('/api/test/orders-artisan', (req, res) => {
  res.json({
    success: true,
    message: 'Orders artisan endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Artisan profile management
app.get('/api/profile/artisan', profileFeatures.getArtisanProfile);
app.post('/api/profile/artisan', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { artisanName, businessName, category, type, description, address, phone, email } = req.body;
    
    // Validate required fields
    if (!artisanName || !businessName || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Artisan name, business name, category, and type are required'
      });
    }
    
    // Validate userId format
    if (!decoded.userId || !(require('mongodb')).ObjectId.isValid(decoded.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if artisan profile already exists
    const existingArtisan = await artisansCollection.findOne({
      user: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (existingArtisan) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Artisan profile already exists'
      });
    }
    
    // Create artisan profile
    const artisan = {
      user: new (require('mongodb')).ObjectId(decoded.userId),
      artisanName,
      businessName,
      category,
      type,
      description: description || '',
      address: address || {},
      phone: phone || '',
      email: email || user.email,
      status: 'active',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await artisansCollection.insertOne(artisan);
    const artisanId = result.insertedId;
    
    // Update user role to artisan
    await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { 
        $set: { 
          role: 'artisan',
          updatedAt: new Date()
        }
      }
    );
    
    await client.close();
    
    res.status(201).json({
      success: true,
      message: 'Artisan profile created successfully',
      data: {
        artisan: {
          _id: artisanId,
          ...artisan
        }
      }
    });
  } catch (error) {
    console.error('Create artisan profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create artisan profile',
      error: error.message
    });
  }
});

// Debug endpoint to check artisan products and orders
app.get('/api/debug/artisan-data', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    const productsCollection = db.collection('products');
    const ordersCollection = db.collection('orders');
    
    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!artisan) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Get products for this artisan
    const products = await productsCollection.find({
      artisan: artisan._id
    }).toArray();
    
    // Get orders for this artisan
    const orders = await ordersCollection.find({
      'items.artisanId': artisan._id
    }).toArray();
    
    // Get all orders to see structure
    const allOrders = await ordersCollection.find({}).limit(3).toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: {
        artisanId: artisan._id,
        artisanName: artisan.artisanName,
        productsCount: products.length,
        products: products.map(p => ({ _id: p._id, name: p.name, artisan: p.artisan })),
        ordersCount: orders.length,
        orders: orders.map(o => ({ _id: o._id, items: o.items?.map(item => ({ artisanId: item.artisanId })) })),
        sampleOrders: allOrders.map(o => ({
          _id: o._id,
          items: o.items?.map(item => ({
            productId: item.productId,
            artisanId: item.artisanId,
            artisanIdType: typeof item.artisanId
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Debug artisan data error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

// Debug endpoint to check artisan profile status
app.get('/api/debug/artisan-status', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const jwt = require('jsonwebtoken');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');
    
    // Get user info
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    // Get artisan profile
    const artisan = await artisansCollection.findOne({
      user: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    await client.close();
    
    res.json({
      success: true,
      data: {
        userId: decoded.userId,
        userExists: !!user,
        userRole: user?.role,
        artisanExists: !!artisan,
        artisanId: artisan?._id
      }
    });
  } catch (error) {
    console.error('Debug artisan status error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

// ============================================================================
// ADDITIONAL SERVICES ENDPOINTS
// ============================================================================

// Spotlight
app.get('/api/spotlight/status', additionalFeatures.getSpotlightStatus);

// Wallet
app.get('/api/wallet/balance', additionalFeatures.getWalletBalance);
app.get('/api/wallet/transactions', additionalFeatures.getWalletTransactions);

// Geocoding
app.post('/api/geocoding/address', additionalFeatures.geocodeAddress);

// Revenue
app.get('/api/revenue/artisan', additionalFeatures.getArtisanRevenue);

// Admin
app.get('/api/admin/stats', additionalFeatures.getAdminStats);

// Enhanced search
app.get('/api/search/enhanced', additionalFeatures.enhancedSearch);

// Business analytics
app.get('/api/analytics/business', additionalFeatures.getBusinessAnalytics);

// All routes are now implemented directly in this file

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Export for Vercel
module.exports = app;