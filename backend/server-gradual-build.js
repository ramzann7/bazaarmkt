const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');

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

// Serve static files for uploads with proper headers
const staticFileHandler = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  express.static(path.join(__dirname, 'public/uploads'))(req, res, next);
};
app.use('/uploads', staticFileHandler);

// Request logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Remove database connection middleware - let routes handle their own connections

// Database connection
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  if (!process.env.VERCEL) {
    process.exit(1);
  }
} else {
  // Initialize database connection optimized for serverless
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // 5 seconds
    socketTimeoutMS: 10000, // 10 seconds
    connectTimeoutMS: 5000, // 5 seconds
    maxPoolSize: 1, // Single connection for serverless
    minPoolSize: 0, // No minimum pool
    maxIdleTimeMS: 1000, // Close connections very quickly
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false, // Disable mongoose buffering
  })
    .then(() => {
      console.log('✅ MongoDB Atlas connected successfully');
      console.log('🔗 Database:', process.env.MONGODB_URI.split('/').pop().split('?')[0]);
    })
    .catch(err => {
      console.error('❌ MongoDB Atlas connection error:', err.message);
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check uploads directory
app.get('/api/debug-uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'public/uploads');
  
  try {
    if (!fs.existsSync(uploadsPath)) {
      return res.json({
        success: false,
        error: 'Uploads directory does not exist',
        path: uploadsPath
      });
    }
    
    const productsPath = path.join(uploadsPath, 'products');
    if (!fs.existsSync(productsPath)) {
      return res.json({
        success: false,
        error: 'Products directory does not exist',
        path: productsPath
      });
    }
    
    const files = fs.readdirSync(productsPath);
    res.json({
      success: true,
      uploadsPath: uploadsPath,
      productsPath: productsPath,
      fileCount: files.length,
      files: files.slice(0, 10) // Show first 10 files
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      path: uploadsPath
    });
  }
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
        // Wait for mongoose connection to be ready
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

// Load routes conditionally - using proven working structure
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
  const orderRoutes = require('./src/routes/orders');
  app.use('/api/orders', orderRoutes);
  console.log('✅ Order routes loaded');
} catch (error) {
  console.error('❌ Error loading order routes:', error.message);
}

try {
  const reviewRoutes = require('./src/routes/reviews');
  app.use('/api/reviews', reviewRoutes);
  console.log('✅ Review routes loaded');
} catch (error) {
  console.error('❌ Error loading review routes:', error.message);
}

try {
  const promotionalRoutes = require('./src/routes/promotional');
  app.use('/api/promotional', promotionalRoutes);
  console.log('✅ Promotional routes loaded');
} catch (error) {
  console.error('❌ Error loading promotional routes:', error.message);
}

try {
  const geographicSettingsRoutes = require('./src/routes/geographicSettings');
  app.use('/api/geographic-settings', geographicSettingsRoutes);
  console.log('✅ Geographic settings routes loaded');
} catch (error) {
  console.error('❌ Error loading geographic settings routes:', error.message);
}

try {
  const profileRoutes = require('./src/routes/profile');
  app.use('/api/profile', profileRoutes);
  console.log('✅ Profile routes loaded');
} catch (error) {
  console.error('❌ Error loading profile routes:', error.message);
}

try {
  const uploadRoutes = require('./src/routes/upload');
  app.use('/api/upload', uploadRoutes);
  console.log('✅ Upload routes loaded');
} catch (error) {
  console.error('❌ Error loading upload routes:', error.message);
}

try {
  const adminRoutes = require('./src/routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded');
} catch (error) {
  console.error('❌ Error loading admin routes:', error.message);
}

try {
  const favoritesRoutes = require('./src/routes/favorites');
  app.use('/api/favorites', favoritesRoutes);
  console.log('✅ Favorites routes loaded');
} catch (error) {
  console.error('❌ Error loading favorites routes:', error.message);
}

try {
  const userStatsRoutes = require('./src/routes/userStats');
  app.use('/api/user', userStatsRoutes);
  console.log('✅ User stats routes loaded');
} catch (error) {
  console.error('❌ Error loading user stats routes:', error.message);
}

try {
  const revenueRoutes = require('./src/routes/revenue');
  app.use('/api/revenue', revenueRoutes);
  console.log('✅ Revenue routes loaded');
} catch (error) {
  console.error('❌ Error loading revenue routes:', error.message);
}

try {
  const geocodingRoutes = require('./src/routes/geocoding');
  app.use('/api/geocoding', geocodingRoutes);
  console.log('✅ Geocoding routes loaded');
} catch (error) {
  console.error('❌ Error loading geocoding routes:', error.message);
}

try {
  const notificationRoutes = require('./src/routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✅ Notification routes loaded');
} catch (error) {
  console.error('❌ Error loading notification routes:', error.message);
}

try {
  const spotlightRoutes = require('./src/routes/spotlight');
  app.use('/api/spotlight', spotlightRoutes);
  console.log('✅ Spotlight routes loaded');
} catch (error) {
  console.error('❌ Error loading spotlight routes:', error.message);
}

try {
  const walletRoutes = require('./src/routes/wallet');
  app.use('/api/wallet', walletRoutes);
  console.log('✅ Wallet routes loaded');
} catch (error) {
  console.error('❌ Error loading wallet routes:', error.message);
}

try {
  const payoutRoutes = require('./src/routes/payouts');
  app.use('/api/payouts', payoutRoutes);
  console.log('✅ Payout routes loaded');
} catch (error) {
  console.error('❌ Error loading payout routes:', error.message);
}

try {
  const communityRoutes = require('./src/routes/community');
  app.use('/api/community', communityRoutes);
  console.log('✅ Community routes loaded');
} catch (error) {
  console.error('❌ Error loading community routes:', error.message);
}

try {
  const deliveryRoutes = require('./src/routes/delivery');
  app.use('/api/delivery', deliveryRoutes);
  console.log('✅ Delivery routes loaded');
} catch (error) {
  console.error('❌ Error loading delivery routes:', error.message);
}

try {
  const orderConfirmationRoutes = require('./src/routes/orderConfirmations');
  app.use('/api/order-confirmations', orderConfirmationRoutes);
  console.log('✅ Order confirmation routes loaded');
} catch (error) {
  console.error('❌ Error loading order confirmation routes:', error.message);
}

try {
  const disputeManagementRoutes = require('./src/routes/disputeManagement');
  app.use('/api/disputes', disputeManagementRoutes);
  console.log('✅ Dispute management routes loaded');
} catch (error) {
  console.error('❌ Error loading dispute management routes:', error.message);
}

try {
  const deliveryRevenueRoutes = require('./src/routes/deliveryRevenue');
  app.use('/api/delivery-revenue', deliveryRevenueRoutes);
  console.log('✅ Delivery revenue routes loaded');
} catch (error) {
  console.error('❌ Error loading delivery revenue routes:', error.message);
}

// Export for Vercel
module.exports = app;
