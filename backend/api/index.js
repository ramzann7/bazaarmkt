// Vercel Serverless Function Entry Point
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

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

// Per-request database connection middleware
app.use(async (req, res, next) => {
  // Skip database check for health endpoint
  if (req.path === '/api/health') {
    return next();
  }
  
  // Ensure database connection for API routes
  if (req.path.startsWith('/api/')) {
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

// Test endpoint to verify serverless function is working
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Serverless function is working',
    timestamp: new Date().toISOString(),
    routes: 'Routes will be loaded after this'
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
          const User = require('../src/models/user');
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
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// Load routes conditionally to prevent crashes
const loadRoutes = async () => {
  console.log('🔄 Loading routes...');
  
  try {
    // Core routes
    app.use('/api/auth', require('../src/routes/auth'));
    console.log('✅ Auth routes loaded');
  } catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
  }

  try {
    app.use('/api/products', require('../src/routes/products'));
    console.log('✅ Products routes loaded');
  } catch (error) {
    console.error('❌ Error loading products routes:', error.message);
  }

  try {
    app.use('/api/artisans', require('../src/routes/artisans'));
    console.log('✅ Artisans routes loaded');
  } catch (error) {
    console.error('❌ Error loading artisans routes:', error.message);
  }

  try {
    app.use('/api/promotional', require('../src/routes/promotional'));
    console.log('✅ Promotional routes loaded');
  } catch (error) {
    console.error('❌ Error loading promotional routes:', error.message);
  }

  try {
    app.use('/api/upload', require('../src/routes/upload'));
    console.log('✅ Upload routes loaded');
  } catch (error) {
    console.error('❌ Error loading upload routes:', error.message);
  }

  try {
    app.use('/api/orders', require('../src/routes/orders'));
    console.log('✅ Orders routes loaded');
  } catch (error) {
    console.error('❌ Error loading orders routes:', error.message);
  }

  try {
    app.use('/api/wallet', require('../src/routes/wallet'));
    console.log('✅ Wallet routes loaded');
  } catch (error) {
    console.error('❌ Error loading wallet routes:', error.message);
  }

  try {
    app.use('/api/geographic-settings', require('../src/routes/geographicSettings'));
    console.log('✅ Geographic settings routes loaded');
  } catch (error) {
    console.error('❌ Error loading geographic settings routes:', error.message);
  }
};

// Load routes
loadRoutes();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Serverless export - this is the key for Vercel
module.exports = app;
