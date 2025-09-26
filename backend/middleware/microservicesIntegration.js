/**
 * Microservices Integration - API Gateway
 * Integrates all microservices with the API Gateway
 */

const APIGateway = require('./apiGateway');
const ServiceRegistry = require('../services/serviceRegistry');
const HealthChecks = require('../services/healthChecks');
const UserService = require('../services/userService');
const ProductService = require('../services/productService');
const OrderService = require('../services/orderService');
const NotificationService = require('../services/notificationService');

class MicroservicesIntegration {
  constructor() {
    this.isInitialized = false;
    this.services = new Map();
  }

  /**
   * Initialize all microservices
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Microservices already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Microservices Integration...');
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

      // Step 4: Initialize Individual Services
      console.log('Step 4: Initializing Individual Services...');
      
      // Initialize User Service
      console.log('  - Initializing User Service...');
      await UserService.initialize();
      this.services.set('user-service', UserService);
      console.log('  ✅ User Service initialized');

      // Initialize Product Service
      console.log('  - Initializing Product Service...');
      await ProductService.initialize();
      this.services.set('product-service', ProductService);
      console.log('  ✅ Product Service initialized');

      // Initialize Order Service
      console.log('  - Initializing Order Service...');
      await OrderService.initialize();
      this.services.set('order-service', OrderService);
      console.log('  ✅ Order Service initialized');

      // Initialize Notification Service
      console.log('  - Initializing Notification Service...');
      await NotificationService.initialize();
      this.services.set('notification-service', NotificationService);
      console.log('  ✅ Notification Service initialized');

      // Step 5: Perform Health Checks
      console.log('Step 5: Performing Health Checks...');
      const healthResults = await ServiceRegistry.performAllHealthChecks();
      const healthyServices = Object.values(healthResults).filter(r => r.status === 'healthy').length;
      const totalServices = Object.keys(healthResults).length;
      console.log(`✅ Health checks completed: ${healthyServices}/${totalServices} services healthy`);

      this.isInitialized = true;
      console.log('');
      console.log('🎉 Microservices Integration completed successfully!');
      console.log(`📊 Total Services: ${this.services.size}`);
      console.log(`📊 Healthy Services: ${healthyServices}/${totalServices}`);
      console.log('🚀 All microservices are ready for production!');

    } catch (error) {
      console.error('❌ Microservices initialization failed:', error);
      throw error;
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
   * Route request to appropriate service
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

      // Get the actual service instance
      const serviceInstance = this.getService(route.service);
      if (!serviceInstance) {
        return res.status(503).json({
          success: false,
          message: `Service ${route.service} not initialized`
        });
      }

      // Add service info to request
      req.service = route.service;
      req.serviceInstance = serviceInstance;
      req.route = route;

      // Continue to the actual endpoint
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
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      services: this.services.size,
      serviceNames: Array.from(this.services.keys()),
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
        services: healthResults
      };
    } catch (error) {
      console.error('Health summary error:', error);
      return {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        error: error.message
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
          endpoints: info.endpoints || []
        });
      }
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
module.exports = new MicroservicesIntegration();
