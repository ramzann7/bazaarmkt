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
// MICROSERVICES INTEGRATION
// ============================================================================
let MicroservicesIntegration;

// Initialize microservices after server starts (non-blocking)
const initializeMicroservices = async () => {
  try {
    console.log('🚀 Initializing Microservices...');
    
    // Import microservices integration
    MicroservicesIntegration = require('./middleware/microservicesIntegration');
    
    console.log('🚀 Initializing Microservices Integration...');
    await MicroservicesIntegration.initialize();
    
    console.log('✅ Microservices Integration initialized');
    console.log('📊 Services: http://localhost:' + PORT + '/api/services');
    console.log('🔍 Gateway: http://localhost:' + PORT + '/api/gateway/status');
  } catch (error) {
    console.error('❌ Microservices initialization failed:', error);
  }
};

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

// Microservices status endpoints
app.get('/api/services', async (req, res) => {
  try {
    if (!MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized'
      });
    }
    
    const status = MicroservicesIntegration.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Services status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get services status',
      error: error.message
    });
  }
});

app.get('/api/services/health', async (req, res) => {
  try {
    if (!MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized'
      });
    }
    
    const ServiceRegistry = require('./services/serviceRegistry');
    const healthChecks = await ServiceRegistry.performAllHealthChecks();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        healthChecks
      }
    });
  } catch (error) {
    console.error('Health checks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform health checks',
      error: error.message
    });
  }
});

app.get('/api/health/:service', async (req, res) => {
  try {
    if (!MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized'
      });
    }
    
    const ServiceRegistry = require('./services/serviceRegistry');
    const healthCheck = await ServiceRegistry.performHealthCheck(req.params.service);
    
    res.json({
      success: true,
      data: {
        service: req.params.service,
        timestamp: new Date().toISOString(),
        healthCheck
      }
    });
  } catch (error) {
    console.error('Service health check error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to check health for service: ${req.params.service}`,
      error: error.message
    });
  }
});

// API Gateway status
app.get('/api/gateway/status', (req, res) => {
  try {
    if (!MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'API Gateway not yet initialized'
      });
    }
    
    const APIGateway = require('./middleware/apiGateway');
    const status = APIGateway.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Gateway status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gateway status',
      error: error.message
    });
  }
});

app.get('/api/gateway/routes', (req, res) => {
  try {
    if (!MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'API Gateway not yet initialized'
      });
    }
    
    const APIGateway = require('./middleware/apiGateway');
    const routes = APIGateway.getRoutes();
    
    res.json({
      success: true,
      data: {
        routes: Array.from(routes.entries()),
        totalRoutes: routes.size
      }
    });
  } catch (error) {
    console.error('Gateway routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gateway routes',
      error: error.message
    });
  }
});

// ============================================================================
// DATABASE CONNECTION TEST ENDPOINTS
// ============================================================================

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

// ============================================================================
// ENVIRONMENT CHECK ENDPOINT
// ============================================================================

app.get('/api/env-check', (req, res) => {
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
      
      // Initialize microservices after server starts (non-blocking)
      // Temporarily disabled due to path-to-regexp compatibility issue
      // if (!process.env.VERCEL) {
      //   initializeMicroservices();
      // }
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for Vercel
module.exports = app;
