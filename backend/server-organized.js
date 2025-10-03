require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const { body, validationResult } = require('express-validator');

// Import route modules
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const artisanRoutes = require('./routes/artisans');
const uploadRoutes = require('./routes/upload');
const promotionalRoutes = require('./routes/promotional');
const reviewsRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const communityRoutes = require('./routes/community');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cache setup
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes default TTL

// MongoDB connection
let db;
const connectDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('bazaarMKT');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Make db and cache available to routes
app.use((req, res, next) => {
  req.db = db;
  req.cache = cache;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/promotional', promotionalRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
