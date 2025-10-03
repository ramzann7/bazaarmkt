/**
 * Cache Service - In-memory caching with TTL and optimization
 * Provides Redis-like functionality for serverless environments
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300; // 5 minutes
    this.maxSize = 1000; // Maximum cache entries
    this.cleanupInterval = 60000; // 1 minute cleanup interval
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get value from cache or execute fallback function
   */
  async get(key, fallbackFn = null, ttl = this.defaultTTL) {
    const entry = this.cache.get(key);
    
    if (entry && !this.isExpired(entry)) {
      // Update access time for LRU
      entry.lastAccessed = Date.now();
      return entry.value;
    }

    // Remove expired entry
    if (entry) {
      this.cache.delete(key);
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
  set(key, value, ttl = this.defaultTTL) {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      expiresAt: Date.now() + (ttl * 1000)
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific key from cache
   */
  del(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start cleanup interval for expired entries
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize
    };
  }
}

// Export singleton instance
module.exports = new CacheService();