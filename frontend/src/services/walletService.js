import api from './apiClient';
import config from '../config/environment.js';

const API_URL = config.API_URL;

class WalletService {
  constructor() {
    this.baseURL = `${API_URL}/wallet`;
  }

  // Get wallet balance and basic info
  async getWalletBalance() {
    try {
      const response = await api.get(`${this.baseURL}/balance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  // Get wallet transaction history
  async getTransactions(page = 1, limit = 20, type = null, status = null) {
    try {
      const params = new URLSearchParams({ page, limit });
      
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      
      console.log('WalletService: Fetching transactions from:', `${this.baseURL}/transactions?${params}`);
      const response = await api.get(`${this.baseURL}/transactions?${params}`);
      console.log('WalletService: Transactions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  }

  // Create Stripe payment intent for wallet top-up
  async createTopUpPaymentIntent(amount, currency = 'CAD') {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(`${this.baseURL}/top-up/create-payment-intent`, {
        amount,
        currency
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
      const response = await api.post(`${this.baseURL}/top-up/confirm`, {
        paymentIntentId
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
      const response = await api.put(`${this.baseURL}/payout-settings`, settings);
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
      const response = await api.get(`${this.baseURL}/transactions?limit=50`);
      
      // Return the summary data in the expected format
      return {
        success: true,
        data: response.data.data?.summary || {
          totalCredits: 0,
          totalDebits: 0,
          netAmount: 0,
          transactionCount: 0
        }
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
      'order_revenue': 'Order Revenue',
      'top_up': 'Top-up',
      'wallet_topup': 'Wallet Top-up',
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
      'order_revenue': 'text-green-600',
      'top_up': 'text-blue-600',
      'wallet_topup': 'text-blue-600',
      'purchase': 'text-red-600',
      'payout': 'text-purple-600',
      'refund': 'text-yellow-600',
      'fee': 'text-gray-600',
      'adjustment': 'text-indigo-600'
    };
    return colorMap[type] || 'text-gray-600';
  }

  // Get transaction type icon
  // Get wallet analytics
  async getWalletAnalytics(period = 'month') {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`${this.baseURL}/analytics?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet analytics:', error);
      throw error;
    }
  }

  // Get detailed wallet statistics
  async getWalletStats() {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`${this.baseURL}/balance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      throw error;
    }
  }

  getTransactionTypeIcon(type) {
    const iconMap = {
      'revenue': '💰',
      'order_revenue': '💰',
      'order_completion': '💰',
      'top_up': '💳',
      'wallet_topup': '💳',
      'purchase': '🛒',
      'payout': '🏦',
      'refund': '↩️',
      'fee': '⚙️',
      'adjustment': '🔧',
      'wallet_deduction': '💸',
      'wallet_transfer_in': '↗️',
      'wallet_transfer_out': '↙️',
      'payment': '💳'
    };
    return iconMap[type] || '💼';
  }
}

export default new WalletService();
