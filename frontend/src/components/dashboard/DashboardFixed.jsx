import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ShoppingCartIcon,
  TagIcon,
  SparklesIcon,
  TruckIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../../services/authservice";
import { orderService } from "../../services/orderService";
import { spotlightService } from "../../services/spotlightService";
import walletService from "../../services/walletService";
import { productService } from "../../services/productService";
import toast from "react-hot-toast";
import DashboardPriorityQueue from "./DashboardPriorityQueue.jsx";
import WalletCard from "./WalletCard.jsx";
import MobileDashboardStat, { MobileDashboardStatGroup } from "../mobile/MobileDashboardStat";
import MobileOrderCard from "../mobile/MobileOrderCard";

export default function DashboardFixed() {
  const { t } = useTranslation();
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
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Step 1: Load user profile
        const userData = await getProfile();
        console.log('DashboardFixed: User data:', userData);
        
        if (!userData) {
          console.error('DashboardFixed: No user data received');
          toast.error(t('dashboard.loadingError'));
          navigate('/login');
          return;
        }
        
        setUser(userData);
        
        // Check if user is artisan (check both role and userType for compatibility)
        const isArtisan = userData.role === 'artisan' || userData.userType === 'artisan' || 
                         userData.role === 'producer' || userData.role === 'food_maker';
        
        if (!isArtisan) {
          toast.error(t('dashboard.artisansOnly'));
          navigate("/");
          return;
        }

        // Step 1.5: Load artisan profile from user data
        try {
          // Artisan profile is already included in the user data from getProfile()
          if (userData.artisan) {
            setArtisanProfile(userData.artisan);
          } else {
            setArtisanProfile(null);
          }
        } catch (error) {
          console.error('DashboardFixed: Error processing artisan profile:', error);
          setArtisanProfile(null);
        }

        // Step 1.6: Load spotlight status
        try {
          const spotlightResponse = await spotlightService.getSpotlightStatus();
          console.log('DashboardFixed: Spotlight response:', spotlightResponse);
          setSpotlightStatus(spotlightResponse.data || { hasActiveSpotlight: false });
        } catch (error) {
          console.error('DashboardFixed: Error loading spotlight status:', error);
          setSpotlightStatus({ hasActiveSpotlight: false });
        }

        // Step 2: Load orders
        const orders = await orderService.getArtisanOrders(true); // Get all orders for revenue calculations
        
        // Ensure orders is an array
        const ordersArray = Array.isArray(orders) ? orders : [];
        
        // Calculate artisan statistics based on actual orders
        // Only count COMPLETED orders (patron confirmed receipt) for revenue
        // This matches when revenue is actually credited to wallet
        const completedOrders = ordersArray.filter(order => 
          order.status === 'completed'
        );
        
        console.log('📊 Dashboard: Total orders:', ordersArray.length);
        console.log('📊 Dashboard: Completed orders:', completedOrders.length);
        
        // Calculate revenue breakdown (gross amounts before fees)
        const productRevenue = completedOrders.reduce((sum, order) => {
          // Product revenue = subtotal (excluding delivery fee)
          const subtotal = (order.subtotal || ((order.totalAmount || 0) - (order.deliveryFee || 0)));
          return sum + subtotal;
        }, 0);
        
        const deliveryRevenue = completedOrders.reduce((sum, order) => {
          // All delivery fees are revenue (artisan keeps 100%)
          return sum + (order.deliveryFee || 0);
        }, 0);
        
        const totalRevenue = productRevenue + deliveryRevenue;
        
        // Calculate earnings (net after platform and payment processing fees)
        // Get platform settings for accurate fee calculations
        let platformFeeRate = 0.10; // Default 10% if settings not available
        let paymentProcessingRate = 0.029; // Default 2.9% if settings not available
        
        try {
          const { getPlatformSettings } = await import('../../services/adminService');
          const platformSettings = await getPlatformSettings();
          
          if (platformSettings) {
            platformFeeRate = (platformSettings.platformFeePercentage || 10) / 100;
            paymentProcessingRate = (platformSettings.paymentProcessingFee || 2.9) / 100;
            console.log('📊 Dashboard: Using platform settings:', {
              platformFeeRate: `${platformSettings.platformFeePercentage}%`,
              paymentProcessingRate: `${platformSettings.paymentProcessingFee}%`
            });
          }
        } catch (error) {
          console.warn('📊 Dashboard: Could not fetch platform settings, using defaults:', error);
        }
        
        const platformFee = productRevenue * platformFeeRate;
        const paymentProcessingFee = totalRevenue * paymentProcessingRate;
        const totalEarnings = totalRevenue - platformFee - paymentProcessingFee;
        
        console.log('📊 Dashboard: Revenue breakdown:', {
          productRevenue,
          deliveryRevenue,
          totalRevenue,
          platformFee,
          paymentProcessingFee,
          totalEarnings
        });

        // Step 2.5: Load total products count
        let totalProducts = 0;
        try {
          const myProducts = await productService.getMyProducts();
          totalProducts = Array.isArray(myProducts) ? myProducts.length : 0;
          console.log('📊 Dashboard: Total products loaded:', totalProducts, 'products');
        } catch (error) {
          console.error('📊 Dashboard: Error loading products count:', error);
          totalProducts = 0;
        }

        const stats = {
          totalOrders: ordersArray.length,
          totalRevenue: totalRevenue,
          productRevenue: productRevenue,
          deliveryRevenue: deliveryRevenue,
          totalEarnings: totalEarnings,
          totalProducts: totalProducts,
          averageRating: ordersArray.length > 0 ? 
            ordersArray.reduce((sum, order) => sum + (order.rating || 0), 0) / ordersArray.length : 0,
          ordersThisMonth: ordersArray.filter(order => {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          }).length,
          revenueThisMonth: completedOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          }).reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          pendingOrders: ordersArray.filter(order => 
            ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status)
          ).length,
          completedOrders: completedOrders.length,
          totalPatrons: (() => {
            const paidOrders = ordersArray.filter(order => 
              // Count patrons from all paid orders (not cancelled/declined)
              !['cancelled', 'declined'].includes(order.status)
            );
            
            // Check first order structure to debug
            if (paidOrders.length > 0) {
              console.log('📊 Dashboard: Sample order structure:', {
                firstOrder: paidOrders[0],
                hasBuyer: !!paidOrders[0].buyer,
                hasBuyerId: !!paidOrders[0].buyerId,
                hasUser: !!paidOrders[0].user,
                hasUserId: !!paidOrders[0].userId,
                hasPatron: !!paidOrders[0].patron,
                hasPatronId: !!paidOrders[0].patronId
              });
            }
            
            // Try multiple possible field names for buyer ID
            const buyerIds = paidOrders
              .map(order => 
                order.buyer?._id || 
                order.buyerId || 
                order.buyer || 
                order.user?._id || 
                order.userId ||
                order.patron?._id ||
                order.patronId
              )
              .filter(id => id); // Remove null/undefined
            
            // Convert IDs to strings for proper Set comparison
            const buyerIdStrings = buyerIds.map(id => 
              typeof id === 'object' ? (id._id || id.toString()) : String(id)
            );
            
            const uniquePatrons = new Set(buyerIdStrings);
            
            console.log('📊 Dashboard: Patron count details:', {
              totalOrders: ordersArray.length,
              paidOrders: paidOrders.length,
              buyerIds: buyerIds,
              buyerIdStrings: buyerIdStrings,
              uniquePatrons: uniquePatrons.size,
              uniquePatronsList: Array.from(uniquePatrons)
            });
            
            return uniquePatrons.size;
          })(),
          viewsThisMonth: 0
        };
        
        setArtisanStats(stats);

        // Load recent orders
        const recent = ordersArray
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentOrders(recent);

        // Step 4: Load wallet balance
        try {
          const walletResponse = await walletService.getWalletBalance();
          if (walletResponse.success) {
            setWalletBalance(walletResponse.data.balance);
          }
        } catch (error) {
          console.error('DashboardFixed: Error loading wallet balance:', error);
        }

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
      const updatedResponse = await spotlightService.getSpotlightStatus();
      setSpotlightStatus(updatedResponse.data || { hasActiveSpotlight: false });
      
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading your artisan dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-stone-600">Failed to load user data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* User Profile Card - Mobile Optimized - Starts at Top */}
        <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Avatar and Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-8 h-8 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-stone-800 font-display truncate">
                  {artisanProfile?.artisanName || `${user.firstName} ${user.lastName}`}
                </h2>
                <p className="text-sm text-stone-600 truncate">{user.email}</p>
                <p className="text-xs sm:text-sm text-stone-500 capitalize">Artisan • {user.role}</p>
                
                {/* Spotlight Status */}
                {spotlightStatus?.hasActiveSpotlight && spotlightStatus?.spotlight ? (
                  <div className="mt-2 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    <span className="text-xs sm:text-sm text-amber-700">
                      Spotlight active • {spotlightStatus.spotlight.remainingDays} day{spotlightStatus.spotlight.remainingDays !== 1 ? 's' : ''} left
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-stone-400" />
                    <span className="text-xs sm:text-sm text-stone-500">No active spotlight</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto">
              <button
                onClick={() => setShowSpotlightModal(true)}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium min-h-[48px] ${
                  spotlightStatus?.hasActiveSpotlight 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 shadow-md hover:shadow-lg'
                }`}
                disabled={spotlightStatus?.hasActiveSpotlight}
                title={spotlightStatus?.hasActiveSpotlight ? 'You already have an active spotlight subscription' : 'Get featured at the top of search results'}
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{spotlightStatus?.hasActiveSpotlight ? 'Spotlight Active' : 'Get Spotlight'}</span>
                <span className="sm:hidden">{spotlightStatus?.hasActiveSpotlight ? 'Active' : 'Spotlight'}</span>
              </button>
              <Link
                to="/my-products"
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 text-center text-sm font-medium min-h-[48px] flex items-center justify-center shadow-md hover:shadow-lg transition-all"
              >
                <TagIcon className="w-4 h-4 mr-2" />
                <span>Manage Products</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Priority Queue Section */}
        <div className="mb-8">
          <DashboardPriorityQueue />
        </div>

        {/* Revenue & Earnings - Mobile Optimized */}
        <div className="card p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-stone-800 font-display">Revenue & Earnings</h2>
            <Link
              to="/revenue-dashboard"
              className="inline-flex items-center text-xs sm:text-sm text-accent hover:text-emerald-700 font-medium gap-1"
            >
              <span className="hidden sm:inline">View detailed analytics</span>
              <span className="sm:hidden">Details</span>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {/* Primary Metrics - Earnings & Wallet Side by Side */}
          <div className="space-y-3">
            {/* Top Row: Total Earnings & Wallet Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Total Earnings */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 sm:p-5 border border-emerald-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-emerald-900">Total Earnings</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-700">
                      {formatCurrency(artisanStats.totalEarnings || 0)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">After platform fees</p>
                  </div>
                  <button
                    onClick={() => setShowRevenueDetails(!showRevenueDetails)}
                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded-full hover:bg-emerald-100 transition-colors"
                    aria-label={showRevenueDetails ? 'Hide details' : 'Show details'}
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform ${showRevenueDetails ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Wallet Balance - Primary Metric */}
              <button 
                onClick={() => navigate('/my-wallet')}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-100 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-blue-900">Wallet Balance</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">
                    {formatCurrency(walletBalance)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    Available to spend
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </p>
                </div>
              </button>
            </div>

            {/* Expandable Revenue Breakdown */}
            {showRevenueDetails && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-gray-100">
                {/* Product Revenue */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CurrencyDollarIcon className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-900 line-clamp-1">Products</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-green-700">
                    {formatCurrency(artisanStats.productRevenue || 0)}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Sales</p>
                </div>

                {/* Delivery Revenue */}
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <TruckIcon className="w-3 h-3 text-orange-600" />
                    </div>
                    <span className="text-xs font-medium text-orange-900 line-clamp-1">Delivery</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-orange-700">
                    {formatCurrency(artisanStats.deliveryRevenue || 0)}
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">Revenue</p>
                </div>
              </div>
            )}

            {/* Mobile hint text */}
            {!showRevenueDetails && (
              <p className="text-xs text-gray-500 text-center">
                Tap arrow to see revenue breakdown
              </p>
            )}
          </div>
        </div>

        {/* Key Metrics - Compact Grid - Mobile Optimized */}
        <div className="card p-4 sm:p-6 mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-stone-800 font-display mb-4">Business Metrics</h2>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Total Orders */}
            <button
              onClick={() => navigate('/orders')}
              className="bg-amber-50 hover:bg-amber-100 rounded-lg p-3 sm:p-4 border border-amber-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingBagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-amber-900 line-clamp-1">Orders</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-700">
                {artisanStats.totalOrders}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">All time</p>
            </button>

            {/* Pending Orders */}
            <button
              onClick={() => navigate('/orders?filter=pending')}
              className="bg-yellow-50 hover:bg-yellow-100 rounded-lg p-3 sm:p-4 border border-yellow-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-yellow-900 line-clamp-1">Pending</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                {artisanStats.pendingOrders}
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">Need action</p>
            </button>

            {/* Total Patrons */}
            <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-purple-900 line-clamp-1">Patrons</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-purple-700">
                {artisanStats.totalPatrons}
              </p>
              <p className="text-xs text-purple-600 mt-0.5">Customers</p>
            </div>

            {/* Total Products */}
            <button
              onClick={() => navigate('/my-products')}
              className="bg-blue-50 hover:bg-blue-100 rounded-lg p-3 sm:p-4 border border-blue-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <TagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-blue-900 line-clamp-1">Products</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">
                {artisanStats.totalProducts}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">In catalog</p>
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-stone-800 font-display">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              View All Orders
            </Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {/* Pending Orders Preview */}
              {artisanStats.pendingOrders > 0 && (
                <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-primary-800">Pending Orders</h3>
                    <span className="text-xs text-primary">{artisanStats.pendingOrders} pending</span>
                  </div>
                  <div className="space-y-2">
                    {recentOrders
                      .filter(order => ['pending', 'confirmed', 'preparing'].includes(order.status))
                      .slice(0, 3)
                      .map((order) => (
                        <div key={order._id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-primary-dark font-medium">#{order._id.slice(-6)}</span>
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

              {/* All Recent Orders - Mobile optimized */}
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <React.Fragment key={order._id}>
                    {/* Mobile Order Card */}
                    <div className="lg:hidden">
                      <MobileOrderCard
                        order={order}
                        onClick={() => navigate('/orders')}
                      />
                    </div>

                    {/* Desktop Order Row */}
                    <div className="hidden lg:flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                         onClick={() => navigate('/orders')}>
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
                  </React.Fragment>
                ))}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders yet</p>
            </div>
          )}
        </div>

      </div>

      {/* Spotlight Purchase Modal */}
      {showSpotlightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-yellow-400 rounded-full flex items-center justify-center">
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
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-primary-200 rounded-xl p-4">
                <h4 className="font-semibold text-primary-800 mb-2">Spotlight Benefits</h4>
                <ul className="text-sm text-primary-dark space-y-1">
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
                      className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
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
