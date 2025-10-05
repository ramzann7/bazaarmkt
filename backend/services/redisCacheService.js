/**
 * Redis Cache Service
 * Provides Redis-based caching for completed orders and other data
 */

const Redis = require('ioredis');

class RedisCacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes in seconds
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      // Use Redis URL from environment or default to localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Connection timeout
        connectTimeout: 10000,
        // Command timeout
        commandTimeout: 5000,
        // Retry strategy
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`🔄 Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        }
      });

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        console.log('🚀 Redis ready for operations');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Get value from Redis cache
   */
  async get(key) {
    if (!this.isConnected || !this.redis) {
      console.log('⚠️ Redis not connected, skipping cache get for key:', key);
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        console.log('📦 Cache hit for key:', key);
        return JSON.parse(value);
      }
      console.log('❌ Cache miss for key:', key);
      return null;
    } catch (error) {
      console.error('❌ Redis get error for key', key, ':', error.message);
      return null;
    }
  }

  /**
   * Set value in Redis cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.redis) {
      console.log('⚠️ Redis not connected, skipping cache set for key:', key);
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      console.log('💾 Cached data for key:', key, 'TTL:', ttl, 'seconds');
      return true;
    } catch (error) {
      console.error('❌ Redis set error for key', key, ':', error.message);
      return false;
    }
  }

  /**
   * Delete key from Redis cache
   */
  async del(key) {
    if (!this.isConnected || !this.redis) {
      console.log('⚠️ Redis not connected, skipping cache delete for key:', key);
      return false;
    }

    try {
      await this.redis.del(key);
      console.log('🗑️ Deleted cache key:', key);
      return true;
    } catch (error) {
      console.error('❌ Redis delete error for key', key, ':', error.message);
      return false;
    }
  }

  /**
   * Check if key exists in Redis
   */
  async exists(key) {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis exists error for key', key, ':', error.message);
      return false;
    }
  }

  /**
   * Get multiple keys from Redis
   */
  async mget(keys) {
    if (!this.isConnected || !this.redis || !keys.length) {
      return [];
    }

    try {
      const values = await this.redis.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('❌ Redis mget error:', error.message);
      return [];
    }
  }

  /**
   * Set multiple key-value pairs in Redis
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.redis || !keyValuePairs.length) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const { key, value } of keyValuePairs) {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, ttl, serializedValue);
      }
      
      await pipeline.exec();
      console.log('💾 Batch cached', keyValuePairs.length, 'items');
      return true;
    } catch (error) {
      console.error('❌ Redis mset error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.redis) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: true,
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('❌ Redis stats error:', error.message);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('🔌 Redis connection closed');
    }
  }

  /**
   * Health check for Redis
   */
  async healthCheck() {
    if (!this.redis) {
      return { status: 'error', message: 'Redis not initialized' };
    }

    try {
      await this.redis.ping();
      return { status: 'healthy', connected: this.isConnected };
    } catch (error) {
      return { status: 'error', message: error.message, connected: false };
    }
  }
}

// Create singleton instance
const redisCacheService = new RedisCacheService();

module.exports = redisCacheService;
