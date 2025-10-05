import React, { createContext, useContext, useState, useEffect } from 'react';
import { authToken } from '../services/authservice';
import { getProfile } from '../services/authservice';
import { getProfileFast, updateProfileCache } from '../services/profileService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import toast from 'react-hot-toast';
import { getUserIdFromToken } from '../utils/tokenUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('useAuth called before AuthProvider is ready, returning fallback context');
    // Return a fallback context to prevent crashes
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      isProviderReady: false,
      login: async () => { console.warn('Auth not initialized'); },
      logout: () => { console.warn('Auth not initialized'); },
      updateUser: async () => { console.warn('Auth not initialized'); },
      refreshUser: async () => { console.warn('Auth not initialized'); },
      setUser: () => { console.warn('Auth not initialized'); }
    };
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProviderReady, setIsProviderReady] = useState(false);

  // Initialize auth state on app load - Optimized for performance
  useEffect(() => {
    const initializeAuth = async () => {
      const startTime = performance.now();
      console.log('🚀 AuthContext: Starting initialization...');
      
      try {
        const token = authToken.getToken();
        
        if (token) {
          console.log('🔑 AuthContext: Token found, setting authenticated state...');
          // Set authenticated immediately for better UX
          setIsAuthenticated(true);
          setIsLoading(false);
          setIsInitialized(true);
          setIsProviderReady(true);
          
          // Try to get cached profile first (fast path)
          const userId = getUserIdFromToken(token);
          const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
          const cachedProfile = cacheService.getFast(cacheKey);
          
          if (cachedProfile) {
            console.log('⚡ AuthContext: Using cached profile for immediate response');
            setUser(cachedProfile);
            
            // Load fresh profile in background (non-blocking)
            setTimeout(async () => {
              try {
                console.log('🔄 AuthContext: Refreshing profile in background...');
                const profile = await getProfile();
                setUser(profile);
                console.log('✅ AuthContext: Background profile refresh completed');
              } catch (error) {
                console.error('❌ AuthContext: Background profile refresh failed:', error);
              }
            }, 100); // Small delay to ensure UI is responsive
            
            const endTime = performance.now();
            console.log(`⚡ AuthContext: Fast initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
            return;
          }
          
          console.log('🔄 AuthContext: No cache found, loading profile...');
          // No cache, load profile with timeout
          const profilePromise = getProfile();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile load timeout')), 3000)
          );
          
          const profile = await Promise.race([profilePromise, timeoutPromise]);
          setUser(profile);
          
          const endTime = performance.now();
          console.log(`✅ AuthContext: Profile loaded in ${(endTime - startTime).toFixed(2)}ms`);
        } else {
          console.log('🔓 AuthContext: No token found, setting unauthenticated state');
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          setIsProviderReady(true);
          
          const endTime = performance.now();
          console.log(`⚡ AuthContext: Quick initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
        }
      } catch (error) {
        console.error('❌ AuthContext: Initialization error:', error);
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        setIsInitialized(true);
        setIsProviderReady(true);
        authToken.removeToken();
        
        const endTime = performance.now();
        console.log(`⚠️ AuthContext: Error recovery completed in ${(endTime - startTime).toFixed(2)}ms`);
      }
    };

    initializeAuth();
  }, []);

  // Login function - Optimized for immediate response
  const login = async (userData) => {
    try {
      // Handle both { user } and direct user object
      const user = userData.user || userData;
      
      // Set user immediately for instant UI response
      setUser(user);
      setIsAuthenticated(true);
      
      // Cache the user profile immediately
      updateProfileCache(user);
      
      // Clear any existing cart count cache to force refresh
      if (user._id) {
        const cartCountKey = `cart_count_${user._id}`;
        cacheService.delete(cartCountKey);
      }
      
      // Force immediate profile refresh for better UX
      setTimeout(async () => {
        try {
          const freshProfile = await getProfile();
          
          // Validate that we have a valid profile
          if (!freshProfile || !freshProfile._id) {
            console.error('❌ AuthContext: Invalid profile data received:', freshProfile);
            return;
          }
          
          // Ensure profile has required fields with defaults
          const normalizedProfile = {
            ...freshProfile,
            userType: freshProfile.userType, // Explicitly preserve userType
            artisan: freshProfile.artisan, // Explicitly preserve artisan data
            artisanId: freshProfile.artisanId, // Explicitly preserve artisanId
            firstName: freshProfile.firstName || '',
            lastName: freshProfile.lastName || '',
            phone: freshProfile.phone || '',
            addresses: freshProfile.addresses || [],
            notificationPreferences: freshProfile.notificationPreferences || {},
            accountSettings: freshProfile.accountSettings || {},
            paymentMethods: freshProfile.paymentMethods || []
          };
          
          setUser(normalizedProfile);
        } catch (error) {
          console.error('❌ AuthContext: Background profile refresh failed:', error);
        }
      }, 100);
      
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    authToken.removeToken();
    toast.success('Logged out successfully');
  };

  // Update user profile - Optimized
  const updateUser = async () => {
    try {
      
      // Clear cache to force fresh data
      const { clearProfileCache } = await import('../services/profileService');
      clearProfileCache();
      
      // Fetch fresh profile data
      const profile = await getProfile();
      
      // Ensure profile has required fields with defaults
      const normalizedProfile = {
        ...profile,
        userType: profile.userType, // Explicitly preserve userType
        artisan: profile.artisan, // Explicitly preserve artisan data
        artisanId: profile.artisanId, // Explicitly preserve artisanId
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        addresses: profile.addresses || [],
        notificationPreferences: profile.notificationPreferences || {},
        accountSettings: profile.accountSettings || {},
        paymentMethods: profile.paymentMethods || []
      };
      
      setUser(normalizedProfile);
      return normalizedProfile;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Refresh user data - Optimized
  const refreshUser = async () => {
    try {
      const token = authToken.getToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        throw new Error('No authentication token');
      }
      
      // Clear profile cache to force fresh data
      const { clearProfileCache } = await import('../services/profileService');
      clearProfileCache();
      
      const profile = await getProfile(true); // Force refresh to get latest data
      
      // Ensure profile has required fields with defaults
      const normalizedProfile = {
        ...profile,
        userType: profile.userType, // Explicitly preserve userType
        artisan: profile.artisan, // Explicitly preserve artisan data
        artisanId: profile.artisanId, // Explicitly preserve artisanId
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        addresses: profile.addresses || [],
        notificationPreferences: profile.notificationPreferences || {},
        accountSettings: profile.accountSettings || {},
        paymentMethods: profile.paymentMethods || []
      };
      
      setUser(normalizedProfile);
      setIsAuthenticated(true);
      return normalizedProfile;
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
      // If refresh fails, user might be logged out
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  };

  // Listen for auth state changes from other components
  useEffect(() => {
    const handleAuthStateChange = async (event) => {
      if (event.detail.isAuthenticated) {
        // User was authenticated elsewhere (e.g., registration), refresh auth state
        await refreshUser();
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [refreshUser]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    isProviderReady,
    login,
    logout,
    updateUser,
    refreshUser,
    setUser
  };

  // Don't render children until provider is ready
  if (!isProviderReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
