/**
 * Service Registry - Microservices Foundation
 * Manages service discovery, health checks, and service communication
 */

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.serviceDependencies = new Map();
    this.isInitialized = false;
  }

  /**
   * Register a service with the registry
   */
  registerService(serviceName, serviceConfig) {
    const serviceInfo = {
      name: serviceName,
      version: serviceConfig.version || '1.0.0',
      status: 'unknown',
      lastHealthCheck: null,
      endpoints: serviceConfig.endpoints || [],
      dependencies: serviceConfig.dependencies || [],
      metadata: serviceConfig.metadata || {},
      registeredAt: new Date(),
      updatedAt: new Date()
    };

    this.services.set(serviceName, serviceInfo);
    this.serviceDependencies.set(serviceName, serviceConfig.dependencies || []);
    
    console.log(`✅ Service registered: ${serviceName} v${serviceInfo.version}`);
    return serviceInfo;
  }

  /**
   * Register a health check for a service
   */
  registerHealthCheck(serviceName, healthCheckFunction) {
    this.healthChecks.set(serviceName, healthCheckFunction);
    console.log(`✅ Health check registered for: ${serviceName}`);
  }

  /**
   * Get service information
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Get all registered services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status) {
    return Array.from(this.services.values()).filter(service => service.status === status);
  }

  /**
   * Update service status
   */
  updateServiceStatus(serviceName, status, metadata = {}) {
    const service = this.services.get(serviceName);
    if (service) {
      service.status = status;
      service.lastHealthCheck = new Date();
      service.updatedAt = new Date();
      Object.assign(service.metadata, metadata);
      
      console.log(`📊 Service status updated: ${serviceName} -> ${status}`);
    }
  }

  /**
   * Perform health check for a service
   */
  async performHealthCheck(serviceName) {
    const healthCheck = this.healthChecks.get(serviceName);
    if (!healthCheck) {
      console.warn(`⚠️ No health check registered for: ${serviceName}`);
      return { status: 'unknown', message: 'No health check registered' };
    }

    try {
      const result = await healthCheck();
      this.updateServiceStatus(serviceName, result.status, result.metadata);
      return result;
    } catch (error) {
      console.error(`❌ Health check failed for ${serviceName}:`, error);
      this.updateServiceStatus(serviceName, 'unhealthy', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Perform health checks for all services
   */
  async performAllHealthChecks() {
    const results = {};
    const services = Array.from(this.services.keys());
    
    console.log(`🔍 Performing health checks for ${services.length} services...`);
    
    for (const serviceName of services) {
      results[serviceName] = await this.performHealthCheck(serviceName);
    }
    
    return results;
  }

  /**
   * Get service dependencies
   */
  getServiceDependencies(serviceName) {
    return this.serviceDependencies.get(serviceName) || [];
  }

  /**
   * Check if all dependencies are healthy
   */
  async checkDependencies(serviceName) {
    const dependencies = this.getServiceDependencies(serviceName);
    const dependencyStatus = {};
    
    for (const dep of dependencies) {
      const service = this.services.get(dep);
      dependencyStatus[dep] = service ? service.status : 'unknown';
    }
    
    return dependencyStatus;
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    const services = Array.from(this.services.values());
    const stats = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      unknown: services.filter(s => s.status === 'unknown').length,
      services: services.map(s => ({
        name: s.name,
        status: s.status,
        lastHealthCheck: s.lastHealthCheck,
        dependencies: this.getServiceDependencies(s.name)
      }))
    };
    
    return stats;
  }

  /**
   * Initialize core services
   */
  initializeCoreServices() {
    if (this.isInitialized) {
      console.log('⚠️ Service registry already initialized');
      return;
    }

    // Register core services
    this.registerService('api-gateway', {
      version: '1.0.0',
      endpoints: ['/api/*'],
      dependencies: ['user-service', 'product-service', 'order-service'],
      metadata: { type: 'gateway', port: process.env.PORT || 4000 }
    });

    this.registerService('user-service', {
      version: '1.0.0',
      endpoints: ['/api/auth/*', '/api/users/*'],
      dependencies: ['database', 'cache'],
      metadata: { type: 'core', database: 'users' }
    });

    this.registerService('product-service', {
      version: '1.0.0',
      endpoints: ['/api/products/*'],
      dependencies: ['database', 'cache'],
      metadata: { type: 'core', database: 'products' }
    });

    this.registerService('order-service', {
      version: '1.0.0',
      endpoints: ['/api/orders/*'],
      dependencies: ['database', 'user-service', 'product-service'],
      metadata: { type: 'core', database: 'orders' }
    });

    this.registerService('notification-service', {
      version: '1.0.0',
      endpoints: ['/api/notifications/*'],
      dependencies: ['database', 'user-service'],
      metadata: { type: 'core', database: 'notifications' }
    });

    this.registerService('database', {
      version: '1.0.0',
      endpoints: [],
      dependencies: [],
      metadata: { type: 'infrastructure', provider: 'mongodb' }
    });

    this.registerService('cache', {
      version: '1.0.0',
      endpoints: [],
      dependencies: [],
      metadata: { type: 'infrastructure', provider: 'redis' }
    });

    this.isInitialized = true;
    console.log('🎉 Core services registered successfully');
  }

  /**
   * Get service communication info
   */
  getServiceCommunicationInfo() {
    return {
      registry: {
        totalServices: this.services.size,
        healthyServices: this.getServicesByStatus('healthy').length,
        lastUpdate: new Date()
      },
      services: this.getAllServices().map(service => ({
        name: service.name,
        status: service.status,
        endpoints: service.endpoints,
        dependencies: this.getServiceDependencies(service.name)
      }))
    };
  }
}

// Export singleton instance
module.exports = new ServiceRegistry();
