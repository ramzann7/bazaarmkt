const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ============================================================================
// INFRASTRUCTURE ENDPOINTS
// ============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Database connection test endpoints
app.get('/api/test-db', async (req, res) => {
  try {
    const dbManager = require('./config/database');
    await dbManager.connect();
    
    const db = dbManager.getDatabase();
    const collections = await db.listCollections().toArray();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        collections: collections.map(c => c.name),
        count: collections.length
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.get('/api/test-mongo', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority');
    
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    res.json({
      success: true,
      message: 'MongoDB connection successful',
      data: {
        collections: collections.map(c => c.name),
        count: collections.length
      }
    });
  } catch (error) {
    console.error('MongoDB test error:', error);
    res.status(500).json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message
    });
  }
});

// Environment check endpoint
app.get('/api/env-check', (req, res) => {
  try {
    const EnvironmentConfig = require('./config/environment');
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    const warnings = EnvironmentConfig.getProductionWarnings();
    
    res.json({
      success: true,
      data: {
        environment: envInfo,
        warnings: warnings,
        required: {
          MONGODB_URI: !!process.env.MONGODB_URI,
          JWT_SECRET: !!process.env.JWT_SECRET,
          NODE_ENV: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    console.error('Environment check error:', error);
    res.json({
      success: false,
      message: 'Environment check failed',
      error: error.message,
      fallback: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    });
  }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log('✅ Clean server started successfully');
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Export for Vercel and development
module.exports = app;

// Only auto-start if running directly (not imported)
if (require.main === module) {
  startServer();
}

