import React, { createContext, useContext, useState, useEffect } from 'react';
import { authToken } from '../services/authService';
import { getProfile } from '../services/authService';
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

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authToken.getToken();
        if (token) {
          setIsAuthenticated(true);
          // Try to get user profile from cache first, then API
          const profile = await getProfile();
          setUser(profile);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsAuthenticated(false);
        setUser(null);
        // Clear invalid token
        authToken.removeToken();
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);
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

  // Update user profile
  const updateUser = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (isAuthenticated) {
      try {
        const profile = await getProfile();
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
