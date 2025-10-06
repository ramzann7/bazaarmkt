import React, { createContext, useContext, useState, useEffect } from 'react';
import { authToken } from '../services/authservice';
import { getProfile } from '../services/authservice';
import { getProfileFast, updateProfileCache } from '../services/profileService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import toast from 'react-hot-toast';
import { getUserIdFromToken, getUserEmailFromToken } from '../utils/tokenUtils';

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
  console.log('🚀 AuthProvider: Component initialized');
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // Initialize auth state on app load - Optimized for performance
  useEffect(() => {
    console.log('🚀 AuthContext: useEffect triggered');
    
    // Prevent multiple initializations in StrictMode
    if (initializationAttempted) {
      console.log('🚀 AuthContext: Initialization already attempted, skipping...');
      return;
    }
    
    setInitializationAttempted(true);
    
    const initializeAuth = async () => {
      const startTime = performance.now();
      console.log('🚀 AuthContext: Starting initialization...');
      
      try {
        const token = authToken.getToken();
        
        if (token) {
          console.log('🔑 AuthContext: Token found, setting authenticated state...');
          
          // Debug: Log token details
          const tokenInfo = getUserIdFromToken(token);
          const tokenEmail = getUserEmailFromToken(token);
          console.log('🔍 AuthContext: Token details - userId:', tokenInfo, 'email:', tokenEmail);
          
          // Set authenticated immediately for better UX
          setIsAuthenticated(true);
          setIsLoading(false);
          setIsInitialized(true);
          setIsProviderReady(true);
          
          // Try to get cached profile first (fast path)
          const userId = getUserIdFromToken(token);
          const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${userId || 'unknown'}`;
          const cachedProfile = cacheService.getFast(cacheKey);
          
          console.log('🔍 AuthContext: Cache key:', cacheKey);
          console.log('🔍 AuthContext: Cached profile exists:', !!cachedProfile);
          
          if (cachedProfile) {
            console.log('⚡ AuthContext: Using cached profile for immediate response');
            console.log('🔍 AuthContext: Cached profile userId:', cachedProfile._id, 'Token userId:', userId);
            
            // Validate that cached profile matches token userId
            console.log('🔍 AuthContext: Cache validation - cachedProfile._id:', cachedProfile._id, 'token userId:', userId, 'match:', cachedProfile._id?.toString() === userId);
            
            if (cachedProfile._id && cachedProfile._id.toString() === userId) {
              console.log('✅ AuthContext: Cache match - using cached profile');
              setUser(cachedProfile);
              
              // Load fresh profile in background (non-blocking)
              setTimeout(async () => {
                try {
                  console.log('🔄 AuthContext: Refreshing profile in background...');
                  const profile = await getProfile();
                  console.log('🔍 AuthContext: Fresh profile loaded:', { userId: profile._id, email: profile.email });
                  setUser(profile);
                  console.log('✅ AuthContext: Background profile refresh completed');
                } catch (error) {
                  console.error('❌ AuthContext: Background profile refresh failed:', error);
                }
              }, 100); // Small delay to ensure UI is responsive
            } else {
              console.warn('⚠️ AuthContext: Cache mismatch detected, clearing cache and loading fresh profile');
              console.log('🔍 AuthContext: Cache mismatch details:', {
                cachedUserId: cachedProfile._id,
                tokenUserId: userId,
                cachedEmail: cachedProfile.email
              });
              cacheService.delete(cacheKey);
              // Load fresh profile immediately
              const profile = await getProfile();
              console.log('🔍 AuthContext: Fresh profile loaded after cache clear:', { userId: profile._id, email: profile.email });
              setUser(profile);
            }
            
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
  }, [initializationAttempted]);

  // Manual initialization trigger as fallback
  const manualInitialize = React.useCallback(() => {
    if (!initializationAttempted) {
      console.log('🚀 AuthContext: Manual initialization triggered');
      setInitializationAttempted(true);
      
      const initializeAuth = async () => {
        const startTime = performance.now();
        console.log('🚀 AuthContext: Manual initialization starting...');
        
        try {
          const token = authToken.getToken();
          
          if (token) {
            console.log('🔑 AuthContext: Manual init - Token found');
            const tokenInfo = getUserIdFromToken(token);
            const tokenEmail = getUserEmailFromToken(token);
            console.log('🔍 AuthContext: Manual init - Token details:', { userId: tokenInfo, email: tokenEmail });
            
            setIsAuthenticated(true);
            setIsLoading(false);
            setIsInitialized(true);
            setIsProviderReady(true);
            
            // Load fresh profile
            const profile = await getProfile();
            console.log('🔍 AuthContext: Manual init - Profile loaded:', { userId: profile._id, email: profile.email });
            setUser(profile);
            
            const endTime = performance.now();
            console.log(`✅ AuthContext: Manual initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
          } else {
            console.log('🔓 AuthContext: Manual init - No token found');
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            setIsInitialized(true);
            setIsProviderReady(true);
          }
        } catch (error) {
          console.error('❌ AuthContext: Manual initialization error:', error);
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          setIsProviderReady(true);
        }
      };
      
      initializeAuth();
    }
  }, [initializationAttempted]);

  // Fallback initialization with timeout in case useEffect doesn't trigger
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!initializationAttempted) {
        console.log('🚀 AuthContext: Fallback initialization triggered after timeout');
        manualInitialize();
      }
    }, 1000); // 1 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [initializationAttempted, manualInitialize]);

  // Login function - Optimized for immediate response
  const login = async (userData) => {
    try {
      // Handle both { user } and direct user object
      const user = userData.user || userData;
      
      console.log('🔑 AuthContext: Login called with user data:', {
        userId: user._id,
        email: user.email,
        userType: user.userType
      });
      
      // Set user immediately for instant UI response
      setUser(user);
      setIsAuthenticated(true);
      
      // Clear all existing caches to prevent stale data
      console.log('🧹 AuthContext: Clearing all user caches during login...');
      const { clearAllUserCaches } = await import('../services/authservice');
      clearAllUserCaches();
      
      // Cache the user profile immediately
      console.log('🔍 AuthContext: Caching user profile:', { userId: user._id, email: user.email });
      updateProfileCache(user);
      
      // Clear any existing cart count cache to force refresh
      if (user._id) {
        const cartCountKey = `cart_count_${user._id}`;
        cacheService.delete(cartCountKey);
        console.log('🔍 AuthContext: Cleared cart count cache for user:', user._id);
      }
      
      // Force immediate profile refresh for better UX
      setTimeout(async () => {
        try {
          console.log('🔄 AuthContext: Starting background profile refresh...');
          const freshProfile = await getProfile(true); // Force refresh to bypass cache
          
          // Validate that we have a valid profile
          if (!freshProfile || !freshProfile._id) {
            console.error('❌ AuthContext: Invalid profile data received:', freshProfile);
            return;
          }
          
          // Validate that the fresh profile matches the logged-in user
          const currentUserId = user._id?.toString();
          const freshUserId = freshProfile._id?.toString();
          
          console.log('🔍 AuthContext: Profile validation - current user:', currentUserId, 'fresh profile:', freshUserId);
          
          if (currentUserId !== freshUserId) {
            console.warn('⚠️ AuthContext: Profile mismatch detected in background refresh!');
            console.log('🔍 AuthContext: Mismatch details:', {
              currentUserId: currentUserId,
              freshUserId: freshUserId,
              currentEmail: user.email,
              freshEmail: freshProfile.email
            });
            // Don't update user if there's a mismatch
            return;
          }
          
          // Ensure profile has required fields with defaults
          const normalizedProfile = {
            ...freshProfile,
            userType: freshProfile.userType || 'customer', // Default to customer if not set
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
          
          console.log('🔍 AuthContext: Background profile refresh - Normalized profile:', {
            userId: normalizedProfile._id,
            email: normalizedProfile.email,
            userType: normalizedProfile.userType
          });
          
          setUser(normalizedProfile);
        } catch (error) {
          console.error('❌ AuthContext: Background profile refresh failed:', error);
          // Don't throw error here as it's a background operation
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
    
    // Clear all user caches to prevent wrong user data persistence
    import('../services/authservice').then(({ clearAllUserCaches }) => {
      clearAllUserCaches();
    });
    
    // Clear localStorage backup
    localStorage.removeItem('user_profile_backup');
    
    // Dispatch auth change event
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: false } 
    }));
    
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
      
      console.log('🔄 AuthContext: refreshUser - Starting profile refresh...');
      console.log('🔍 AuthContext: refreshUser - Token details:', {
        userId: getUserIdFromToken(token),
        email: getUserEmailFromToken(token)
      });
      
      // Clear ALL user caches to force fresh data
      console.log('🧹 AuthContext: refreshUser - Clearing all user caches...');
      const { clearAllUserCaches } = await import('../services/authservice');
      clearAllUserCaches();
      
      // Also clear profile cache
      const { clearProfileCache } = await import('../services/profileService');
      clearProfileCache();
      
      const profile = await getProfile(true); // Force refresh to get latest data
      
      // Validate profile data
      if (!profile) {
        console.error('❌ AuthContext: refreshUser - Profile is null/undefined');
        throw new Error('Profile data is null or undefined');
      }
      
      // Validate that profile matches the token
      const tokenUserId = getUserIdFromToken(token);
      const profileUserId = profile._id?.toString();
      
      console.log('🔍 AuthContext: refreshUser - Profile validation:', {
        tokenUserId: tokenUserId,
        profileUserId: profileUserId,
        tokenEmail: getUserEmailFromToken(token),
        profileEmail: profile.email
      });
      
      if (tokenUserId !== profileUserId) {
        console.error('❌ AuthContext: refreshUser - Profile mismatch detected!');
        console.error('🔍 AuthContext: refreshUser - Mismatch details:', {
          tokenUserId: tokenUserId,
          profileUserId: profileUserId,
          tokenEmail: getUserEmailFromToken(token),
          profileEmail: profile.email
        });
        throw new Error(`Profile mismatch: token user ${tokenUserId} != profile user ${profileUserId}`);
      }
      
      // Ensure profile has required fields with defaults
      const normalizedProfile = {
        ...profile,
        userType: profile.userType || 'customer', // Default to customer if not set
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
      
      console.log('🔍 AuthContext: refreshUser - Normalized profile:', {
        userId: normalizedProfile._id,
        email: normalizedProfile.email,
        userType: normalizedProfile.userType
      });
      
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
    setUser,
    manualInitialize
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
