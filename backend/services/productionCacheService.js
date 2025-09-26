/**
 * Production Cache Service - Redis with in-memory fallback
 * Provides Redis caching for production with in-memory fallback for development
 */

const Redis = require('ioredis');

class ProductionCacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.useMemoryCache = !this.isProduction;
    this.redisConnected = false;
    
    // Initialize based on environment
    if (this.isProduction) {
      this.initializeRedis();
    } else {
      console.log('🔧 Development mode: Using in-memory cache');
      this.initializeMemoryCache();
    }
  }

  /**
   * Initialize Redis for production
   */
  initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Production settings
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
        maxLoadingTimeout: 10000,
        // Connection pool
        family: 4,
        db: process.env.REDIS_DB || 0,
        // Retry settings
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        // Health check
        enableOfflineQueue: false
      });

      // Handle Redis connection events
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.redisConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        this.redisConnected = false;
        this.useMemoryCache = true;
      });

      this.redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
        this.redisConnected = false;
        this.useMemoryCache = true;
      });

      // Test connection
      this.testRedisConnection();
      
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.useMemoryCache = true;
    }
  }

  /**
   * Initialize in-memory cache for development
   */
  initializeMemoryCache() {
    this.defaultTTL = 300; // 5 minutes
    this.maxSize = 1000; // Maximum cache entries
    this.cleanupInterval = 60000; // 1 minute cleanup interval
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Test Redis connection
   */
  async testRedisConnection() {
    try {
      await this.redis.ping();
      console.log('✅ Redis ping successful');
      this.redisConnected = true;
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      this.redisConnected = false;
      this.useMemoryCache = true;
    }
  }

  /**
   * Get value from cache or execute fallback function
   */
  async get(key, fallbackFn = null, ttl = 300) {
    try {
      if (this.isProduction && this.redisConnected) {
        return await this.getFromRedis(key, fallbackFn, ttl);
      } else {
        return await this.getFromMemory(key, fallbackFn, ttl);
      }
    } catch (error) {
      console.error('❌ Cache get error:', error);
      // Fallback to memory cache
      if (this.isProduction) {
        this.useMemoryCache = true;
        return await this.getFromMemory(key, fallbackFn, ttl);
      }
      throw error;
    }
  }

  /**
   * Get from Redis cache
   */
  async getFromRedis(key, fallbackFn = null, ttl = 300) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value);
      }

      // Execute fallback function if provided
      if (fallbackFn) {
        const result = await fallbackFn();
        await this.set(key, result, ttl);
        return result;
      }

      return null;
    } catch (error) {
      console.error('❌ Redis get error:', error);
      throw error;
    }
  }

  /**
   * Get from memory cache
   */
  async getFromMemory(key, fallbackFn = null, ttl = 300) {
    const entry = this.memoryCache.get(key);
    
    if (entry && !this.isExpired(entry)) {
      // Update access time for LRU
      entry.lastAccessed = Date.now();
      return entry.value;
    }

    // Remove expired entry
    if (entry) {
      this.memoryCache.delete(key);
    }

    // Execute fallback function if provided
    if (fallbackFn) {
      try {
        const value = await fallbackFn();
        this.set(key, value, ttl);
        return value;
      } catch (error) {
        console.error(`❌ Cache fallback function failed for key ${key}:`, error);
        throw error;
      }
    }

    return null;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.isProduction && this.redisConnected) {
        return await this.setInRedis(key, value, ttl);
      } else {
        return this.setInMemory(key, value, ttl);
      }
    } catch (error) {
      console.error('❌ Cache set error:', error);
      // Fallback to memory cache
      if (this.isProduction) {
        this.useMemoryCache = true;
        return this.setInMemory(key, value, ttl);
      }
      throw error;
    }
  }

  /**
   * Set in Redis cache
   */
  async setInRedis(key, value, ttl = 300) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Redis set error:', error);
      throw error;
    }
  }

  /**
   * Set in memory cache
   */
  setInMemory(key, value, ttl = 300) {
    // Check cache size limit
    if (this.memoryCache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      expiresAt: Date.now() + (ttl * 1000)
    };

    this.memoryCache.set(key, entry);
    return true;
  }

  /**
   * Delete specific key from cache
   */
  async del(key) {
    try {
      if (this.isProduction && this.redisConnected) {
        return await this.redis.del(key);
      } else {
        return this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    try {
      if (this.isProduction && this.redisConnected) {
        await this.redis.flushdb();
      } else {
        this.memoryCache.clear();
      }
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  /**
   * Check if cache entry is expired (memory only)
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict least recently used entry (memory only)
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  /**
   * Start cleanup interval for expired entries (memory only)
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries (memory only)
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.isProduction && this.redisConnected) {
      return await this.getRedisStats();
    } else {
      return this.getMemoryStats();
    }
  }

  /**
   * Get Redis statistics
   */
  async getRedisStats() {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        type: 'redis',
        connected: this.redisConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Redis stats error:', error);
      return {
        type: 'redis',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get memory cache statistics
   */
  getMemoryStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      type: 'memory',
      total: this.memoryCache.size,
      active,
      expired,
      maxSize: this.maxSize,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cache user data with user-specific key
   */
  async cacheUserData(userId, dataType, fallbackFn, ttl = 300) {
    const key = `user:${userId}:${dataType}`;
    return this.get(key, fallbackFn, ttl);
  }

  /**
   * Cache product data with product-specific key
   */
  async cacheProductData(productId, dataType, fallbackFn, ttl = 300) {
    const key = `product:${productId}:${dataType}`;
    return this.get(key, fallbackFn, ttl);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern) {
    if (this.isProduction && this.redisConnected) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return keys.length;
      } catch (error) {
        console.error('❌ Redis pattern invalidation error:', error);
        return 0;
      }
    } else {
      const regex = new RegExp(pattern);
      const keysToDelete = [];

      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.memoryCache.delete(key));
      return keysToDelete.length;
    }
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId) {
    return this.invalidatePattern(`^user:${userId}:`);
  }

  /**
   * Invalidate product-related cache
   */
  async invalidateProductCache(productId) {
    return this.invalidatePattern(`^product:${productId}:`);
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    if (this.isProduction && this.redisConnected) {
      try {
        await this.redis.ping();
        return {
          status: 'healthy',
          type: 'redis',
          connected: true,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          type: 'redis',
          connected: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      return {
        status: 'healthy',
        type: 'memory',
        connected: true,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new ProductionCacheService();
