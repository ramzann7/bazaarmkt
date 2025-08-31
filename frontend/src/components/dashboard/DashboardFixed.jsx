import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon, 
  StarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  UsersIcon,
  ShoppingCartIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import { getProfile, logoutUser } from "../../services/authservice";
import { orderService } from "../../services/orderService";
import { revenueService } from "../../services/revenueService";
import toast from "react-hot-toast";
import PendingOrdersWidget from "./PendingOrdersWidget.jsx";

export default function DashboardFixed() {
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
    viewsThisMonth: 0,
    platformCosts: 0,
    netEarnings: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueData, setRevenueData] = useState(null);

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

        // Step 2: Load orders
        console.log('DashboardFixed: Loading orders...');
        const orders = await orderService.getArtisanOrders();
        console.log('DashboardFixed: Orders loaded:', orders);
        
        // Ensure orders is an array
        const ordersArray = Array.isArray(orders) ? orders : [];
        
        // Calculate artisan statistics
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
          viewsThisMonth: 0,
          platformCosts: 0,
          netEarnings: 0
        };
        
        setArtisanStats(stats);
        console.log('DashboardFixed: Stats calculated:', stats);

        // Load recent orders
        const recent = ordersArray
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentOrders(recent);
        console.log('DashboardFixed: Recent orders loaded:', recent);

        // Step 3: Load revenue data
        console.log('DashboardFixed: Loading revenue data...');
        try {
          const revenue = await revenueService.getArtisanRevenueSummary('month');
          setRevenueData(revenue);
          console.log('DashboardFixed: Revenue loaded:', revenue);
          
          // Update stats with platform costs and net earnings
          if (revenue && revenue.revenue) {
            setArtisanStats(prevStats => ({
              ...prevStats,
              platformCosts: revenue.revenue.totalCommission || 0,
              netEarnings: revenue.revenue.totalEarnings || 0
            }));
          }
        } catch (error) {
          console.error('DashboardFixed: Error loading revenue:', error);
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

        {/* Pending Orders Widget */}
        <div className="mb-8 relative z-10">
          <PendingOrdersWidget />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          {/* Net Earnings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Earnings</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(artisanStats.netEarnings)}</p>
                <p className="text-xs text-gray-500">After platform costs</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        {revenueData && revenueData.revenue && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl shadow-sm border border-emerald-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Revenue & Earnings</h2>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-600">Live Data</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gross Revenue */}
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Gross Revenue</p>
                <p className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(revenueData.revenue.totalGrossAmount || 0)}</p>
                <p className="text-xs text-gray-500">Total sales before platform fees</p>
              </div>
              
              {/* Platform Commission */}
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Platform Commission</p>
                <p className="text-3xl font-bold text-red-600 mb-2">{formatCurrency(revenueData.revenue.totalCommission || 0)}</p>
                <p className="text-xs text-gray-500">10% platform fee</p>
                <div className="mt-3 px-3 py-1 bg-red-50 rounded-full inline-block">
                  <span className="text-xs font-medium text-red-700">Platform Cost</span>
                </div>
              </div>
              
              {/* Your Earnings */}
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CurrencyDollarIcon className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">Your Earnings</p>
                <p className="text-3xl font-bold text-emerald-600 mb-2">{formatCurrency(revenueData.revenue.totalEarnings || 0)}</p>
                <p className="text-xs text-gray-500">90% after platform fees</p>
                <div className="mt-3 px-3 py-1 bg-emerald-50 rounded-full inline-block">
                  <span className="text-xs font-medium text-emerald-700">Your Profit</span>
                </div>
              </div>
            </div>
            
            {/* Transparency Information */}
            {revenueData.summary && revenueData.summary.transparency && (
              <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm">ℹ️</span>
                  </div>
                  Transparency Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{revenueData.summary.transparency.platformCommission}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{revenueData.summary.transparency.artisanEarnings}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{revenueData.summary.transparency.promotionalCosts}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Breakdown - Fallback */}
        {(!revenueData || !revenueData.revenue) && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Revenue & Earnings</h2>
              <p className="text-gray-600 mb-4">Your revenue data will appear here once you start receiving orders</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Gross Revenue</p>
                  <p className="text-2xl font-bold text-gray-400">$0.00</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Platform Commission</p>
                  <p className="text-2xl font-bold text-gray-400">$0.00</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Your Earnings</p>
                  <p className="text-2xl font-bold text-gray-400">$0.00</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </div>
    </div>
  );
}
