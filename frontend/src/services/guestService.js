// src/services/guestService.js

const API_BASE_URL = 'http://localhost:4000/api';

export const guestService = {
  // Create a new guest user
  createGuest: async (guestData = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestData),
      });

      if (!response.ok) {
        throw new Error('Failed to create guest user');
      }

      const data = await response.json();
      
      // Store the token
      localStorage.setItem('token', data.token);
      
      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true } 
      }));
      
      return data;
    } catch (error) {
      console.error('Error creating guest user:', error);
      throw error;
    }
  },

  // Create guest user automatically when needed
  ensureGuestUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Check if token is valid and user is guest
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.isGuest) {
          return { token, userId: payload.userId };
        }
      }
      
      // Create new guest user
      const guestData = await guestService.createGuest();
      return guestData;
    } catch (error) {
      console.error('Error ensuring guest user:', error);
      throw error;
    }
  },

  // Convert guest to regular user
  convertGuestToUser: async (userData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/auth/guest/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to convert guest user');
      }

      const data = await response.json();
      
      // Update the token
      localStorage.setItem('token', data.token);
      
      return data;
    } catch (error) {
      console.error('Error converting guest user:', error);
      throw error;
    }
  },

  // Check if current user is a guest
  isGuestUser: () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.isGuest === true;
    } catch (error) {
      console.error('Error checking guest status:', error);
      return false;
    }
  },

  // Get guest user ID from token
  getGuestUserId: () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch (error) {
      console.error('Error getting guest user ID:', error);
      return null;
    }
  }
};
