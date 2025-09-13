import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShoppingCartIcon,
  TagIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../../services/authService";
import { orderService } from "../../services/orderService";
import { spotlightService } from "../../services/spotlightService";
import walletService from "../../services/walletService";
import toast from "react-hot-toast";
import PendingOrdersWidget from "./PendingOrdersWidget.jsx";
import WalletCard from "./WalletCard.jsx";

export default function DashboardFixed() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [spotlightStatus, setSpotlightStatus] = useState(null);
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [artisanStats, setArtisanStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    averageRating: 0,
    ordersThisMonth: 0,
    revenueThisMonth: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalPatrons: 0,
    viewsThisMonth: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        console.log('DashboardFixed: Starting to load...');
        
        // Step 1: Load user profile
        console.log('DashboardFixed: Loading user profile...');
        const userData = await getProfile();
        console.log('DashboardFixed: User loaded:', userData);
        setUser(userData);
        
        // Check if user is artisan
        if (userData.role !== 'artisan' && userData.role !== 'producer' && userData.role !== 'food_maker') {
          toast.error("Dashboard is only available for artisans");
          navigate("/");
          return;
        }

        // Step 1.5: Load artisan profile
        console.log('DashboardFixed: Loading artisan profile...');
        try {
          const response = await fetch('/api/profile/artisan', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const artisanData = await response.json();
            console.log('DashboardFixed: Artisan profile loaded:', artisanData);
            setArtisanProfile(artisanData);
          }
        } catch (error) {
          console.error('DashboardFixed: Error loading artisan profile:', error);
        }

        // Step 1.6: Load spotlight status
        console.log('DashboardFixed: Loading spotlight status...');
        try {
          const spotlightData = await spotlightService.getSpotlightStatus();
          console.log('DashboardFixed: Spotlight status loaded:', spotlightData);
          setSpotlightStatus(spotlightData);
        } catch (error) {
          console.error('DashboardFixed: Error loading spotlight status:', error);
          setSpotlightStatus({ hasActiveSpotlight: false });
        }

        // Step 2: Load orders
        console.log('DashboardFixed: Loading orders...');
        const orders = await orderService.getArtisanOrders();
        console.log('DashboardFixed: Orders loaded:', orders);
        
        // Ensure orders is an array
        const ordersArray = Array.isArray(orders) ? orders : [];
        
        // Calculate artisan statistics based on actual orders
        const stats = {
          totalOrders: ordersArray.length,
          totalRevenue: ordersArray.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          totalProducts: 0,
          averageRating: ordersArray.length > 0 ? 
            ordersArray.reduce((sum, order) => sum + (order.rating || 0), 0) / ordersArray.length : 0,
          ordersThisMonth: ordersArray.filter(order => {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          }).length,
          revenueThisMonth: ordersArray.filter(order => {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          }).reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          pendingOrders: ordersArray.filter(order => 
            order.status === 'pending' || order.status === 'confirmed'
          ).length,
          completedOrders: ordersArray.filter(order => 
            order.status === 'delivered' || order.status === 'completed'
          ).length,
          totalPatrons: new Set(ordersArray.map(order => order.buyer?._id || order.buyerId)).size,
          viewsThisMonth: 0
        };
        
        setArtisanStats(stats);
        console.log('DashboardFixed: Stats calculated:', stats);

        // Load recent orders
        const recent = ordersArray
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentOrders(recent);
        console.log('DashboardFixed: Recent orders loaded:', recent);

        // Step 4: Load wallet balance
        console.log('DashboardFixed: Loading wallet balance...');
        try {
          const walletResponse = await walletService.getWalletBalance();
          console.log('DashboardFixed: Wallet response:', walletResponse);
          if (walletResponse.success) {
            setWalletBalance(walletResponse.data.balance);
            console.log('DashboardFixed: Wallet balance loaded:', walletResponse.data.balance);
          }
        } catch (error) {
          console.error('DashboardFixed: Error loading wallet balance:', error);
        }

        console.log('DashboardFixed: Dashboard loaded successfully');
      } catch (error) {
        console.error('DashboardFixed: Error loading dashboard:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSpotlightPurchase = async (days) => {
    try {
      setShowSpotlightModal(false);
      toast.loading('Processing spotlight purchase...', { id: 'spotlight-purchase' });
      
      const result = await spotlightService.purchaseSpotlight(days, 'card');
      
      toast.success(`Spotlight activated for ${days} day${days > 1 ? 's' : ''}!`, { id: 'spotlight-purchase' });
      
      // Refresh spotlight status
      const updatedStatus = await spotlightService.getSpotlightStatus();
      setSpotlightStatus(updatedStatus);
      
    } catch (error) {
      console.error('Error purchasing spotlight:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message;
        const errorType = error.response?.data?.error;
        
        // Handle insufficient funds error
        if (errorType === 'INSUFFICIENT_FUNDS') {
          const errorData = error.response.data;
          const shortfall = errorData.shortfall;
          const currentBalance = errorData.currentBalance;
          const requiredAmount = errorData.requiredAmount;
          
          toast.error(
            `Insufficient wallet balance! You need $${requiredAmount.toFixed(2)} but only have $${currentBalance.toFixed(2)}. Please top up your wallet.`, 
            { 
              id: 'spotlight-purchase',
              duration: 6000 
            }
          );
          
          // Show wallet top-up prompt
          if (window.confirm(
            `You need $${shortfall.toFixed(2)} more to purchase this spotlight subscription.\n\nWould you like to top up your wallet now?`
          )) {
            // Navigate to wallet top-up or show top-up modal
            // For now, we'll just show a message
            toast.info('Wallet top-up feature coming soon! Please add funds to your wallet first.', { id: 'spotlight-purchase' });
          }
        } else if (errorMessage?.includes('already have an active spotlight')) {
          const existingSpotlight = error.response?.data?.existingSpotlight;
          if (existingSpotlight?.endDate) {
            const endDate = new Date(existingSpotlight.endDate).toLocaleDateString();
            toast.error(`You already have an active spotlight subscription that expires on ${endDate}. Please wait for it to expire before purchasing a new one.`, { 
              id: 'spotlight-purchase',
              duration: 6000 
            });
          } else {
            toast.error('You already have an active spotlight subscription. Please wait for it to expire before purchasing a new one.', { 
              id: 'spotlight-purchase' 
            });
          }
        } else if (errorMessage?.includes('Days must be between')) {
          toast.error('Please select a valid number of days (1-30).', { id: 'spotlight-purchase' });
        } else {
          toast.error(errorMessage || 'Invalid request. Please check your input and try again.', { id: 'spotlight-purchase' });
        }
      } else {
        toast.error('Failed to purchase spotlight. Please try again.', { id: 'spotlight-purchase' });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800";
      case "preparing":
      case "confirmed":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your artisan dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">Failed to load user data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Artisan Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user.firstName}! Here's your business overview.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  toast.success("Logged out successfully!");
                  navigate("/");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {artisanProfile?.artisanName || `${user.firstName} ${user.lastName}`}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 capitalize">Artisan • {user.role}</p>
              
              {/* Spotlight Status */}
              {spotlightStatus?.hasActiveSpotlight && spotlightStatus?.spotlight ? (
                <div className="mt-2 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-700">
                    Spotlight active • {spotlightStatus.spotlight.remainingDays} day{spotlightStatus.spotlight.remainingDays !== 1 ? 's' : ''} left
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">No active spotlight</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSpotlightModal(true)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  spotlightStatus?.hasActiveSpotlight 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600'
                }`}
                disabled={spotlightStatus?.hasActiveSpotlight}
                title={spotlightStatus?.hasActiveSpotlight ? 'You already have an active spotlight subscription' : 'Get featured at the top of search results'}
              >
                <SparklesIcon className="w-4 h-4" />
                {spotlightStatus?.hasActiveSpotlight ? 'Spotlight Active' : 'Get Spotlight'}
              </button>
              <Link
                to="/profile"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Edit Profile
              </Link>
              <Link
                to="/products"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Products
              </Link>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mb-8">
          <PendingOrdersWidget />
        </div>

        {/* Revenue & Earnings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Revenue & Earnings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Revenue */}
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(artisanStats.totalRevenue)}</p>
              <p className="text-xs text-gray-500">From all orders</p>
            </div>
            
            {/* Your Earnings */}
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Your Earnings</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(artisanStats.totalRevenue * 0.9)}</p>
              <p className="text-xs text-gray-500">90% after platform fees</p>
            </div>

            {/* Your Wallet */}
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Your Wallet</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(walletBalance)}</p>
              <p className="text-xs text-gray-500 mb-3">Available balance</p>
              <Link
                to="/my-wallet"
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View more details
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{artisanStats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900">{artisanStats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Total Patrons */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patrons</p>
                <p className="text-3xl font-bold text-gray-900">{artisanStats.totalPatrons}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              View All Orders
            </Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {/* Pending Orders Preview */}
              {artisanStats.pendingOrders > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-amber-800">Pending Orders</h3>
                    <span className="text-xs text-amber-600">{artisanStats.pendingOrders} pending</span>
                  </div>
                  <div className="space-y-2">
                    {recentOrders
                      .filter(order => ['pending', 'confirmed', 'preparing'].includes(order.status))
                      .slice(0, 3)
                      .map((order) => (
                        <div key={order._id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-amber-700 font-medium">#{order._id.slice(-6)}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-700">
                              {order.items?.slice(0, 2).map((item, index) => (
                                <span key={index}>
                                  {item.quantity}x {item.product?.name || 'Product'}
                                  {index < Math.min(order.items.length, 2) - 1 && ', '}
                                </span>
                              ))}
                              {order.items?.length > 2 && (
                                <span className="text-gray-500"> +{order.items.length - 2} more</span>
                              )}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* All Recent Orders */}
              {recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <ShoppingCartIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order #{order._id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders yet</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/products"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Products</h3>
                <p className="text-sm text-gray-600">Add, edit, or remove your products</p>
              </div>
            </div>
          </Link>

          <Link
            to="/orders"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingCartIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Orders</h3>
                <p className="text-sm text-gray-600">Check and manage your orders</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Edit Profile</h3>
                <p className="text-sm text-gray-600">Update your business information</p>
              </div>
            </div>
          </Link>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Spotlight Feature</h3>
                <p className="text-sm text-gray-600">Get featured in search results</p>
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <SparklesIcon className="w-3 h-3 mr-1" />
                Premium Feature
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spotlight Purchase Modal */}
      {showSpotlightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Get Spotlight</h3>
                  <p className="text-sm text-gray-600">Get featured in search results</p>
                </div>
              </div>
              <button
                onClick={() => setShowSpotlightModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Spotlight Benefits</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Featured at the top of search results</li>
                  <li>• Increased visibility to patrons</li>
                  <li>• Higher chance of getting orders</li>
                  <li>• Premium placement in "Find Artisans"</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 7].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleSpotlightPurchase(days)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors text-center"
                    >
                      <div className="font-semibold text-gray-900">{days} day{days > 1 ? 's' : ''}</div>
                      <div className="text-sm text-gray-600">${days * 10}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                <p>Payment will be processed securely</p>
                <p>Spotlight starts immediately after payment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
