import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  StarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { paymentService } from '../services/paymentService';
import { favoriteService } from '../services/favoriteService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import { useOptimizedEffect, useAsyncOperation } from '../hooks/useOptimizedEffect';
import { OverviewTab, OperationsTab, HoursTab, DeliveryTab, SetupTab } from './ArtisanTabs';
import { PRODUCT_CATEGORIES } from '../data/productReference';

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  // Different tabs for different user types
  const patronTabs = [
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'addresses', name: 'Delivery Addresses', icon: MapPinIcon },
    { id: 'favorites', name: 'Favorite Artisans', icon: HeartIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'settings', name: 'Account Settings', icon: CogIcon }
  ];

  const artisanTabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'operations', name: 'Operations', icon: CogIcon },
    { id: 'hours', name: 'Artisan Hours', icon: MapPinIcon },
    { id: 'delivery', name: 'Delivery', icon: MapPinIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  const setupTabs = [
    { id: 'setup', name: 'Setup Profile', icon: UserIcon },
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  const [activeTab, setActiveTab] = useState('personal');
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArtisan, setIsArtisan] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tabs, setTabs] = useState(patronTabs);
  const [favoriteArtisans, setFavoriteArtisans] = useState([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const isMountedRef = useRef(true);

  // Use user from AuthContext as profile
  const profile = user;

  // Memoize tab determination to prevent unnecessary re-renders
  const determineTabs = useMemo(() => {
    if (!profile) return patronTabs;
    
    // Map all possible roles to appropriate tabs
    switch (profile.role) {
      case 'artisan':
      case 'producer':
      case 'food_maker':
        return artisanTabs;
      case 'admin':
        return patronTabs; // Admins get patron tabs for now
      case 'patron':
      case 'customer':
      case 'buyer':
      default:
        return patronTabs;
    }
  }, [profile?.role]);

  // Simplified profile loading using AuthContext
  const loadProfile = async () => {
    if (!user) {
      try {
        await refreshUser();
      } catch (error) {
        console.error('Error refreshing user:', error);
        toast.error('Failed to load profile');
      }
    }
  };

  // Load artisan profile data
  const loadArtisanProfile = async () => {
    try {
      console.log('🔄 Loading artisan profile...');
      console.log('🔄 User role:', profile?.role);
      console.log('🔄 User ID:', profile?._id);
      const artisanData = await profileService.getArtisanProfile();
      console.log('✅ Artisan profile loaded:', artisanData);
      console.log('✅ Artisan profile ID:', artisanData?._id);
      console.log('✅ Artisan profile type:', artisanData?.type);
      
      if (isMountedRef.current) {
        setArtisanProfile(artisanData);
        console.log('✅ Artisan profile state updated');
      }
    } catch (error) {
      console.log('ℹ️ No artisan profile found or user is not artisan:', error.message);
      console.log('ℹ️ Error response:', error.response?.data);
      console.log('ℹ️ Error status:', error.response?.status);
      console.log('ℹ️ Error details:', error.response?.data?.message);
      // This is normal for new artisans who haven't created their profile yet
    }
  };

  // Simplified useEffect for profile loading
  useEffect(() => {
    if (location.pathname === '/profile' && !user) {
      loadProfile();
    }
  }, [location.pathname, user]);

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
      setTabs(determineTabs);
      setIsArtisan(profile.role === 'artisan' || profile.role === 'producer' || profile.role === 'food_maker');
      setNeedsSetup(profile.role === 'setup');
    }
  }, [profile, determineTabs]);

  // Force refresh profile data when payment tab is accessed
  useEffect(() => {
    if (activeTab === 'payment' && profile) {
      console.log('🔄 Payment tab accessed, ensuring fresh profile data');
      // Clear cache to force fresh data load
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.delete(cacheKey);
        console.log('🗑️ Cleared profile cache for fresh data');
      }
    }
  }, [activeTab, profile]);

  // Preload profile data when component mounts
  useEffect(() => {
    preloadProfile();
  }, []);
  
  // Listen for storage changes (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        console.log('🔄 Token changed in storage, reloading profile...');
        if (e.newValue) {
          loadProfile();
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
        if (token && (!profile || !artisanProfile)) {
          console.log('🔄 Profile data missing, reloading...');
          loadProfile();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, profile, artisanProfile]);

  // Memoized save handler
  const handleSave = useMemo(() => {
    return async (data) => {
      setIsSaving(true);
      try {
        const updatedProfile = await profileService.updateProfile(data);
        setProfile(updatedProfile);
        
        // Update cache
        const token = localStorage.getItem('token');
        if (token) {
          const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
          cacheService.set(cacheKey, updatedProfile, CACHE_TTL.USER_PROFILE);
        }
        
        toast.success('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        throw error;
      } finally {
        setIsSaving(false);
      }
    };
  }, []);

  // Handle address updates
  const handleAddressUpdate = async (addresses) => {
    try {
      setIsSaving(true);
      const updatedProfile = await profileService.updateAddresses(addresses);
      setProfile(updatedProfile);
      
      // Update cache
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.set(cacheKey, updatedProfile, CACHE_TTL.USER_PROFILE);
      }
      
      // Dispatch profile update event for cart and other components
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { profile: updatedProfile, updatedFields: ['addresses'] } 
      }));
      
      toast.success('Addresses updated successfully!');
    } catch (error) {
      console.error('Error updating addresses:', error);
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
      setProfile(updatedProfile);
      
      // Clear and update cache to ensure fresh data
      const token = localStorage.getItem('token');
      if (token) {
        const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${token.slice(-10)}`;
        cacheService.delete(cacheKey); // Clear old cache
        cacheService.set(cacheKey, updatedProfile, CACHE_TTL.USER_PROFILE);
        console.log('💾 Cleared and updated cache with new profile data');
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
      
      toast.success('Business hours updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan hours:', error);
      toast.error('Failed to update business hours');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle artisan delivery updates
  const handleArtisanDeliveryUpdate = async (deliveryData) => {
    try {
      console.log('🔄 Updating artisan delivery options:', deliveryData);
      setIsSaving(true);
      const updatedArtisanProfile = await profileService.updateArtisanDelivery(deliveryData);
      console.log('✅ Artisan delivery options updated:', updatedArtisanProfile);
      setArtisanProfile(updatedArtisanProfile);
      
      toast.success('Delivery options updated successfully!');
    } catch (error) {
      console.error('❌ Error updating artisan delivery options:', error);
      toast.error('Failed to update delivery options');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    console.log('🔍 Profile loading state:', { isLoading, profile: !!profile });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
          <p className="text-sm text-gray-500 mt-2">Debug: Component loading</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load profile</p>
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
        return <OperationsTab profile={combinedProfile} onSave={handleArtisanSave} isSaving={isSaving} />;
      case 'hours':
        return <HoursTab profile={combinedProfile} onSave={handleArtisanHoursUpdate} isSaving={isSaving} />;
      case 'delivery':
        return <DeliveryTab profile={combinedProfile} onSave={handleArtisanDeliveryUpdate} isSaving={isSaving} />;
      
      // Shared tabs
      case 'personal':
        return <PersonalInfoTab profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'addresses':
        return <AddressesTab profile={profile} onSave={handleAddressUpdate} isSaving={isSaving} />;
      case 'favorites':
        return <FavoritesTab favoriteArtisans={favoriteArtisans} isLoading={isLoadingFavorites} />;
      case 'notifications':
        return <NotificationsTab profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'payment':
        return <PaymentTab profile={profile} onSave={handlePaymentMethodUpdate} isSaving={isSaving} />;
      case 'security':
        return <SecurityTab profile={profile} onSave={handleSave} isSaving={isSaving} />;
      case 'settings':
        return <SettingsTab profile={profile} onSave={handleSave} isSaving={isSaving} />;
      
      // Setup tab
      case 'setup':
        return <SetupTab profile={profile} onSave={handleSave} isSaving={isSaving} setActiveTab={setActiveTab} />;
      
      default:
        return <PersonalInfoTab profile={profile} onSave={handleSave} isSaving={isSaving} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full mb-6 shadow-lg">
            <UserIcon className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">My Profile</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isArtisan 
              ? "Manage your artisan business profile, operations, and customer information"
              : "Manage your account settings, preferences, and personal information"
            }
          </p>
        </div>

        {/* Enhanced Profile Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center shadow-lg">
              <UserIcon className="w-10 h-10 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-lg text-gray-600 mb-1">{profile.email}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                <span className="capitalize">{profile.role}</span>
                {isArtisan && (
                  <span className="ml-2 text-xs bg-orange-200 px-2 py-0.5 rounded-full">
                    Business Owner
                  </span>
                )}
              </div>
            </div>
            {isArtisan && (
              <div className="text-right">
                <div className="text-sm text-gray-500">Business Status</div>
                <div className="text-lg font-semibold text-green-600">Active</div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
            <nav className="flex space-x-1 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-6 font-medium text-sm rounded-t-lg transition-all duration-200 flex items-center space-x-2
                    ${activeTab === tab.id
                      ? 'bg-white text-orange-600 shadow-sm border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
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
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || ''
  });

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
  const [addresses, setAddresses] = useState(profile.addresses || []);

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
  const [preferences, setPreferences] = useState(profile.notificationPreferences || {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ notificationPreferences: preferences });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div className="space-y-3">
            {Object.entries(preferences.email || {}).map(([key, value]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    email: { ...preferences.email, [key]: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
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

function PaymentTab({ profile, onSave, isSaving }) {
  const [paymentMethods, setPaymentMethods] = useState(profile.paymentMethods || []);
  
  // Update payment methods when profile changes
  useEffect(() => {
    console.log('🔄 PaymentTab: Profile payment methods updated:', profile.paymentMethods);
    setPaymentMethods(profile.paymentMethods || []);
  }, [profile.paymentMethods]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit_card',
    last4: '',
    brand: '',
    expiryMonth: '',
    expiryYear: '',
    cardholderName: '',
    isDefault: false
  });

  const addPaymentMethod = async () => {
    if (!newPaymentMethod.last4 || !newPaymentMethod.brand) {
      toast.error('Please fill in all required fields');
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
      // Convert string values to proper types for backend
      const paymentMethodToAdd = {
        type: newPaymentMethod.type,
        last4: newPaymentMethod.last4,
        brand: newPaymentMethod.brand,
        expiryMonth: parseInt(newPaymentMethod.expiryMonth, 10),
        expiryYear: parseInt(newPaymentMethod.expiryYear, 10),
        cardholderName: newPaymentMethod.cardholderName,
        isDefault: newPaymentMethod.isDefault
      };
      
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

  const removePaymentMethod = async (id) => {
    try {
      console.log('🔄 Removing payment method with id:', id);
      const updatedMethods = paymentMethods.filter(method => method._id !== id);
      console.log('📊 Updated methods after removal:', updatedMethods);
      
      // Create a clean array of payment methods for the backend
      const cleanPaymentMethods = updatedMethods.map(method => ({
        type: method.type,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        cardholderName: method.cardholderName,
        isDefault: method.isDefault
      }));
      
      // Auto-save the updated payment methods first
      await onSave(cleanPaymentMethods);
      
      // Only update local state if API call succeeds
      setPaymentMethods(updatedMethods);
      
      // Success toast is shown by handlePaymentMethodUpdate
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast.error('Failed to remove payment method');
    }
  };



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
            <div>
              <label className="block text-sm font-medium text-gray-700">Card Number *</label>
              <input
                type="text"
                value={newPaymentMethod.last4}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, last4: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="**** **** **** ****"
                maxLength="19"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Card Brand *</label>
              <select
                value={newPaymentMethod.brand}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, brand: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              >
                <option value="">Select brand</option>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="discover">Discover</option>
              </select>
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

      {paymentMethods.map((method) => (
        <div key={method._id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="w-6 h-6 text-gray-400" />
              <div>
                <p className="font-medium">
                  {method.brand} •••• {method.last4}
                </p>
                <p className="text-sm text-gray-600">
                  Expires {method.expiryMonth}/{method.expiryYear}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removePaymentMethod(method._id)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    try {
      await profileService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
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
            disabled={isSaving}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {isSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsTab({ profile, onSave, isSaving }) {
  const [settings, setSettings] = useState(profile.accountSettings || {});

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

