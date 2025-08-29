// Cache service for API responses and data
class CacheService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  // Set cache with TTL
  set(key, data, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, data);
    this.cacheExpiry.set(key, expiry);
  }

  // Get cache if not expired
  get(key) {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Check if cache exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Cache with promise (for async operations)
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached) {
      return cached;
    }

    try {
      const data = await fetchFunction();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Cache fetch error:', error);
      throw error;
    }
  }

  // Preload cache
  preload(key, fetchFunction, ttl = this.defaultTTL) {
    fetchFunction().then(data => {
      this.set(key, data, ttl);
    }).catch(error => {
      console.error('Cache preload error:', error);
    });
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  FEATURED_PRODUCTS: 'featured_products',
  POPULAR_PRODUCTS: 'popular_products',
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  CART_COUNT: 'cart_count',
  ARTISAN_DETAILS: 'artisan_details',
  PRODUCT_DETAILS: 'product_details',
  FAVORITE_ARTISANS: 'favorite_artisans',
  USER_ORDERS: 'user_orders',
  USER_STATS: 'user_stats'
};

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  FEATURED_PRODUCTS: 15 * 60 * 1000, // 15 minutes
  POPULAR_PRODUCTS: 15 * 60 * 1000, // 15 minutes
  CATEGORIES: 60 * 60 * 1000, // 1 hour
  SUBCATEGORIES: 60 * 60 * 1000, // 1 hour
  CART_COUNT: 30 * 1000, // 30 seconds
  ARTISAN_DETAILS: 5 * 60 * 1000, // 5 minutes
  PRODUCT_DETAILS: 5 * 60 * 1000, // 5 minutes
  FAVORITE_ARTISANS: 5 * 60 * 1000, // 5 minutes
  USER_ORDERS: 2 * 60 * 1000, // 2 minutes
  USER_STATS: 5 * 60 * 1000 // 5 minutes
};
