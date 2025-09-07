import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  ChartBarIcon, 
  ShoppingCartIcon,
  UsersIcon,
  StarIcon,
  CalendarIcon,
  EyeIcon,
  BanknotesIcon,
  SparklesIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { revenueService } from '../services/revenueService';
import toast from 'react-hot-toast';

export default function AdminRevenueManagement() {
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    commissionRevenue: 0,
    promotionalRevenue: 0,
    spotlightRevenue: 0,
    totalOrders: 0,
    totalArtisans: 0,
    averageOrderValue: 0,
    commissionRate: 0.10,
    growthRate: 0
  });
  
  const [analytics, setAnalytics] = useState({
    dailyRevenue: [],
    topArtisans: [],
    topCategories: [],
    revenueBySource: [],
    monthlyTrends: []
  });
  
  const [timeRange, setTimeRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load platform revenue summary
      const platformData = await revenueService.getPlatformRevenueSummary(timeRange);
      
      // Load spotlight revenue stats
      const spotlightData = await revenueService.getSpotlightRevenueStats(timeRange);
      
      // Load promotional revenue from admin service
      const promotionalData = await adminService.getPromotionalStats(timeRange);
      
      // Load general analytics
      const analyticsData = await adminService.getAnalytics(timeRange);

      // Combine all revenue data
      const combinedData = {
        totalRevenue: (platformData.commissionRevenue?.totalCommission || 0) + 
                     (promotionalData?.totalPromotionalRevenue || 0) + 
                     (spotlightData?.stats?.totalRevenue || 0),
        commissionRevenue: platformData.commissionRevenue?.totalCommission || 0,
        promotionalRevenue: promotionalData?.totalPromotionalRevenue || 0,
        spotlightRevenue: spotlightData?.stats?.totalRevenue || 0,
        totalOrders: platformData.commissionRevenue?.orderCount || 0,
        totalArtisans: analyticsData?.totalArtisans || 0,
        averageOrderValue: platformData.commissionRevenue?.averageOrderValue || 0,
        commissionRate: 0.10,
        growthRate: analyticsData?.growthRate || 0
      };

      setRevenueData(combinedData);

      // Set analytics data
      setAnalytics({
        dailyRevenue: spotlightData?.dailyRevenue || [],
        topArtisans: analyticsData?.topArtisans || [],
        topCategories: analyticsData?.topCategories || [],
        revenueBySource: [
          { name: 'Commission (10%)', value: combinedData.commissionRevenue, color: 'bg-blue-500' },
          { name: 'Promotional Features', value: combinedData.promotionalRevenue, color: 'bg-green-500' },
          { name: 'Artisan Spotlight', value: combinedData.spotlightRevenue, color: 'bg-purple-500' }
        ],
        monthlyTrends: analyticsData?.monthlyTrends || []
      });

    } catch (error) {
      console.error('Error loading revenue data:', error);
      setError('Failed to load revenue data');
      toast.error('Failed to load revenue data');
      
      // Set fallback data
      setRevenueData({
        totalRevenue: 0,
        commissionRevenue: 0,
        promotionalRevenue: 0,
        spotlightRevenue: 0,
        totalOrders: 0,
        totalArtisans: 0,
        averageOrderValue: 0,
        commissionRate: 0.10,
        growthRate: 0
      });
      } finally {
        setIsLoading(false);
      }
    };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Admin Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Revenue Management</h1>
            <p className="text-gray-600 mt-1">Track platform revenue performance and financial metrics</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(revenueData.totalRevenue)}
                </p>
                <p className="text-sm text-green-600">
                  {revenueData.growthRate > 0 ? '+' : ''}{formatPercentage(revenueData.growthRate)} vs last period
                </p>
              </div>
            </div>
          </div>
          
          {/* Commission Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Commission Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(revenueData.commissionRevenue)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatPercentage(revenueData.commissionRate * 100)} of {revenueData.totalOrders} orders
                </p>
              </div>
            </div>
          </div>
          
          {/* Promotional Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <SparklesIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Promotional Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(revenueData.promotionalRevenue)}
                </p>
                <p className="text-sm text-gray-600">
                  Featured products & sponsored listings
                </p>
              </div>
            </div>
          </div>
          
          {/* Spotlight Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Spotlight Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(revenueData.spotlightRevenue)}
                </p>
                <p className="text-sm text-gray-600">
                  Artisan spotlight subscriptions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Source */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Source</h3>
            <div className="space-y-4">
              {analytics.revenueBySource.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full ${source.color} mr-3`}></div>
                    <span className="text-sm font-medium text-gray-700">{source.name}</span>
              </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(source.value)}
                  </span>
              </div>
              ))}
            </div>
          </div>
          
          {/* Platform Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Metrics</h3>
            <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Total Orders</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{revenueData.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Active Artisans</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{revenueData.totalArtisans}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Average Order Value</span>
            </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(revenueData.averageOrderValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Commission Rate</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatPercentage(revenueData.commissionRate * 100)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Artisans */}
        {analytics.topArtisans.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Artisans</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Artisan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Earned
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.topArtisans.slice(0, 10).map((artisan, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingStorefrontIcon className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {artisan.artisanName || `${artisan.firstName} ${artisan.lastName}`}
                            </div>
                            <div className="text-sm text-gray-500">{artisan.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(artisan.totalRevenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {artisan.orderCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency((artisan.totalRevenue || 0) * revenueData.commissionRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {/* Top Categories */}
        {analytics.topCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Revenue Categories</h3>
            <div className="space-y-4">
              {analytics.topCategories.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {category.name?.replace(/_/g, ' ') || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(category.revenue || 0)}
                  </div>
                    <div className="text-xs text-gray-500">
                      {category.orders || 0} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Transparency Note */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <EyeIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Revenue Transparency</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This platform operates on a transparent revenue model where 10% of each sale goes to platform maintenance and development, 
                  while 90% goes directly to artisans. Additional revenue comes from promotional features and spotlight subscriptions.
                </p>
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}