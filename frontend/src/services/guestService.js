import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const guestService = {
  // Create a guest user profile
  createGuestProfile: async (guestInfo) => {
    try {
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
  }
};
