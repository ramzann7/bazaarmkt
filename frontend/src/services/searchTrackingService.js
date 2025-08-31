// Search tracking service to track actual user searches and provide popular searches
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

class SearchTrackingService {
  constructor() {
    this.SEARCH_TRACKING_KEY = 'search_tracking_data';
    this.POPULAR_SEARCHES_KEY = 'popular_searches_cache';
    this.MAX_POPULAR_SEARCHES = 7;
    this.SEARCH_EXPIRY_DAYS = 30; // Keep search data for 30 days
  }

  // Track a search query
  trackSearch(query, category = 'all') {
    try {
      if (!query || query.trim().length === 0) return;

      const normalizedQuery = query.trim().toLowerCase();
      const searchData = this.getSearchTrackingData();
      const now = Date.now();
      const searchKey = `${normalizedQuery}_${category}`;

      // Update search count and last used time
      if (searchData[searchKey]) {
        searchData[searchKey].count += 1;
        searchData[searchKey].lastUsed = now;
      } else {
        searchData[searchKey] = {
          query: normalizedQuery,
          category: category,
          count: 1,
          firstUsed: now,
          lastUsed: now
        };
      }

      // Clean up old searches (older than 30 days)
      this.cleanupOldSearches(searchData, now);

      // Save updated data
      this.saveSearchTrackingData(searchData);

      // Clear popular searches cache to force refresh
      cacheService.delete(this.POPULAR_SEARCHES_KEY);

      console.log(`🔍 Search tracked: "${normalizedQuery}" (category: ${category})`);
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Get popular searches based on actual usage
  getPopularSearches(limit = this.MAX_POPULAR_SEARCHES) {
    try {
      // Check cache first
      const cachedPopular = cacheService.get(this.POPULAR_SEARCHES_KEY);
      if (cachedPopular) {
        return cachedPopular.slice(0, limit);
      }

      const searchData = this.getSearchTrackingData();
      const now = Date.now();

      // Convert to array and sort by count (descending), then by last used (descending)
      const searchesArray = Object.values(searchData)
        .filter(search => {
          // Only include searches from the last 30 days
          const daysSinceLastUsed = (now - search.lastUsed) / (1000 * 60 * 60 * 24);
          return daysSinceLastUsed <= this.SEARCH_EXPIRY_DAYS;
        })
        .sort((a, b) => {
          // Primary sort: by count (descending)
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          // Secondary sort: by last used (descending)
          return b.lastUsed - a.lastUsed;
        })
        .slice(0, limit)
        .map(search => search.query);

      // Cache the results for 5 minutes
      cacheService.set(this.POPULAR_SEARCHES_KEY, searchesArray, 5 * 60 * 1000);

      return searchesArray;
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return this.getDefaultPopularSearches();
    }
  }

  // Get search tracking data from localStorage
  getSearchTrackingData() {
    try {
      const data = localStorage.getItem(this.SEARCH_TRACKING_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading search tracking data:', error);
      return {};
    }
  }

  // Save search tracking data to localStorage
  saveSearchTrackingData(data) {
    try {
      localStorage.setItem(this.SEARCH_TRACKING_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving search tracking data:', error);
    }
  }

  // Clean up old searches
  cleanupOldSearches(searchData, now) {
    const cutoffTime = now - (this.SEARCH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    Object.keys(searchData).forEach(key => {
      if (searchData[key].lastUsed < cutoffTime) {
        delete searchData[key];
      }
    });
  }

  // Get default popular searches (fallback)
  getDefaultPopularSearches() {
    return [
      'fresh eggs',
      'sourdough bread', 
      'maple syrup',
      'organic honey',
      'artisan cheese',
      'fresh herbs',
      'homemade pasta'
    ];
  }

  // Get search statistics (for analytics)
  getSearchStats() {
    try {
      const searchData = this.getSearchTrackingData();
      const now = Date.now();
      
      const totalSearches = Object.values(searchData).reduce((sum, search) => sum + search.count, 0);
      const uniqueSearches = Object.keys(searchData).length;
      const recentSearches = Object.values(searchData).filter(search => {
        const daysSinceLastUsed = (now - search.lastUsed) / (1000 * 60 * 60 * 24);
        return daysSinceLastUsed <= 7; // Last 7 days
      }).length;

      return {
        totalSearches,
        uniqueSearches,
        recentSearches,
        topSearches: this.getPopularSearches(10)
      };
    } catch (error) {
      console.error('Error getting search stats:', error);
      return {
        totalSearches: 0,
        uniqueSearches: 0,
        recentSearches: 0,
        topSearches: []
      };
    }
  }

  // Clear all search tracking data (for testing/reset)
  clearSearchData() {
    try {
      localStorage.removeItem(this.SEARCH_TRACKING_KEY);
      cacheService.delete(this.POPULAR_SEARCHES_KEY);
      console.log('🔍 Search tracking data cleared');
    } catch (error) {
      console.error('Error clearing search data:', error);
    }
  }
}

// Create singleton instance
const searchTrackingService = new SearchTrackingService();

export default searchTrackingService;
