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
  BanknotesIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import * as adminService from '../services/adminService';
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
    platformFeePercentage: 10,
    growthRate: 0
  });
  
  const [analytics, setAnalytics] = useState({
    dailyRevenue: [],
    topArtisans: [],
    topCategories: [],
    revenueBySource: [],
    monthlyTrends: []
  });
  
  const [transactions, setTransactions] = useState([]);
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

      // Load cash flow data with transactions
      const cashFlowResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/admin/cash-flow?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!cashFlowResponse.ok) {
        throw new Error('Failed to load cash flow data');
      }

      const cashFlowData = await cashFlowResponse.json();
      
      if (cashFlowData.success) {
        const summary = cashFlowData.data.summary;
        const txns = cashFlowData.data.transactions || [];

        // Update revenue data
        const combinedData = {
          totalRevenue: summary.totalRevenue || 0,
          commissionRevenue: summary.orderCommissions || 0,
          promotionalRevenue: summary.promotionalRevenue || 0,
          spotlightRevenue: summary.spotlightRevenue || 0,
          totalOrders: summary.totalOrders || 0,
          totalArtisans: 0,
          averageOrderValue: summary.totalOrders > 0 ? summary.totalGMV / summary.totalOrders : 0,
          commissionRate: (summary.platformFeePercentage || 10) / 100, // Convert to decimal
          platformFeePercentage: summary.platformFeePercentage || 10, // Store as percentage
          netRevenue: summary.netRevenue || 0,
          estimatedStripeFees: summary.estimatedStripeFees || 0,
          growthRate: 0
        };

        setRevenueData(combinedData);
        setTransactions(txns);

        // Set analytics data
        setAnalytics({
          dailyRevenue: [],
          topArtisans: [],
          topCategories: [],
          revenueBySource: [
            { name: `Order Commissions (${combinedData.platformFeePercentage}%)`, value: combinedData.commissionRevenue, color: 'bg-blue-500' },
            { name: 'Promotional Features', value: combinedData.promotionalRevenue, color: 'bg-green-500' },
            { name: 'Artisan Spotlight', value: combinedData.spotlightRevenue, color: 'bg-purple-500' }
          ],
          monthlyTrends: []
        });
      }

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
        platformFeePercentage: 10,
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

        {/* Recent Revenue Transactions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ReceiptPercentIcon className="w-5 h-5 mr-2 text-emerald-600" />
              Recent Revenue Transactions
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              All platform revenue transactions from orders, promotions, and spotlight
            </p>
          </div>
          <div className="p-6">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BanknotesIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No transactions found for this time period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
                  <div 
                    key={transaction._id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'order_commission' ? 'bg-blue-100' :
                        transaction.type === 'spotlight_subscription' ? 'bg-purple-100' :
                        'bg-green-100'
                      }`}>
                        {transaction.type === 'order_commission' ? (
                          <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                        ) : transaction.type === 'spotlight_subscription' ? (
                          <SparklesIcon className="w-5 h-5 text-purple-600" />
                        ) : (
                          <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description || transaction.type}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            transaction.type === 'order_commission' ? 'bg-blue-100 text-blue-700' :
                            transaction.type === 'spotlight_subscription' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {transaction.type === 'order_commission' ? 'Order Commission' :
                             transaction.type === 'spotlight_subscription' ? 'Spotlight' :
                             'Promotional'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-600">
                        ${transaction.amount?.toFixed(2) || '0.00'}
                      </p>
                      {transaction.totalAmount && (
                        <p className="text-xs text-gray-500">
                          of ${transaction.totalAmount.toFixed(2)}
                        </p>
                      )}
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