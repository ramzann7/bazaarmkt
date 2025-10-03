/**
 * BazaarMKT API Server - Clean Modular Version
 * Routes are properly modularized in /routes directory
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const app = express();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'https://bazaarmkt.vercel.app',
  'https://bazaarmkt-ramzans-projects-d1bb7f0d.vercel.app'
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
  const path = require('path');
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
  console.log('📁 Static files served from:', path.join(__dirname, 'public/uploads'));
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;
let connectionPromise = null;

const getDB = async () => {
  // Check if we have a healthy connection
  if (db && client) {
    try {
      // Test if connection is actually working by pinging
      if (client.topology && client.topology.isConnected && client.topology.isConnected()) {
        return db;
      }
    } catch (error) {
      console.log('⚠️  Connection check failed, resetting...');
    }
    
    // Connection is bad, reset everything
    console.log('⚠️  Resetting stale connection...');
    try {
      if (client) await client.close();
    } catch (e) {}
    client = null;
    db = null;
    connectionPromise = null;
  }
  
  // Wait for existing connection attempt
  if (connectionPromise) {
    console.log('⏳ Waiting for existing connection...');
    try {
      await connectionPromise;
      return db;
    } catch (error) {
      console.log('⚠️  Connection promise failed, resetting...');
      client = null;
      db = null;
      connectionPromise = null;
      throw error;
    }
  }
  
  // Start new connection
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set');
  }
  
  console.log('🔄 Creating new MongoDB connection...');
  connectionPromise = (async () => {
    try {
      client = new MongoClient(mongoUri); // Use defaults - let driver handle everything
      
      console.log('🔗 Connecting to MongoDB Atlas...');
      await client.connect();
      
      console.log('📊 Testing connection...');
      db = client.db('bazarmkt');
      // Verify connection works by doing a quick ping
      await db.admin().ping();
      
      console.log('✅ MongoDB connected and verified!');
      return db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      client = null;
      db = null;
      connectionPromise = null;
      throw error;
    }
  })();
  
  try {
    await connectionPromise;
    return db;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

// ============================================================================
// RATE LIMITING
// ============================================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.path;
    return path === '/api/health' || 
           path === '/api/debug' || 
           path === '/api/test-db' || 
           path.startsWith('/api/auth/') || 
           path.startsWith('/api/products') ||
           path.startsWith('/api/artisans') ||
           path.startsWith('/api/upload');
  }
});

app.use(limiter);

// ============================================================================
// JWT VERIFICATION MIDDLEWARE
// ============================================================================

const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: error.message
    });
  }
};

const verifyArtisanRole = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const db = await getDB();
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isArtisan = user.role === 'artisan' || user.userType === 'artisan';
    
    if (!isArtisan) {
      return res.status(403).json({
        success: false,
        message: 'Artisan privileges required'
      });
    }
    
    const artisan = await db.collection('artisans').findOne({ user: new ObjectId(userId) });
    
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    req.artisan = artisan;
    req.artisanId = artisan._id;
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ verifyArtisanRole: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying artisan role',
      error: error.message
    });
  }
};

// ============================================================================
// DATABASE MIDDLEWARE - Make DB available to all routes
// ============================================================================

app.use(async (req, res, next) => {
  // Skip database connection for health check
  if (req.path === '/api/health') {
    return next();
  }
  
  try {
    // Create a fresh connection for each request (fixes monitor timeout issue)
    const freshClient = new MongoClient(process.env.MONGODB_URI);
    await freshClient.connect();
    req.db = freshClient.db('bazarmkt');
    req.mongoClient = freshClient; // Store client to close later
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// Close connection after response is sent
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend; // Restore original
    const result = res.send.call(this, data);
    
    // Close MongoDB connection after response
    if (req.mongoClient) {
      req.mongoClient.close().catch(err => console.error('Error closing MongoDB:', err));
    }
    
    return result;
  };
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/api/health', async (req, res) => {
  try {
    const db = await getDB();
    await db.admin().ping();
    
    res.json({
      status: 'OK',
      message: 'bazaar API is running',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'bazaar API is running but database connection failed',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
    });
  }
});

// ============================================================================
// IMPORT AND MOUNT ROUTE MODULES
// ============================================================================

const productsRoutes = require('./routes/products');
const artisansRoutes = require('./routes/artisans');
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const profileRoutes = require('./routes/profile');
const favoritesRoutes = require('./routes/favorites');
const reviewsRoutes = require('./routes/reviews');
const notificationsRoutes = require('./routes/notifications');
const communityRoutes = require('./routes/community');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const revenueRoutes = require('./routes/revenue');
const promotionalRoutes = require('./routes/promotional');

// Mount all routes
app.use('/api/products', productsRoutes);
app.use('/api/artisans', artisansRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/promotional', promotionalRoutes);

// ============================================================================
// CRON JOBS
// ============================================================================

// Daily inventory restoration (runs at midnight)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔄 Running daily inventory restoration...');
    const db = await getDB();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const expiredOrders = await ordersCollection.find({
      status: 'pending',
      createdAt: { $lt: cutoffTime }
    }).toArray();
    
    for (const order of expiredOrders) {
      for (const item of order.items) {
        await productsCollection.updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { quantity: item.quantity } }
        );
      }
      
      await ordersCollection.updateOne(
        { _id: order._id },
        { $set: { status: 'auto-cancelled', cancelledAt: new Date() } }
      );
    }
    
    console.log(`✅ Restored inventory for ${expiredOrders.length} expired orders`);
  } catch (error) {
    console.error('❌ Inventory restoration error:', error);
  }
});

// Weekly payout processing (runs at 9 AM every Friday)
cron.schedule('0 9 * * 5', async () => {
  try {
    console.log('🔄 Running weekly payout processing...');
    const db = await getDB();
    const artisansCollection = db.collection('artisans');
    const walletsCollection = db.collection('wallets');
    const transactionsCollection = db.collection('wallet_transactions');
    
    const artisans = await artisansCollection.find({
      payoutSettings: { $exists: true },
      'payoutSettings.enabled': true,
      'payoutSettings.schedule': 'weekly'
    }).toArray();
    
    for (const artisan of artisans) {
      const wallet = await walletsCollection.findOne({ artisanId: artisan._id });
      
      if (wallet && wallet.pendingBalance > 0) {
        const payoutAmount = wallet.pendingBalance;
        
        await walletsCollection.updateOne(
          { artisanId: artisan._id },
          {
            $inc: { pendingBalance: -payoutAmount, totalPaidOut: payoutAmount },
            $set: { lastPayoutDate: new Date() }
          }
        );
        
        await transactionsCollection.insertOne({
          artisanId: artisan._id,
          type: 'payout',
          amount: -payoutAmount,
          description: 'Weekly automatic payout',
          status: 'completed',
          createdAt: new Date()
        });
        
        console.log(`✅ Processed payout of $${payoutAmount} for artisan ${artisan._id}`);
      }
    }
  } catch (error) {
    console.error('❌ Payout processing error:', error);
  }
});

// ============================================================================
// VERCEL CRON ENDPOINTS (for serverless)
// ============================================================================

app.get('/api/cron/inventory-restoration', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const db = await getDB();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const expiredOrders = await ordersCollection.find({
      status: 'pending',
      createdAt: { $lt: cutoffTime }
    }).toArray();
    
    for (const order of expiredOrders) {
      for (const item of order.items) {
        await productsCollection.updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { quantity: item.quantity } }
        );
      }
      
      await ordersCollection.updateOne(
        { _id: order._id },
        { $set: { status: 'auto-cancelled', cancelledAt: new Date() } }
      );
    }
    
    res.json({ success: true, restoredOrders: expiredOrders.length });
  } catch (error) {
    console.error('Inventory restoration error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cron/weekly-payout', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const db = await getDB();
    const artisansCollection = db.collection('artisans');
    const walletsCollection = db.collection('wallets');
    const transactionsCollection = db.collection('wallet_transactions');
    
    const artisans = await artisansCollection.find({
      payoutSettings: { $exists: true },
      'payoutSettings.enabled': true,
      'payoutSettings.schedule': 'weekly'
    }).toArray();
    
    let processedCount = 0;
    
    for (const artisan of artisans) {
      const wallet = await walletsCollection.findOne({ artisanId: artisan._id });
      
      if (wallet && wallet.pendingBalance > 0) {
        const payoutAmount = wallet.pendingBalance;
        
        await walletsCollection.updateOne(
          { artisanId: artisan._id },
          {
            $inc: { pendingBalance: -payoutAmount, totalPaidOut: payoutAmount },
            $set: { lastPayoutDate: new Date() }
          }
        );
        
        await transactionsCollection.insertOne({
          artisanId: artisan._id,
          type: 'payout',
          amount: -payoutAmount,
          description: 'Weekly automatic payout',
          status: 'completed',
          createdAt: new Date()
        });
        
        processedCount++;
      }
    }
    
    res.json({ success: true, processedPayouts: processedCount });
  } catch (error) {
    console.error('Payout processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    }
  });
}

// Export for Vercel
module.exports = app;

