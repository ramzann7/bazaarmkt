/**
 * Environment Configuration - Microservices Foundation
 * Handles environment variables for development and production (Vercel)
 */

require('dotenv').config(); // Load .env file for development

class EnvironmentConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isVercel = process.env.VERCEL === '1';
    
    this.validateEnvironment();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET'
    ];

    const missingVars = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      
      if (this.isProduction || this.isVercel) {
        throw new Error(`${errorMessage}. Please set these in Vercel environment variables.`);
      } else {
        console.warn(`⚠️ ${errorMessage}. Using default values for development.`);
        this.setDefaultValues();
      }
    }
  }

  /**
   * Set default values for development
   */
  setDefaultValues() {
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';
      console.log('🔧 Using default MONGODB_URI for development');
    }

    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'development_jwt_secret_key_change_in_production';
      console.log('🔧 Using default JWT_SECRET for development');
    }

    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
      console.log('🔧 Using default NODE_ENV=development');
    }
  }

  /**
   * Get MongoDB URI
   */
  getMongoDBUri() {
    return process.env.MONGODB_URI;
  }

  /**
   * Get JWT Secret
   */
  getJWTSecret() {
    return process.env.JWT_SECRET;
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig() {
    return {
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      tls: process.env.REDIS_TLS === 'true'
    };
  }

  /**
   * Get cache configuration
   */
  getCacheConfig() {
    return {
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 300,
      userCacheTtlSeconds: parseInt(process.env.USER_CACHE_TTL_SECONDS) || 3600
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
      enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING === 'true'
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5
    };
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      isProduction: this.isProduction,
      isDevelopment: this.isDevelopment,
      isVercel: this.isVercel,
      vercelEnv: process.env.VERCEL_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      hasMongoDB: !!process.env.MONGODB_URI,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasRedis: !!(process.env.REDIS_HOST && process.env.REDIS_PASSWORD)
    };
  }

  /**
   * Validate service configuration
   */
  validateServiceConfig(serviceName) {
    const config = {
      service: serviceName,
      environment: this.getEnvironmentInfo(),
      database: {
        uri: this.getMongoDBUri() ? 'configured' : 'missing',
        connected: false
      },
      cache: {
        redis: this.getRedisConfig(),
        configured: !!(this.getRedisConfig().host && this.getRedisConfig().password)
      },
      security: {
        jwtSecret: this.getJWTSecret() ? 'configured' : 'missing'
      }
    };

    return config;
  }

  /**
   * Get production warnings
   */
  getProductionWarnings() {
    const warnings = [];

    if (this.isProduction && process.env.JWT_SECRET === 'development_jwt_secret_key_change_in_production') {
      warnings.push('JWT_SECRET is using development default - change in production!');
    }

    if (this.isProduction && !process.env.REDIS_HOST) {
      warnings.push('Redis not configured - using in-memory cache');
    }

    if (this.isProduction && !process.env.VERCEL) {
      warnings.push('Not running on Vercel - ensure environment variables are set');
    }

    return warnings;
  }
}

// Export singleton instance
module.exports = new EnvironmentConfig();
