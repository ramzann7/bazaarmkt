const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
const geocodingRoutes = require('./src/routes/geocoding');

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
app.use('/api/geocoding', geocodingRoutes);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'The Bazaar API is running',
    timestamp: new Date().toISOString()
  });
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
});

