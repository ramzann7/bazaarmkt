import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import toast from 'react-hot-toast';

export default function Account() {
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
        { id: 'dashboard', name: 'Dashboard', icon: UserIcon, action: () => navigate('/dashboard') },
        { id: 'personal', name: 'Personal Info', icon: UserIcon },
        { id: 'orders', name: 'My Orders', icon: ShoppingBagIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
        { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
        { id: 'settings', name: 'Account Settings', icon: CogIcon }
      ];
    } else {
      return [
        { id: 'dashboard', name: 'Dashboard', icon: UserIcon },
        { id: 'personal', name: 'Personal Info', icon: UserIcon },
        { id: 'addresses', name: 'Delivery Addresses', icon: MapPinIcon },
        { id: 'orders', name: 'My Orders', icon: ShoppingBagIcon },
        { id: 'favorites', name: 'Favorite Artisans', icon: HeartIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
        { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
        { id: 'settings', name: 'Account Settings', icon: CogIcon }
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
        toast.error("Session expired. Please login again.");
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

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Handle HTTP URLs
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle relative paths (already have /uploads prefix)
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths that need /uploads prefix
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths without leading slash
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully!");
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">My Account</h1>
              <p className="text-stone-600">Manage your account, orders, and preferences</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200">
          {/* Tab Navigation */}
          <div className="border-b border-stone-200">
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
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
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
                <h3 className="text-lg font-semibold text-stone-900 mb-2">Artisan Dashboard</h3>
                <p className="text-stone-600 mb-4">Artisans have access to a dedicated dashboard with business analytics.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Go to Artisan Dashboard
                </button>
              </div>
            )}
            {activeTab === 'dashboard' && user && user.role !== 'artisan' && (
              <DashboardTab user={user} stats={stats} recentOrders={recentOrders} favoriteArtisans={favoriteArtisans} getStatusColor={getStatusColor} />
            )}
            {activeTab === 'personal' && (
              <PersonalInfoTab user={user} />
            )}
            {activeTab === 'addresses' && (
              <AddressesTab user={user} />
            )}
            {activeTab === 'orders' && (
              <OrdersTab recentOrders={recentOrders} getStatusColor={getStatusColor} />
            )}
            {activeTab === 'favorites' && (
              <FavoritesTab favoriteArtisans={favoriteArtisans} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab user={user} />
            )}
            {activeTab === 'payment' && (
              <PaymentTab user={user} />
            )}
            {activeTab === 'security' && (
              <SecurityTab />
            )}
            {activeTab === 'settings' && (
              <SettingsTab user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ user, stats, recentOrders, favoriteArtisans, getStatusColor }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Welcome back, {user.firstName}!
        </h2>
        <p className="text-stone-600">
          Here's what's happening with your local marketplace account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ShoppingBagIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-stone-600">Total Orders</p>
              <p className="text-2xl font-bold text-stone-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCardIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-stone-600">Total Spent</p>
              <p className="text-2xl font-bold text-stone-900">${stats.totalSpent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HeartIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-stone-600">Favorite Artisans</p>
              <p className="text-2xl font-bold text-stone-900">{stats.favoriteArtisans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <StarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-stone-600">Avg Rating</p>
              <p className="text-2xl font-bold text-stone-900">{stats.averageRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-stone-200 rounded-xl">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">Recent Orders</h3>
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
      <div className="bg-white border border-stone-200 rounded-xl">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-stone-900">Favorite Artisans</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteArtisans.map((artisan) => (
              <div key={artisan.id} className="flex items-center space-x-3 p-3 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                <img
                  src={getImageUrl(artisan.image)}
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
                    <StarIcon className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-stone-600">{artisan.rating}</span>
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
function PersonalInfoTab({ user }) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update functionality
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Personal Information</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Addresses Tab Component
function AddressesTab({ user }) {
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
    toast.success('Address added successfully!');
  };

  const handleDeleteAddress = (id) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast.success('Address removed successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">Delivery Addresses</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary btn-small"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Address
        </button>
      </div>

      {/* Add Address Form */}
      {showAddForm && (
        <div className="bg-stone-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-stone-900 mb-4">Add New Address</h4>
          <form onSubmit={handleAddAddress} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Address Type</label>
                <select
                  value={newAddress.type}
                  onChange={(e) => setNewAddress({...newAddress, type: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Label</label>
                <input
                  type="text"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., My House, Office"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Street Address</label>
              <input
                type="text"
                required
                value={newAddress.street}
                onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">City</label>
                <input
                  type="text"
                  required
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">State</label>
                <input
                  type="text"
                  required
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  required
                  value={newAddress.zipCode}
                  onChange={(e) => setNewAddress({...newAddress, zipCode: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">
                Add Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Addresses List */}
      {addresses.length > 0 ? (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="w-5 h-5 text-stone-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-stone-900 capitalize">{address.type}</span>
                    {address.label && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="text-sm text-stone-600">{address.label}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-stone-600">
                    {address.street}, {address.city}, {address.state} {address.zipCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAddress(address.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-stone-500">
          <MapPinIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>No addresses added yet.</p>
          <p className="text-sm">Add your delivery addresses to make ordering easier.</p>
        </div>
      )}
    </div>
  );
}

// Orders Tab Component
function OrdersTab({ recentOrders, getStatusColor }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">My Orders</h3>
      <div className="bg-white border border-stone-200 rounded-xl">
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
function FavoritesTab({ favoriteArtisans }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">Favorite Artisans</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteArtisans.map((artisan) => (
          <div key={artisan.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-stone-100">
              <img
                src={getImageUrl(artisan.image)}
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
                  <StarIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-stone-600">{artisan.rating}</span>
                  <span className="text-sm text-stone-500">•</span>
                  <span className="text-sm text-stone-500">{artisan.products} products</span>
                </div>
                <button className="btn-primary btn-small">
                  Visit
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
function NotificationsTab({ user }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">Notification Preferences</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Order Updates</h4>
            <p className="text-sm text-stone-500">Get notified about your order status</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">New Products</h4>
            <p className="text-sm text-stone-500">Be the first to know about new products from your favorite artisans</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Community Events</h4>
            <p className="text-sm text-stone-500">Get notified about local artisan events and workshops</p>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Seasonal Offers</h4>
            <p className="text-sm text-stone-500">Receive special offers and seasonal promotions</p>
          </div>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
      </div>
    </div>
  );
}

// Payment Tab Component
function PaymentTab({ user }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">Payment Methods</h3>
        <button className="btn-primary btn-small">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Payment Method
        </button>
      </div>
      <div className="text-center py-8 text-stone-500">
        <CreditCardIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
        <p>No payment methods added yet.</p>
        <p className="text-sm">Add a payment method for faster checkout.</p>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">Security Settings</h3>
      <div className="space-y-4">
        <div className="p-4 border border-stone-200 rounded-lg">
          <h4 className="font-medium text-stone-900 mb-2">Change Password</h4>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Current Password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button className="btn-primary">
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ user }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">Account Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Language</h4>
            <p className="text-sm text-stone-500">English</p>
          </div>
          <select className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
            <option>English</option>
            <option>French</option>
            <option>Spanish</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Currency</h4>
            <p className="text-sm text-stone-500">US Dollar (USD)</p>
          </div>
          <select className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent">
            <option>USD</option>
            <option>CAD</option>
            <option>EUR</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
          <div>
            <h4 className="font-medium text-stone-900">Two-Factor Authentication</h4>
            <p className="text-sm text-stone-500">Add an extra layer of security</p>
          </div>
          <input type="checkbox" className="rounded" />
        </div>
      </div>
    </div>
  );
}
