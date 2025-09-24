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
// CORS configuration
const allowedOrigins = [
  'http://localhost:5180',
  'http://localhost:3000', 
  'http://localhost:5173',
  'https://bazaarmkt.ca',
  'https://www.bazaarmkt.ca',
  // Allow all Vercel preview URLs
  /^https:\/\/bazaarmkt-.*\.vercel\.app$/
];

// Add production origin from environment variable if provided
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const sizeInMB = (JSON.stringify(req.body).length / (1024 * 1024)).toFixed(2);
  if (sizeInMB > 1) {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Load routes conditionally to avoid crashes
try {
  // Core routes that we know work
  const authRoutes = require('./src/routes/auth');
  const productRoutes = require('./src/routes/products');
  const artisanRoutes = require('./src/routes/artisans');
  const orderRoutes = require('./src/routes/orders');
  const reviewRoutes = require('./src/routes/reviews');
  const promotionalRoutes = require('./src/routes/promotional');
  const geographicSettingsRoutes = require('./src/routes/geographicSettings');

  // Use core routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/artisans', artisanRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/promotional', promotionalRoutes);
  app.use('/api/geographic-settings', geographicSettingsRoutes);

  console.log('✅ Core routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading core routes:', error.message);
}

// Try to load additional routes
try {
  const profileRoutes = require('./src/routes/profile');
  const uploadRoutes = require('./src/routes/upload');
  const adminRoutes = require('./src/routes/admin');
  const favoritesRoutes = require('./src/routes/favorites');

  app.use('/api/profile', profileRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/favorites', favoritesRoutes);

  console.log('✅ Additional routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading additional routes:', error.message);
}

// Try to load more routes
try {
  const userStatsRoutes = require('./src/routes/userStats');
  const revenueRoutes = require('./src/routes/revenue');
  const geocodingRoutes = require('./src/routes/geocoding');
  const notificationRoutes = require('./src/routes/notifications');

  app.use('/api/user', userStatsRoutes);
  app.use('/api/revenue', revenueRoutes);
  app.use('/api/geocoding', geocodingRoutes);
  app.use('/api/notifications', notificationRoutes);

  console.log('✅ More routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading more routes:', error.message);
}

// Export for Vercel
module.exports = app;
