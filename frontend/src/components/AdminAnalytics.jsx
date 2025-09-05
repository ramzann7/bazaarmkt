import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminAnalytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser && authChecked) {
      loadAnalytics();
    }
  }, [currentUser, selectedPeriod, authChecked]);

  const checkAdminAccess = async () => {
    try {
      const token = authToken.getToken();
      if (!token) {
        setAuthChecked(true);
        navigate('/login');
        return;
      }

      const profile = await getProfile();
      if (profile.role !== 'admin') {
        setAuthChecked(true);
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setCurrentUser(profile);
      setAuthChecked(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setError('Authentication error');
      setAuthChecked(true);
      toast.error('Authentication error');
      navigate('/login');
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminService.getAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      delivering: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      paypal: 'PayPal',
      cash_on_delivery: 'Cash on Delivery'
    };
    return labels[method] || method;
  };

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600 mt-1">
                Business insights and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.orderStats.totalOrders)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.orderStats.totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.orderStats.averageOrderValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CheckCircleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.orderStats.totalOrders > 0 
                        ? `${Math.round((analytics.orderStats.completedOrders / analytics.orderStats.totalOrders) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Selling Products */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
                {analytics.topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topProducts.map((product, index) => (
                      <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.productName}</p>
                            <p className="text-sm text-gray-500">{product.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatNumber(product.totalSold)} sold</p>
                          <p className="text-sm text-gray-500">{formatCurrency(product.totalRevenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <ShoppingBagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No sales data available for this period</p>
                  </div>
                )}
              </div>

              {/* Product Category Performance */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
                {analytics.productSales.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.productSales.map((category) => (
                      <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{category.category}</p>
                          <p className="text-sm text-gray-500">{category.uniqueProducts} products</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatNumber(category.totalSold)} sold</p>
                          <p className="text-sm text-gray-500">{formatCurrency(category.totalRevenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No category data available for this period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Status and Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Order Status Distribution */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
                {analytics.orderStatusDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.orderStatusDistribution.map((status) => (
                      <div key={status._id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status._id)}`}>
                            {status._id}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{status.count} orders</p>
                          <p className="text-sm text-gray-500">
                            {analytics.orderStats.totalOrders > 0 
                              ? `${Math.round((status.count / analytics.orderStats.totalOrders) * 100)}%`
                              : '0%'
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No order status data available</p>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
                {analytics.paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.paymentMethods.map((method) => (
                      <div key={method._id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getPaymentMethodLabel(method._id)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{method.count} orders</p>
                          <p className="text-sm text-gray-500">{formatCurrency(method.totalAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No payment method data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Performing Artisans */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Artisans</h3>
              {analytics.artisanPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artisan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Order Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.artisanPerformance.map((artisan) => (
                        <tr key={artisan._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {artisan.artisanName || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">{artisan.artisanEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(artisan.totalOrders)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(artisan.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(artisan.averageOrderValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No artisan performance data available for this period</p>
                </div>
              )}
            </div>

            {/* Daily Order Trends */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Order Trends</h3>
              {analytics.dailyOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.dailyOrders.map((day) => (
                        <tr key={day._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(day._id).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(day.orders)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(day.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ArrowTrendingUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No daily trend data available for this period</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No analytics data available</p>
            <p className="text-sm">Try selecting a different time period</p>
          </div>
        )}
      </div>
    </div>
  );
}
