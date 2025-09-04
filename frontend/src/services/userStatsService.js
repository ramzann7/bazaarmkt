// src/services/userStatsService.js
import axios from 'axios';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const userStatsService = {
  // Get user statistics
  getUserStats: async () => {
    try {
      const token = localStorage.getItem('token');
      const cacheKey = `${CACHE_KEYS.USER_STATS}_${token?.slice(-10)}`;
      
      // Check cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const response = await axios.get(`${API_URL}/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const stats = response.data;
      cacheService.set(cacheKey, stats, CACHE_TTL.USER_STATS);
      
      return stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Return default stats if API fails
      return {
        totalOrders: 0,
        totalSpent: 0,
        favoriteArtisans: 0,
        averageRating: 0,
        ordersThisMonth: 0,
        spentThisMonth: 0,
        lastOrderDate: null
      };
    }
  },

  // Get user's recent orders
  getRecentOrders: async (limit = 5) => {
    try {
      const token = localStorage.getItem('token');
      const cacheKey = `${CACHE_KEYS.USER_ORDERS}_${token?.slice(-10)}`;
      
      // Check cache first
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return cached.slice(0, limit);
      }
      
      const response = await axios.get(`${API_URL}/user/orders?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const orders = response.data.orders || [];
      cacheService.set(cacheKey, orders, CACHE_TTL.USER_ORDERS);
      
      return orders;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  },

  // Get user's favorite artisans
  getFavoriteArtisans: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/user/favorites/artisans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.favorites || [];
    } catch (error) {
      console.error('Error fetching favorite artisans:', error);
      return [];
    }
  },

  // Get user's order history
  getOrderHistory: async (page = 1, limit = 10) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/user/orders?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching order history:', error);
      return { orders: [], total: 0, page: 1, limit: 10 };
    }
  },

  // Get order details
  getOrderDetails: async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/user/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  },

  // Clear user stats cache
  clearStatsCache: () => {
    const token = localStorage.getItem('token');
    const cacheKey = `${CACHE_KEYS.USER_STATS}_${token?.slice(-10)}`;
    cacheService.delete(cacheKey);
  },

  // Clear orders cache
  clearOrdersCache: () => {
    const token = localStorage.getItem('token');
    const cacheKey = `${CACHE_KEYS.USER_ORDERS}_${token?.slice(-10)}`;
    cacheService.delete(cacheKey);
  },

  // Refresh all user data
  refreshUserData: () => {
    userStatsService.clearStatsCache();
    userStatsService.clearOrdersCache();
  }
};
