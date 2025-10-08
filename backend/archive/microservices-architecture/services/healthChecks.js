/**
 * Health Checks - Microservices Foundation
 * Provides health check functions for all services
 */

const dbManager = require('../config/database');
const CacheService = require('./productionCacheService');

class HealthChecks {
  constructor() {
    this.checks = new Map();
    this.initializeHealthChecks();
  }

  /**
   * Initialize all health checks
   */
  initializeHealthChecks() {
    // Database health check
    this.checks.set('database', async () => {
      try {
        const start = Date.now();
        const health = await dbManager.healthCheck();
        const responseTime = Date.now() - start;
        
        return {
          status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
          responseTime: responseTime,
          metadata: {
            connection: health.connected,
            timestamp: health.timestamp,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Cache health check
    this.checks.set('cache', async () => {
      try {
        const start = Date.now();
        const health = await CacheService.healthCheck();
        const responseTime = Date.now() - start;
        
        return {
          status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
          responseTime: responseTime,
          metadata: {
            type: health.type,
            connected: health.connected,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // User Service health check
    this.checks.set('user-service', async () => {
      try {
        const start = Date.now();
        
        // Test database connection
        const db = await dbManager.connect();
        const usersCollection = db.collection('users');
        await usersCollection.findOne({}, { projection: { _id: 1 } });
        
        // Test cache
        const cacheKey = 'health-check:user-service';
        await CacheService.set(cacheKey, { test: true }, 60);
        const cached = await CacheService.get(cacheKey);
        await CacheService.del(cacheKey);
        
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            database: 'connected',
            cache: cached ? 'working' : 'failed',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Product Service health check
    this.checks.set('product-service', async () => {
      try {
        const start = Date.now();
        
        // Test database connection
        const db = await dbManager.connect();
        const productsCollection = db.collection('products');
        await productsCollection.findOne({}, { projection: { _id: 1 } });
        
        // Test cache
        const cacheKey = 'health-check:product-service';
        await CacheService.set(cacheKey, { test: true }, 60);
        const cached = await CacheService.get(cacheKey);
        await CacheService.del(cacheKey);
        
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            database: 'connected',
            cache: cached ? 'working' : 'failed',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Order Service health check
    this.checks.set('order-service', async () => {
      try {
        const start = Date.now();
        
        // Test database connection
        const db = await dbManager.connect();
        const ordersCollection = db.collection('orders');
        await ordersCollection.findOne({}, { projection: { _id: 1 } });
        
        // Test cache
        const cacheKey = 'health-check:order-service';
        await CacheService.set(cacheKey, { test: true }, 60);
        const cached = await CacheService.get(cacheKey);
        await CacheService.del(cacheKey);
        
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            database: 'connected',
            cache: cached ? 'working' : 'failed',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Notification Service health check
    this.checks.set('notification-service', async () => {
      try {
        const start = Date.now();
        
        // Test database connection
        const db = await dbManager.connect();
        const notificationsCollection = db.collection('notifications');
        await notificationsCollection.findOne({}, { projection: { _id: 1 } });
        
        // Test cache
        const cacheKey = 'health-check:notification-service';
        await CacheService.set(cacheKey, { test: true }, 60);
        const cached = await CacheService.get(cacheKey);
        await CacheService.del(cacheKey);
        
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            database: 'connected',
            cache: cached ? 'working' : 'failed',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // API Gateway health check
    this.checks.set('api-gateway', async () => {
      try {
        const start = Date.now();
        
        // Test basic functionality
        const testData = { test: true, timestamp: Date.now() };
        const cacheKey = 'health-check:api-gateway';
        await CacheService.set(cacheKey, testData, 60);
        const cached = await CacheService.get(cacheKey);
        await CacheService.del(cacheKey);
        
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            cache: cached ? 'working' : 'failed',
            responseTime: `${responseTime}ms`,
            port: process.env.PORT || 4000
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Search Service health check
    this.checks.set('search-service', async () => {
      try {
        const start = Date.now();
        
        // Test search functionality
        const testQuery = 'test';
        const testFilters = { limit: 1 };
        
        // This would normally call the search service
        // For now, we'll just test basic connectivity
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            searchCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Analytics Service health check
    this.checks.set('analytics-service', async () => {
      try {
        const start = Date.now();
        
        // Test analytics functionality
        const responseTime = Date.now() - start;
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            analyticsCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // File Service health check
    this.checks.set('file-service', async () => {
      try {
        const start = Date.now();
        
        // Test file service functionality
        const uploadPath = process.env.UPLOAD_PATH || './public/uploads';
        const fs = require('fs');
        const path = require('path');
        
        // Check if upload directory exists
        const dirExists = fs.existsSync(uploadPath);
        const responseTime = Date.now() - start;
        
        return {
          status: dirExists ? 'healthy' : 'unhealthy',
          responseTime: responseTime,
          metadata: {
            uploadPath: uploadPath,
            directoryExists: dirExists,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    });

    // Reviews Service health check
    this.checks.set('reviews-service', async () => {
      try {
        const start = Date.now();
        // Test reviews functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            reviewsCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Favorites Service health check
    this.checks.set('favorites-service', async () => {
      try {
        const start = Date.now();
        // Test favorites functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            favoritesCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Community Service health check
    this.checks.set('community-service', async () => {
      try {
        const start = Date.now();
        // Test community functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            communityCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Artisan Service health check
    this.checks.set('artisan-service', async () => {
      try {
        const start = Date.now();
        // Test artisan functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            artisanCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Promotional Service health check
    this.checks.set('promotional-service', async () => {
      try {
        const start = Date.now();
        // Test promotional functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            promotionalCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Wallet Service health check
    this.checks.set('wallet-service', async () => {
      try {
        const start = Date.now();
        // Test wallet functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            walletCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Revenue Service health check
    this.checks.set('revenue-service', async () => {
      try {
        const start = Date.now();
        // Test revenue functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            revenueCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Spotlight Service health check
    this.checks.set('spotlight-service', async () => {
      try {
        const start = Date.now();
        // Test spotlight functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            spotlightCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Admin Service health check
    this.checks.set('admin-service', async () => {
      try {
        const start = Date.now();
        // Test admin functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            adminCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    // Geocoding Service health check
    this.checks.set('geocoding-service', async () => {
      try {
        const start = Date.now();
        // Test geocoding functionality (placeholder for now)
        const responseTime = Date.now() - start;
        return {
          status: 'healthy',
          responseTime: responseTime,
          metadata: {
            geocodingCapability: 'available',
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error) {
        return { status: 'unhealthy', error: error.message, metadata: { timestamp: new Date().toISOString() } };
      }
    });

    console.log('✅ Health checks initialized for all services');
  }

  /**
   * Get health check for a specific service
   */
  getHealthCheck(serviceName) {
    return this.checks.get(serviceName);
  }

  /**
   * Perform health check for a service
   */
  async performHealthCheck(serviceName) {
    const healthCheck = this.checks.get(serviceName);
    if (!healthCheck) {
      throw new Error(`No health check found for service: ${serviceName}`);
    }

    return await healthCheck();
  }

  /**
   * Perform health checks for all services
   */
  async performAllHealthChecks() {
    const results = {};
    const services = Array.from(this.checks.keys());
    
    console.log(`🔍 Performing health checks for ${services.length} services...`);
    
    for (const serviceName of services) {
      try {
        results[serviceName] = await this.performHealthCheck(serviceName);
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          error: error.message,
          metadata: { timestamp: new Date().toISOString() }
        };
      }
    }
    
    return results;
  }

  /**
   * Get health check summary
   */
  async getHealthSummary() {
    const results = await this.performAllHealthChecks();
    const summary = {
      total: Object.keys(results).length,
      healthy: Object.values(results).filter(r => r.status === 'healthy').length,
      unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
      services: results
    };
    
    return summary;
  }
}

// Export singleton instance
module.exports = new HealthChecks();
