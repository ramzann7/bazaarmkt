const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache helper functions
const getCacheKey = (endpoint, params = {}) => {
  return `${endpoint}?${JSON.stringify(params)}`;
};

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = () => {
  cache.clear();
};

// Clear cache for specific artisan
const clearArtisanCache = (artisanId = null) => {
  if (artisanId) {
    // Clear specific artisan cache
    const keysToDelete = [];
    for (const [key] of cache) {
      if (key.includes(`artisans/${artisanId}`) || key.includes('all-artisans')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  } else {
    // Clear all artisan-related cache
    const keysToDelete = [];
    for (const [key] of cache) {
      if (key.includes('artisans')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  }
};

export const artisanService = {
  // Clear artisan cache
  clearArtisanCache,
  
  // Get all artisans with optional filters
  async getAllArtisans(filters = {}) {
    try {
      const cacheKey = getCacheKey('all-artisans', filters);
      const cached = getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const queryParams = new URLSearchParams();
      
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.includeProducts) queryParams.append('includeProducts', 'true');

      const url = `${API_BASE_URL}/artisans?${queryParams}`;
      console.log('Fetching artisans from:', url);
      console.log('Filters applied:', filters);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        throw new Error(`Failed to fetch artisans: ${response.status}`);
      }

      const data = await response.json();
      console.log('Artisans fetched successfully:', data.length, 'artisans');
      
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching artisans:', error);
      throw error;
    }
  },

  // Get a specific artisan by ID
  async getArtisanById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/artisans/${id}?includeProducts=true`);
      
      if (!response.ok) {
        throw new Error('Artisan not found');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artisan:', error);
      throw error;
    }
  },

  // Create a new artisan (requires authentication)
  async createArtisan(artisanData, token) {
    try {
              const response = await fetch(`${API_BASE_URL}/artisans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(artisanData)
        });

              if (!response.ok) {
          throw new Error('Failed to create artisan');
        }

      return await response.json();
    } catch (error) {
      console.error('Error creating artisan:', error);
      throw error;
    }
  },

  // Update an artisan (requires authentication)
  async updateArtisan(id, artisanData, token) {
    try {
              const response = await fetch(`${API_BASE_URL}/artisans/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(artisanData)
        });

              if (!response.ok) {
          throw new Error('Failed to update artisan');
        }

      return await response.json();
    } catch (error) {
      console.error('Error updating artisan:', error);
      throw error;
    }
  },

  // Get artisans by type
  async getArtisansByType(type) {
    try {
      const response = await fetch(`${API_BASE_URL}/artisans?type=${type}&includeProducts=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artisans by type');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artisans by type:', error);
      throw error;
    }
  },

  // Get artisans by category
  async getArtisansByCategory(category) {
    try {
      const response = await fetch(`${API_BASE_URL}/artisans?category=${category}&includeProducts=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artisans by category');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artisans by category:', error);
      throw error;
    }
  },

  // Search artisans
  async searchArtisans(searchTerm) {
    try {
      const response = await fetch(`${API_BASE_URL}/artisans?search=${encodeURIComponent(searchTerm)}&includeProducts=true`);
      
      if (!response.ok) {
        throw new Error('Failed to search artisans');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching artisans:', error);
      throw error;
    }
  }
};