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
  CalendarIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../services/authService";
import { userStatsService } from "../services/userStatsService";
import { favoriteService } from "../services/favoriteService";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cacheService";
import { useOptimizedEffect, useAsyncOperation } from "../hooks/useOptimizedEffect";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    favoriteArtisans: 0,
    averageRating: 0,
    ordersThisMonth: 0,
    spentThisMonth: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [favoriteArtisans, setFavoriteArtisans] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  // Optimized user profile loading
  const { execute: loadUser, isLoading: isUserLoading } = useAsyncOperation(
    async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
        return data.user;
      } catch (err) {
        toast.error("Session expired. Please login again.");
        logoutUser();
        navigate("/login");
        throw err;
      }
    },
    []
  );

  // Optimized stats loading
  const { execute: loadStats, isLoading: isStatsLoading } = useAsyncOperation(
    async () => {
      try {
        const userStats = await userStatsService.getUserStats();
        setStats(userStats);
        return userStats;
      } catch (error) {
        console.error('Error loading user stats:', error);
        toast.error('Failed to load statistics');
        return stats;
      }
    },
    []
  );

  // Optimized recent orders loading
  const { execute: loadRecentOrders, isLoading: isOrdersLoading } = useAsyncOperation(
    async () => {
      try {
        const orders = await userStatsService.getRecentOrders(5);
        setRecentOrders(orders);
        return orders;
      } catch (error) {
        console.error('Error loading recent orders:', error);
        toast.error('Failed to load recent orders');
        return [];
      }
    },
    []
  );

  // Optimized favorite artisans loading
  const { execute: loadFavoriteArtisans, isLoading: isFavoritesLoading } = useAsyncOperation(
    async () => {
      try {
        const favorites = await favoriteService.getFavoriteArtisans();
        setFavoriteArtisans(favorites);
        return favorites;
      } catch (error) {
        console.error('Error loading favorite artisans:', error);
        toast.error('Failed to load favorite artisans');
        return [];
      }
    },
    []
  );

  // Load all data on component mount
  useOptimizedEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadUser(),
          loadStats(),
          loadRecentOrders(),
          loadFavoriteArtisans()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [], { skipFirstRender: false });

  // Refresh data function
  const refreshData = async () => {
    userStatsService.refreshUserData();
    await Promise.all([
      loadStats(),
      loadRecentOrders(),
      loadFavoriteArtisans()
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
        return "bg-green-100 text-green-800";
      case "preparing":
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
          <p className="text-gray-600">Loading your dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user.firstName}!</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refreshData}
                disabled={isStatsLoading || isOrdersLoading || isFavoritesLoading}
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
              <p className="text-sm text-gray-500 capitalize">Role: {user.role}</p>
            </div>
            <Link
              to="/profile"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : stats.totalOrders}
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
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : formatCurrency(stats.totalSpent)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <HeartIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favorite Artisans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isFavoritesLoading ? '...' : favoriteArtisans.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <StarIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isStatsLoading ? '...' : stats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders and Favorite Artisans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <Link
                to="/orders"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {isOrdersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders yet</p>
                <Link
                  to="/"
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {order.artisan?.artisanName || 'Unknown Artisan'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} items • {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorite Artisans */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Favorite Artisans</h3>
              <Link
                to="/find-artisans"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Discover More
              </Link>
            </div>
            
            {isFavoritesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : favoriteArtisans.length === 0 ? (
              <div className="text-center py-8">
                <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No favorite artisans yet</p>
                <Link
                  to="/find-artisans"
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Find artisans
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {favoriteArtisans.slice(0, 5).map((favorite) => (
                  <div key={favorite._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {favorite.artisan?.artisanName || favorite.artisanName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {favorite.artisan?.type || 'Artisan'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await favoriteService.removeFavoriteArtisan(favorite.artisanId || favorite._id);
                            await loadFavoriteArtisans();
                            toast.success('Removed from favorites');
                          } catch (error) {
                            toast.error('Failed to remove from favorites');
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <HeartIcon className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
