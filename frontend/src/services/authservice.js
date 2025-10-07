// src/services/authService.js
import axios from 'axios';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService.js';
import { getUserIdFromToken } from '../utils/tokenUtils';
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

// Comprehensive cache clearing utility
export const clearAllUserCaches = () => {
  console.log('🧹 Clearing all user caches...');
  
  // Clear cache service
  cacheService.clear();
  
  // Clear all localStorage entries that might be user-specific
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_KEYS.USER_PROFILE) || 
        key.startsWith('cart_') || 
        key.startsWith('cart_count_') ||
        key.includes('profile_') ||
        key.includes('user_') ||
        key.includes('profile') ||
        key.includes('user') ||
        key.includes('cart')) {
      console.log('🗑️ Clearing cache key:', key);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ All user caches cleared');
};

// Token management
export const authToken = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => {
    console.log('🔑 Setting new token, clearing all user caches...');
    
    // Use comprehensive cache clearing
    clearAllUserCaches();
    
    // Set the new token
    localStorage.setItem('token', token);
    
    console.log('✅ Token set and caches cleared');
  },
  removeToken: () => {
    localStorage.removeItem('token');
    // Clear all cached data when logging out
    cacheService.clear();
  }
};

// Optimized getProfile with caching - Performance focused
export const getProfile = async (forceRefresh = false) => {
  const token = authToken.getToken();
  
  if (!token) {
    console.warn('⚠️ getProfile: No token available');
    return null;
  }
  
  const userId = getUserIdFromToken(token);
  const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
  
  // Clear cache if force refresh is requested
  if (forceRefresh) {
    console.log('🔄 getProfile: Force refresh requested, clearing cache:', cacheKey);
    cacheService.delete(cacheKey);
  }
  
  try {
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        console.log('📡 getProfile: Fetching profile from API...');
        const response = await api.get('/auth/profile');
        console.log('📦 getProfile: API response:', {
          hasData: !!response.data,
          hasDataUser: !!response.data?.data?.user,
          hasUser: !!response.data?.user,
          success: response.data?.success
        });
        
        // The auth/profile endpoint returns { success: true, data: { user: userObject } }
        const profile = response.data.data?.user || response.data.user;
        
        if (!profile) {
          console.error('❌ getProfile: API returned no profile data!', response.data);
          return null;
        }
        
        console.log('✅ getProfile: Profile fetched successfully:', profile._id);
        return profile;
      },
      CACHE_TTL.USER_PROFILE
    );
  } catch (error) {
    console.error('❌ getProfile: Error fetching profile:', error);
    console.error('❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Clear cache on error to allow retry
    cacheService.delete(cacheKey);
    
    // Don't throw - return null to allow graceful handling
    return null;
  }
};

// Preload profile data
export const preloadProfile = () => {
  const token = authToken.getToken();
  if (token) {
    const userId = getUserIdFromToken(token);
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
    cacheService.preload(cacheKey, async () => {
      const response = await api.get('/auth/profile');
      return response.data.data?.user || response.data.user;
    }, CACHE_TTL.USER_PROFILE);
  }
};

// Login with optimized error handling
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    
    // Debug: Log the response structure
    console.log('🔍 Login response:', response.data);
    
    // Handle both nested and direct response structures
    const responseData = response.data.data || response.data;
    const { token, user } = responseData;
    
    // Validate required fields
    if (!token) {
      console.error('❌ No token in response:', responseData);
      throw new Error('Login failed: No token received');
    }
    
    if (!user) {
      console.error('❌ No user in response:', responseData);
      throw new Error('Login failed: No user data received');
    }
    
    authToken.setToken(token);
    
    // Cache the profile immediately
    const userId = getUserIdFromToken(token);
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
    cacheService.set(cacheKey, user, CACHE_TTL.USER_PROFILE);
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: true } 
    }));
    
    return { user };
  } catch (error) {
    console.error('❌ Login error:', error);
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
    
    // Handle both nested and direct response structures
    const responseData = response.data.data || response.data;
    const { token, user, artisan } = responseData;
    
    // Validate required fields
    if (!token) {
      console.error('❌ No token in registration response:', responseData);
      throw new Error('Registration failed: No token received');
    }
    
    if (!user) {
      console.error('❌ No user in registration response:', responseData);
      throw new Error('Registration failed: No user data received');
    }
    
    authToken.setToken(token);
    
    // Cache the profile immediately
    const userId = getUserIdFromToken(token);
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
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
  
  // Use comprehensive cache clearing
  clearAllUserCaches();
  
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
        const token = authToken.getToken();
        const userId = getUserIdFromToken(token);
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
        cacheService.set(cacheKey, response.data, CACHE_TTL.USER_PROFILE);
        
        profileUpdateQueue = [];
      } catch (error) {
        console.error('Batch profile update failed:', error);
        throw error;
      }
    }
  }, 1000); // Batch updates within 1 second
};
