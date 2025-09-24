const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Minimal server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
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

// Test model import step by step
app.get('/api/test-models', async (req, res) => {
  try {
    // Test User model first
    let userModel = null;
    let userError = null;
    try {
      userModel = require('./src/models/user');
    } catch (error) {
      userError = error.message;
    }
    
    // Test Product model
    let productModel = null;
    let productError = null;
    try {
      productModel = require('./src/models/product');
    } catch (error) {
      productError = error.message;
    }
    
    res.json({
      success: true,
      message: 'Model import test completed',
      results: {
        user: {
          success: !!userModel,
          error: userError
        },
        product: {
          success: !!productModel,
          error: productError
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Test route imports
app.get('/api/test-routes', async (req, res) => {
  try {
    const authRoutes = require('./src/routes/auth');
    const productRoutes = require('./src/routes/products');
    
    res.json({
      success: true,
      message: 'Route imports successful',
      routes: {
        auth: !!authRoutes,
        products: !!productRoutes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Export for Vercel
module.exports = app;
