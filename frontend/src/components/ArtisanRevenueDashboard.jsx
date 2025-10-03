import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ShoppingCartIcon,
  TruckIcon,
  ReceiptPercentIcon,
  BanknotesIcon,
  CubeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { revenueService } from '../services/revenueService';
import toast from 'react-hot-toast';

export default function ArtisanRevenueDashboard() {
  const [revenueData, setRevenueData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [selectedPeriod]);

  const loadRevenueData = async () => {
    try {
      setIsLoading(true);
      const data = await revenueService.getArtisanRevenueSummary(selectedPeriod);
      setRevenueData(data);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast.error('Failed to load revenue data');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!revenueData || !revenueData.revenue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">No revenue data available for this period.</p>
        </div>
      </div>
    );
  }

  const { revenue, topProducts = [], trends = [], deliveryBreakdown = {}, averageOrderValue = 0, platformFeePercentage = 10 } = revenueData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Revenue Management</h1>
        <p className="text-gray-600 mt-2">Track your earnings and sales performance</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['week', 'month', 'quarter', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatCurrency(revenue.totalGrossAmount)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Products + Delivery</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Product Revenue */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Product Revenue</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {formatCurrency(revenue.productRevenue)}
              </p>
              <p className="text-xs text-purple-600 mt-1">Before commission</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <ShoppingCartIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Delivery Revenue */}
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl shadow-sm border border-cyan-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-700">Delivery Revenue</p>
              <p className="text-2xl font-bold text-cyan-900 mt-1">
                {formatCurrency(revenue.deliveryRevenue)}
              </p>
              <p className="text-xs text-cyan-600 mt-1">100% yours</p>
            </div>
            <div className="p-3 bg-cyan-200 rounded-lg">
              <TruckIcon className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Platform Commission</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {formatCurrency(revenue.totalCommission)}
              </p>
              <p className="text-xs text-red-600 mt-1">{platformFeePercentage}% on products</p>
            </div>
            <div className="p-3 bg-red-200 rounded-lg">
              <ReceiptPercentIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Net Earnings */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Net Earnings</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {formatCurrency(revenue.totalEarnings)}
              </p>
              <p className="text-xs text-accent mt-1">After commission</p>
            </div>
            <div className="p-3 bg-emerald-200 rounded-lg">
              <BanknotesIcon className="h-8 w-8 text-accent" />
            </div>
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-gradient-to-br from-amber-50 to-primary-100 rounded-xl shadow-sm border border-primary-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-dark">Total Orders</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {formatNumber(revenue.orderCount)}
              </p>
              <p className="text-xs text-primary mt-1">This {selectedPeriod}</p>
            </div>
            <div className="p-3 bg-primary-200 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Products Sold */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">Products Sold</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">
                {formatNumber(revenue.totalProductsSold)}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Avg {revenue.averageItemsPerOrder?.toFixed(1) || 0} per order
              </p>
            </div>
            <div className="p-3 bg-indigo-200 rounded-lg">
              <CubeIcon className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-sm border border-pink-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-700">Avg Order Value</p>
              <p className="text-2xl font-bold text-pink-900 mt-1">
                {formatCurrency(averageOrderValue)}
              </p>
              <p className="text-xs text-pink-600 mt-1">Per order</p>
            </div>
            <div className="p-3 bg-pink-200 rounded-lg">
              <CalendarIcon className="h-8 w-8 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 text-orange-600 mr-2" />
            Top Selling Products
          </h2>
          
          {topProducts && topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((product) => (
                <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold">{product.rank}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatNumber(product.quantitySold)} sold • {formatNumber(product.orderCount)} orders
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-accent">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No product sales in this period</p>
            </div>
          )}
        </div>

        {/* Commission & Fees Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ReceiptPercentIcon className="h-6 w-6 text-purple-600 mr-2" />
            Commission & Earnings
          </h2>
          
          <div className="space-y-4">
            {/* Visual breakdown */}
            <div className="space-y-3">
              {/* Your Earnings */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">Your Earnings</span>
                  <span className="text-lg font-bold text-emerald-900">
                    {100 - platformFeePercentage}%
                  </span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full" 
                    style={{ width: `${100 - platformFeePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-accent mt-2">
                  {formatCurrency(revenue.productEarnings)} from products
                </p>
              </div>

              {/* Platform Commission */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">Platform Commission</span>
                  <span className="text-lg font-bold text-red-900">
                    {platformFeePercentage}%
                  </span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full" 
                    style={{ width: `${platformFeePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  {formatCurrency(revenue.totalCommission)} on products
                </p>
              </div>

              {/* Delivery Revenue */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-cyan-700">Delivery Fees</span>
                  <span className="text-lg font-bold text-cyan-900">100%</span>
                </div>
                <div className="w-full bg-cyan-200 rounded-full h-3">
                  <div className="bg-cyan-500 h-3 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-cyan-600 mt-2">
                  {formatCurrency(revenue.deliveryRevenue)} (no commission)
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(revenue.totalGrossAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Platform Commission</span>
                <span className="text-sm font-semibold text-red-600">
                  -{formatCurrency(revenue.totalCommission)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-base font-semibold text-gray-900">Your Total Earnings</span>
                <span className="text-lg font-bold text-accent">
                  {formatCurrency(revenue.totalEarnings)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Breakdown */}
      {revenue.deliveryRevenue > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TruckIcon className="h-6 w-6 text-cyan-600 mr-2" />
            Delivery Revenue Breakdown
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pickup Orders */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Pickup Orders</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(revenue.pickupOrders)}
                </span>
              </div>
              <p className="text-xs text-gray-500">No delivery fee</p>
              <p className="text-lg font-semibold text-gray-600 mt-2">$0.00</p>
            </div>

            {/* Personal Delivery */}
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cyan-700">Personal Delivery</span>
                <span className="text-2xl font-bold text-cyan-900">
                  {formatNumber(revenue.personalDeliveryOrders)}
                </span>
              </div>
              <p className="text-xs text-cyan-600">100% to you</p>
              <p className="text-lg font-semibold text-cyan-600 mt-2">
                {formatCurrency(deliveryBreakdown.personal?.revenue || revenue.deliveryRevenue)}
              </p>
            </div>

            {/* Professional Delivery */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Professional Delivery</span>
                <span className="text-2xl font-bold text-blue-900">
                  {formatNumber(revenue.professionalDeliveryOrders)}
                </span>
              </div>
              <p className="text-xs text-blue-600">Handled by service</p>
              <p className="text-lg font-semibold text-blue-600 mt-2">$0.00</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trends */}
      {trends && trends.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 mr-2" />
            Revenue Trends
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trends.map((trend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trend.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {formatNumber(trend.orders)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-medium">
                      {formatCurrency(trend.productRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-cyan-600 font-medium">
                      {formatCurrency(trend.deliveryRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-accent font-semibold">
                      {formatCurrency(trend.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
