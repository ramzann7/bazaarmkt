import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  HeartIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  EyeIcon,
  UsersIcon,
  TrendingUpIcon,
  ShoppingCartIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../../services/authservice";
import { orderService } from "../../services/orderService";
import { revenueService } from "../../services/revenueService";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../../services/cacheService";
import walletService from "../../services/walletService";
import { useOptimizedEffect, useAsyncOperation } from "../../hooks/useOptimizedEffect";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
  const [revenueData, setRevenueData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);

  // Optimized user profile loading
  const { execute: loadUser, isLoading: isUserLoading } = useAsyncOperation(
    async () => {
      try {
        const userData = await getProfile();
        setUser(userData);
        
        // Check if user is artisan, if not redirect to home
        if (userData.role !== 'artisan' && userData.role !== 'producer' && userData.role !== 'food_maker') {
          toast.error("Dashboard is only available for artisans");
          navigate("/");
          return null;
        }
        
        return userData;
      } catch (err) {
        toast.error("Session expired. Please login again.");
        logoutUser();
        navigate("/login");
        throw err;
      }
    },
    []
  );

  // Optimized artisan stats loading
  const { execute: loadArtisanStats, isLoading: isStatsLoading } = useAsyncOperation(
    async () => {
      try {
        const orders = await orderService.getArtisanOrders();
        
        // Ensure orders is an array
        const ordersArray = Array.isArray(orders) ? orders : [];
        
        // Calculate comprehensive artisan statistics
        const stats = {
          totalOrders: ordersArray.length,
          totalRevenue: ordersArray.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          totalProducts: 0, // Will be updated when we have product service
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
          viewsThisMonth: 0 // Will be updated when we have analytics service
        };
        
        setArtisanStats(stats);
        return stats;
      } catch (error) {
        console.error('Error loading artisan stats:', error);
        toast.error('Failed to load statistics');
        return artisanStats;
      }
    },
    []
  );

  // Optimized recent orders loading
  const { execute: loadRecentOrders, isLoading: isOrdersLoading } = useAsyncOperation(
    async () => {
      try {
        const orders = await orderService.getArtisanOrders();
        // Ensure orders is an array and sort by creation date and take the 5 most recent
        const ordersArray = Array.isArray(orders) ? orders : [];
        const recent = ordersArray
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentOrders(recent);
        return recent;
      } catch (error) {
        console.error('Error loading recent orders:', error);
        toast.error('Failed to load recent orders');
        return [];
      }
    },
    []
  );

  // Optimized revenue data loading
  const { execute: loadRevenueData, isLoading: isRevenueLoading } = useAsyncOperation(
    async () => {
      try {
        const revenue = await revenueService.getArtisanRevenueSummary('month');
        setRevenueData(revenue);
        return revenue;
      } catch (error) {
        console.error('Error loading revenue data:', error);
        // Don't show error toast for revenue as it might not be available for all artisans
        return null;
      }
    },
    []
  );

  // Optimized wallet balance loading
  const { execute: loadWalletBalance, isLoading: isWalletLoading } = useAsyncOperation(
    async () => {
      try {
        const response = await walletService.getWalletBalance();
        if (response.success) {
          setWalletBalance(response.balance);
          return response;
        }
        return null;
      } catch (error) {
        console.error('Error loading wallet balance:', error);
        // Don't show error toast for wallet as it might not be available for all artisans
        return null;
      }
    },
    []
  );

  // Load all data on component mount
  useOptimizedEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const userData = await loadUser();
        if (userData) {
          // Load data in parallel but handle errors individually
          await Promise.allSettled([
            loadArtisanStats(),
            loadRecentOrders(),
            loadRevenueData(),
            loadWalletBalance()
          ]);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load some dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [], { skipFirstRender: false });

  // Refresh data function
  const refreshData = async () => {
    await Promise.all([
      loadArtisanStats(),
      loadRecentOrders(),
      loadRevenueData()
    ]);
    toast.success('Dashboard refreshed!');
  };

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully!");
    navigate("/");
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

  if (isLoading || isUserLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your artisan dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
              <Link
                to="/my-wallet"
                className="px-4 py-2 bg-[#D77A61] text-white rounded-lg hover:bg-[#C06A51] transition-colors flex items-center space-x-2"
              >
                <CurrencyDollarIcon className="w-4 h-4" />
                <span>My Wallet</span>
              </Link>
              <button
                onClick={refreshData}
                disabled={isStatsLoading || isOrdersLoading || isRevenueLoading}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
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
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 capitalize">Artisan • {user.role}</p>
            </div>
            <div className="flex gap-3">
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

        {/* Artisan Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : artisanStats.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : formatCurrency(artisanStats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : artisanStats.pendingOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patrons</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : artisanStats.totalPatrons}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isWalletLoading ? '...' : formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : artisanStats.ordersThisMonth} Orders
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : formatCurrency(artisanStats.revenueThisMonth)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUpIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : artisanStats.averageRating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown (if available) */}
        {revenueData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Platform Fee</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(revenueData.platformFee || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Your Earnings</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(revenueData.artisanEarnings || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(revenueData.totalSales || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <Link
              to="/orders"
              className="flex items-center text-orange-600 hover:text-orange-700 transition-colors"
            >
              View All Orders
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {isOrdersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading recent orders...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders yet. Start promoting your products!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Order #{order._id.slice(-6)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} items • {formatCurrency(order.totalAmount || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/products"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
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
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCartIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Orders</h3>
                <p className="text-sm text-gray-600">Check and manage incoming orders</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CogIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Business Settings</h3>
                <p className="text-sm text-gray-600">Update your business profile</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
