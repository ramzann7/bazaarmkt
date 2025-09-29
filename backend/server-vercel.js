/**
 * Optimized Microservices Server - Production Ready
 * Efficient, scalable, and cost-effective microservices architecture
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// OPTIMIZED MIDDLEWARE SETUP
// ============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://bazarmkt.vercel.app', 'https://www.bazarmkt.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5180'],
  credentials: true
}));

// Compression for better performance
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing with optimized limits
app.use(express.json({ 
  limit: '4.5mb',
  verify: (req, res, buf) => {
    // Add request size validation
    if (buf.length > 4.5 * 1024 * 1024) {
      throw new Error('Request too large');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '4.5mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ============================================================================
// MICROSERVICES INTEGRATION (OPTIMIZED)
// ============================================================================

let MicroservicesIntegration = null;
let isMicroservicesReady = false;

// Optimized microservices initialization
const initializeMicroservices = async () => {
  try {
    console.log('🚀 Initializing Microservices (Optimized)...');
    
    // Import optimized microservices integration
    MicroservicesIntegration = require('./middleware/microservicesIntegration');
    
    // Initialize with timeout to prevent hanging
    const initPromise = MicroservicesIntegration.initialize();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Microservices initialization timeout')), 30000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    
    isMicroservicesReady = true;
    console.log('✅ Microservices Integration initialized successfully');
    console.log('📊 Services: http://localhost:' + PORT + '/api/services');
    console.log('🔍 Gateway: http://localhost:' + PORT + '/api/gateway/status');
    
  } catch (error) {
    console.error('❌ Microservices initialization failed:', error.message);
    console.log('⚠️ Server will continue without microservices (graceful degradation)');
    isMicroservicesReady = false;
  }
};

// ============================================================================
// CORE INFRASTRUCTURE ENDPOINTS
// ============================================================================

// Health check endpoint (always available)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    microservices: isMicroservicesReady ? 'ready' : 'not-ready'
  });
});

// Environment check endpoint
app.get('/api/env-check', (req, res) => {
  const EnvironmentConfig = require('./config/environment');
  res.json({
    success: true,
    data: {
      environment: EnvironmentConfig.getEnvironmentInfo(),
      warnings: EnvironmentConfig.getProductionWarnings(),
      required: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    }
  });
});

// Database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const dbManager = require('./config/database');
    const db = await dbManager.connect();
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

// ============================================================================
// MICROSERVICES ENDPOINTS (WITH GRACEFUL DEGRADATION)
// ============================================================================

// Microservices status endpoints
app.get('/api/services', async (req, res) => {
  try {
    if (!isMicroservicesReady || !MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized',
        status: 'initializing'
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
    if (!isMicroservicesReady || !MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized'
      });
    }
    
    const healthReport = await MicroservicesIntegration.getHealthSummary();
    res.json({
      success: true,
      data: healthReport
    });
  } catch (error) {
    console.error('Overall health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overall health',
      error: error.message
    });
  }
});

app.get('/api/health/:service', async (req, res) => {
  try {
    if (!isMicroservicesReady || !MicroservicesIntegration) {
      return res.status(503).json({
        success: false,
        message: 'Microservices not yet initialized'
      });
    }
    
    const serviceName = req.params.service;
    const ServiceRegistry = require('./services/serviceRegistry');
    const health = await ServiceRegistry.performHealthCheck(serviceName);
    
    res.json({
      success: true,
      data: { service: serviceName, health }
    });
  } catch (error) {
    console.error(`Health check for ${req.params.service} error:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get health for ${req.params.service}`,
      error: error.message
    });
  }
});

// API Gateway status
app.get('/api/gateway/status', (req, res) => {
  try {
    if (!isMicroservicesReady || !MicroservicesIntegration) {
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
    console.error('API Gateway status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API Gateway status',
      error: error.message
    });
  }
});

app.get('/api/gateway/routes', (req, res) => {
  try {
    if (!isMicroservicesReady || !MicroservicesIntegration) {
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
        routes: Array.from(routes.keys()),
        count: routes.size 
      }
    });
  } catch (error) {
    console.error('API Gateway routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API Gateway routes',
      error: error.message
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
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================================================
// OPTIMIZED SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    console.log('🚀 Starting Optimized Microservices Server...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${PORT}`);
    
    // Start the server first
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Services: http://localhost:${PORT}/api/services`);
      console.log(`🔍 Gateway: http://localhost:${PORT}/api/gateway/status`);
      
      // Initialize microservices asynchronously (non-blocking)
      if (!process.env.VERCEL) {
        console.log('🔄 Initializing microservices in background...');
        initializeMicroservices().catch(error => {
          console.error('❌ Background microservices initialization failed:', error.message);
        });
      } else {
        console.log('⚠️ Running on Vercel - microservices initialization skipped');
      }
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
