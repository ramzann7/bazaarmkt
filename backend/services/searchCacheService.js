/**
 * Search Cache Service
 * Implements in-memory caching for search results to reduce database load
 */

class SearchCacheService {
  constructor() {
    this.cache = new Map();
    this.TTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxSize = 500; // Max number of cached items
    
    // Clean up expired cache entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Generate cache key from search parameters
   */
  generateKey(query, filters = {}) {
    const keyData = {
      q: query || '',
      ...filters
    };
    return JSON.stringify(keyData);
  }

  /**
   * Get cached search results
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access time for LRU
    cached.lastAccessed = Date.now();
    
    return cached.data;
  }

  /**
   * Set search results in cache
   */
  set(key, data, customTTL = null) {
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      ttl: customTTL || this.TTL
    });
  }

  /**
   * Clear cache for specific key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Search cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const [, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        expired++;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      active: this.cache.size - expired,
      hitRate: this.hitRate || 0
    };
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Create singleton instance
const searchCacheService = new SearchCacheService();

module.exports = searchCacheService;

