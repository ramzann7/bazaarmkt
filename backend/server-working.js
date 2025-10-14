// Load environment variables (only needed for local development)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  require('dotenv').config({ path: './.env' });
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
// REMOVED: compression - Vercel handles compression at edge
// const compression = require('compression');
const path = require('path');
// REMOVED: sharp - not needed for serverless (Vercel Blob has image optimization)

// REMOVED: In-memory cache - doesn't persist in serverless
// Vercel provides edge caching; use Redis if app-level caching is needed

// Import database utilities from centralized config  
const { getDB, closeDB, getStats } = require('./config/database');

const app = express();
app.set('trust proxy', 1);

// Security Headers - Helmet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com', 'https://maps.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://*.vercel-storage.com'],
      connectSrc: [
        "'self'", 
        'https://api.stripe.com', 
        'https://api.brevo.com',
        'https://maps.googleapis.com',
        'https://geocoding-api.open-cage.com',
        'https://api.uber.com',
        'https://*.vercel-storage.com'
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

// Stripe Webhook - Must use raw body, so handle it before express.json()
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Manually add database to request
    try {
      req.db = await getDB();
      const { handleStripeWebhook } = require('./routes/webhooks/stripe');
      await handleStripeWebhook(req, res);
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  }
);

// Middleware
app.use(express.json({ limit: '4.5mb' }));

// REMOVED: Compression middleware - Vercel handles compression at the edge
// No need for application-level compression in serverless
// This reduces function execution time and compute costs

// CORS Configuration - Environment-based
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://bazaarmkt.ca',
      'https://www.bazaarmkt.ca',
      'https://bazaarmkt.vercel.app',
      /^https:\/\/bazaarmkt-.*\.vercel\.app$/ // Preview deployments
    ]
  : [
      'http://localhost:5173',
      'http://localhost:5180',
      'http://localhost:3000',
      'http://localhost:4000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, Vercel cron, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
}));

// REMOVED: In-memory cache middleware - doesn't persist in serverless
// REMOVED: Broken inline database code - now using config/database.js module

// Database middleware - reuse connection with proper error handling
app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next();
  
  try {
    req.db = await getDB();
    next();
  } catch (error) {
    console.error('DB error:', error);
    res.status(500).json({ success: false, message: 'Database unavailable' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Redis health check
app.get('/api/health/redis', async (req, res) => {
  try {
    const redisCacheService = require('./services/redisCacheService');
    const health = await redisCacheService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// REMOVED: Image optimization endpoint - Vercel has read-only filesystem
// Images should be served from Vercel Blob Storage with built-in optimization
// See: https://vercel.com/docs/storage/vercel-blob

// REMOVED: Static file serving - Vercel filesystem is read-only
// All uploads must use Vercel Blob Storage instead of local /public/uploads
// Vercel Blob provides CDN, automatic optimization, and global distribution

// Redirect old /uploads URLs to Vercel Blob (if configured)
if (process.env.VERCEL_BLOB_URL) {
  app.get('/uploads/*', (req, res) => {
    const filename = req.params[0];
    const blobUrl = `${process.env.VERCEL_BLOB_URL}/${filename}`;
    res.redirect(301, blobUrl);
  });
}

// Import routes that ACTUALLY EXIST
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const communityRoutes = require('./routes/community');
const promotionalRoutes = require('./routes/promotional');
const artisansRoutes = require('./routes/artisans');
const ordersRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const revenueRoutes = require('./routes/revenue');
const walletRoutes = require('./routes/wallet');
const spotlightRoutes = require('./routes/spotlight');
const geocodingRoutes = require('./routes/geocoding');
const platformSettingsRoutes = require('./routes/platform-settings');
const geographicSettingsRoutes = require('./routes/geographic-settings');
const deliveryRoutes = require('./routes/delivery');
const searchRoutes = require('./routes/search');
const timelineRoutes = require('./routes/timeline');

// ============================================================================
// WALLET TRANSACTION HELPER FUNCTIONS
// ============================================================================

/**
 * Record a wallet transaction
 * @param {Object} db - Database connection
 * @param {Object} transactionData - Transaction data
 */
const recordWalletTransaction = async (db, transactionData) => {
  try {
    const {
      artisanId,
      type,
      amount,
      description,
      reference = null,
      orderId = null,
      status = 'completed',
      balanceAfter = null
    } = transactionData;

    const transaction = {
      walletId: artisanId, // Using artisanId as walletId for simplicity
      artisanId: new ObjectId(artisanId),
      type,
      amount,
      description,
      reference,
      orderId: orderId ? new ObjectId(orderId) : null,
      status,
      balanceAfter,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('wallettransactions').insertOne(transaction);
    console.log(`💰 Wallet transaction recorded: ${type} - ${amount} - ${description}`);
  } catch (error) {
    console.error('Error recording wallet transaction:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Make helper functions available to routes
app.locals.recordWalletTransaction = recordWalletTransaction;

// Health check endpoint (works without database initialization)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Server is running'
  });
});

// Ensure database initialization before handling other API requests (with timeout)
app.use('/api', async (req, res, next) => {
  // Skip initialization for health check
  if (req.path === '/health') {
    return next();
  }
  
  try {
    // Add timeout to prevent indefinite blocking (10 seconds max)
    const initPromise = ensureInitialization();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Initialization timeout')), 10000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    next();
  } catch (error) {
    console.error('❌ Database initialization failed for request:', req.path, error.message);
    
    // Check if it's a timeout vs actual database error
    if (error.message === 'Initialization timeout') {
      // Continue anyway - database might be working even if initialization is slow
      console.log('⚠️ Initialization timeout, continuing with request...');
      next();
    } else {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Database is initializing, please try again in a moment',
        code: 'DB_INIT_FAILED'
      });
    }
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/promotional', promotionalRoutes);
app.use('/api/artisans', artisansRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/spotlight', spotlightRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/geographic-settings', geographicSettingsRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', timelineRoutes);

// ============================================================================
// SPOTLIGHT ENDPOINTS
// ============================================================================

// Get active spotlights
app.get('/api/spotlight/active-public', async (req, res) => {
  try {
    const db = await getDB();
    
    // Get active spotlights from artisans collection
    const spotlights = await db.collection('artisans').aggregate([
      {
        $match: {
          isSpotlight: true,
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profilePicture: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'artisan',
          as: 'featuredProducts',
          pipeline: [
            { $match: { status: 'active' } },
            { $limit: 3 },
            { $project: { name: 1, price: 1, primaryImage: 1, category: 1 } }
          ]
        }
      },
      {
        $project: {
          artisanName: 1,
          businessName: 1,
          type: 1,
          description: 1,
          profileImage: 1,
          businessImage: 1,
          photos: 1,
          location: 1,
          user: '$userData',
          featuredProducts: 1,
          spotlightStartDate: 1,
          spotlightEndDate: 1,
          isSpotlight: 1
        }
      },
      { $sort: { spotlightStartDate: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Transform the data to match the expected format
    const transformedSpotlights = spotlights.map(spotlight => ({
      _id: spotlight._id,
      artisan: {
        _id: spotlight._id,
        artisanName: spotlight.artisanName,
        businessName: spotlight.businessName,
        type: spotlight.type,
        description: spotlight.description,
        profileImage: spotlight.profileImage,
        businessImage: spotlight.businessImage,
        photos: spotlight.photos,
        location: spotlight.location,
        user: spotlight.user,
        featuredProducts: spotlight.featuredProducts
      },
      spotlightStartDate: spotlight.spotlightStartDate,
      spotlightEndDate: spotlight.spotlightEndDate
    }));

    res.json({
      success: true,
      spotlights: transformedSpotlights,
      count: transformedSpotlights.length
    });
  } catch (error) {
    console.error('Error fetching active spotlights:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active spotlights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
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


// Initialize database indexes and services
const initializeDatabaseServices = async () => {
  try {
    console.log('🔄 Initializing database services...');
    const db = await getDB();
    
    // Initialize search analytics indexes
    try {
      const SearchAnalyticsService = require('./services/searchAnalyticsService');
      const searchAnalyticsService = new SearchAnalyticsService(db);
      await searchAnalyticsService.createIndexes();
      console.log('✅ Search analytics indexes created');
    } catch (error) {
      console.error('❌ Failed to initialize search analytics:', error);
    }
    
    // Initialize other critical indexes if needed (non-blocking)
    try {
      const { createIndexes } = require('./config/database-indexes');
      // Run index creation in background to avoid blocking API requests
      createIndexes().then(() => {
        console.log('✅ Core database indexes verified');
      }).catch(error => {
        console.error('⚠️ Core indexes initialization failed (non-blocking):', error);
      });
    } catch (error) {
      console.error('⚠️ Core indexes module not available:', error);
    }
    
    console.log('✅ Database services initialization completed');
  } catch (error) {
    console.error('❌ Database services initialization failed:', error);
    // Don't throw - allow server to start even if some services fail
  }
};

// Initialize services on app startup (works in both local and serverless)
let initializationPromise = null;
const ensureInitialization = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeDatabaseServices();
  }
  return initializationPromise;
};

// Start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💰 Payout processing: http://localhost:${PORT}/api/admin/wallet/process-payouts`);
    console.log(`📦 Inventory restoration: http://localhost:${PORT}/api/admin/inventory/restore-all`);
    console.log(`⏰ Cron jobs configured for Vercel deployment`);
    
    // Initialization will happen via middleware
    console.log('🔄 Database services will initialize on first request');
  });
}

module.exports = app;
