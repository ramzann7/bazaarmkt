// src/services/deliveryRevenueService.js
import config from '../config/environment.js';

const API_BASE_URL = config.API_URL;

class DeliveryRevenueService {
  /**
   * Get delivery revenue summary for the authenticated artisan
   * @param {string} period - Time period ('week', 'month', 'year', 'all')
   * @returns {Promise<Object>} Delivery revenue summary
   */
  static async getDeliveryRevenueSummary(period = 'month') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/delivery-revenue/summary?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch delivery revenue summary');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching delivery revenue summary:', error);
      throw error;
    }
  }

  /**
   * Get delivery revenue trends over time
   * @param {string} period - Time period ('week', 'month', 'year')
   * @returns {Promise<Array>} Array of revenue trend data
   */
  static async getDeliveryRevenueTrends(period = 'month') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/delivery-revenue/trends?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch delivery revenue trends');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching delivery revenue trends:', error);
      throw error;
    }
  }

  /**
   * Get delivery performance metrics
   * @param {string} period - Time period ('week', 'month', 'year', 'all')
   * @returns {Promise<Object>} Delivery performance metrics
   */
  static async getDeliveryPerformanceMetrics(period = 'month') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/delivery-revenue/performance?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch delivery performance metrics');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching delivery performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive delivery revenue analytics
   * @param {string} period - Time period ('week', 'month', 'year', 'all')
   * @returns {Promise<Object>} Comprehensive analytics data
   */
  static async getDeliveryRevenueAnalytics(period = 'month') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/delivery-revenue/analytics?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch delivery revenue analytics');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching delivery revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  }

  /**
   * Format percentage for display
   * @param {number} value - Value to format as percentage
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage string
   */
  static formatPercentage(value, decimals = 1) {
    return `${(value || 0).toFixed(decimals)}%`;
  }

  /**
   * Get delivery method display name
   * @param {string} method - Delivery method
   * @returns {string} Human-readable delivery method name
   */
  static getDeliveryMethodDisplayName(method) {
    const methodNames = {
      'pickup': 'Pickup',
      'personalDelivery': 'Personal Delivery',
      'professionalDelivery': 'Professional Delivery'
    };
    return methodNames[method] || method;
  }

  /**
   * Get delivery method color for UI
   * @param {string} method - Delivery method
   * @returns {string} CSS color class
   */
  static getDeliveryMethodColor(method) {
    const colors = {
      'pickup': 'text-gray-600',
      'personalDelivery': 'text-orange-600',
      'professionalDelivery': 'text-blue-600'
    };
    return colors[method] || 'text-gray-600';
  }

  /**
   * Get delivery method background color for UI
   * @param {string} method - Delivery method
   * @returns {string} CSS background color class
   */
  static getDeliveryMethodBgColor(method) {
    const colors = {
      'pickup': 'bg-gray-100',
      'personalDelivery': 'bg-orange-100',
      'professionalDelivery': 'bg-blue-100'
    };
    return colors[method] || 'bg-gray-100';
  }
}

export default DeliveryRevenueService;
