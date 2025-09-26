const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');

const app = express();

// Middleware
app.use(compression());
app.use(express.json({ limit: '4.5mb' }));
app.use(express.urlencoded({ extended: true, limit: '4.5mb' }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5180',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://bazaarmkt.ca',
  'https://www.bazaarmkt.ca',
  /^https:\/\/bazaarmkt-.*\.vercel\.app$/
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Microservices Integration
const MicroservicesIntegration = require('./middleware/microservicesIntegration');

// Initialize microservices
(async () => {
  try {
    await MicroservicesIntegration.initialize();
    console.log('✅ Microservices Integration initialized');
  } catch (error) {
    console.error('❌ Microservices Integration failed:', error);
  }
})();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString()
  });
});

// Microservices routes
app.get('/api/services', async (req, res) => {
  try {
    const status = MicroservicesIntegration.getStatus();
    res.json({
      success: true,
      ...status.serviceRegistry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service registry error',
      error: error.message
    });
  }
});

app.get('/api/services/health', async (req, res) => {
  try {
    const healthSummary = await MicroservicesIntegration.getHealthSummary();
    res.json({
      success: true,
      ...healthSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check error',
      error: error.message
    });
  }
});

app.get('/api/health/:service', async (req, res) => {
  try {
    const serviceName = req.params.service;
    const service = MicroservicesIntegration.getService(serviceName);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service ${serviceName} not found`
      });
    }

    if (service.healthCheck) {
      const health = await service.healthCheck();
      res.json({
        success: true,
        service: serviceName,
        ...health
      });
    } else {
      res.json({
        success: true,
        service: serviceName,
        status: 'healthy',
        message: 'No health check available'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service health check error',
      error: error.message
    });
  }
});

app.get('/api/gateway/status', (req, res) => {
  try {
    const status = MicroservicesIntegration.getStatus();
    res.json({
      success: true,
      status: 'active',
      routes: status.apiGateway.routes || [],
      services: status.services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API Gateway status error',
      error: error.message
    });
  }
});

app.get('/api/gateway/routes', (req, res) => {
  try {
    const endpoints = MicroservicesIntegration.getServiceEndpoints();
    res.json({
      success: true,
      routes: endpoints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API Gateway routes error',
      error: error.message
    });
  }
});

// Development and testing endpoints
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    await client.close();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Gateway routing for microservices
// Note: Direct routing to microservices is handled by the API Gateway middleware
// The microservices integration provides the routing logic

// Legacy endpoints that are still needed (not handled by microservices yet)
// These will be gradually moved to microservices

// File upload endpoints (still needed)
app.post('/api/upload', async (req, res) => {
  try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/products';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
    
    const upload = multer({ storage: storage }).single('image');
    
    upload(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: `/uploads/products/${req.file.filename}`
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Artisan endpoints (still needed - will be moved to User Service later)
app.get('/api/artisans', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    const artisans = await artisansCollection.find({}).toArray();
    await client.close();
    
    res.json({
      success: true,
      artisans: artisans
    });
  } catch (error) {
    console.error('Artisans fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artisans',
      error: error.message
    });
  }
});

app.get('/api/artisans/:id', async (req, res) => {
  try {
    const { MongoClient } = require('mongodb');
    const { ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ _id: new ObjectId(req.params.id) });
    await client.close();
    
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }
    
    res.json({
      success: true,
      artisan: artisan
    });
  } catch (error) {
    console.error('Artisan fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artisan',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Services: http://localhost:${PORT}/api/services`);
  console.log(`🔍 Gateway: http://localhost:${PORT}/api/gateway/status`);
});

module.exports = app;
