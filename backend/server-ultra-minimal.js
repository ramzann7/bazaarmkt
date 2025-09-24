const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ultra minimal server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET'
    },
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.json({
        success: false,
        message: 'No MONGODB_URI found',
        timestamp: new Date().toISOString()
      });
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const dbName = mongoose.connection.db.databaseName;
    await mongoose.disconnect();

    res.json({
      success: true,
      message: 'Database connection successful',
      database: dbName,
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

// Test model imports
app.get('/api/test-models', async (req, res) => {
  try {
    const results = {};
    
    // Test User model
    try {
      const User = require('./src/models/user');
      results.user = 'OK';
    } catch (error) {
      results.user = error.message;
    }
    
    // Test Product model
    try {
      const Product = require('./src/models/product');
      results.product = 'OK';
    } catch (error) {
      results.product = error.message;
    }
    
    // Test Artisan model
    try {
      const Artisan = require('./src/models/artisan');
      results.artisan = 'OK';
    } catch (error) {
      results.artisan = error.message;
    }
    
    // Test Order model
    try {
      const Order = require('./src/models/order');
      results.order = 'OK';
    } catch (error) {
      results.order = error.message;
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export for Vercel
module.exports = app;
