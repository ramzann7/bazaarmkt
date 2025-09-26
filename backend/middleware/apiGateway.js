/**
 * API Gateway Foundation - Microservices Foundation
 * Provides request routing, authentication, rate limiting, and service communication
 */

const ServiceRegistry = require('../services/serviceRegistry');
const CacheService = require('../services/productionCacheService');

class APIGateway {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
    this.rateLimits = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize API Gateway
   */
  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ API Gateway already initialized');
      return;
    }

    // Register service routes
    this.registerServiceRoutes();
    
    // Initialize middleware
    this.initializeMiddleware();
    
    // Initialize rate limiting
    this.initializeRateLimiting();
    
    this.isInitialized = true;
    console.log('✅ API Gateway initialized successfully');
  }

  /**
   * Register service routes
   */
  registerServiceRoutes() {
    // User Service routes
    this.routes.set('/api/auth/*', {
      service: 'user-service',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      authentication: true,
      rateLimit: 'auth'
    });

    this.routes.set('/api/users/*', {
      service: 'user-service',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      authentication: true,
      rateLimit: 'standard'
    });

    // Product Service routes
    this.routes.set('/api/products/*', {
      service: 'product-service',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      authentication: false, // Public read access
      rateLimit: 'standard'
    });

    // Order Service routes
    this.routes.set('/api/orders/*', {
      service: 'order-service',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      authentication: true,
      rateLimit: 'standard'
    });

    // Notification Service routes
    this.routes.set('/api/notifications/*', {
      service: 'notification-service',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      authentication: true,
      rateLimit: 'standard'
    });

    // Health check routes
    this.routes.set('/api/health/*', {
      service: 'api-gateway',
      methods: ['GET'],
      authentication: false,
      rateLimit: 'health'
    });

    console.log(`✅ Registered ${this.routes.size} service routes`);
  }

  /**
   * Initialize middleware
   */
  initializeMiddleware() {
    this.middleware = [
      this.requestLoggingMiddleware.bind(this),
      this.corsMiddleware.bind(this),
      this.rateLimitMiddleware.bind(this),
      this.authenticationMiddleware.bind(this),
      this.serviceRoutingMiddleware.bind(this)
    ];
  }

  /**
   * Initialize rate limiting
   */
  initializeRateLimiting() {
    this.rateLimits.set('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many authentication attempts'
    });

    this.rateLimits.set('standard', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests'
    });

    this.rateLimits.set('health', {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // 10 requests per window
      message: 'Too many health check requests'
    });

    console.log(`✅ Initialized ${this.rateLimits.size} rate limit configurations`);
  }

  /**
   * Request logging middleware
   */
  requestLoggingMiddleware(req, res, next) {
    const start = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    req.requestId = requestId;
    req.startTime = start;

    console.log(`📥 [${requestId}] ${req.method} ${req.originalUrl} - ${req.ip}`);

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`📤 [${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });

    next();
  }

  /**
   * CORS middleware
   */
  corsMiddleware(req, res, next) {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  }

  /**
   * Rate limiting middleware
   */
  async rateLimitMiddleware(req, res, next) {
    try {
      const route = this.findRoute(req.originalUrl);
      if (!route) {
        return next();
      }

      const rateLimit = this.rateLimits.get(route.rateLimit);
      if (!rateLimit) {
        return next();
      }

      const key = `rate-limit:${route.rateLimit}:${req.ip}`;
      const current = await CacheService.get(key) || 0;
      
      if (current >= rateLimit.max) {
        return res.status(429).json({
          success: false,
          message: rateLimit.message,
          retryAfter: Math.ceil(rateLimit.windowMs / 1000)
        });
      }

      await CacheService.set(key, current + 1, Math.ceil(rateLimit.windowMs / 1000));
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  }

  /**
   * Authentication middleware
   */
  async authenticationMiddleware(req, res, next) {
    try {
      const route = this.findRoute(req.originalUrl);
      if (!route || !route.authentication) {
        return next();
      }

      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check cache first
      const cacheKey = `auth:${token}`;
      let user = await CacheService.get(cacheKey);

      if (!user) {
        // Verify token (simplified for now)
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Get user from database
          const dbManager = require('../config/database');
          const db = await dbManager.connect();
          const usersCollection = db.collection('users');
          user = await usersCollection.findOne(
            { _id: require('mongodb').ObjectId(decoded.userId) },
            { projection: { password: 0 } }
          );

          if (!user) {
            return res.status(404).json({
              success: false,
              message: 'User not found'
            });
          }

          // Cache user for 1 hour
          await CacheService.set(cacheKey, user, 3600);
        } catch (error) {
          return res.status(403).json({
            success: false,
            message: 'Invalid token'
          });
        }
      }

      req.user = user;
      req.userId = user._id;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }

  /**
   * Service routing middleware
   */
  async serviceRoutingMiddleware(req, res, next) {
    try {
      const route = this.findRoute(req.originalUrl);
      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }

      // Check if service is healthy
      const service = ServiceRegistry.getService(route.service);
      if (!service || service.status !== 'healthy') {
        return res.status(503).json({
          success: false,
          message: `Service ${route.service} is unavailable`,
          service: route.service,
          status: service ? service.status : 'unknown'
        });
      }

      // Add service information to request
      req.service = route.service;
      req.route = route;

      // For now, continue to the actual endpoint
      // In a full microservices setup, this would route to the actual service
      next();
    } catch (error) {
      console.error('Service routing error:', error);
      res.status(500).json({
        success: false,
        message: 'Service routing error'
      });
    }
  }

  /**
   * Find route for a given URL
   */
  findRoute(url) {
    for (const [pattern, route] of this.routes) {
      if (this.matchRoute(pattern, url)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Match route pattern with URL
   */
  matchRoute(pattern, url) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  }

  /**
   * Get API Gateway status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      routes: this.routes.size,
      middleware: this.middleware.length,
      rateLimits: this.rateLimits.size,
      services: ServiceRegistry.getAllServices().length
    };
  }

  /**
   * Get service health for routing
   */
  async getServiceHealth() {
    const services = ServiceRegistry.getAllServices();
    const health = {};

    for (const service of services) {
      health[service.name] = {
        status: service.status,
        lastHealthCheck: service.lastHealthCheck,
        endpoints: service.endpoints
      };
    }

    return health;
  }

  /**
   * Get routing information
   */
  getRoutingInfo() {
    const routes = [];
    for (const [pattern, route] of this.routes) {
      routes.push({
        pattern,
        service: route.service,
        methods: route.methods,
        authentication: route.authentication,
        rateLimit: route.rateLimit
      });
    }

    return {
      totalRoutes: routes.length,
      routes
    };
  }
}

// Export singleton instance
module.exports = new APIGateway();
