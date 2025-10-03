/**
 * BazaarMKT Server - Refactored Version
 * Phase 1: Foundation Setup with extracted config and middleware
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

// Import configuration and middleware
const { environment, database } = require('./config');
const { 
  databaseMiddleware, 
  auth, 
  validation, 
  errorHandler, 
  rateLimiter 
} = require('./middleware');

// Validate environment on startup
try {
  environment.validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

const app = express();

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
app.use(cors({
  origin: environment.getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Static file serving for uploads (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  console.log('📁 Static files served from:', path.join(__dirname, 'public/uploads'));
}

// Database middleware
app.use(databaseMiddleware);

// Input sanitization
app.use(validation.sanitizeInput);

// Rate limiting
app.use('/api', rateLimiter.apiRateLimiter);

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStats = database.getStats();
    
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        connected: dbStats.connected,
        connectionAttempts: dbStats.connectionAttempts,
        databaseName: dbStats.databaseName
      },
      config: {
        corsOrigins: environment.getCorsOrigins().length,
        rateLimit: environment.getRateLimitConfig()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: 'Debug endpoint not available in production'
    });
  }

  try {
    const dbStats = database.getStats();
    
    res.json({
      success: true,
      debug: {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbStats,
        config: {
          corsOrigins: environment.getCorsOrigins(),
          rateLimit: environment.getRateLimitConfig()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug information unavailable',
      error: error.message
    });
  }
});

// Database test endpoint
app.get('/api/test-mongo', async (req, res) => {
  try {
    const result = await database.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// ============================================================================
// ROUTE IMPORTS (Existing routers)
// ============================================================================

// Import existing route modules
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
// INLINE ENDPOINTS (To be extracted in Phase 2)
// ============================================================================

// TODO: Extract these inline endpoints to dedicated routers in Phase 2
// - Community endpoints (9 endpoints)
// - Geocoding endpoints (4 endpoints) 
// - Spotlight endpoints (3 endpoints)
// - Wallet endpoints (1 endpoint)
// - Inventory endpoints (2 endpoints)
// - Auth helper endpoints (3 endpoints)
// - User dashboard endpoints (3 endpoints)
// - Artisan dashboard endpoints (1 endpoint)

// Placeholder for inline endpoints - these will be moved to routers
app.get('/api/inline-endpoints-placeholder', (req, res) => {
  res.json({
    success: true,
    message: 'Inline endpoints will be extracted to routers in Phase 2',
    endpoints: [
      'Community endpoints (9)',
      'Geocoding endpoints (4)',
      'Spotlight endpoints (3)',
      'Wallet endpoints (1)',
      'Inventory endpoints (2)',
      'Auth helper endpoints (3)',
      'User dashboard endpoints (3)',
      'Artisan dashboard endpoints (1)'
    ]
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(errorHandler.handleNotFound);

// Global error handler
app.use(errorHandler.errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 4000;

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await database.closeDB();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', errorHandler.handleUnhandledRejection);

// Handle uncaught exceptions
process.on('uncaughtException', errorHandler.handleUncaughtException);

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 BazaarMKT Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🐛 Debug info: http://localhost:${PORT}/api/debug`);
    console.log(`📋 Phase 1 refactoring complete - Foundation setup done`);
  });
}

module.exports = app;
