const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5180', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected successfully');
    console.log('🔗 Database:', process.env.MONGODB_URI.split('/').pop().split('?')[0]);
  })
  .catch(err => {
    console.error('❌ MongoDB Atlas connection error:', err);
    process.exit(1);
  });

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Import routes
const authRoutes = require('./src/routes/auth');
const artisanRoutes = require('./src/routes/artisans');
const profileRoutes = require('./src/routes/profile');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const uploadRoutes = require('./src/routes/upload');
const adminRoutes = require('./src/routes/admin');
const reviewRoutes = require('./src/routes/reviews');
const favoritesRoutes = require('./src/routes/favorites');
const userStatsRoutes = require('./src/routes/userStats');
const revenueRoutes = require('./src/routes/revenue');
const promotionalRoutes = require('./src/routes/promotional');
const geocodingRoutes = require('./src/routes/geocoding');
const notificationRoutes = require('./src/routes/notifications');
const spotlightRoutes = require('./src/routes/spotlight');

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/user', userStatsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/promotional', promotionalRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/spotlight', spotlightRoutes);



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'The Bazaar API is running',
    timestamp: new Date().toISOString()
  });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
  console.log(`📦 Payload limit: 100MB`);
  console.log(`🖼️ Static files served from: ${path.join(__dirname, 'public/uploads')}`);
  console.log(`🔗 Test image endpoint: http://localhost:${PORT}/api/test-image/image-1755916231829-653071106.jpg`);
});

