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
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Set cache headers for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  }
  
  // Log static file requests for debugging
  console.log(`📁 Static file request: ${req.method} ${req.url}`);
  
  next();
};

const staticFileOptions = {
  // Add error handling for static files
  fallthrough: false,
  setHeaders: (res, path) => {
    // Set proper content type for images
    if (path.match(/\.(jpg|jpeg)$/i)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.match(/\.png$/i)) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.match(/\.gif$/i)) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.match(/\.webp$/i)) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
};

// Serve static files via /uploads route
app.use('/uploads', staticFileHandler, express.static(path.join(__dirname, 'public/uploads'), staticFileOptions));

// Also serve static files via /api/uploads route for backward compatibility
app.use('/api/uploads', staticFileHandler, express.static(path.join(__dirname, 'public/uploads'), staticFileOptions));

// Add request size logging middleware
app.use((req, res, next) => {
  if (req.headers['content-length']) {
    const sizeInMB = (parseInt(req.headers['content-length']) / (1024 * 1024)).toFixed(2);
    console.log(`Request size: ${sizeInMB}MB`);
  }
  next();
});

// Database connection - Atlas only
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  console.error('❌ Please ensure your .env file contains the Atlas connection string');
  // Don't exit in serverless environment
  if (!process.env.VERCEL) {
    process.exit(1);
  }
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB Atlas connected successfully');
      console.log('🔗 Database:', process.env.MONGODB_URI.split('/').pop().split('?')[0]);
    })
    .catch(err => {
      console.error('❌ MongoDB Atlas connection error:', err);
      // Don't exit in serverless environment - let the function handle the error
      if (!process.env.VERCEL) {
        process.exit(1);
      }
    });
}

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
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



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check loaded routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.regexp.toString().split('|').forEach((path) => {
        if (path.includes('/api/')) {
          routes.push({
            path: path.replace(/\\/g, '/').replace(/[()]/g, ''),
            methods: ['*']
          });
        }
      });
    }
  });
  
  res.json({
    success: true,
    routes: routes,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check environment and database status
app.get('/api/debug', async (req, res) => {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      API_URL: process.env.API_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      databaseConnection: 'unknown'
    };

    // Test database connection
    try {
      if (process.env.MONGODB_URI) {
        const User = require('./src/models/user');
        const userCount = await User.countDocuments();
        envInfo.databaseConnection = 'connected';
        envInfo.userCount = userCount;
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

// Test image serving endpoint
app.get('/api/test-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'public/uploads/products', filename);
  
  console.log(`🧪 Testing image path: ${imagePath}`);
  
  if (require('fs').existsSync(imagePath)) {
    console.log(`✅ Image exists: ${filename}`);
    res.json({ 
      status: 'success', 
      message: 'Image file exists',
      filename: filename,
      path: imagePath
    });
  } else {
    console.log(`❌ Image not found: ${filename}`);
    res.status(404).json({ 
      status: 'error', 
      message: 'Image file not found',
      filename: filename,
      path: imagePath
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Error handling middleware for payload size errors
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    console.error('Payload too large:', error.message);
    return res.status(413).json({ 
      message: 'Request entity too large. Please reduce the size of your data.',
      error: error.message 
    });
  }
  next(error);
});

// Import inventory service for scheduled capacity restoration
const inventoryService = require('./src/services/inventoryService');

// For Vercel serverless deployment, export the app directly
// For local development, start the server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    console.log(`📦 Payload limit: 100MB`);
    console.log(`🖼️ Static files served from: ${path.join(__dirname, 'public/uploads')}`);
    console.log(`🔗 Test image endpoint: http://localhost:${PORT}/api/test-image/image-1755916231829-653071106.jpg`);
    
    // Note: Scheduled tasks removed for serverless deployment
    // Use Vercel Cron Jobs for scheduled tasks instead
    console.log(`ℹ️ Scheduled tasks disabled for serverless deployment`);
    console.log(`💡 Use Vercel Cron Jobs for capacity restoration and order auto-completion`);
  });
}

// Export the app for Vercel serverless functions
module.exports = app;

