// Authentication debugging utilities
import { authToken } from '../services/authservice';
import { cacheService } from '../services/cacheService';
import { getUserIdFromToken, getUserEmailFromToken } from './tokenUtils';

/**
 * Clear all authentication-related data
 */
export const clearAllAuthData = () => {
  console.log('🧹 Clearing all authentication data...');
  
  // Clear token
  authToken.removeToken();
  
  // Clear all caches
  cacheService.clear();
  
  // Clear all localStorage entries that might be user-specific
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('user_profile_') || 
        key.startsWith('cart_') || 
        key.startsWith('cart_count_') ||
        key.includes('profile_') ||
        key.includes('user_') ||
        key.includes('profile') ||
        key.includes('user') ||
        key.includes('cart') ||
        key === 'token') {
      console.log('🗑️ Clearing localStorage key:', key);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ All authentication data cleared');
};

/**
 * Debug current authentication state
 */
export const debugAuthState = () => {
  console.log('🔍 Debugging authentication state...');
  
  const token = authToken.getToken();
  console.log('Token exists:', !!token);
  
  if (token) {
    const userId = getUserIdFromToken(token);
    const email = getUserEmailFromToken(token);
    console.log('Token userId:', userId);
    console.log('Token email:', email);
    
    // Check cache
    const cacheKey = `user_profile_${userId || 'unknown'}`;
    const cachedProfile = cacheService.getFast(cacheKey);
    console.log('Cached profile exists:', !!cachedProfile);
    
    if (cachedProfile) {
      console.log('Cached profile userId:', cachedProfile._id);
      console.log('Cached profile email:', cachedProfile.email);
      console.log('Cache matches token:', cachedProfile._id?.toString() === userId);
    }
  }
  
  // List all localStorage keys
  console.log('All localStorage keys:', Object.keys(localStorage));
};

/**
 * Force refresh authentication state
 */
export const forceRefreshAuth = () => {
  console.log('🔄 Force refreshing authentication state...');
  
  // Clear all data first
  clearAllAuthData();
  
  // Reload the page to reinitialize everything
  window.location.reload();
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.clearAllAuthData = clearAllAuthData;
  window.debugAuthState = debugAuthState;
  window.forceRefreshAuth = forceRefreshAuth;
  
  console.log('🔧 Auth debug utilities available:');
  console.log('- window.clearAllAuthData() - Clear all auth data');
  console.log('- window.debugAuthState() - Debug current auth state');
  console.log('- window.forceRefreshAuth() - Force refresh auth state');
}
