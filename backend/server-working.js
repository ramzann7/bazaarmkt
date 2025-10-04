require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const compression = require('compression');
const path = require('path');
const sharp = require('sharp');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '4.5mb' }));

// Compression middleware for better performance
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5180',
    'https://bazaarmkt.vercel.app'
  ],
  credentials: true
}));

// Database connection - singleton pattern for better performance
let db = null;
let client = null;

const getDB = async () => {
  if (db && client && client.topology && client.topology.isConnected()) {
    return db;
  }
  
  try {
    if (client) {
      await client.close();
    }
    
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    
    await client.connect();
    db = client.db('bazarmkt');
    console.log('✅ Database connected');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Cache middleware for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Store original res.json
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      setCache(cacheKey, data);
      return originalJson(data);
    };
  }
  next();
});

// Database middleware - reuse connection
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

// Image optimization endpoint
app.get('/api/images/optimize/:path(*)', async (req, res) => {
  try {
    const imagePath = path.join(__dirname, 'public', 'uploads', req.params.path);
    const { width = 400, height = 400, quality = 80 } = req.query;
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Optimize image with Sharp
    const optimizedBuffer = await sharp(imagePath)
      .resize(parseInt(width), parseInt(height), {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: parseInt(quality),
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': optimizedBuffer.length,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'ETag': `"${Date.now()}"`
    });
    
    res.send(optimizedBuffer);
  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({ error: 'Image optimization failed' });
  }
});

// Static file serving with caching
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
  }
}));

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
const spotlightRoutes = require('./routes/spotlight');

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
app.use('/api/spotlight', spotlightRoutes);

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


// Start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💰 Payout processing: http://localhost:${PORT}/api/admin/wallet/process-payouts`);
    console.log(`📦 Inventory restoration: http://localhost:${PORT}/api/admin/inventory/restore-all`);
    console.log(`⏰ Cron jobs configured for Vercel deployment`);
  });
}

module.exports = app;
