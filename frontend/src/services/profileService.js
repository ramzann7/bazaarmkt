// Profile service for user profile management
import axios from 'axios';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';
import { authToken } from './authservice';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${authToken.getToken()}`
});

export const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update entire profile
  updateProfile: async (profileData) => {
    const response = await axios.put(`${API_URL}/profile`, profileData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update basic profile information
  updateBasicProfile: async (profileData) => {
    const response = await axios.put(`${API_URL}/profile`, profileData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update addresses
  updateAddresses: async (addresses) => {
    const response = await axios.put(`${API_URL}/profile/addresses`, { addresses }, {
      headers: getAuthHeaders()
    });
    
    // Geocode the default address if available
    const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
    if (defaultAddress) {
      try {
        const { geocodingService } = await import('./geocodingService');
        await geocodingService.geocodeUserAddress(null, defaultAddress);
      } catch (error) {
        console.warn('Could not geocode address:', error);
      }
    }
    
    return response.data;
  },

  // Add new address
  addAddress: async (address) => {
    const response = await axios.post(`${API_URL}/profile/addresses`, address, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update notification preferences
  updateNotifications: async (notificationPreferences) => {
    const response = await axios.put(`${API_URL}/profile`, { notificationPreferences }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update account settings
  updateSettings: async (accountSettings) => {
    const response = await axios.put(`${API_URL}/profile`, { accountSettings }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await axios.put(`${API_URL}/password`, {
      currentPassword,
      newPassword
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update profile picture
  updateProfilePicture: async (profilePicture) => {
    const response = await axios.put(`${API_URL}/picture`, { profilePicture }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Get payment methods
  getPaymentMethods: async () => {
    const response = await axios.get(`${API_URL}/payment-methods`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Add payment method
  addPaymentMethod: async (paymentMethod) => {
    const response = await axios.post(`${API_URL}/payment-methods`, paymentMethod, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Delete payment method
  deletePaymentMethod: async (paymentMethodId) => {
    const response = await axios.delete(`${API_URL}/payment-methods/${paymentMethodId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Artisan-specific methods
  getArtisanProfile: async () => {
    const response = await axios.get(`${API_URL}/profile/artisan`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createArtisanProfile: async (artisanData) => {
    const response = await axios.post(`${API_URL}/profile/artisan`, artisanData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanProfile: async (artisanData) => {
    const response = await axios.put(`${API_URL}/profile/artisan`, artisanData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanOperations: async (operationsData) => {
    const response = await axios.put(`${API_URL}/profile/artisan/operations`, operationsData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanPhotosContact: async (photosContactData) => {
    const response = await axios.put(`${API_URL}/profile/artisan/photos-contact`, photosContactData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanHours: async (hoursData) => {
    const response = await axios.put(`${API_URL}/profile/artisan/hours`, { artisanHours: hoursData }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanDelivery: async (deliveryData) => {
    const response = await axios.put(`${API_URL}/profile/artisan/delivery`, { deliveryOptions: deliveryData }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update payment methods
  updatePaymentMethods: async (paymentMethods) => {
    const response = await axios.put(`${API_URL}/payment-methods`, { paymentMethods }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update security settings
  updateSecuritySettings: async (securitySettings) => {
    const response = await axios.put(`${API_URL}/security`, { securitySettings }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Change password (updated to accept object)
  changePassword: async (passwordData) => {
    const response = await axios.put(`${API_URL}/password`, passwordData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update delivery options
  updateDeliveryOptions: async (deliveryOptions) => {
    const response = await axios.put(`${API_URL}/profile/artisan/delivery`, { deliveryOptions }, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// Fast profile loading with immediate cache return (for performance optimization)
export const getProfileFast = async () => {
  const token = authToken.getToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
  
  // Try fast cache first (synchronous)
  const cached = cacheService.getFast(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback to async cache with API call
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/profile`, {
        headers: getAuthHeaders()
      });
      return response.data.user;
    },
    CACHE_TTL.USER_PROFILE
  );
};

// Preload profile for instant access
export const preloadProfileFast = () => {
  const token = authToken.getToken();
  if (!token) return;

  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
  
  // Only preload if not already cached
  if (!cacheService.getFast(cacheKey)) {
    cacheService.preload(cacheKey, async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/profile`, {
        headers: getAuthHeaders()
      });
      return response.data.user;
    }, CACHE_TTL.USER_PROFILE);
  }
};

// Update profile cache immediately
export const updateProfileCache = (userData) => {
  const token = authToken.getToken();
  if (!token) return;

  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
  cacheService.set(cacheKey, userData, CACHE_TTL.USER_PROFILE);
};

// Clear profile cache
export const clearProfileCache = () => {
  const token = authToken.getToken();
  if (!token) return;

  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
  cacheService.delete(cacheKey);
};
