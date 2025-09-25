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

// Database connection middleware for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    console.log('🔗 Attempting Mongoose connection...');
    console.log('🔗 Connection string exists:', !!process.env.MONGODB_URI);
    console.log('🔗 Connection string preview:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'NOT SET');
    
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds for serverless
      socketTimeoutMS: 15000, // 15 seconds
      connectTimeoutMS: 10000, // 10 seconds
      maxPoolSize: 1, // Single connection for serverless
      minPoolSize: 0, // No minimum connections
      maxIdleTimeMS: 15000, // Close connections after 15 seconds
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      retryWrites: true,
      w: 'majority'
    });
    
    isConnected = true;
    console.log('✅ Mongoose connected for serverless');
    console.log('✅ Connection state:', mongoose.connection.readyState);
  } catch (error) {
    console.error('❌ Mongoose connection failed:', error.message);
    console.error('❌ Error details:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error name:', error.name);
    isConnected = false;
  }
};

// Middleware to ensure database connection
app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectDB();
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString(),
    database: isConnected ? 'connected' : 'disconnected'
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
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
        databaseConnection: isConnected ? 'connected' : 'disconnected'
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
    
    const products = await productsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
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
    
    // Get popular products (sorted by soldCount or views)
    const popularProducts = await productsCollection
      .find({ status: 'active' })
      .sort({ soldCount: -1, views: -1 })
      .limit(8)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: popularProducts,
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
    
    // Get featured products
    const featuredProducts = await productsCollection
      .find({ status: 'active', isFeatured: true })
      .limit(6)
      .toArray();
    
    await client.close();
    
    res.json({
      success: true,
      data: featuredProducts,
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
    
    const product = await productsCollection.findOne({ 
      _id: new ObjectId(req.params.id),
      status: 'active'
    });
    
    await client.close();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
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
    
    // Get products (simplified without aggregation for now)
    const products = await productsCollection
      .find(query)
      .limit(parseInt(req.query.limit) || 20)
      .toArray();
    
    // Add basic artisan info (simplified)
    for (let product of products) {
      if (product.artisan) {
        try {
          // Convert string to ObjectId if needed
          const { ObjectId } = require('mongodb');
          let artisanId;
          if (typeof product.artisan === 'string') {
            if (ObjectId.isValid(product.artisan)) {
              artisanId = new ObjectId(product.artisan);
            } else {
              console.log('Invalid ObjectId string for artisan:', product.artisan);
              product.artisan = { _id: product.artisan, artisanName: 'Unknown Artisan', type: 'other', address: null, rating: 0 };
              continue;
            }
          } else {
            artisanId = product.artisan;
          }
          
          const artisan = await db.collection('artisans').findOne({ _id: artisanId });
          if (artisan) {
            product.artisan = {
              _id: artisan._id,
              artisanName: artisan.artisanName || artisan.businessName,
              type: artisan.type,
              address: artisan.address,
              rating: artisan.rating || 0
            };
          } else {
            product.artisan = {
              _id: product.artisan,
              artisanName: 'Unknown Artisan',
              type: 'other',
              address: null,
              rating: 0
            };
          }
        } catch (err) {
          console.log('Error fetching artisan for product:', product._id, err.message);
          product.artisan = {
            _id: product.artisan,
            artisanName: 'Unknown Artisan',
            type: 'other',
            address: null,
            rating: 0
          };
        }
      }
    }
    
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
      _id: new ObjectId(req.params.id),
      status: 'active'
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

// Load routes conditionally (these may fail due to Mongoose issues)
try {
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  const productRoutes = require('./src/routes/products');
  app.use('/api/products', productRoutes);
  console.log('✅ Product routes loaded');
} catch (error) {
  console.error('❌ Error loading product routes:', error.message);
}

try {
  const artisanRoutes = require('./src/routes/artisans');
  app.use('/api/artisans', artisanRoutes);
  console.log('✅ Artisan routes loaded');
} catch (error) {
  console.error('❌ Error loading artisan routes:', error.message);
}

try {
  const promotionalRoutes = require('./src/routes/promotional');
  app.use('/api/promotional', promotionalRoutes);
  console.log('✅ Promotional routes loaded');
} catch (error) {
  console.error('❌ Error loading promotional routes:', error.message);
}

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
