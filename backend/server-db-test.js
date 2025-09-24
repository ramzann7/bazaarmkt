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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection without models
app.get('/api/test-db', async (req, res) => {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      VERCEL: process.env.VERCEL,
      databaseConnection: 'unknown'
    };

    // Test basic mongoose connection
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        envInfo.databaseConnection = 'connected';
        envInfo.databaseName = mongoose.connection.db.databaseName;
        
        // Test basic database operations
        const collections = await mongoose.connection.db.listCollections().toArray();
        envInfo.collections = collections.map(c => c.name);
        
        await mongoose.disconnect();
      } catch (dbError) {
        envInfo.databaseConnection = 'error';
        envInfo.databaseError = dbError.message;
      }
    } else {
      envInfo.databaseConnection = 'no_uri';
    }

    res.json({
      success: true,
      message: 'Database test completed',
      environment: envInfo,
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

// Test model import
app.get('/api/test-models', async (req, res) => {
  try {
    const envInfo = {
      modelImport: 'unknown',
      modelError: null
    };

    // Test User model import
    try {
      const User = require('./src/models/user');
      envInfo.modelImport = 'success';
      envInfo.userModelExists = !!User;
    } catch (modelError) {
      envInfo.modelImport = 'error';
      envInfo.modelError = modelError.message;
    }

    res.json({
      success: true,
      message: 'Model test completed',
      environment: envInfo,
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

// Test full database query
app.get('/api/test-query', async (req, res) => {
  try {
    const envInfo = {
      connection: 'unknown',
      query: 'unknown',
      error: null
    };

    // Connect to database
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        envInfo.connection = 'connected';
        
        // Try to import and use User model
        const User = require('./src/models/user');
        const userCount = await User.countDocuments();
        envInfo.query = 'success';
        envInfo.userCount = userCount;
        
        await mongoose.disconnect();
      } catch (error) {
        envInfo.connection = 'error';
        envInfo.error = error.message;
      }
    }

    res.json({
      success: true,
      message: 'Full query test completed',
      environment: envInfo,
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
