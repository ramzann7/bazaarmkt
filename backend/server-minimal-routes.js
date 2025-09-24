const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

// Request logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Per-request database connection middleware for serverless
app.use(async (req, res, next) => {
  console.log(`🔍 Middleware: ${req.method} ${req.path}`);
  
  // Skip database check for health endpoint
  if (req.path === '/api/health') {
    console.log('⏭️ Skipping DB check for health endpoint');
    return next();
  }
  
  // Ensure database connection for API routes
  if (req.path.startsWith('/api/')) {
    console.log('🔍 API route detected, checking DB connection...');
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          connectTimeoutMS: 5000,
          maxPoolSize: 1,
          minPoolSize: 0,
          maxIdleTimeMS: 1000,
          bufferMaxEntries: 0,
          bufferCommands: false,
        });
        console.log('✅ MongoDB connected');
      } else {
        console.log('✅ MongoDB already connected');
      }
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      return res.status(500).json({ message: 'Database connection failed' });
    }
  }
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      API_URL: process.env.API_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      databaseConnection: 'unknown'
    };

    try {
      if (process.env.MONGODB_URI) {
        if (mongoose.connection.readyState === 1) {
          const User = require('./src/models/user');
          const userCount = await User.countDocuments();
          envInfo.databaseConnection = 'connected';
          envInfo.userCount = userCount;
        } else {
          envInfo.databaseConnection = 'connecting';
          envInfo.connectionState = mongoose.connection.readyState;
        }
      } else {
        envInfo.databaseConnection = 'no_uri';
      }
    } catch (dbError) {
      envInfo.databaseConnection = 'error';
      envInfo.databaseError = dbError.message;
    }

    res.json({
      success: true,
      message: 'Debug endpoint working',
      environment: envInfo,
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

// Simple test route
app.get('/api/simple-test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test route is working',
    timestamp: new Date().toISOString()
  });
});

// Load only essential routes
console.log('🔄 Loading essential routes...');

try {
  console.log('🔄 Loading auth routes...');
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
  console.error('❌ Full error:', error);
}

try {
  console.log('🔄 Loading product routes...');
  const productRoutes = require('./src/routes/products');
  app.use('/api/products', productRoutes);
  console.log('✅ Product routes loaded');
} catch (error) {
  console.error('❌ Error loading product routes:', error.message);
  console.error('❌ Full error:', error);
}

try {
  console.log('🔄 Loading artisan routes...');
  const artisanRoutes = require('./src/routes/artisans');
  app.use('/api/artisans', artisanRoutes);
  console.log('✅ Artisan routes loaded');
} catch (error) {
  console.error('❌ Error loading artisan routes:', error.message);
  console.error('❌ Full error:', error);
}

console.log('✅ Essential routes loaded, server ready');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export for Vercel
module.exports = app;
