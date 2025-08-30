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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on app load - Optimized for performance
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authToken.getToken();
        
        if (token) {
          // Set authenticated immediately for better UX
          setIsAuthenticated(true);
          
          // Try to get cached profile first (fast path)
          const cachedProfile = cacheService.getFast(`${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`);
          if (cachedProfile) {
            setUser(cachedProfile);
            setIsLoading(false);
            setIsInitialized(true);
            
            // Load fresh profile in background
            getProfileFast().then(profile => {
              setUser(profile);
            }).catch(error => {
              console.error('Background profile refresh failed:', error);
            });
            return;
          }
          
          // No cache, load profile
          const profile = await getProfileFast();
          setUser(profile);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsAuthenticated(false);
        setUser(null);
        authToken.removeToken();
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
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
      const profile = await getProfileFast();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Refresh user data - Optimized
  const refreshUser = async () => {
    if (isAuthenticated) {
      try {
        const profile = await getProfileFast();
        setUser(profile);
        return profile;
      } catch (error) {
        console.error('Profile refresh error:', error);
        // If refresh fails, user might be logged out
        if (error.response?.status === 401) {
          logout();
        }
        throw error;
      }
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    logout,
    updateUser,
    refreshUser,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
