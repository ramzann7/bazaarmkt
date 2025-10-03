/**
 * BazaarMKT Server - Simplified Version
 * Fixes critical issues identified in the refactored version
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Compression middleware
app.use(compression());

// Body parsing middleware
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

// Static file serving for uploads (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  console.log('📁 Static files served from:', path.join(__dirname, 'public/uploads'));
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

let client = null;
let db = null;

const connectToDatabase = async () => {
  try {
    if (client) {
      await client.close();
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      compressors: ['zlib']
    });

    await client.connect();
    db = client.db('bazarmkt');
    
    console.log(`✅ MongoDB connected successfully to database: ${db.databaseName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

// Database middleware
app.use(async (req, res, next) => {
  try {
    if (!db) {
      await connectToDatabase();
    }
    req.db = db;
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      connected: !!db
    }
  });
});

// Database test endpoint
app.get('/api/test-mongo', async (req, res) => {
  try {
    await db.admin().ping();
    res.json({ success: true, message: 'Database connection successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// ROUTE IMPORTS (Only existing routes)
// ============================================================================

// Import only routes that actually exist
const reviewsRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const communityRoutes = require('./routes/community');
const geocodingRoutes = require('./routes/geocoding');
const spotlightRoutes = require('./routes/spotlight');
const walletRoutes = require('./routes/wallet');
const inventoryRoutes = require('./routes/inventory');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const revenueRoutes = require('./routes/revenue');
const productsRoutes = require('./routes/products');
const artisansRoutes = require('./routes/artisans');
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const uploadRoutes = require('./routes/upload');
const promotionalRoutes = require('./routes/promotional');

// ============================================================================
// ROUTE MOUNTING
// ============================================================================

// Mount existing routes
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/spotlight', spotlightRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/artisans', artisansRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/promotional', promotionalRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Handle unhandled promise rejections (register early)
process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Rejection:', err.message, err.stack);
  process.exit(1);
});

// Handle uncaught exceptions (register early)
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    if (client) {
      await client.close();
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 BazaarMKT Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📋 Simplified server - no unnecessary abstractions`);
  });
}

module.exports = app;
