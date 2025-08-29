import axios from 'axios';
import { authToken } from './authService';

const API_URL = '/api/profile';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${authToken.getToken()}`
});

export const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await axios.get(API_URL, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update entire profile
  updateProfile: async (profileData) => {
    const response = await axios.put(API_URL, profileData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update basic profile information
  updateBasicProfile: async (profileData) => {
    const response = await axios.put(`${API_URL}/basic`, profileData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update addresses
  updateAddresses: async (addresses) => {
    const response = await axios.put(`${API_URL}/addresses`, { addresses }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Add new address
  addAddress: async (address) => {
    const response = await axios.post(`${API_URL}/addresses`, address, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update notification preferences
  updateNotifications: async (notificationPreferences) => {
    const response = await axios.put(`${API_URL}/notifications`, { notificationPreferences }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update account settings
  updateSettings: async (accountSettings) => {
    const response = await axios.put(`${API_URL}/settings`, { accountSettings }, {
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
    const response = await axios.get(`${API_URL}/artisan`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  createArtisanProfile: async (artisanData) => {
    const response = await axios.post(`${API_URL}/artisan`, artisanData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanProfile: async (artisanData) => {
    const response = await axios.put(`${API_URL}/artisan`, artisanData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanOperations: async (operationsData) => {
    const response = await axios.put(`${API_URL}/artisan/operations`, operationsData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanPhotosContact: async (photosContactData) => {
    const response = await axios.put(`${API_URL}/artisan/photos-contact`, photosContactData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanHours: async (hoursData) => {
    const response = await axios.put(`${API_URL}/artisan/hours`, { artisanHours: hoursData }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  updateArtisanDelivery: async (deliveryData) => {
    const response = await axios.put(`${API_URL}/artisan/delivery`, { deliveryOptions: deliveryData }, {
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
    const response = await axios.put(`${API_URL}/artisan/delivery`, { deliveryOptions }, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};
