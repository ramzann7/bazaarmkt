import axios from 'axios';
import config from '../config/environment.js';

const API_URL = config.API_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const guestService = {
  // Check if user already exists by email
  checkExistingUser: async (email) => {
    try {
      const response = await axios.get(`${API_URL}/auth/check-email/${encodeURIComponent(email)}`);
      return {
        exists: true,
        user: response.data.user,
        isGuest: response.data.user.isGuest,
        isPatron: response.data.user.isPatron,
        message: response.data.message
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          exists: false,
          user: null,
          isGuest: false,
          isPatron: false,
          message: 'Email not found'
        };
      }
      console.error('Error checking existing user:', error);
      throw error;
    }
  },

  // Create a guest user profile
  createGuestProfile: async (guestInfo) => {
    try {
      console.log('🔍 Guest service API_URL:', API_URL);
      console.log('🔍 Guest service full URL:', `${API_URL}/auth/guest`);
      console.log('🔍 Guest info being sent:', guestInfo);
      const response = await axios.post(`${API_URL}/auth/guest`, guestInfo);
      return response.data;
    } catch (error) {
      console.error('Error creating guest profile:', error);
      throw error;
    }
  },

  // Get guest profile by guest ID
  getGuestProfile: async (guestId) => {
    try {
      const response = await axios.get(`${API_URL}/auth/guest/${guestId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting guest profile:', error);
      throw error;
    }
  },

  // Update guest profile
  updateGuestProfile: async (guestId, updates) => {
    try {
      const response = await axios.put(`${API_URL}/auth/guest/${guestId}`, updates, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating guest profile:', error);
      throw error;
    }
  },

  // Update user profile (for both guests and regular users)
  updateUserProfile: async (userId, updates) => {
    try {
      const response = await axios.put(`${API_URL}/auth/update-profile/${userId}`, updates, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Convert guest to regular user
  convertToUser: async (guestId, userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/guest/${guestId}/convert`, userData);
      return response.data;
    } catch (error) {
      console.error('Error converting guest to user:', error);
      throw error;
    }
  },

  // Generate unique guest ID
  generateGuestId: () => {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Store guest info in localStorage
  storeGuestInfo: (guestInfo) => {
    const guestId = guestService.generateGuestId();
    const guestData = {
      ...guestInfo,
      guestId,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('guest_profile', JSON.stringify(guestData));
    return guestId;
  },

  // Get stored guest info
  getStoredGuestInfo: () => {
    const guestData = localStorage.getItem('guest_profile');
    return guestData ? JSON.parse(guestData) : null;
  },

  // Clear stored guest info
  clearStoredGuestInfo: () => {
    localStorage.removeItem('guest_profile');
  },

  // Create token for existing user
  createTokenForExistingUser: async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/auth/token-for-existing`, { userId });
      return response.data;
    } catch (error) {
      console.error('Error creating token for existing user:', error);
      throw error;
    }
  },

  // Create a permanent account from guest user
  createAccount: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/guest/convert`, userData, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }
};
