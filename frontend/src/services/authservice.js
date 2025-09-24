// src/services/authService.js
import axios from 'axios';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService.js';

import config from '../config/environment.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear cache and token on auth error
      cacheService.delete(CACHE_KEYS.USER_PROFILE);
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
    }
    return Promise.reject(error);
  }
);

// Token management
export const authToken = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => {
    localStorage.setItem('token', token);
    // Clear user profile cache when token changes
    cacheService.delete(CACHE_KEYS.USER_PROFILE);
  },
  removeToken: () => {
    localStorage.removeItem('token');
    // Clear all cached data when logging out
    cacheService.clear();
  }
};

// Optimized getProfile with caching - Performance focused
export const getProfile = async () => {
  const token = authToken.getToken();
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token?.slice(-10)}`;
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const response = await api.get('/auth/profile');
      // The auth/profile endpoint returns { user: userObject }
      return response.data.user;
    },
    CACHE_TTL.USER_PROFILE
  );
};

// Preload profile data
export const preloadProfile = () => {
  if (authToken.getToken()) {
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${authToken.getToken()?.slice(-10)}`;
    cacheService.preload(cacheKey, async () => {
      const response = await api.get('/auth/profile');
      return response.data.user;
    }, CACHE_TTL.USER_PROFILE);
  }
};

// Login with optimized error handling
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;
    
    authToken.setToken(token);
    
    // Cache the profile immediately
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
    cacheService.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: true } 
    }));
    
    return { user };
  } catch (error) {
    throw error;
  }
};

// Register with optimized error handling
export const registerUser = async (userData) => {
  try {
    // Use artisan registration endpoint if role is artisan
    const endpoint = userData.role === 'artisan' ? '/auth/register/artisan' : '/auth/register';
    
    // For artisan registration, include artisan-specific data
    if (userData.role === 'artisan') {
      // Extract artisan data from the artisanData object if it exists
      const artisanData = userData.artisanData || {};
      
      // Use the artisanName from the form, or fallback to firstName + lastName
      userData.artisanName = artisanData.artisanName || userData.artisanName || `${userData.firstName} ${userData.lastName}`;
      userData.type = artisanData.type || userData.businessType || 'food_beverages';
      userData.description = artisanData.description || userData.businessDescription || `Artisan profile for ${userData.firstName} ${userData.lastName}`;
    }
    
    const response = await api.post(endpoint, userData);
    const { token, user, artisan } = response.data;
    
    authToken.setToken(token);
    
    // Cache the profile immediately
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
    cacheService.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    
    // Mark user as new (they haven't completed onboarding yet)
    // This will ensure SmartRedirect sends them to profile setup
    const { onboardingService } = await import('./onboardingService');
    // Don't mark onboarding as completed - let SmartRedirect handle the flow
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: true } 
    }));
    
    return { user, artisan };
  } catch (error) {
    throw error;
  }
};

// Logout with cache clearing
export const logoutUser = () => {
  authToken.removeToken();
  
  // Clear all cached data
  cacheService.clear();
  
  // Clear localStorage backup
  localStorage.removeItem('user_profile_backup');
  
  // Dispatch auth change event
  window.dispatchEvent(new CustomEvent('authStateChanged', { 
    detail: { isAuthenticated: false } 
  }));
};

// Check if user is authenticated (optimized)
export const isAuthenticated = () => {
  const token = authToken.getToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

// Get current user ID from token (optimized)
export const getCurrentUserId = () => {
  const token = authToken.getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
};

// Batch profile updates to reduce API calls
let profileUpdateQueue = [];
let profileUpdateTimeout = null;

export const queueProfileUpdate = (updates) => {
  profileUpdateQueue.push(updates);
  
  if (profileUpdateTimeout) {
    clearTimeout(profileUpdateTimeout);
  }
  
  profileUpdateTimeout = setTimeout(async () => {
    if (profileUpdateQueue.length > 0) {
      try {
        const mergedUpdates = profileUpdateQueue.reduce((acc, update) => ({ ...acc, ...update }), {});
        const response = await api.put('/auth/profile', mergedUpdates);
        
        // Update cache
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${authToken.getToken()?.slice(-10)}`;
        cacheService.set(cacheKey, response.data, CACHE_TTL.USER_PROFILE);
        
        profileUpdateQueue = [];
      } catch (error) {
        console.error('Batch profile update failed:', error);
        throw error;
      }
    }
  }, 1000); // Batch updates within 1 second
};
