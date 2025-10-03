import axios from 'axios';
import config from '../config/environment.js';

const API_BASE_URL = config.API_URL;

class SpotlightService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get current spotlight status for artisan
  async getSpotlightStatus() {
    try {
      const response = await this.api.get('/spotlight/status');
      return response.data;
    } catch (error) {
      console.error('Error getting spotlight status:', error);
      throw error;
    }
  }

  // Purchase spotlight subscription
  async purchaseSpotlight(days, paymentMethod = 'card') {
    try {
      const response = await this.api.post('/spotlight/purchase', {
        days,
        paymentMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error purchasing spotlight:', error);
      throw error;
    }
  }

  // Extend existing spotlight subscription
  async extendSpotlight(days) {
    try {
      const response = await this.api.post('/spotlight/extend', { days });
      return response.data;
    } catch (error) {
      console.error('Error extending spotlight:', error);
      throw error;
    }
  }

  // Cancel spotlight subscription
  async cancelSpotlight(spotlightId) {
    try {
      const response = await this.api.post(`/spotlight/cancel/${spotlightId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling spotlight:', error);
      throw error;
    }
  }

  // Get spotlight history for artisan
  async getSpotlightHistory() {
    try {
      const response = await this.api.get('/spotlight/history');
      return response.data;
    } catch (error) {
      console.error('Error getting spotlight history:', error);
      throw error;
    }
  }

  // Get all active spotlights (public endpoint)
  async getActiveSpotlights() {
    try {
      const response = await this.api.get('/spotlight/active-public');
      return response.data;
    } catch (error) {
      console.error('Error getting active spotlights:', error);
      throw error;
    }
  }

  // Admin: Get all active spotlights (with admin details)
  async getAdminActiveSpotlights() {
    try {
      const response = await this.api.get('/spotlight/admin/active');
      return response.data;
    } catch (error) {
      console.error('Error getting admin active spotlights:', error);
      throw error;
    }
  }

  // Admin: Get spotlight revenue stats
  async getSpotlightRevenue(period = '30') {
    try {
      const response = await this.api.get(`/spotlight/admin/revenue?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error getting spotlight revenue:', error);
      throw error;
    }
  }
}

export const spotlightService = new SpotlightService();
