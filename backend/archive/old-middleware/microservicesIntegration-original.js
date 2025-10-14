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
const SearchService = require('../services/searchService');
const AnalyticsService = require('../services/analyticsService');
const FileService = require('../services/fileService');
const ReviewsService = require('../services/reviewsService');
const FavoritesService = require('../services/favoritesService');
const CommunityService = require('../services/communityService');
const ArtisanService = require('../services/artisanService');
const PromotionalService = require('../services/promotionalService');
const WalletService = require('../services/WalletService');
const RevenueService = require('../services/revenueService');
const SpotlightService = require('../services/spotlightService');
const AdminService = require('../services/adminService');
const GeocodingService = require('../services/geocodingService');

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

      // Initialize Search Service
      console.log('  - Initializing Search Service...');
      await SearchService.initialize();
      this.services.set('search-service', SearchService);
      console.log('  ✅ Search Service initialized');

      // Initialize Analytics Service
      console.log('  - Initializing Analytics Service...');
      await AnalyticsService.initialize();
      this.services.set('analytics-service', AnalyticsService);
      console.log('  ✅ Analytics Service initialized');

      // Initialize File Service
      console.log('  - Initializing File Service...');
      await FileService.initialize();
      this.services.set('file-service', FileService);
      console.log('  ✅ File Service initialized');

      // Initialize Reviews Service
      console.log('  - Initializing Reviews Service...');
      await ReviewsService.initialize();
      this.services.set('reviews-service', ReviewsService);
      console.log('  ✅ Reviews Service initialized');

      // Initialize Favorites Service
      console.log('  - Initializing Favorites Service...');
      await FavoritesService.initialize();
      this.services.set('favorites-service', FavoritesService);
      console.log('  ✅ Favorites Service initialized');

      // Initialize Community Service
      console.log('  - Initializing Community Service...');
      await CommunityService.initialize();
      this.services.set('community-service', CommunityService);
      console.log('  ✅ Community Service initialized');

      // Initialize Artisan Service
      console.log('  - Initializing Artisan Service...');
      await ArtisanService.initialize();
      this.services.set('artisan-service', ArtisanService);
      console.log('  ✅ Artisan Service initialized');

      // Initialize Promotional Service
      console.log('  - Initializing Promotional Service...');
      await PromotionalService.initialize();
      this.services.set('promotional-service', PromotionalService);
      console.log('  ✅ Promotional Service initialized');

      // Initialize Wallet Service
      console.log('  - Initializing Wallet Service...');
      await WalletService.initialize();
      this.services.set('wallet-service', WalletService);
      console.log('  ✅ Wallet Service initialized');

      // Initialize Revenue Service
      console.log('  - Initializing Revenue Service...');
      await RevenueService.initialize();
      this.services.set('revenue-service', RevenueService);
      console.log('  ✅ Revenue Service initialized');

      // Initialize Spotlight Service
      console.log('  - Initializing Spotlight Service...');
      await SpotlightService.initialize();
      this.services.set('spotlight-service', SpotlightService);
      console.log('  ✅ Spotlight Service initialized');

      // Initialize Admin Service
      console.log('  - Initializing Admin Service...');
      await AdminService.initialize();
      this.services.set('admin-service', AdminService);
      console.log('  ✅ Admin Service initialized');

      // Initialize Geocoding Service
      console.log('  - Initializing Geocoding Service...');
      await GeocodingService.initialize();
      this.services.set('geocoding-service', GeocodingService);
      console.log('  ✅ Geocoding Service initialized');

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
