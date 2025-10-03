import axios from 'axios';
import config from '../config/environment.js';

const API_URL = config.API_URL;

class WalletService {
  constructor() {
    this.baseURL = `${API_URL}/admin/wallet`;
  }

  // Get wallet balance and basic info
  async getWalletBalance() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${this.baseURL}/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  // Get wallet transaction history
  async getTransactions(page = 1, limit = 20, type = null, status = null) {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit });
      
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      
      const response = await axios.get(`${this.baseURL}/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  }

  // Create Stripe payment intent for wallet top-up
  async createTopUpPaymentIntent(amount, currency = 'CAD') {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${this.baseURL}/top-up/create-payment-intent`, {
        amount,
        currency
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm wallet top-up after successful payment
  async confirmTopUp(paymentIntentId) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${this.baseURL}/top-up/confirm`, {
        paymentIntentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming top-up:', error);
      throw error;
    }
  }

  // Update payout settings
  async updatePayoutSettings(settings) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${this.baseURL}/payout-settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating payout settings:', error);
      throw error;
    }
  }

  // Get wallet statistics (using transactions endpoint)
  async getWalletStats(period = '30') {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${this.baseURL}/transactions?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Return the stats data in the expected format
      return {
        success: true,
        data: response.data.data.stats
      };
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      throw error;
    }
  }

  // Format currency
  formatCurrency(amount, currency = 'CAD') {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Get transaction type display name
  getTransactionTypeDisplay(type) {
    const typeMap = {
      'revenue': 'Revenue',
      'top_up': 'Top-up',
      'purchase': 'Purchase',
      'payout': 'Payout',
      'refund': 'Refund',
      'fee': 'Fee',
      'adjustment': 'Adjustment'
    };
    return typeMap[type] || type;
  }

  // Get transaction type color
  getTransactionTypeColor(type) {
    const colorMap = {
      'revenue': 'text-green-600',
      'top_up': 'text-blue-600',
      'purchase': 'text-red-600',
      'payout': 'text-purple-600',
      'refund': 'text-yellow-600',
      'fee': 'text-gray-600',
      'adjustment': 'text-indigo-600'
    };
    return colorMap[type] || 'text-gray-600';
  }

  // Get transaction type icon
  getTransactionTypeIcon(type) {
    const iconMap = {
      'revenue': '💰',
      'top_up': '💳',
      'purchase': '🛒',
      'payout': '🏦',
      'refund': '↩️',
      'fee': '⚙️',
      'adjustment': '🔧'
    };
    return iconMap[type] || '💼';
  }
}

export default new WalletService();
