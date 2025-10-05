import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  UserIcon, 
  MapPinIcon, 
  BellIcon, 
  CreditCardIcon, 
  CogIcon, 
  ShieldCheckIcon,
  CameraIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  HeartIcon,
  StarIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { profileService, clearProfileCache } from '../services/profileService';
import { paymentService } from '../services/paymentService';
import { favoriteService } from '../services/favoriteService';
import { onboardingService } from '../services/onboardingService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import { useOptimizedEffect, useAsyncOperation } from '../hooks/useOptimizedEffect';
import { OverviewTab, OperationsTab, HoursTab, DeliveryTab, SetupTab } from './ArtisanTabs';
import { PRODUCT_CATEGORIES } from '../data/productReference';
import config from '../config/environment';

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isProviderReady, refreshUser, updateUser } = useAuth();
  
  // Helper function to safely refresh user data
  const safeRefreshUser = async () => {
    if (typeof refreshUser === 'function') {
      try {
        await refreshUser();
      } catch (error) {
        console.error('refreshUser failed, trying fallback:', error);
        // Fallback: manually refresh profile data
        try {
          const { clearProfileCache } = await import('../services/profileService');
          clearProfileCache();
          if (updateUser) {
            await updateUser();
          }
        } catch (fallbackError) {
          console.error('Fallback profile refresh failed:', fallbackError);
        }
      }
    } else {
      console.warn('refreshUser is not available, using fallback profile refresh');
      // Fallback: manually refresh profile data
      try {
        const { clearProfileCache } = await import('../services/profileService');
        clearProfileCache();
        if (updateUser) {
          await updateUser();
        }
      } catch (fallbackError) {
        console.error('Fallback profile refresh failed:', fallbackError);
      }
    }
  };
  
  // Different tabs for different user types
  const patronTabs = [
    { id: 'setup', name: 'Setup Profile', icon: UserIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'addresses', name: 'Delivery Addresses', icon: MapPinIcon },
    { id: 'favorites', name: 'Favorite Artisans', icon: HeartIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'settings', name: 'Account Settings', icon: CogIcon }
  ];

  const artisanTabs = [
    { id: 'setup', name: 'Setup Profile', icon: UserIcon },
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'operations', name: 'Operations', icon: CogIcon },
    { id: 'hours', name: 'Artisan Hours', icon: MapPinIcon },
    { id: 'delivery', name: 'Delivery', icon: MapPinIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Bank Information', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  const setupTabs = [
    { id: 'setup', name: 'Setup Profile', icon: UserIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  const [activeTab, setActiveTab] = useState('setup');
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [hasRefreshedOnMount, setHasRefreshedOnMount] = useState(false);
  const [isArtisan, setIsArtisan] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tabs, setTabs] = useState(patronTabs);
  const [favoriteArtisans, setFavoriteArtisans] = useState([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const isMountedRef = useRef(true);

  // Use user from AuthContext as profile
  const profile = user;

  // Debug effect to track user data changes (reduced logging)
  useEffect(() => {
    if (user?._id) {
      console.log('🔄 Profile component: User data updated:', {
        userId: user._id,
        userType: user.userType || user.role
      });
    }
  }, [user?._id, user?.userType, user?.role]);

  // Handle URL tab parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Memoize tab determination to prevent unnecessary re-renders
  const determineTabs = useMemo(() => {
    if (!profile) return patronTabs;
    
    // Use userType instead of role for consistency with AuthContext
    const userRole = profile.userType || profile.role;
    
    // Map all possible roles to appropriate tabs
    switch (userRole) {
      case 'artisan':
        return artisanTabs;
      case 'admin':
        return patronTabs; // Admins get patron tabs for now
      case 'patron':
      case 'customer':
      case 'buyer':
      default:
        return patronTabs;
    }
  }, [profile?.userType, profile?.role]);

  // Manual refresh function for explicit data refresh
  const forceRefreshProfile = async () => {
    console.log('🔄 Force refreshing profile data...');
    try {
      setIsRefreshing(true);
      await refreshUser();
      toast.success('Profile refreshed successfully!');
    } catch (error) {
      console.error('❌ Failed to force refresh profile:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load artisan profile data - now using the enhanced profile endpoint
  const loadArtisanProfile = useCallback(async () => {
    try {
      // The artisan data is now included in the main profile response
      if (profile?.artisan) {
        if (isMountedRef.current) {
          // Set artisanProfile to the nested artisan data
          setArtisanProfile(profile.artisan);
        }
      } else {
        if (isMountedRef.current) {
          setArtisanProfile(null);
        }
      }
    } catch (error) {
      console.error('❌ Error processing artisan profile data:', error);
      if (isMountedRef.current) {
        setArtisanProfile(null);
      }
    }
  }, [profile?.artisan]);

  // Always fetch profile on profile page mount or navigation (for all users)
  useEffect(() => {
    if (location.pathname === '/profile' && isProviderReady && user && !isLoading && !hasRefreshedOnMount) {
      console.log('🔄 Profile component: Starting profile refresh...');
      setIsLoading(true);
      setHasRefreshedOnMount(true);
      refreshUser()
        .then(() => {
          console.log('✅ Profile component: Profile refresh completed');
        })
        .catch(err => {
          console.error('❌ Failed to load profile:', err);
          toast.error('Failed to load profile');
          navigate('/login');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [location.pathname, isProviderReady, navigate]); // Removed refreshUser, user, isLoading from dependencies

  // Reset refresh flag when navigating away from profile
  useEffect(() => {
    if (location.pathname !== '/profile') {
      setHasRefreshedOnMount(false);
    }
  }, [location.pathname]);

  // Load favorites when profile changes
  useEffect(() => {
    const loadFavorites = async () => {
      if (profile?.role === 'patron' || profile?.role === 'customer' || profile?.role === 'buyer') {
        try {
          setIsLoadingFavorites(true);
          const favorites = await favoriteService.getFavoriteArtisans();
          if (isMountedRef.current) {
            setFavoriteArtisans(favorites);
          }
        } catch (error) {
          console.error('Error loading favorite artisans:', error);
          if (isMountedRef.current) {
            setFavoriteArtisans([]);
          }
        } finally {
          if (isMountedRef.current) {
            setIsLoadingFavorites(false);
          }
        }
      }
    };

    loadFavorites();
  }, [profile?.role]);

  // Update tabs when profile changes
  useEffect(() => {
    if (profile) {
      // Use userType instead of role for consistency with AuthContext
      const userRole = profile.userType || profile.role;
      const isPatron = userRole === 'patron' || userRole === 'customer' || userRole === 'buyer';
      const isArtisanUser = userRole === 'artisan';
      
      if (isPatron) {
        setTabs(patronTabs);
        setIsArtisan(false);
      } else if (isArtisanUser) {
        setTabs(artisanTabs);
        setIsArtisan(true);
        // Only set overview as default tab if no tab is currently active
        if (!activeTab) {
          setActiveTab('overview');
        }
      } else {
        setTabs(patronTabs);
        setIsArtisan(false);
      }
      
      setNeedsSetup(userRole === 'setup');
    }
  }, [profile]);

  // Load artisan profile when user is an artisan
  useEffect(() => {
    // Use userType instead of role for consistency with AuthContext
    const userRole = profile?.userType || profile?.role;
    const isArtisanUser = userRole === 'artisan';
    
    if (profile && isArtisanUser) {
      loadArtisanProfile();
    }
  }, [profile, loadArtisanProfile]);

  // Payment tab data is now loaded via the main profile data, no need for separate refresh

  // Profile data is now loaded via the main useEffect when visiting /profile
  
  // Listen for storage changes (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        console.log('🔄 Token changed in storage, reloading profile...');
        if (e.newValue) {
          // Trigger a fresh profile fetch
          setIsLoading(true);
          refreshUser()
            .catch(err => {
              console.error('❌ Failed to refresh profile after token change:', err);
              toast.error('Failed to refresh profile');
            })
            .finally(() => setIsLoading(false));
        } else {
          // Token was removed, redirect to login
          navigate('/login');
        }
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && location.pathname === '/profile') {
        console.log('🔄 Tab became visible, checking profile data...');
        const token = localStorage.getItem('token');
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Only refresh if profile is completely missing, not already loading, and enough time has passed
        if (token && !profile && !isLoading && timeSinceLastRefresh > 5000) {
          console.log('🔄 Profile data missing, reloading...');
          setLastRefreshTime(now);
          // Trigger a fresh profile fetch
          setIsLoading(true);
          refreshUser()
            .catch(err => {
              console.error('❌ Failed to refresh profile after visibility change:', err);
              toast.error('Failed to refresh profile');
            })
            .finally(() => setIsLoading(false));
        } else {
          console.log('✅ Profile data available, already loading, or too soon to refresh');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, profile]);

  // Refresh profile data when switching tabs (optimized)
  useEffect(() => {
    const handleTabChange = () => {
      // Only refresh if profile is older than 30 seconds
      const profileAge = profile?.updatedAt ? Date.now() - new Date(profile.updatedAt).getTime() : 0;
      
      if (profile && activeTab && profileAge > 30000) { // 30 seconds
        console.log('🔄 Tab changed, profile is stale, refreshing...');
        // Trigger a gentle refresh without showing loading state
        refreshUser().catch(err => {
          console.error('❌ Failed to refresh profile on tab change:', err);
        });
      }
    };

    // Listen for tab changes
    const handleFocus = () => handleTabChange();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab, profile]);

  // Memoized save handler
  const handleSave = useMemo(() => {
    return async (data) => {
      setIsSaving(true);
      try {
        console.log('🔄 Updating profile with data:', data);
        const updatedProfile = await profileService.updateProfile(data);
        console.log('✅ Profile updated successfully:', updatedProfile);
        
        // Clear profile cache to ensure fresh data
        const token = localStorage.getItem('token');
        if (token) {
          const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
          cacheService.delete(cacheKey);
          console.log('🧹 Cleared profile cache');
        }
        
        // Update the user in AuthContext with the returned profile data
        if (updatedProfile?.data?.user) {
          // Use the fresh data from the server response
          await updateUser(updatedProfile.data.user);
        } else {
          // Fallback to refreshing from server
          if (refreshUser) {
            await refreshUser();
          } else {
            await updateUser();
          }
        }
        
        // Mark onboarding as completed for new users
        if (profile && onboardingService.isNewUser(profile._id)) {
          onboardingService.markOnboardingCompleted(profile._id);
          console.log('✅ Onboarding marked as completed for user:', profile._id);
        }
        
        // Dispatch profile update event for other components
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { profile: updatedProfile, updatedFields: Object.keys(data) } 
        }));
        
        toast.success('Profile updated successfully!');
        
        // Return the updated profile so calling components can use it
        return updatedProfile;
      } catch (error) {
        console.error('❌ Error updating profile:', error);
        toast.error('Failed to update profile');
        throw error;
      } finally {
        setIsSaving(false);
      }
    };
  }, [updateUser, refreshUser, profile]);

  // Handle address updates
  const handleAddressUpdate = async (addresses) => {
    try {
      setIsSaving(true);
      console.log('🔄 Updating addresses:', addresses);
      const updatedProfile = await profileService.updateAddresses(addresses);
      console.log('✅ Addresses updated successfully:', updatedProfile);
      
      // Clear profile cache to force fresh load
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.delete(cacheKey);
        console.log('🧹 Cleared profile cache');
      }
      
      // Update the user in AuthContext with fresh data
      if (updatedProfile?.data?.user) {
        await updateUser(updatedProfile.data.user);
      } else {
        await refreshUser(); // Force refresh from server
      }
      
      // Dispatch profile update event for cart and other components
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { profile: updatedProfile, updatedFields: ['addresses'] } 
      }));
      
      toast.success('Addresses updated successfully!');
    } catch (error) {
      console.error('❌ Error updating addresses:', error);
      toast.error('Failed to update addresses');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle payment method updates
  const handlePaymentMethodUpdate = async (paymentMethods) => {
    try {
      console.log('🔄 Updating payment methods:', paymentMethods);
      setIsSaving(true);
      const updatedProfile = await profileService.updatePaymentMethods(paymentMethods);
      console.log('✅ Payment methods updated, new profile:', updatedProfile);
      
      // Clear profile cache to ensure fresh data
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.delete(cacheKey);
      }
      
      // Force AuthContext to refresh user data from backend
      if (refreshUser) {
        await refreshUser();
      } else {
        await updateUser();
      }
      
      // Dispatch profile update event for cart and other components
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { profile: updatedProfile, updatedFields: ['paymentMethods'] } 
      }));
      
      toast.success('Payment methods updated successfully!');
    } catch (error) {
      console.error('❌ Error updating payment methods:', error);
      toast.error('Failed to update payment methods');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle artisan profile updates
  const handleArtisanSave = async (data) => {
    try {
      console.log('🔄 Updating artisan profile:', data);
      console.log('🔄 Current artisan profile exists:', !!artisanProfile);
      console.log('🔄 User role:', profile?.role);
      setIsSaving(true);
      
      let updatedArtisanProfile;
      if (artisanProfile) {
        // Update existing artisan profile
        console.log('🔄 Updating existing artisan profile...');
        updatedArtisanProfile = await profileService.updateArtisanProfile(data);
      } else {
        // Create new artisan profile
        console.log('🔄 Creating new artisan profile...');
        updatedArtisanProfile = await profileService.createArtisanProfile(data);
      }
      
      console.log('✅ Artisan profile updated:', updatedArtisanProfile);
      setArtisanProfile(updatedArtisanProfile);
      
      // Mark onboarding as completed for new users
      if (profile && onboardingService.isNewUser(profile._id)) {
        onboardingService.markOnboardingCompleted(profile._id);
        console.log('✅ Onboarding marked as completed for artisan user:', profile._id);
      }
      
      // Clear any cached artisan profile data to ensure fresh data on next load
      clearProfileCache();
      
      toast.success('Artisan profile updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan profile:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(`Failed to update artisan profile: ${error.response?.data?.message || error.message}`);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle artisan hours updates
  const handleArtisanHoursUpdate = async (hoursData) => {
    try {
      console.log('🔄 Updating artisan hours:', hoursData);
      setIsSaving(true);
      const updatedArtisanProfile = await profileService.updateArtisanHours(hoursData);
      console.log('✅ Artisan hours updated:', updatedArtisanProfile);
      setArtisanProfile(updatedArtisanProfile);
      
      // Clear any cached artisan profile data to ensure fresh data on next load
      clearProfileCache();
      
      toast.success('Business hours updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan hours:', error);
      toast.error('Failed to update business hours');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle artisan operations updates
  const handleArtisanOperationsUpdate = async (operationsData) => {
    try {
      console.log('🔄 Updating artisan operations:', operationsData);
      console.log('🔄 Operations data type:', typeof operationsData);
      console.log('🔄 Operations data keys:', Object.keys(operationsData || {}));
      setIsSaving(true);
      const updatedArtisanProfile = await profileService.updateArtisanOperations(operationsData);
      console.log('✅ Artisan operations updated:', updatedArtisanProfile);
      setArtisanProfile(updatedArtisanProfile);
      
      // Clear any cached artisan profile data to ensure fresh data on next load
      clearProfileCache();
      
      toast.success('Operations details updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan operations:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(`Failed to update operations: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle artisan delivery updates
  const handleArtisanDeliveryUpdate = async (deliveryData) => {
    try {
      console.log('🔄 Updating artisan delivery options:', deliveryData);
      console.log('🔄 Delivery data type:', typeof deliveryData);
      console.log('🔄 Delivery data keys:', Object.keys(deliveryData || {}));
      setIsSaving(true);
      const updatedArtisanProfile = await profileService.updateArtisanDelivery(deliveryData);
      console.log('✅ Artisan delivery options updated:', updatedArtisanProfile);
      setArtisanProfile(updatedArtisanProfile);
      
      // Clear any cached artisan profile data to ensure fresh data on next load
      clearProfileCache();
      
      toast.success('Delivery options updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan delivery options:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      toast.error('Failed to update delivery options');
    } finally {
      setIsSaving(false);
    }
  };





  // If user data isn't loaded yet, show loading
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Defensive render logic
  if (!isProviderReady) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D77A61] mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Check if AuthContext is ready
  if (!isProviderReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 mb-4">Unable to load profile</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }



  // Render tab content
  const renderTabContent = () => {
    // Combine user profile and artisan profile data
    const combinedProfile = artisanProfile ? { ...profile, ...artisanProfile } : profile;
    
    switch (activeTab) {
      // Artisan-specific tabs
      case 'overview':
        return <OverviewTab profile={combinedProfile} onSave={handleArtisanSave} isSaving={isSaving} />;
      case 'operations':
        return <OperationsTab profile={combinedProfile} onSave={handleArtisanOperationsUpdate} isSaving={isSaving} />;
      case 'hours':
        return <HoursTab profile={combinedProfile} onSave={handleArtisanHoursUpdate} isSaving={isSaving} />;
      case 'delivery':
        return <DeliveryTab profile={combinedProfile} onSave={handleArtisanDeliveryUpdate} isSaving={isSaving} />;
      
      // Shared tabs
      case 'personal':
        return <PersonalInfoTab key={`personal-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'addresses':
        return <AddressesTab key={`addresses-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleAddressUpdate} isSaving={isSaving} />;
      case 'favorites':
        return <FavoritesTab favoriteArtisans={favoriteArtisans} isLoading={isLoadingFavorites} />;
      case 'notifications':
        return <NotificationsTab key={`notifications-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'payment':
        return <PaymentTab key={`payment-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handlePaymentMethodUpdate} isSaving={isSaving} safeRefreshUser={safeRefreshUser} />;
      case 'security':
        return <SecurityTab key={`security-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'settings':
        return <SettingsTab key={`settings-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} />;
      
      // Setup tab
      case 'setup':
        return <SetupTab key={`setup-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} setActiveTab={setActiveTab} />;
      
      default:
        return <PersonalInfoTab key={`personal-default-${profile._id}-${profile.updatedAt}`} profile={profile} onSave={handleSave} isSaving={isSaving} />;
    }
  };

  // Check if user is a patron/customer
  const isPatron = profile.role === 'patron' || profile.role === 'customer' || profile.role === 'buyer';

  return (
    <div className="min-h-screen bg-background relative">
      {/* Saving overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
            <span className="text-stone-700">Saving changes...</span>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-6 shadow-lg">
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-3 font-display">My Profile</h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            {isArtisan 
              ? "Manage your artisan business profile, operations, and customer information"
              : "Manage your account settings, preferences, and personal information"
            }
          </p>
        </div>

        {/* Enhanced Profile Header */}
        <div className="card p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
              <UserIcon className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {isArtisan && artisanProfile?.artisanName ? (
                    <h2 className="text-2xl font-bold text-amber-600 font-display">
                      🏪 {artisanProfile.artisanName}
                    </h2>
                  ) : (
                    <h2 className="text-2xl font-bold text-stone-800 font-display">
                      {profile.firstName} {profile.lastName}
                    </h2>
                  )}
                </div>
                <button
                  onClick={forceRefreshProfile}
                  disabled={isRefreshing}
                  className={`p-2 text-gray-500 hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-full transition-colors duration-200 ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={isRefreshing ? "Refreshing..." : "Refresh profile data"}
                >
                  <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-lg text-gray-600 mb-1">{profile.email}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#E6B655] text-[#2E2E2E]">
                <span className="capitalize">{profile.role}</span>
                {isArtisan && (
                  <span className="ml-2 text-xs bg-[#D77A61] text-white px-2 py-0.5 rounded-full">
                    Business Owner
                  </span>
                )}
              </div>
            </div>
            {isArtisan && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Business Status</div>
                <div className="text-lg font-semibold text-[#3C6E47]">Active</div>
              </div>
            )}
          </div>
        </div>



        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#F5F1EA] to-[#E6B655] border-b border-[#E6B655]">
            <nav className="flex space-x-1 px-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
              {tabs
                .filter(tab => {
                  // Hide setup tab once profile is complete
                  if (tab.id === 'setup' && !needsSetup) {
                    return false;
                  }
                  return true;
                })
                .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-6 font-medium text-sm rounded-t-lg transition-all duration-200 flex items-center space-x-2 whitespace-nowrap flex-shrink-0
                    ${activeTab === tab.id
                      ? 'bg-white text-[#D77A61] shadow-sm border-b-2 border-[#D77A61]'
                      : 'text-gray-600 hover:text-[#D77A61] hover:bg-[#F5F1EA]'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Enhanced Tab Content */}
          <div className="p-8">
            <div className="animate-fadeIn">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function PersonalInfoTab({ profile, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || ''
  });

  // Update form data when profile changes
  useEffect(() => {
    console.log('🔄 PersonalInfoTab: Profile updated, syncing form data:', {
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      phone: profile?.phone
    });
    
    // Ensure we have valid profile data
    if (profile && typeof profile === 'object') {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || ''
      });
    }
  }, [profile, profile?.firstName, profile?.lastName, profile?.phone, profile?.updatedAt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function AddressesTab({ profile, onSave, isSaving }) {
  const [addresses, setAddresses] = useState(profile?.addresses || []);

  // Update addresses when profile changes
  useEffect(() => {
    console.log('🔄 AddressesTab: Profile updated, syncing addresses:', profile?.addresses?.length || 0, 'address(es)');
    
    // Ensure we have valid profile data
    if (profile && typeof profile === 'object') {
      setAddresses(profile.addresses || []);
    }
  }, [profile, profile?.addresses, profile?.updatedAt]);

  const addAddress = () => {
    setAddresses([...addresses, {
      type: 'home',
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Canada',
      isDefault: addresses.length === 0
    }]);
  };

  const removeAddress = (index) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const updateAddress = (index, field, value) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setAddresses(newAddresses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(addresses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Delivery Addresses</h3>
        <button
          type="button"
          onClick={addAddress}
          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
        >
          <PlusIcon className="w-4 h-4 inline mr-1" />
          Add Address
        </button>
      </div>

      {addresses.map((address, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-medium">Address {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeAddress(index)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={address.type}
                onChange={(e) => updateAddress(index, 'type', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Label</label>
              <input
                type="text"
                value={address.label}
                onChange={(e) => updateAddress(index, 'label', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., Main Address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Street Address</label>
              <input
                type="text"
                value={address.street}
                onChange={(e) => updateAddress(index, 'street', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => updateAddress(index, 'city', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">State/Province</label>
              <input
                type="text"
                value={address.state}
                onChange={(e) => updateAddress(index, 'state', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">ZIP/Postal Code</label>
              <input
                type="text"
                value={address.zipCode}
                onChange={(e) => updateAddress(index, 'zipCode', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={address.country}
                onChange={(e) => updateAddress(index, 'country', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={address.isDefault}
                onChange={(e) => {
                  const newAddresses = addresses.map((addr, i) => ({
                    ...addr,
                    isDefault: i === index ? e.target.checked : false
                  }));
                  setAddresses(newAddresses);
                }}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Set as default address</span>
            </label>
          </div>
        </div>
      ))}

      {addresses.length > 0 && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Addresses'}
          </button>
        </div>
      )}
    </form>
  );
}

function FavoritesTab({ favoriteArtisans, isLoading }) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading favorite artisans...</p>
      </div>
    );
  }

  if (favoriteArtisans.length === 0) {
    return (
      <div className="text-center py-8">
        <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorite Artisans</h3>
        <p className="text-gray-600 mb-4">You haven't added any artisans to your favorites yet.</p>
        <button
          onClick={() => window.location.href = '/find-artisans'}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Discover Artisans
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Favorite Artisans</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteArtisans.map((favorite) => (
          <div key={favorite._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {favorite.artisan?.artisanName || favorite.artisanName}
                </h4>
                <p className="text-sm text-gray-600">
                  {favorite.artisan?.type || 'Artisan'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab({ profile, onSave, isSaving }) {
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load notification preferences whenever profile changes
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        
        console.log('📧 NotificationsTab: Loading preferences for profile:', profile?._id);
        
        // Try to get preferences from profile first
        if (profile?.notificationPreferences && Object.keys(profile.notificationPreferences).length > 0) {
          console.log('📧 Loading preferences from profile:', profile.notificationPreferences);
          console.log('📧 Profile notificationPreferences keys:', Object.keys(profile.notificationPreferences));
          
          // Merge with defaults to ensure complete structure
          const mergedPreferences = {
            email: {
              marketing: profile.notificationPreferences.email?.marketing ?? true,
              orderUpdates: profile.notificationPreferences.email?.orderUpdates ?? true,
              promotions: profile.notificationPreferences.email?.promotions ?? true,
              security: profile.notificationPreferences.email?.security ?? true
            },
            push: {
              orderUpdates: profile.notificationPreferences.push?.orderUpdates ?? true,
              promotions: profile.notificationPreferences.push?.promotions ?? true,
              newArtisans: profile.notificationPreferences.push?.newArtisans ?? true,
              nearbyOffers: profile.notificationPreferences.push?.nearbyOffers ?? true
            }
          };
          
          console.log('📧 Merged preferences with defaults:', mergedPreferences);
          setPreferences(mergedPreferences);
          setIsLoading(false);
          return;
        }
        
        // Load from backend if not in profile
        const response = await fetch('http://localhost:4000/api/notifications/preferences', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📧 Loaded preferences from API:', data.data);
          setPreferences(data.data || {});
        } else {
            // Use default preferences if loading fails
            setPreferences({
              email: {
                marketing: true,
                orderUpdates: true,
                promotions: true,
                security: true
              },
              push: {
                orderUpdates: true,
                promotions: true,
                newArtisans: true,
                nearbyOffers: true
              }
            });
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        // Use default preferences on error
        setPreferences({
          email: {
            marketing: true,
            orderUpdates: true,
            promotions: true,
            security: true
          },
          push: {
            orderUpdates: true,
            promotions: true,
            newArtisans: true,
            nearbyOffers: true
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we have a profile
    if (profile?._id) {
      loadPreferences();
    }
  }, [profile?._id, profile?.notificationPreferences, profile?.updatedAt]); // Reload when profile or preferences change

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure we always send complete notification preferences structure
      const completePreferences = {
        email: {
          marketing: preferences.email?.marketing ?? true,
          orderUpdates: preferences.email?.orderUpdates ?? true,
          promotions: preferences.email?.promotions ?? true,
          security: preferences.email?.security ?? true
        },
        push: {
          orderUpdates: preferences.push?.orderUpdates ?? true,
          promotions: preferences.push?.promotions ?? true,
          newArtisans: preferences.push?.newArtisans ?? true,
          nearbyOffers: preferences.push?.nearbyOffers ?? true
        }
      };
      
      console.log('📧 Saving complete preferences:', completePreferences);
      const result = await onSave({ notificationPreferences: completePreferences });
      console.log('📧 Preferences saved successfully:', result);
      
      // Update local state with the saved preferences from the response
      if (result?.data?.user?.notificationPreferences) {
        console.log('📧 Updating local state with server response:', result.data.user.notificationPreferences);
        setPreferences(result.data.user.notificationPreferences);
      } else {
        console.log('📧 No notificationPreferences in response, keeping current state');
      }
    } catch (error) {
      console.error('📧 Error saving preferences:', error);
    }
  };

  // Ensure preferences are properly structured - matches current database structure
  const defaultPreferences = {
    email: {
      marketing: true,           // Marketing emails
      orderUpdates: true,        // Order status changes
      promotions: true,          // Special offers and discounts
      security: true             // Account security alerts
    },
    push: {
      orderUpdates: true,        // Order status changes
      promotions: true,          // Special offers and discounts
      newArtisans: true,         // New artisan notifications
      nearbyOffers: true         // Nearby offers
    }
  };

  // Merge with defaults to ensure all keys exist
  const finalPreferences = {
    email: { ...defaultPreferences.email, ...(preferences.email || {}) },
    push: { ...defaultPreferences.push, ...(preferences.push || {}) }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
      
      <div className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div className="space-y-3">
            {Object.entries(finalPreferences.email || {}).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {key === 'marketing' && 'Receive marketing emails and newsletters'}
                    {key === 'orderUpdates' && 'Get notified about your order status changes'}
                    {key === 'promotions' && 'Receive special offers, discounts, and promotional updates'}
                    {key === 'security' && 'Get security alerts and account notifications'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    email: { ...finalPreferences.email, [key]: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Push Notifications</h4>
          <div className="space-y-3">
            {Object.entries(finalPreferences.push || {}).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <p className="text-xs text-gray-500">
                    {key === 'orderUpdates' && 'Real-time order notifications'}
                    {key === 'promotions' && 'Push notifications for offers and discounts'}
                    {key === 'newArtisans' && 'New artisan and business notifications'}
                    {key === 'nearbyOffers' && 'Local deals and nearby offers'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    push: { ...finalPreferences.push, [key]: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              </label>
            ))}
          </div>
        </div>

      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}

function PaymentTab({ profile, onSave, isSaving, safeRefreshUser }) {
  // Check if user is an artisan - check both role and userType for compatibility
  const isArtisan = profile.role === 'artisan' || profile.userType === 'artisan' || profile.artisan;
  
  // State for patrons (payment methods)
  const [paymentMethods, setPaymentMethods] = useState(() => {
    let methods = profile.paymentMethods;
    console.log('🔧 Initializing paymentMethods:', methods, 'Type:', typeof methods, 'IsArray:', Array.isArray(methods));
    
    // Handle nested paymentMethods structure
    if (methods && typeof methods === 'object' && methods.paymentMethods && Array.isArray(methods.paymentMethods)) {
      console.log('⚠️  Found nested paymentMethods structure, extracting array');
      methods = methods.paymentMethods;
    }
    
    // Ensure it's always an array
    if (Array.isArray(methods)) {
      return methods;
    } else if (methods && typeof methods === 'object') {
      // If it's an object but not an array, wrap it in an array
      console.log('⚠️  paymentMethods is an object, converting to array');
      return [methods];
    } else {
      return [];
    }
  });
  
  // State for artisans (bank information)
  const [bankInfo, setBankInfo] = useState(profile.artisan?.bankInfo || {
    accountHolderName: '',
    bankName: '',
    institutionNumber: '',
    transitNumber: '',
    accountNumber: '',
    accountType: 'checking' // checking or savings
  });
  
  // Update payment methods when profile changes
  useEffect(() => {
    if (!isArtisan) {
      console.log('🔄 PaymentTab: Profile payment methods updated:', profile.paymentMethods);
      
      let methods = profile.paymentMethods;
      console.log('🔧 Updating paymentMethods:', methods, 'Type:', typeof methods, 'IsArray:', Array.isArray(methods));
      
      // Handle nested paymentMethods structure
      if (methods && typeof methods === 'object' && methods.paymentMethods && Array.isArray(methods.paymentMethods)) {
        console.log('⚠️  Found nested paymentMethods structure, extracting array');
        methods = methods.paymentMethods;
      }
      
      // Ensure it's always an array
      if (Array.isArray(methods)) {
        setPaymentMethods(methods);
      } else if (methods && typeof methods === 'object') {
        console.log('⚠️  paymentMethods is an object, converting to array');
        setPaymentMethods([methods]);
      } else {
        setPaymentMethods([]);
      }
    } else {
      setBankInfo(profile.artisan?.bankInfo || {
        accountHolderName: '',
        bankName: '',
        institutionNumber: '',
        transitNumber: '',
        accountNumber: '',
        accountType: 'checking'
      });
    }
  }, [profile.paymentMethods, profile.artisan?.bankInfo, isArtisan]);

  // Update Stripe Connect status when profile changes
  useEffect(() => {
    if (profile.artisan?.stripeConnectStatus) {
      setStripeConnectStatus(profile.artisan.stripeConnectStatus);
    }
  }, [profile.artisan?.stripeConnectStatus]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit_card',
    cardNumber: '',  // Store full card number temporarily for validation
    last4: '',
    brand: '',
    expiryMonth: '',
    expiryYear: '',
    cardholderName: '',
    isDefault: false
  });

  const addPaymentMethod = async () => {
    // Validate all fields
    if (!newPaymentMethod.cardNumber) {
      toast.error('Please enter card number');
      return;
    }
    
    if (!newPaymentMethod.brand) {
      toast.error('Please select card brand');
      return;
    }
    
    if (!newPaymentMethod.expiryMonth || !newPaymentMethod.expiryYear) {
      toast.error('Please enter expiry date');
      return;
    }
    
    if (!newPaymentMethod.cardholderName) {
      toast.error('Please enter cardholder name');
      return;
    }
    
    try {
      // Validate and extract last 4 digits from full card number
      const cardDigitsOnly = newPaymentMethod.cardNumber.replace(/\D/g, '');
      
      // Validate card number length (typically 13-19 digits)
      if (cardDigitsOnly.length < 13 || cardDigitsOnly.length > 19) {
        toast.error('Invalid card number length. Card numbers are typically 13-19 digits.');
        return;
      }
      
      // Extract last 4 digits
      const last4Only = cardDigitsOnly.slice(-4);
      
      console.log('💳 Card validation:', {
        fullLength: cardDigitsOnly.length,
        last4: last4Only,
        brand: newPaymentMethod.brand
      });
      
      // Validate expiry date
      const currentYear = new Date().getFullYear();
      const expiryYear = parseInt(newPaymentMethod.expiryYear, 10);
      const expiryMonth = parseInt(newPaymentMethod.expiryMonth, 10);
      
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < (new Date().getMonth() + 1))) {
        toast.error('Card has expired');
        return;
      }
      
      // Convert string values to proper types for backend
      const paymentMethodToAdd = {
        type: newPaymentMethod.type,
        last4: last4Only,
        brand: newPaymentMethod.brand.toLowerCase(), // Ensure consistent lowercase
        expiryMonth: expiryMonth,
        expiryYear: expiryYear,
        cardholderName: newPaymentMethod.cardholderName.trim(),
        isDefault: paymentMethods.length === 0 ? true : newPaymentMethod.isDefault // First card is always default
      };
      
      console.log('💳 Adding payment method:', paymentMethodToAdd);
      
      // Create a clean array of payment methods for the backend
      const cleanPaymentMethods = paymentMethods.map(method => ({
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        cardholderName: method.cardholderName,
        isDefault: method.isDefault
      }));
      
      const updatedMethods = [...cleanPaymentMethods, paymentMethodToAdd];
      console.log('🔄 Adding payment method, data to save:', updatedMethods);
      
      // Auto-save the updated payment methods first
      await onSave(updatedMethods);
      
      // Only update local state if API call succeeds
      setPaymentMethods(updatedMethods);
      
      setNewPaymentMethod({
        type: 'credit_card',
        cardNumber: '',
        last4: '',
        brand: '',
        expiryMonth: '',
        expiryYear: '',
        cardholderName: '',
        isDefault: false
      });
      setShowAddForm(false);
      
      // Success toast is shown by handlePaymentMethodUpdate
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    }
  };

  const removePaymentMethod = async (idOrIndex) => {
    try {
      console.log('🔄 Removing payment method with ID/index:', idOrIndex);
      console.log('📊 All payment methods:', paymentMethods);
      console.log('📋 Payment method details:', paymentMethods.map((method, idx) => ({
        index: idx,
        id: method.id,
        _id: method._id,
        stripePaymentMethodId: method.stripePaymentMethodId,
        type: method.type,
        last4: method.last4,
        brand: method.brand
      })));
      
      // Try to find payment method by ID first, then by index
      let paymentMethodToRemove;
      let removalId = idOrIndex;
      
      // If it's a number, treat it as an index (for backward compatibility)
      if (typeof idOrIndex === 'number' || !isNaN(parseInt(idOrIndex))) {
        const index = parseInt(idOrIndex);
        paymentMethodToRemove = paymentMethods[index];
        if (!paymentMethodToRemove) {
          throw new Error('Payment method not found at index ' + index);
        }
        removalId = paymentMethodToRemove.id || paymentMethodToRemove._id || index.toString();
      } else {
        // Try to find by ID
        paymentMethodToRemove = paymentMethods.find(method => 
          method.id === idOrIndex || method._id === idOrIndex
        );
        if (!paymentMethodToRemove) {
          throw new Error('Payment method not found with ID ' + idOrIndex);
        }
        removalId = idOrIndex;
      }
      
      console.log('🔍 Payment method to remove:', paymentMethodToRemove);
      console.log('🆔 Using removal ID:', removalId);
      
      // Use the ID for backend deletion
      await profileService.deletePaymentMethod(removalId);
      console.log('✅ Payment method deleted from backend');
      
      // Update local state - remove the payment method by ID
      const updatedMethods = paymentMethods.filter(method => 
        method.id !== removalId && method._id !== removalId
      );
      setPaymentMethods(updatedMethods);
      
      // Update the profile with the new payment methods array
      const cleanPaymentMethods = updatedMethods.map(method => ({
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        cardholderName: method.cardholderName,
        isDefault: method.isDefault,
        stripePaymentMethodId: method.stripePaymentMethodId
      }));
      
      // Update the profile - pass the array directly, not wrapped in an object
      await onSave(cleanPaymentMethods);
      
      // Only update local state if API call succeeds
      setPaymentMethods(updatedMethods);
      
      // Success toast is shown by handlePaymentMethodUpdate
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast.error('Failed to remove payment method');
    }
  };

  // Local state for Stripe Connect setup
  const [isSettingUpStripe, setIsSettingUpStripe] = useState(false);
  const [stripeConnectStatus, setStripeConnectStatus] = useState(profile.artisan?.stripeConnectStatus || 'not_setup');
  
  // Local state for editing bank info
  const [isEditingBankInfo, setIsEditingBankInfo] = useState(false);

  // Stripe Connect setup function
  const setupStripeConnect = async () => {
    try {
      setIsSettingUpStripe(true);
      
      const response = await fetch(`${config.API_URL}/profile/artisan/stripe-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Stripe Connect setup completed! You will receive payouts automatically.');
        // Update local state to reflect Stripe Connect is now active
        setStripeConnectStatus('active');
        // Refresh profile to get updated Stripe Connect status
        if (safeRefreshUser) {
          await safeRefreshUser();
        }
      } else {
        toast.error(result.message || 'Failed to setup Stripe Connect');
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Failed to setup Stripe Connect');
    } finally {
      setIsSettingUpStripe(false);
    }
  };

  // Bank info functions for artisans
  const saveBankInfo = async () => {
    try {
      // Validate Canadian bank account format
      if (!bankInfo.accountHolderName) {
        toast.error('Please enter account holder name');
        return;
      }
      
      if (!bankInfo.institutionNumber || bankInfo.institutionNumber.length !== 3) {
        toast.error('Institution number must be 3 digits');
        return;
      }
      
      if (!bankInfo.transitNumber || bankInfo.transitNumber.length !== 5) {
        toast.error('Transit number must be 5 digits');
        return;
      }
      
      if (!bankInfo.accountNumber || bankInfo.accountNumber.length < 7) {
        toast.error('Please enter a valid account number');
        return;
      }

      
      // Save bank info to artisan profile
      await profileService.updateArtisanProfile({
        bankInfo: {
          accountHolderName: bankInfo.accountHolderName.trim(),
          bankName: bankInfo.bankName.trim(),
          institutionNumber: bankInfo.institutionNumber.trim(),
          transitNumber: bankInfo.transitNumber.trim(),
          accountNumber: bankInfo.accountNumber.trim(), // Backend will encrypt this
          accountType: bankInfo.accountType,
          lastUpdated: new Date()
        }
      });
      
      // Refresh profile to get updated data
      await safeRefreshUser();
      
      // Reset editing state
      setIsEditingBankInfo(false);
      
      toast.success('Bank information saved successfully');
    } catch (error) {
      console.error('Error saving bank info:', error);
      toast.error('Failed to save bank information');
    }
  };

  // If artisan, show bank information form
  if (isArtisan) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Bank Information for Payouts</h4>
              <p className="text-sm text-blue-700">
                Enter your Canadian bank account details to receive weekly payouts. Your information is securely encrypted and used only for transferring your earnings.
              </p>
            </div>
          </div>
        </div>

        {/* Bank Form - Only show if no bank info exists or when editing */}
        {(!profile.artisan?.bankInfo?.accountNumber || isEditingBankInfo) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bank Account Details</h3>
              {isEditingBankInfo && (
                <button
                  onClick={() => setIsEditingBankInfo(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          
          <div className="space-y-4">
            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankInfo.accountHolderName}
                onChange={(e) => setBankInfo({ ...bankInfo, accountHolderName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Name as it appears on your bank account</p>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={bankInfo.bankName}
                onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="TD Canada Trust, RBC, Scotiabank, etc."
              />
            </div>

            {/* Institution Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankInfo.institutionNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setBankInfo({ ...bankInfo, institutionNumber: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                  placeholder="001"
                  maxLength="3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">3-digit code (e.g., 001 for BMO)</p>
              </div>

              {/* Transit Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transit Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankInfo.transitNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setBankInfo({ ...bankInfo, transitNumber: value });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                  placeholder="12345"
                  maxLength="5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">5-digit branch code</p>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bankInfo.accountNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setBankInfo({ ...bankInfo, accountNumber: value });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                placeholder="1234567890"
                maxLength="20"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Your bank account number (7-12 digits typically)</p>
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                value={bankInfo.accountType}
                onChange={(e) => setBankInfo({ ...bankInfo, accountType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="checking">Checking Account</option>
                <option value="savings">Savings Account</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={saveBankInfo}
                disabled={isSaving}
                className="w-full px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Bank Information'}
              </button>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start">
                <ShieldCheckIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">Secure & Encrypted</p>
                  <p>Your bank information is encrypted and stored securely. It will only be used for weekly payout transfers to your account.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Current Bank Info Display (if saved) */}
        {profile.artisan?.bankInfo && profile.artisan.bankInfo.accountNumber && !isEditingBankInfo && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-accent mt-0.5 mr-2" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900 mb-2">Bank Account Configured</p>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="font-medium">Bank:</span> {profile.artisan.bankInfo.bankName || 'Not specified'}</p>
                        <p><span className="font-medium">Account Holder:</span> {profile.artisan.bankInfo.accountHolderName}</p>
                        <p><span className="font-medium">Account:</span> ****{profile.artisan.bankInfo.accountNumber?.slice(-4)}</p>
                        <p><span className="font-medium">Institution:</span> {profile.artisan.bankInfo.institutionNumber}</p>
                        <p><span className="font-medium">Transit:</span> {profile.artisan.bankInfo.transitNumber}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingBankInfo(true)}
                    className="ml-4 px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

        {/* Stripe Connect Setup */}
        {profile.artisan?.bankInfo && profile.artisan.bankInfo.accountNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <CreditCardIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Enable Automatic Payouts</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Connect your bank account with Stripe to enable automatic weekly payouts of your earnings.
                </p>
                    <button
                      onClick={setupStripeConnect}
                      disabled={isSettingUpStripe || stripeConnectStatus === 'active'}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        stripeConnectStatus === 'active'
                          ? 'bg-green-600 text-white cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {stripeConnectStatus === 'active' 
                        ? '✅ Stripe Connect Active' 
                        : isSettingUpStripe 
                          ? 'Setting up...' 
                          : 'Setup Stripe Connect'
                      }
                    </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Patron payment methods UI (existing code)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
        >
          <PlusIcon className="w-4 h-4 inline mr-1" />
          Add Payment Method
        </button>
      </div>

      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium mb-4">Add New Payment Method</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Card Number *</label>
              <input
                type="text"
                value={newPaymentMethod.cardNumber}
                onChange={(e) => {
                  // Format card number with spaces every 4 digits
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
                  
                  // Auto-detect card brand based on first digits
                  let detectedBrand = newPaymentMethod.brand;
                  if (value.length >= 2) {
                    if (value.startsWith('4')) {
                      detectedBrand = 'visa';
                    } else if (value.startsWith('5')) {
                      detectedBrand = 'mastercard';
                    } else if (value.startsWith('34') || value.startsWith('37')) {
                      detectedBrand = 'amex';
                    } else if (value.startsWith('6')) {
                      detectedBrand = 'discover';
                    }
                  }
                  
                  setNewPaymentMethod({ 
                    ...newPaymentMethod, 
                    cardNumber: formatted,
                    brand: detectedBrand
                  });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 font-mono"
                placeholder="1234 5678 9012 3456"
                maxLength="23"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter full card number (only last 4 digits will be stored for security)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Card Brand * 
                {newPaymentMethod.brand && (
                  <span className="ml-2 text-xs text-green-600">(Auto-detected)</span>
                )}
              </label>
              <select
                value={newPaymentMethod.brand}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, brand: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              >
                <option value="">Select brand</option>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">Amex</option>
                <option value="discover">Discover</option>
                <option value="other">Other</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Card brand is auto-detected from card number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Month *</label>
              <input
                type="number"
                value={newPaymentMethod.expiryMonth}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                min="1"
                max="12"
                placeholder="MM"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Year *</label>
              <input
                type="number"
                value={newPaymentMethod.expiryYear}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                min={new Date().getFullYear()}
                placeholder="YYYY"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Cardholder Name *</label>
              <input
                type="text"
                value={newPaymentMethod.cardholderName}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardholderName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Name on card"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="button"
              onClick={addPaymentMethod}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Add Card
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(() => {
        // Safety check - ensure paymentMethods is always an array
        const methods = paymentMethods;
        console.log('🔍 Before map - paymentMethods:', methods, 'Type:', typeof methods, 'IsArray:', Array.isArray(methods));
        
        if (!Array.isArray(methods)) {
          console.error('❌ paymentMethods is not an array:', methods);
          return <div className="text-red-600 p-4">Error: Payment methods data is invalid</div>;
        }
        
        return methods.map((method, index) => (
        <div key={method._id || `payment-${index}`} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="w-6 h-6 text-gray-400" />
              <div>
                <p className="font-medium capitalize">
                  {method.brand} •••• {method.last4}
                </p>
                <p className="text-sm text-gray-600">
                  Expires {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                </p>
                {method.cardholderName && (
                  <p className="text-xs text-gray-500">
                    {method.cardholderName}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removePaymentMethod(method.id || method._id || index)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        ));
      })()}

      {paymentMethods.length === 0 && (
        <div className="text-center py-8">
          <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">No Payment Methods</h4>
          <p className="text-gray-600">Add a payment method to get started.</p>
        </div>
      )}
    </div>
  );
}

function SecurityTab({ profile, onSave, isSaving }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await profileService.changePassword({ currentPassword, newPassword });
      
      // Clear profile cache
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.delete(cacheKey);
        console.log('🧹 Cleared profile cache after password change');
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
      
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <h4 className="font-medium text-gray-900">Change Password</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
          >
            {isChangingPassword ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsTab({ profile, onSave, isSaving }) {
  const [settings, setSettings] = useState(profile?.accountSettings || {});

  // Update settings when profile changes
  useEffect(() => {
    console.log('⚙️ SettingsTab: Profile updated, syncing settings:', profile?.accountSettings);
    if (profile && typeof profile === 'object') {
      setSettings(profile.accountSettings || {
        language: 'en',
        currency: 'CAD'
      });
    }
  }, [profile, profile?.accountSettings, profile?.updatedAt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ accountSettings: settings });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Language</label>
          <select
            value={settings.language || 'en'}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            value={settings.currency || 'CAD'}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          >
            <option value="CAD">Canadian Dollar (CAD)</option>
            <option value="USD">US Dollar (USD)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

