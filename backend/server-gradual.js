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

// Debug endpoint to check environment and database status
app.get('/api/debug', async (req, res) => {
  try {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      API_URL: process.env.API_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      VERCEL: process.env.VERCEL,
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

// Test basic routes
app.get('/api/test-routes', (req, res) => {
  res.json({
    success: true,
    message: 'Basic routes working',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;
