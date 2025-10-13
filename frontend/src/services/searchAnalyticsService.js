/**
 * Frontend Search Analytics Service
 * Tracks search events and user interactions with search results
 */

import api from './apiClient';
import config from '../config/environment';

const API_URL = `${config.API_URL}/search`;

class SearchAnalyticsService {
  constructor() {
    this.currentAnalyticsId = null;
    this.sessionId = this.getOrCreateSessionId();
    this.enabled = true; // Can be toggled based on user preferences
  }

  /**
   * Get or create a session ID for tracking
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('search_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('search_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Track a search query
   */
  async trackSearch(searchData) {
    if (!this.enabled) return null;

    try {
      const startTime = performance.now();
      
      const payload = {
        query: searchData.query,
        userId: searchData.userId || null,
        resultsCount: searchData.resultsCount || 0,
        responseTime: searchData.responseTime || 0,
        filters: {
          category: searchData.category,
          subcategory: searchData.subcategory,
          priceRange: searchData.priceRange,
          location: searchData.location
        },
        sessionId: this.sessionId
      };

      const response = await api.post(`${API_URL}/analytics`, payload);
      
      if (response.data.success) {
        this.currentAnalyticsId = response.data.analyticsId;
        console.log('📊 Search tracked:', response.data.analyticsId);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to track search:', error);
      return null;
    }
  }

  /**
   * Track when user clicks on a search result
   */
  async trackResultClick(productId, position) {
    if (!this.enabled || !this.currentAnalyticsId) return null;

    try {
      const response = await api.post(
        `${API_URL}/analytics/${this.currentAnalyticsId}/click`,
        {
          productId,
          position
        }
      );
      
      if (response.data.success) {
        console.log('👆 Click tracked:', productId, 'at position', position);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to track click:', error);
      return null;
    }
  }

  /**
   * Get popular searches (for autocomplete or suggestions)
   */
  async getPopularSearches(limit = 10, timeRange = '7d') {
    try {
      const response = await api.get(
        `${API_URL}/popular?limit=${limit}&timeRange=${timeRange}`
      );
      
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Get search insights (admin only)
   */
  async getSearchInsights(timeRange = '7d') {
    try {
      const response = await api.get(`${API_URL}/insights?timeRange=${timeRange}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get search insights:', error);
      throw error;
    }
  }

  /**
   * Enable/disable analytics tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('search_analytics_enabled', enabled.toString());
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled() {
    const stored = localStorage.getItem('search_analytics_enabled');
    return stored === null ? true : stored === 'true';
  }

  /**
   * Clear current session
   */
  clearSession() {
    this.currentAnalyticsId = null;
    sessionStorage.removeItem('search_session_id');
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Measure search performance
   */
  measurePerformance(startTime, resultsCount) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    return {
      responseTime,
      resultsCount,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const searchAnalyticsService = new SearchAnalyticsService();

export default searchAnalyticsService;

