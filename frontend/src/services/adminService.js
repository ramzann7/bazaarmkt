import api from './apiClient';
import config from '../config/environment.js';

const API_URL = config.API_URL;

// Get dashboard statistics
export const getStats = async () => {
  try {
    const response = await api.get(`${API_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Return mock data for development
    return {
      totalUsers: 1250,
      totalProducts: 450,
      totalArtisans: 45,
      featuredProducts: 12
    };
  }
};

// Get all users
export const getUsers = async () => {
  try {
    const response = await api.get(`${API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Get all products
export const getProducts = async () => {
  try {
    const response = await api.get(`${API_URL}/admin/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get all artisans
export const getArtisans = async () => {
  try {
    const response = await api.get(`${API_URL}/admin/artisans`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching artisans:', error);
    throw error;
  }
};

// Update user status
export const updateUserStatus = async (userId, isActive) => {
  try {
    const response = await api.patch(`${API_URL}/admin/users/${userId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId, role) => {
  try {
    const response = await api.patch(`${API_URL}/admin/users/${userId}/role`, 
      { role },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Update product status
export const updateProductStatus = async (productId, isActive) => {
  try {
    const response = await api.patch(`${API_URL}/admin/products/${productId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating product status:', error);
    throw error;
  }
};

// Set featured product
export const setFeaturedProduct = async (productId, isFeatured) => {
  try {
    const response = await api.patch(`${API_URL}/admin/products/${productId}/featured`, 
      { isFeatured },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error setting featured product:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (productId) => {
  try {
    const response = await api.delete(`${API_URL}/admin/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Update artisan status
export const updateArtisanStatus = async (artisanId, isActive) => {
  try {
    const response = await api.patch(`${API_URL}/admin/artisans/${artisanId}/status`, 
      { isActive },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating artisan status:', error);
    throw error;
  }
};

// Update artisan verification
export const updateArtisanVerification = async (artisanId, isVerified) => {
  try {
    const response = await api.patch(`${API_URL}/admin/artisans/${artisanId}/verification`, 
      { isVerified },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating artisan verification:', error);
    throw error;
  }
};

// Update artisan commission rate
export const updateArtisanCommissionRate = async (artisanId, commissionRate) => {
  try {
    const response = await api.patch(`${API_URL}/admin/artisans/${artisanId}/commission-rate`, 
      { commissionRate },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating artisan commission rate:', error);
    throw error;
  }
};

// Get analytics data
export const getAnalytics = async (period = 30) => {
  try {
    const response = await api.get(`${API_URL}/admin/analytics?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

// Get promotional statistics
export const getPromotionalStats = async (period = 30) => {
  try {
    const token = localStorage.getItem('token');
    console.log('🔍 getPromotionalStats - Token:', { hasToken: !!token, tokenLength: token?.length });
    console.log('🔍 getPromotionalStats - URL:', `${API_URL}/admin/promotional/stats?period=${period}`);
    
    const response = await api.get(`${API_URL}/admin/promotional/stats?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('🔍 getPromotionalStats - Response:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching promotional stats:', error);
    throw error;
  }
};

// Get active promotions
export const getActivePromotions = async () => {
  try {
    console.log('🔍 getActivePromotions - URL:', `${API_URL}/admin/promotional/active`);
    const response = await api.get(`${API_URL}/admin/promotional/active`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('🔍 getActivePromotions - Response:', response.data);
    return response.data.data || []; // Extract data array from paginated response
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    throw error;
  }
};

// Get promotional pricing configuration
export const getPromotionalPricing = async () => {
  try {
    const response = await api.get(`${API_URL}/promotional/pricing`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const pricingData = response.data.data || response.data;
    
    // Convert object format to array format expected by component
    if (pricingData && typeof pricingData === 'object' && !Array.isArray(pricingData)) {
      // Backend returns { featured_product: {...}, sponsored_product: {...} }
      // Convert to array format
      const pricingArray = Object.entries(pricingData)
        .filter(([key]) => !['success', 'data', '_id', 'createdAt', 'updatedAt'].includes(key))
        .map(([featureType, config]) => ({
          featureType,
          name: config.name || featureType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: config.description || '',
          basePrice: config.pricePerDay || config.basePrice || 0,
          pricePerDay: config.pricePerDay || 0,
          benefits: config.benefits || [],
          currency: config.currency || 'CAD',
          isActive: config.isActive !== undefined ? config.isActive : true
        }));
      return pricingArray;
    }
    
    // If already array, return as is
    return pricingData;
  } catch (error) {
    console.error('Error fetching promotional pricing:', error);
    throw error;
  }
};

// Update promotional pricing
export const updatePromotionalPricing = async (pricingData) => {
  try {
    const response = await api.put(`${API_URL}/promotional/admin/pricing`, pricingData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating promotional pricing:', error);
    throw error;
  }
};

// Initialize default promotional pricing
export const initializeDefaultPricing = async () => {
  try {
    const response = await api.post(`${API_URL}/promotional/admin/pricing/initialize`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error initializing default pricing:', error);
    throw error;
  }
};

// Platform Settings API calls

// Get platform settings
export const getPlatformSettings = async () => {
  try {
    const response = await api.get(`${API_URL}/platform-settings`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    throw error;
  }
};

// Update platform settings
export const updatePlatformSettings = async (settingsData) => {
  try {
    const response = await api.put(`${API_URL}/platform-settings`, settingsData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating platform settings:', error);
    throw error;
  }
};

// Reset platform settings to defaults
export const resetPlatformSettings = async () => {
  try {
    const response = await api.post(`${API_URL}/platform-settings/reset-defaults`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error resetting platform settings:', error);
    throw error;
  }
};

// Get platform fee percentage (public)
export const getPlatformFeePercentage = async () => {
  try {
    const response = await api.get(`${API_URL}/platform-settings/fee-percentage`);
    return response.data.data.platformFeePercentage;
  } catch (error) {
    console.error('Error fetching platform fee percentage:', error);
    return 10; // Default fallback
  }
};

// Calculate platform fee for an order
export const calculatePlatformFee = async (orderAmount) => {
  try {
    const response = await api.post(`${API_URL}/platform-settings/calculate-fee`, {
      orderAmount
    });
    return response.data.data;
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    throw error;
  }
};

export default {
  getStats,
  getUsers,
  getProducts,
  getArtisans,
  updateUserStatus,
  updateUserRole,
  updateProductStatus,
  setFeaturedProduct,
  deleteProduct,
  updateArtisanStatus,
  updateArtisanVerification,
  updateArtisanCommissionRate,
  getAnalytics,
  getPromotionalStats,
  getActivePromotions,
  getPromotionalPricing,
  updatePromotionalPricing,
  initializeDefaultPricing,
  getPlatformSettings,
  updatePlatformSettings,
  resetPlatformSettings,
  getPlatformFeePercentage,
  calculatePlatformFee
};
