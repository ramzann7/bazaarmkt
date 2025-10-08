/**
 * Optimized Microservices Integration - Production Ready
 * Handles graceful degradation and efficient service management
 */

const APIGateway = require('./apiGateway');
const ServiceRegistry = require('../services/serviceRegistry');
const HealthChecks = require('../services/healthChecks');

// Core services (essential for application functionality)
const CORE_SERVICES = [
  'user-service',
  'product-service', 
  'order-service',
  'notification-service'
];

// Extended services (enhanced functionality)
const EXTENDED_SERVICES = [
  'search-service',
  'analytics-service',
  'file-service',
  'reviews-service',
  'favorites-service',
  'community-service',
  'artisan-service',
  'promotional-service',
  'wallet-service',
  'revenue-service',
  'spotlight-service',
  'admin-service',
  'geocoding-service'
];

class OptimizedMicroservicesIntegration {
  constructor() {
    this.isInitialized = false;
    this.services = new Map();
    this.failedServices = new Set();
    this.initializationAttempts = 0;
    this.maxInitializationAttempts = 3;
  }

  /**
   * Initialize microservices with graceful degradation
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Microservices already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Optimized Microservices Integration...');
      console.log('');

      // Step 1: Initialize API Gateway
      console.log('Step 1: Initializing API Gateway...');
      APIGateway.initialize();
      console.log('✅ API Gateway initialized');

      // Step 2: Initialize Service Registry
      console.log('Step 2: Initializing Service Registry...');
      ServiceRegistry.initializeCoreServices();
      console.log('✅ Service Registry initialized');

      // Step 3: Register Health Checks
      console.log('Step 3: Registering Health Checks...');
      const services = ServiceRegistry.getAllServices();
      for (const service of services) {
        const healthCheck = HealthChecks.getHealthCheck(service.name);
        if (healthCheck) {
          ServiceRegistry.registerHealthCheck(service.name, healthCheck);
          console.log(`✅ Health check registered for: ${service.name}`);
        }
      }

      // Step 4: Initialize Core Services (Critical)
      console.log('Step 4: Initializing Core Services (Critical)...');
      await this.initializeCoreServices();

      // Step 5: Initialize Extended Services (Non-blocking)
      console.log('Step 5: Initializing Extended Services (Non-blocking)...');
      this.initializeExtendedServices(); // Non-blocking

      // Step 6: Perform Health Checks
      console.log('Step 6: Performing Health Checks...');
      await this.performHealthChecks();

      this.isInitialized = true;
      console.log('');
      console.log('🎉 Optimized Microservices Integration completed!');
      console.log(`📊 Total Services: ${this.services.size}`);
      console.log(`❌ Failed Services: ${this.failedServices.size}`);
      console.log('🚀 Core services are ready for production!');

    } catch (error) {
      console.error('❌ Microservices initialization failed:', error);
      this.handleInitializationFailure(error);
    }
  }

  /**
   * Initialize core services (blocking)
   */
  async initializeCoreServices() {
    const coreServiceModules = {
      'user-service': require('../services/userService'),
      'product-service': require('../services/productService'),
      'order-service': require('../services/orderService'),
      'notification-service': require('../services/notificationService')
    };

    for (const [serviceName, serviceModule] of Object.entries(coreServiceModules)) {
      try {
        console.log(`  - Initializing ${serviceName}...`);
        await this.initializeService(serviceName, serviceModule);
        console.log(`  ✅ ${serviceName} initialized`);
      } catch (error) {
        console.error(`  ❌ ${serviceName} initialization failed:`, error.message);
        this.failedServices.add(serviceName);
        throw new Error(`Core service ${serviceName} failed to initialize`);
      }
    }
  }

  /**
   * Initialize extended services (non-blocking)
   */
  async initializeExtendedServices() {
    const extendedServiceModules = {
      'search-service': require('../services/searchService'),
      'analytics-service': require('../services/analyticsService'),
      'file-service': require('../services/fileService'),
      'reviews-service': require('../services/reviewsService'),
      'favorites-service': require('../services/favoritesService'),
      'community-service': require('../services/communityService'),
      'artisan-service': require('../services/artisanService'),
      'promotional-service': require('../services/promotionalService'),
      'wallet-service': require('../services/walletService'),
      'revenue-service': require('../services/revenueService'),
      'spotlight-service': require('../services/spotlightService'),
      'admin-service': require('../services/adminService'),
      'geocoding-service': require('../services/geocodingService')
    };

    // Initialize extended services in parallel (non-blocking)
    const initPromises = Object.entries(extendedServiceModules).map(async ([serviceName, serviceModule]) => {
      try {
        console.log(`  - Initializing ${serviceName}...`);
        await this.initializeService(serviceName, serviceModule);
        console.log(`  ✅ ${serviceName} initialized`);
      } catch (error) {
        console.error(`  ❌ ${serviceName} initialization failed:`, error.message);
        this.failedServices.add(serviceName);
        // Don't throw - extended services are optional
      }
    });

    // Wait for all extended services to complete (with timeout)
    try {
      await Promise.race([
        Promise.allSettled(initPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Extended services initialization timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.warn('⚠️ Extended services initialization timed out, continuing...');
    }
  }

  /**
   * Initialize individual service with timeout
   */
  async initializeService(serviceName, serviceModule) {
    const initPromise = serviceModule.initialize();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${serviceName} initialization timeout`)), 15000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    this.services.set(serviceName, serviceModule);
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks() {
    try {
      const healthResults = await ServiceRegistry.performAllHealthChecks();
      const healthyServices = Object.values(healthResults).filter(r => r.status === 'healthy').length;
      const totalServices = Object.keys(healthResults).length;
      
      console.log(`✅ Health checks completed: ${healthyServices}/${totalServices} services healthy`);
      
      // Log unhealthy services
      for (const [serviceName, result] of Object.entries(healthResults)) {
        if (result.status !== 'healthy') {
          console.warn(`⚠️ ${serviceName}: ${result.status} - ${result.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Health checks failed:', error.message);
    }
  }

  /**
   * Handle initialization failure with retry logic
   */
  handleInitializationFailure(error) {
    this.initializationAttempts++;
    
    if (this.initializationAttempts < this.maxInitializationAttempts) {
      console.log(`🔄 Retrying microservices initialization (${this.initializationAttempts}/${this.maxInitializationAttempts})...`);
      setTimeout(() => {
        this.initialize().catch(err => {
          console.error('❌ Retry failed:', err.message);
        });
      }, 5000 * this.initializationAttempts);
    } else {
      console.error('❌ Max initialization attempts reached. Server will continue with limited functionality.');
    }
  }

  /**
   * Get service by name
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Get all services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get failed services
   */
  getFailedServices() {
    return Array.from(this.failedServices);
  }

  /**
   * Route request to appropriate service with fallback
   */
  async routeRequest(req, res, next) {
    try {
      const route = APIGateway.findRoute(req.originalUrl);
      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }

      // Check if service is available
      const service = this.getService(route.service);
      if (!service) {
        return res.status(503).json({
          success: false,
          message: `Service ${route.service} is not available`,
          fallback: 'Please try again later or contact support'
        });
      }

      // Check if service is healthy
      const healthCheck = await ServiceRegistry.performHealthCheck(route.service);
      if (healthCheck.status !== 'healthy') {
        return res.status(503).json({
          success: false,
          message: `Service ${route.service} is unhealthy`,
          status: healthCheck.status,
          error: healthCheck.error
        });
      }

      // Add service info to request
      req.service = route.service;
      req.serviceInstance = service;
      req.route = route;

      // Continue to the actual endpoint
      next();
    } catch (error) {
      console.error('Service routing error:', error);
      res.status(500).json({
        success: false,
        message: 'Service routing error',
        error: error.message
      });
    }
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      totalServices: this.services.size,
      failedServices: this.failedServices.size,
      serviceNames: Array.from(this.services.keys()),
      failedServiceNames: Array.from(this.failedServices),
      apiGateway: APIGateway.getStatus(),
      serviceRegistry: ServiceRegistry.getServiceStats()
    };
  }

  /**
   * Get health summary
   */
  async getHealthSummary() {
    try {
      const healthResults = await ServiceRegistry.performAllHealthChecks();
      const healthy = Object.values(healthResults).filter(r => r.status === 'healthy').length;
      const unhealthy = Object.values(healthResults).filter(r => r.status === 'unhealthy').length;
      const total = Object.keys(healthResults).length;

      return {
        total,
        healthy,
        unhealthy,
        services: healthResults,
        failedServices: Array.from(this.failedServices)
      };
    } catch (error) {
      console.error('Health summary error:', error);
      return {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        error: error.message,
        failedServices: Array.from(this.failedServices)
      };
    }
  }

  /**
   * Get service endpoints
   */
  getServiceEndpoints() {
    const endpoints = [];
    
    for (const [serviceName, service] of this.services) {
      if (service.getServiceInfo) {
        const info = service.getServiceInfo();
        endpoints.push({
          service: serviceName,
          endpoints: info.endpoints || [],
          status: 'available'
        });
      }
    }

    // Add failed services
    for (const serviceName of this.failedServices) {
      endpoints.push({
        service: serviceName,
        endpoints: [],
        status: 'failed'
      });
    }

    return endpoints;
  }

  /**
   * Get integration information
   */
  getIntegrationInfo() {
    return {
      status: this.getStatus(),
      endpoints: this.getServiceEndpoints(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new OptimizedMicroservicesIntegration();
