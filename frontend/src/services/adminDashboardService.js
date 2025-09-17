import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Get financial dashboard data
export const getFinancialDashboardData = async (timeRange = '30d') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/financial-dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { timeRange }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching financial dashboard data:', error);
    throw error;
  }
};

// Get transaction history
export const getTransactionHistory = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw error;
  }
};

// Get payout schedule
export const getPayoutSchedule = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/payouts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching payout schedule:', error);
    throw error;
  }
};

// Export transaction data
export const exportTransactionData = async (format = 'csv', filters = {}) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/transactions/export`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { format, ...filters },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting transaction data:', error);
    throw error;
  }
};

// Update commission rates
export const updateCommissionRates = async (rates) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/admin/commission-rates`, rates, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating commission rates:', error);
    throw error;
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (timeRange = '30d', groupBy = 'day') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/revenue-analytics`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { timeRange, groupBy }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    throw error;
  }
};

// Get artisan performance metrics
export const getArtisanPerformance = async (timeRange = '30d') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/artisan-performance`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { timeRange }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching artisan performance:', error);
    throw error;
  }
};

// Get category performance
export const getCategoryPerformance = async (timeRange = '30d') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/category-performance`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { timeRange }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching category performance:', error);
    throw error;
  }
};

// Get financial alerts
export const getFinancialAlerts = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/financial-alerts`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching financial alerts:', error);
    throw error;
  }
};

// Process manual payout
export const processManualPayout = async (artisanId, amount, notes = '') => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/admin/process-payout`, {
      artisanId,
      amount,
      notes
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error processing manual payout:', error);
    throw error;
  }
};

// Get dashboard settings
export const getDashboardSettings = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin/dashboard-settings`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard settings:', error);
    throw error;
  }
};

// Update dashboard settings
export const updateDashboardSettings = async (settings) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/admin/dashboard-settings`, settings, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating dashboard settings:', error);
    throw error;
  }
};
