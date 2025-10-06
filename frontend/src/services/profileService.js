// Profile service for user profile management
import api from './apiClient';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';
import { authToken } from './authservice';
import { getUserIdFromToken } from '../utils/tokenUtils';
import config from '../config/environment.js';

const API_URL = config.API_URL;

export const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get(`${API_URL}/auth/profile`);
    return response.data;
  },

  // Update entire profile
  updateProfile: async (profileData) => {
    const response = await api.put(`${API_URL}/auth/profile`, profileData);
    return response.data;
  },

  // Update basic profile information
  updateBasicProfile: async (profileData) => {
    const response = await api.put(`${API_URL}/profile`, profileData);
    return response.data;
  },

  // Update addresses
  updateAddresses: async (addresses) => {
    const response = await api.put(`${API_URL}/profile/addresses`, { addresses });
    
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
    const response = await api.post(`${API_URL}/profile/addresses`, address);
    return response.data;
  },

  // Update notification preferences
  updateNotifications: async (notificationPreferences) => {
    const response = await api.put(`${API_URL}/profile`, { notificationPreferences });
    return response.data;
  },

  // Update account settings
  updateSettings: async (accountSettings) => {
    const response = await api.put(`${API_URL}/profile`, { accountSettings });
    return response.data;
  },

  // Update profile picture
  updateProfilePicture: async (profilePicture) => {
    const response = await api.put(`${API_URL}/picture`, { profilePicture });
    return response.data;
  },

  // Get payment methods
  getPaymentMethods: async () => {
    const response = await api.get(`${API_URL}/payment-methods`);
    return response.data;
  },

  // Add payment method
  addPaymentMethod: async (paymentMethod) => {
    const response = await api.post(`${API_URL}/payment-methods`, paymentMethod);
    return response.data;
  },

  // Delete payment method
  deletePaymentMethod: async (paymentMethodId) => {
    const response = await api.delete(`${API_URL}/profile/payment-methods/${paymentMethodId}`);
    return response.data;
  },

  // Artisan-specific methods
  getArtisanProfile: async () => {
    const response = await api.get(`${API_URL}/profile/artisan`);
    return response.data;
  },

  createArtisanProfile: async (artisanData) => {
    const response = await api.post(`${API_URL}/profile/artisan`, artisanData);
    return response.data;
  },

  updateArtisanProfile: async (artisanData) => {
    const response = await api.put(`${API_URL}/profile/artisan`, artisanData);
    return response.data;
  },

  updateArtisanOperations: async (operationsData) => {
    const response = await api.put(`${API_URL}/profile/artisan/operations`, operationsData);
    return response.data;
  },

  updateArtisanPhotosContact: async (photosContactData) => {
    const response = await api.put(`${API_URL}/profile/artisan/photos-contact`, photosContactData);
    return response.data;
  },

  updateArtisanHours: async (hoursData) => {
    const response = await api.put(`${API_URL}/profile/artisan/hours`, { artisanHours: hoursData });
    return response.data;
  },

  updateArtisanDelivery: async (deliveryData) => {
    const response = await api.put(`${API_URL}/profile/artisan/delivery`, { deliveryOptions: deliveryData });
    return response.data;
  },

  // Update payment methods
  updatePaymentMethods: async (paymentMethods) => {
    const response = await api.put(`${API_URL}/profile/payment-methods`, paymentMethods);
    return response.data;
  },


  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put(`${API_URL}/profile/password`, passwordData);
    return response.data;
  },

  // Update delivery options
  updateDeliveryOptions: async (deliveryOptions) => {
    const response = await api.put(`${API_URL}/profile/artisan/delivery`, { deliveryOptions });
    return response.data;
  }
};

// Fast profile loading with immediate cache return (for performance optimization)
export const getProfileFast = async () => {
  const token = authToken.getToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  const userId = getUserIdFromToken(token);
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
  
  // Try fast cache first (synchronous)
  const cached = cacheService.getFast(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback to async cache with API call
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const response = await api.get(`${config.API_URL}/auth/profile`, {
        headers: getAuthHeaders()
      });
      return response.data.data?.user || response.data.user;
    },
    CACHE_TTL.USER_PROFILE
  );
};

// Preload profile for instant access
export const preloadProfileFast = () => {
  const token = authToken.getToken();
  if (!token) return;

  const userId = getUserIdFromToken(token);
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
  
  // Only preload if not already cached
  if (!cacheService.getFast(cacheKey)) {
    cacheService.preload(cacheKey, async () => {
      const response = await api.get(`${config.API_URL}/auth/profile`, {
        headers: getAuthHeaders()
      });
      return response.data.data?.user || response.data.user;
    }, CACHE_TTL.USER_PROFILE);
  }
};

// Update profile cache immediately
export const updateProfileCache = (userData) => {
  const token = authToken.getToken();
  if (!token) return;

  const userId = getUserIdFromToken(token);
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
  cacheService.set(cacheKey, userData, CACHE_TTL.USER_PROFILE);
};


// Clear profile cache
export const clearProfileCache = () => {
  const token = authToken.getToken();
  if (!token) return;

  const userId = getUserIdFromToken(token);
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
  cacheService.delete(cacheKey);
};
