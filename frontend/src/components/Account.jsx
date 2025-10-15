import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon, 
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CogIcon,
  ArrowRightIcon,
  PlusIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CameraIcon,
  ArrowLeftIcon,
  HeartIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { getProfile, logoutUser } from '../services/authservice';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import toast from 'react-hot-toast';

export default function Account() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Mock data for Patron dashboard
  const [stats] = useState({
    totalOrders: 8,
    totalSpent: 156.75,
    favoriteArtisans: 5,
    averageRating: 4.9
  });

  const [recentOrders] = useState([
    {
      id: 1,
      artisan: "Green Valley Farm",
      items: ["Organic Tomatoes", "Fresh Basil", "Local Honey"],
      total: 28.50,
      status: "delivered",
      date: "2024-01-15"
    },
    {
      id: 2,
      artisan: "Artisan Bread Co.",
      items: ["Sourdough Bread", "Croissants"],
      total: 18.00,
      status: "preparing",
      date: "2024-01-14"
    },
    {
      id: 3,
      artisan: "Sweet Honey Haven",
      items: ["Wildflower Honey", "Lavender Honey"],
      total: 24.75,
      status: "delivered",
      date: "2024-01-13"
    }
  ]);

  const [favoriteArtisans] = useState([
    {
      id: 1,
      name: "Green Valley Farm",
      type: "farm",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
      rating: 4.8,
      products: 12
    },
    {
      id: 2,
      name: "Artisan Bread Co.",
      type: "bakery",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      rating: 4.9,
      products: 8
    },
    {
      id: 3,
      name: "Sweet Honey Haven",
      type: "honey_producer",
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      rating: 4.7,
      products: 5
    }
  ]);

  // Tabs based on user role
  const getTabs = () => {
    const isArtisan = user?.role === 'artisan';
    
    if (isArtisan) {
      return [
        { id: 'dashboard', name: t('nav.dashboard'), icon: UserIcon, action: () => navigate('/dashboard') },
        { id: 'personal', name: t('account.personalInfo'), icon: UserIcon },
        { id: 'orders', name: t('nav.myOrders'), icon: ShoppingBagIcon },
        { id: 'notifications', name: t('account.notifications'), icon: BellIcon },
        { id: 'payment', name: t('account.paymentMethods'), icon: CreditCardIcon },
        { id: 'security', name: t('account.security'), icon: ShieldCheckIcon },
        { id: 'settings', name: t('account.settings'), icon: CogIcon }
      ];
    } else {
      return [
        { id: 'dashboard', name: t('nav.dashboard'), icon: UserIcon },
        { id: 'personal', name: t('account.personalInfo'), icon: UserIcon },
        { id: 'addresses', name: t('account.addresses'), icon: MapPinIcon },
        { id: 'orders', name: t('nav.myOrders'), icon: ShoppingBagIcon },
        { id: 'favorites', name: t('account.favoriteArtisans'), icon: HeartIcon },
        { id: 'notifications', name: t('account.notifications'), icon: BellIcon },
        { id: 'payment', name: t('account.paymentMethods'), icon: CreditCardIcon },
        { id: 'security', name: t('account.security'), icon: ShieldCheckIcon },
        { id: 'settings', name: t('account.settings'), icon: CogIcon }
      ];
    }
  };

  const tabs = getTabs();

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getProfile();
        setUser(userData);
        
        // If user is an artisan and trying to access dashboard, redirect to main dashboard
        if (userData.role === 'artisan') {
          const urlParams = new URLSearchParams(location.search);
          const tabParam = urlParams.get('tab');
          if (tabParam === 'dashboard') {
            navigate('/dashboard');
            return;
          }
        }
      } catch (err) {
        toast.error(t('auth.sessionExpired'));
        logoutUser();
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [navigate, location.search]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.map(t => t.id).includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);


  const handleLogout = () => {
    logoutUser();
    toast.success(t('account.loggedOutSuccess'));
    navigate("/");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('account.title')}</h1>
              <p className="text-gray-600">{t('account.subtitle')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>{t('account.signOut')}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.action) {
                        tab.action();
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-stone-500 hover:text-secondary hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && user && user.role === 'artisan' && (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-2">{t('account.artisanDashboardAccess')}</h3>
                <p className="text-gray-600 mb-4">{t('account.artisanDashboardDescription')}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {t('account.goToArtisanDashboard')}
                </button>
              </div>
            )}
            {activeTab === 'dashboard' && user && user.role !== 'artisan' && (
              <DashboardTab user={user} stats={stats} recentOrders={recentOrders} favoriteArtisans={favoriteArtisans} getStatusColor={getStatusColor} t={t} />
            )}
            {activeTab === 'personal' && (
              <PersonalInfoTab user={user} t={t} />
            )}
            {activeTab === 'addresses' && (
              <AddressesTab user={user} t={t} />
            )}
            {activeTab === 'orders' && (
              <OrdersTab recentOrders={recentOrders} getStatusColor={getStatusColor} t={t} />
            )}
            {activeTab === 'favorites' && (
              <FavoritesTab favoriteArtisans={favoriteArtisans} t={t} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab user={user} t={t} />
            )}
            {activeTab === 'payment' && (
              <PaymentTab user={user} t={t} />
            )}
            {activeTab === 'security' && (
              <SecurityTab t={t} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab user={user} t={t} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ user, stats, recentOrders, favoriteArtisans, getStatusColor, t }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          {t('account.welcomeBack', { name: user.firstName })}
        </h2>
        <p className="text-gray-600">
          {t('account.dashboardSubtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ShoppingBagIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('account.totalOrders')}</p>
              <p className="text-2xl font-bold text-stone-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCardIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('account.totalSpent')}</p>
              <p className="text-2xl font-bold text-stone-900">${stats.totalSpent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HeartIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('account.favoriteArtisans')}</p>
              <p className="text-2xl font-bold text-stone-900">{stats.favoriteArtisans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <StarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('account.avgRating')}</p>
              <p className="text-2xl font-bold text-stone-900">{stats.averageRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-stone-900">{t('account.recentOrders')}</h3>
        </div>
        <div className="divide-y divide-stone-200">
          {recentOrders.map((order) => (
            <div key={order.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-stone-900">{order.artisan}</h4>
                  <p className="text-sm text-stone-500">{order.items.join(', ')}</p>
                  <p className="text-sm text-stone-500">{order.date}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-medium text-stone-900">${order.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Artisans */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-stone-900">{t('account.favoriteArtisans')}</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteArtisans.map((artisan) => (
              <div key={artisan.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <img
                  src={getImageUrl(artisan.image, { width: 48, height: 48, quality: 80 })}
                  alt={artisan.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                  <BuildingStorefrontIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-stone-900">{artisan.name}</h4>
                  <p className="text-xs text-stone-500 capitalize">{artisan.type.replace('_', ' ')}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <StarIcon className="w-3 h-3 text-primary-400" />
                    <span className="text-xs text-gray-600">{artisan.metrics?.rating || 0}</span>
                    <span className="text-xs text-stone-500">•</span>
                    <span className="text-xs text-stone-500">{artisan.products} products</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Personal Info Tab Component
function PersonalInfoTab({ user, t }) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update functionality
    toast.success(t('profile.profileUpdated'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">{t('account.personalInfo')}</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('auth.firstName')}</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('auth.lastName')}</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('common.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('common.phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn-primary">
              {t('common.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Addresses Tab Component
function AddressesTab({ user, t }) {
  const [addresses, setAddresses] = useState(user.addresses || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: 'home',
    label: '',
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const handleAddAddress = (e) => {
    e.preventDefault();
    const address = {
      id: Date.now(),
      ...newAddress
    };
    setAddresses([...addresses, address]);
    setNewAddress({
      type: 'home',
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: ''
    });
    setShowAddForm(false);
    toast.success(t('account.addressAdded'));
  };

  const handleDeleteAddress = (id) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast.success(t('account.addressRemoved'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">{t('account.addresses')}</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary btn-small"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('account.addAddress')}
        </button>
      </div>

      {/* Add Address Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-stone-900 mb-4">{t('account.addNewAddress')}</h4>
          <form onSubmit={handleAddAddress} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('account.addressType')}</label>
                <select
                  value={newAddress.type}
                  onChange={(e) => setNewAddress({...newAddress, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="home">{t('account.home')}</option>
                  <option value="work">{t('account.work')}</option>
                  <option value="other">{t('account.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('account.label')}</label>
                <input
                  type="text"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., My House, Office"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('account.streetAddress')}</label>
              <input
                type="text"
                required
                value={newAddress.street}
                onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('common.city')}</label>
                <input
                  type="text"
                  required
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('common.province')}</label>
                <input
                  type="text"
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">{t('common.postalCode')}</label>
                <input
                  type="text"
                  required
                  value={newAddress.zipCode}
                  onChange={(e) => setNewAddress({...newAddress, zipCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                {t('account.addAddress')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      {addresses.length > 0 ? (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="w-5 h-5 text-stone-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-stone-900 capitalize">{address.type}</span>
                    {address.label && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="text-sm text-gray-600">{address.label}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.street}, {address.city}, {address.state} {address.zipCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAddress(address.id)}
                className="text-red-500 hover:text-red-700"
              >
                {t('account.remove')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-stone-500">
          <MapPinIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>{t('account.noAddressesYet')}</p>
          <p className="text-sm">{t('account.addAddressesHelp')}</p>
        </div>
      )}
    </div>
  );
}

// Orders Tab Component
function OrdersTab({ recentOrders, getStatusColor, t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{t('orders.title')}</h3>
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="divide-y divide-stone-200">
          {recentOrders.map((order) => (
            <div key={order.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-stone-900">{order.artisan}</h4>
                  <p className="text-sm text-stone-500">{order.items.join(', ')}</p>
                  <p className="text-sm text-stone-500">{order.date}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-medium text-stone-900">${order.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Favorites Tab Component
function FavoritesTab({ favoriteArtisans, t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{t('account.favoriteArtisans')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteArtisans.map((artisan) => (
          <div key={artisan.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <img
                src={getImageUrl(artisan.image, { width: 400, height: 192, quality: 80 })}
                alt={artisan.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                <BuildingStorefrontIcon className="w-16 h-16 text-gray-400" />
              </div>
              <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                <HeartIcon className="w-5 h-5 text-red-500" />
              </button>
            </div>
            <div className="p-4">
              <h4 className="text-lg font-medium text-stone-900 mb-2">{artisan.name}</h4>
              <p className="text-sm text-stone-500 capitalize mb-3">{artisan.type.replace('_', ' ')}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <StarIcon className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-gray-600">{artisan.metrics?.rating || 0}</span>
                  <span className="text-sm text-stone-500">•</span>
                  <span className="text-sm text-stone-500">{artisan.products} products</span>
                </div>
                <button className="btn-primary btn-small">
                  {t('account.visit')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ user, t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{t('account.notifications')}</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.orderNotifications')}</h4>
            <p className="text-sm text-stone-500">{t('account.orderNotificationsDesc')}</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.newProducts')}</h4>
            <p className="text-sm text-stone-500">{t('account.newProductsDesc')}</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.communityEvents')}</h4>
            <p className="text-sm text-stone-500">{t('account.communityEventsDesc')}</p>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.seasonalOffers')}</h4>
            <p className="text-sm text-stone-500">{t('account.seasonalOffersDesc')}</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
      </div>
    </div>
  );
}

// Payment Tab Component
function PaymentTab({ user, t }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">{t('account.paymentMethods')}</h3>
        <button className="btn-primary btn-small">
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('account.addPaymentMethod')}
        </button>
      </div>
      <div className="text-center py-8 text-stone-500">
        <CreditCardIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
        <p>{t('account.noPaymentMethods')}</p>
        <p className="text-sm">{t('account.addPaymentMethodHelp')}</p>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab({ t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{t('account.security')}</h3>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-stone-900 mb-2">{t('account.changePassword')}</h4>
          <div className="space-y-3">
            <input
              type="password"
              placeholder={t('account.currentPassword')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <input
              type="password"
              placeholder={t('account.newPassword')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <input
              type="password"
              placeholder={t('account.confirmNewPassword')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button className="btn-primary">
              {t('account.updatePassword')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ user, t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{t('account.settings')}</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.language')}</h4>
            <p className="text-sm text-stone-500">English</p>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option>English</option>
            <option>French</option>
            <option>Spanish</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.currency')}</h4>
            <p className="text-sm text-stone-500">US Dollar (USD)</p>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option>USD</option>
            <option>CAD</option>
            <option>EUR</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">{t('account.twoFactorAuth')}</h4>
            <p className="text-sm text-stone-500">{t('account.twoFactorAuthDesc')}</p>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
      </div>
    </div>
  );
}
