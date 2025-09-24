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

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Database connection
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
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
      if (!process.env.VERCEL) {
        process.exit(1);
      }
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

// Export for Vercel
module.exports = app;
