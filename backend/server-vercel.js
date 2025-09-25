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
    
    // Force a new connection attempt
    isConnected = false;
    await connectDB();
    
    if (isConnected) {
      // Try a simple query
      const User = require('./src/models/user');
      const userCount = await User.countDocuments();
      
      res.json({
        success: true,
        message: 'Database connection successful',
        userCount: userCount,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database connection failed - connection not established',
        timestamp: new Date().toISOString()
      });
    }
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

// Load routes conditionally
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
