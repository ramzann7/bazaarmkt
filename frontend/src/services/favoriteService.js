// src/services/favoriteService.js
import axios from 'axios';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

const API_URL = '/api';

export const favoriteService = {
  // Get user's favorite artisans
  getFavoriteArtisans: async () => {
    try {
      const token = localStorage.getItem('token');
      const cacheKey = `${CACHE_KEYS.FAVORITE_ARTISANS}_${token?.slice(-10)}`;
      
      // Check cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const response = await axios.get(`${API_URL}/favorites/artisans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const favorites = response.data.favorites || [];
      cacheService.set(cacheKey, favorites, CACHE_TTL.FAVORITE_ARTISANS);
      
      return favorites;
    } catch (error) {
      console.error('Error fetching favorite artisans:', error);
      return [];
    }
  },

  // Add artisan to favorites
  addFavoriteArtisan: async (artisanId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/favorites/artisans`, { artisanId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear cache to force refresh
      const cacheKey = `${CACHE_KEYS.FAVORITE_ARTISANS}_${token?.slice(-10)}`;
      cacheService.delete(cacheKey);
      
      return response.data;
    } catch (error) {
      console.error('Error adding favorite artisan:', error);
      throw error;
    }
  },

  // Remove artisan from favorites
  removeFavoriteArtisan: async (artisanId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/favorites/artisans/${artisanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear cache to force refresh
      const cacheKey = `${CACHE_KEYS.FAVORITE_ARTISANS}_${token?.slice(-10)}`;
      cacheService.delete(cacheKey);
      
      return response.data;
    } catch (error) {
      console.error('Error removing favorite artisan:', error);
      throw error;
    }
  },

  // Check if artisan is favorited
  isArtisanFavorited: async (artisanId) => {
    try {
      const favorites = await favoriteService.getFavoriteArtisans();
      return favorites.some(fav => fav.artisanId === artisanId || fav._id === artisanId);
    } catch (error) {
      console.error('Error checking if artisan is favorited:', error);
      return false;
    }
  },

  // Get favorite count for an artisan
  getFavoriteCount: async (artisanId) => {
    try {
      const response = await axios.get(`${API_URL}/favorites/artisans/${artisanId}/count`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Error getting favorite count:', error);
      return 0;
    }
  },

  // Toggle favorite status
  toggleFavorite: async (artisanId) => {
    try {
      const isFavorited = await favoriteService.isArtisanFavorited(artisanId);
      
      if (isFavorited) {
        await favoriteService.removeFavoriteArtisan(artisanId);
        return { isFavorited: false, action: 'removed' };
      } else {
        await favoriteService.addFavoriteArtisan(artisanId);
        return { isFavorited: true, action: 'added' };
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }
};
