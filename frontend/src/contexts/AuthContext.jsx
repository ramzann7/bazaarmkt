import React, { createContext, useContext, useState, useEffect } from 'react';
import { authToken } from '../services/authservice';
import { getProfile } from '../services/authservice';
import { getProfileFast, updateProfileCache } from '../services/profileService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    // Return a fallback context to prevent crashes
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      login: async () => { throw new Error('Auth not initialized'); },
      logout: () => { console.warn('Auth not initialized'); },
      updateUser: async () => { throw new Error('Auth not initialized'); },
      refreshUser: async () => { throw new Error('Auth not initialized'); },
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
      try {
        console.log('🔄 AuthContext: Starting initialization...');
        const token = authToken.getToken();
        
        if (token) {
          console.log('✅ AuthContext: Token found, setting authenticated state');
          // Set authenticated immediately for better UX
          setIsAuthenticated(true);
          
          // Try to get cached profile first (fast path)
          const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
          const cachedProfile = cacheService.getFast(cacheKey);
          if (cachedProfile) {
            console.log('✅ AuthContext: Using cached profile:', { userId: cachedProfile._id, email: cachedProfile.email });
            console.log('AuthContext setUser:', cachedProfile);
            setUser(cachedProfile);
            setIsLoading(false);
            setIsInitialized(true);
            setIsProviderReady(true);
            
            // Load fresh profile in background
            console.log('🔄 AuthContext: Loading fresh profile in background...');
            getProfileFast().then(profile => {
              console.log('✅ AuthContext: Fresh profile loaded:', { userId: profile._id, email: profile.email });
              console.log('AuthContext setUser:', profile);
              setUser(profile);
            }).catch(error => {
              console.error('❌ AuthContext: Background profile refresh failed:', error);
            });
            return;
          }
          
          // No cache, load profile
          console.log('🔄 AuthContext: No cached profile, loading fresh data...');
          const profile = await getProfileFast();
          console.log('✅ AuthContext: Fresh profile loaded:', { userId: profile._id, email: profile.email });
          console.log('AuthContext setUser:', profile);
          setUser(profile);
        } else {
          console.log('ℹ️ AuthContext: No token found, user not authenticated');
          setIsAuthenticated(false);
          console.log('AuthContext setUser:', null);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Initialization error:', error);
        setIsAuthenticated(false);
        console.log('AuthContext setUser:', null);
        setUser(null);
        authToken.removeToken();
      } finally {
        console.log('✅ AuthContext: Initialization complete, setting provider ready');
        setIsLoading(false);
        setIsInitialized(true);
        setIsProviderReady(true);
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
      console.log('AuthContext setUser:', user);
      setUser(user);
      setIsAuthenticated(true);
      
      // Cache the user profile immediately
      updateProfileCache(user);
      
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    console.log('AuthContext setUser:', null);
    setUser(null);
    setIsAuthenticated(false);
    authToken.removeToken();
    toast.success('Logged out successfully');
  };

  // Update user profile - Optimized
  const updateUser = async () => {
    try {
      console.log('🔄 AuthContext: Updating user profile...');
      
      // Clear cache to force fresh data
      const { clearProfileCache } = await import('../services/profileService');
      clearProfileCache();
      
      // Fetch fresh profile data
      const profile = await getProfileFast();
      console.log('✅ AuthContext: Profile updated successfully:', profile);
      
      console.log('AuthContext setUser:', profile);
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Refresh user data - Optimized
  const refreshUser = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing user data...');
      const token = authToken.getToken();
      
      if (!token) {
        console.log('❌ No token found, user not authenticated');
        setIsAuthenticated(false);
        console.log('AuthContext setUser:', null);
        setUser(null);
        throw new Error('No authentication token');
      }
      
      const profile = await getProfileFast();
      console.log('✅ AuthContext: User data refreshed successfully:', profile);
      console.log('AuthContext setUser:', profile);
      setUser(profile);
      setIsAuthenticated(true);
      return profile;
    } catch (error) {
      console.error('❌ Profile refresh error:', error);
      // If refresh fails, user might be logged out
      if (error.response?.status === 401) {
        console.log('❌ 401 error, logging out user');
        logout();
      }
      throw error;
    }
  };

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
