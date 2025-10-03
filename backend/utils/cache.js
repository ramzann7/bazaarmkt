/**
 * Caching Utility
 * Implements in-memory caching for improved performance
 */

class Cache {
  constructor(ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
    this.timers = new Map();
  }

  /**
   * Set a cache entry
   */
  set(key, value, customTtl = null) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: customTtl || this.ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, customTtl || this.ttl);

    this.timers.set(key, timer);
  }

  /**
   * Get a cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a cache entry
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
    return expiredKeys.length;
  }
}

// Create cache instances for different data types
const productCache = new Cache(600000); // 10 minutes
const userCache = new Cache(300000); // 5 minutes
const artisanCache = new Cache(600000); // 10 minutes
const communityCache = new Cache(180000); // 3 minutes
const orderCache = new Cache(300000); // 5 minutes

/**
 * Cache key generators
 */
const cacheKeys = {
  product: (id) => `product:${id}`,
  products: (filters) => `products:${JSON.stringify(filters)}`,
  user: (id) => `user:${id}`,
  artisan: (id) => `artisan:${id}`,
  artisans: (filters) => `artisans:${JSON.stringify(filters)}`,
  communityPosts: (filters) => `community:posts:${JSON.stringify(filters)}`,
  communityStats: () => 'community:stats',
  order: (id) => `order:${id}`,
  orders: (userId, filters) => `orders:${userId}:${JSON.stringify(filters)}`
};

/**
 * Cache middleware for Express routes
 */
function cacheMiddleware(cache, keyGenerator, ttl = null) {
  return (req, res, next) => {
    const key = keyGenerator(req);
    const cached = cache.get(key);

    if (cached) {
      return res.json(cached);
    }

    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      cache.set(key, data, ttl);
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Cache invalidation helpers
 */
const cacheInvalidation = {
  invalidateProduct: (productId) => {
    productCache.delete(cacheKeys.product(productId));
    // Also invalidate product lists
    productCache.clear(); // Simple approach - could be more granular
  },

  invalidateUser: (userId) => {
    userCache.delete(cacheKeys.user(userId));
  },

  invalidateArtisan: (artisanId) => {
    artisanCache.delete(cacheKeys.artisan(artisanId));
    artisanCache.clear(); // Invalidate artisan lists
  },

  invalidateCommunity: () => {
    communityCache.clear();
  },

  invalidateOrder: (orderId) => {
    orderCache.delete(cacheKeys.order(orderId));
    orderCache.clear(); // Invalidate order lists
  }
};

/**
 * Cache warming functions
 */
const cacheWarming = {
  warmPopularProducts: async (productService) => {
    try {
      const popularProducts = await productService.getPopularProducts({ limit: 20 });
      popularProducts.forEach(product => {
        productCache.set(cacheKeys.product(product._id), product);
      });
      console.log('🔥 Warmed popular products cache');
    } catch (error) {
      console.error('❌ Error warming popular products cache:', error);
    }
  },

  warmActiveArtisans: async (artisanService) => {
    try {
      const activeArtisans = await artisanService.getActiveArtisans({ limit: 50 });
      activeArtisans.forEach(artisan => {
        artisanCache.set(cacheKeys.artisan(artisan._id), artisan);
      });
      console.log('🔥 Warmed active artisans cache');
    } catch (error) {
      console.error('❌ Error warming active artisans cache:', error);
    }
  },

  warmCommunityStats: async (communityService) => {
    try {
      const stats = await communityService.getCommunityStats();
      communityCache.set(cacheKeys.communityStats(), stats);
      console.log('🔥 Warmed community stats cache');
    } catch (error) {
      console.error('❌ Error warming community stats cache:', error);
    }
  }
};

/**
 * Cache monitoring and cleanup
 */
class CacheMonitor {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  recordHit() {
    this.stats.hits++;
  }

  recordMiss() {
    this.stats.misses++;
  }

  recordSet() {
    this.stats.sets++;
  }

  recordDelete() {
    this.stats.deletes++;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  reset() {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }
}

const cacheMonitor = new CacheMonitor();

// Clean expired entries every 5 minutes
setInterval(() => {
  const cleaned = [
    productCache.cleanExpired(),
    userCache.cleanExpired(),
    artisanCache.cleanExpired(),
    communityCache.cleanExpired(),
    orderCache.cleanExpired()
  ].reduce((sum, count) => sum + count, 0);

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}, 300000);

module.exports = {
  Cache,
  productCache,
  userCache,
  artisanCache,
  communityCache,
  orderCache,
  cacheKeys,
  cacheMiddleware,
  cacheInvalidation,
  cacheWarming,
  cacheMonitor
};
