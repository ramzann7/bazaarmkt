import { authToken } from './authservice';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class RevenueService {
  // Get artisan revenue summary
  async getArtisanRevenueSummary(period = 'month') {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/artisan/summary?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue summary');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      throw error;
    }
  }

  // Get revenue breakdown for a specific order
  async getRevenueBreakdown(orderId) {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/breakdown/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue breakdown');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      throw error;
    }
  }

  // Get available promotional features
  async getAvailablePromotionalFeatures() {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/promotional/features?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch promotional features');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching promotional features:', error);
      throw error;
    }
  }

  // Purchase promotional feature
  async purchasePromotionalFeature(featureData) {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/promotional/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          featureType: featureData.type,
          productId: featureData.productId,
          startDate: new Date().toISOString(),
          endDate: this.calculateEndDate(featureData.duration),
          price: featureData.price,
          paymentMethod: 'credit_card', // Default, can be made configurable
          specifications: {
            placement: this.getPlacementForFeature(featureData.type),
            priority: 5
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to purchase promotional feature');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error purchasing promotional feature:', error);
      throw error;
    }
  }

  // Get artisan's promotional features
  async getArtisanPromotionalFeatures() {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/promotional/artisan-features`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artisan promotional features');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching artisan promotional features:', error);
      throw error;
    }
  }

  // Get transparency information
  async getTransparencyInfo() {
    try {
      const response = await fetch(`${API_URL}/revenue/transparency`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transparency information');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching transparency information:', error);
      throw error;
    }
  }

  // Helper method to calculate end date based on duration
  calculateEndDate(duration) {
    const now = new Date();
    const durationMap = {
      '7 days': 7,
      '14 days': 14,
      '21 days': 21,
      '30 days': 30
    };

    const days = durationMap[duration] || 7;
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return endDate.toISOString();
  }

  // Helper method to get placement for feature type
  getPlacementForFeature(featureType) {
    const placementMap = {
      'product_featured': 'homepage_and_search',
      'product_sponsored': 'search_results'
    };

    return placementMap[featureType] || 'search_results';
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Calculate commission amount
  calculateCommission(grossAmount, commissionRate = 0.10) {
    return grossAmount * commissionRate;
  }

  // Calculate artisan earnings
  calculateArtisanEarnings(grossAmount, commissionRate = 0.10) {
    return grossAmount - this.calculateCommission(grossAmount, commissionRate);
  }

  // Get commission percentage display
  getCommissionPercentage(commissionRate = 0.10) {
    return `${(commissionRate * 100).toFixed(1)}%`;
  }

  // Get artisan earnings percentage display
  getArtisanEarningsPercentage(commissionRate = 0.10) {
    return `${((1 - commissionRate) * 100).toFixed(1)}%`;
  }

  // Get platform revenue summary (admin only)
  async getPlatformRevenueSummary(period = '30') {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/admin/platform-summary?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch platform revenue summary');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching platform revenue summary:', error);
      throw error;
    }
  }

  // Get spotlight revenue stats
  async getSpotlightRevenueStats(period = '30') {
    try {
      const token = authToken.getToken();
      const response = await fetch(`${API_URL}/revenue/spotlight/stats?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch spotlight revenue stats');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching spotlight revenue stats:', error);
      throw error;
    }
  }
}

export const revenueService = new RevenueService();
