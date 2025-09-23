import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  TruckIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import DeliveryRevenueService from '../../services/deliveryRevenueService';
import { toast } from 'react-hot-toast';

const DeliveryRevenueDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  const periods = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'trends', label: 'Trends', icon: ArrowTrendingUpIcon },
    { id: 'performance', label: 'Performance', icon: TruckIcon }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await DeliveryRevenueService.getDeliveryRevenueAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading delivery revenue analytics:', error);
      toast.error('Failed to load delivery revenue data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => DeliveryRevenueService.formatCurrency(amount);
  const formatPercentage = (value) => DeliveryRevenueService.formatPercentage(value);
  const getDeliveryMethodDisplayName = (method) => DeliveryRevenueService.getDeliveryMethodDisplayName(method);
  const getDeliveryMethodColor = (method) => DeliveryRevenueService.getDeliveryMethodColor(method);
  const getDeliveryMethodBgColor = (method) => DeliveryRevenueService.getDeliveryMethodBgColor(method);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center p-6 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12">
          <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Delivery Data</h3>
          <p className="text-gray-500">You haven't completed any delivery orders yet.</p>
        </div>
      </div>
    );
  }

  const { summary, trends, performance } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Revenue</h2>
          <p className="text-gray-600 mt-1">Track your delivery earnings and performance</p>
        </div>
        
        {/* Period Selector */}
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Delivery Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Delivery Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totals.totalDeliveryFees)}
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Delivery Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TruckIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Personal Delivery</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totals.personalDeliveryRevenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary.totals.personalDeliveryOrders} orders
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Delivery Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Professional Delivery</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totals.professionalDeliveryRevenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summary.totals.professionalDeliveryOrders} orders
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Credits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Wallet Credits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.totals.deliveryWalletCredits)}
                  </p>
                  <p className="text-xs text-gray-500">From personal delivery</p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Method Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Method Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Personal Delivery</p>
                      <p className="text-sm text-gray-600">{summary.breakdown.personalDelivery.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {formatCurrency(summary.breakdown.personalDelivery.revenue)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(summary.breakdown.personalDelivery.walletCredits)} to wallet
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-gray-900">Professional Delivery</p>
                      <p className="text-sm text-gray-600">{summary.breakdown.professionalDelivery.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
                      {formatCurrency(summary.breakdown.professionalDelivery.revenue)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(summary.breakdown.professionalDelivery.walletCredits)} to wallet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Delivery Orders</h3>
              <div className="space-y-3">
                {summary.recentOrders.slice(0, 5).map((order, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${getDeliveryMethodBgColor(order.deliveryMethod).replace('bg-', 'bg-').replace('-100', '-500')}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                        <p className="text-xs text-gray-500">
                          {getDeliveryMethodDisplayName(order.deliveryMethod)}
                          {order.distance && ` • ${order.distance.toFixed(1)}km`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(order.deliveryFee)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Revenue Trends</h3>
          {trends.length > 0 ? (
            <div className="space-y-4">
              {trends.slice(0, 10).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{trend.date}</p>
                    <p className="text-sm text-gray-600">
                      {trend.personalDeliveryCount} personal • {trend.professionalDeliveryCount} professional
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(trend.totalDeliveryFees)}</p>
                    <p className="text-sm text-gray-500">
                      Avg: {formatCurrency(trend.averageDeliveryFee)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trend data available for this period.</p>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Delivery Adoption</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(performance.overview.deliveryAdoptionRate)}
                  </p>
                  <p className="text-xs text-gray-500">of total orders</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(performance.overview.deliveryCompletionRate)}
                  </p>
                  <p className="text-xs text-gray-500">delivery orders</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Delivery Fee</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(performance.averages.deliveryFee)}
                  </p>
                  <p className="text-xs text-gray-500">per order</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPinIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Distance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performance.averages.deliveryDistance.toFixed(1)}km
                  </p>
                  <p className="text-xs text-gray-500">per delivery</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Method Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{performance.breakdown.pickup}</p>
                <p className="text-sm text-gray-600">Pickup Orders</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{performance.breakdown.personalDelivery}</p>
                <p className="text-sm text-gray-600">Personal Delivery</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{performance.breakdown.professionalDelivery}</p>
                <p className="text-sm text-gray-600">Professional Delivery</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryRevenueDashboard;
