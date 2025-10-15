import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('revenueDashboard.failedToLoad'));
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600">{t('revenueDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (!revenueData || !revenueData.revenue) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-stone-500">{t('revenueDashboard.noDataAvailable')}</p>
          </div>
        </div>
      </div>
    );
  }

  const { revenue, topProducts = [], trends = [], deliveryBreakdown = {}, averageOrderValue = 0, platformFeePercentage = 10 } = revenueData;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Period Selector - Mobile Optimized */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{t('revenueDashboard.title')}</h1>
              <p className="text-sm text-gray-600">{t('revenueDashboard.subtitle')}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['week', 'month', 'quarter', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ${
                    selectedPeriod === period
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t(`revenueDashboard.${period}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* Key Revenue Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <div className="hidden sm:flex w-8 h-8 bg-amber-100 rounded-lg items-center justify-center mx-auto mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{t('revenueDashboard.totalRevenue')}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {formatCurrency(revenue.totalGrossAmount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">Products + Delivery</p>
          </div>
        </div>

        {/* Net Earnings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <div className="hidden sm:flex w-8 h-8 bg-emerald-100 rounded-lg items-center justify-center mx-auto mb-2">
              <BanknotesIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{t('revenueDashboard.netEarnings')}</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600">
              {formatCurrency(revenue.totalEarnings)}
            </p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">{t('revenueDashboard.afterCommission')}</p>
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <div className="hidden sm:flex w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mx-auto mb-2">
              <ShoppingCartIcon className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{t('revenueDashboard.orders')}</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">
              {formatNumber(revenue.orderCount)}
            </p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">{t(`revenueDashboard.${selectedPeriod}`)}</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center">
            <div className="hidden sm:flex w-8 h-8 bg-purple-100 rounded-lg items-center justify-center mx-auto mb-2">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{t('revenueDashboard.averageOrderValue')}</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600">
              {formatCurrency(averageOrderValue)}
            </p>
            <p className="text-xs text-gray-500 mt-1 hidden sm:block">{t('revenueDashboard.avgPerOrder')}</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 mr-2" />
            {t('revenueDashboard.topSellingProducts')}
          </h2>
          
          {topProducts && topProducts.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {topProducts.slice(0, 5).map((product) => (
                <div key={product.productId} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-600 font-bold text-xs sm:text-sm">{product.rank}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {formatNumber(product.quantitySold)} sold • {formatNumber(product.orderCount)} orders
                      </p>
                      <p className="text-xs text-gray-500 sm:hidden">
                        {formatNumber(product.quantitySold)} sold
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 sm:ml-4 text-right">
                    <p className="text-xs sm:text-sm font-semibold text-emerald-600">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="text-sm">{t('revenueDashboard.noRevenueMessage')}</p>
            </div>
          )}
        </div>

        {/* Commission & Fees Breakdown */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <ReceiptPercentIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mr-2" />
            {t('revenueDashboard.revenueBreakdown')}
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            {/* Visual breakdown */}
            <div className="space-y-2 sm:space-y-3">
              {/* Your Earnings */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-emerald-700">{t('revenueDashboard.netEarnings')}</span>
                  <span className="text-sm sm:text-lg font-bold text-emerald-900">
                    {100 - platformFeePercentage}%
                  </span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 sm:h-3">
                  <div 
                    className="bg-emerald-500 h-2 sm:h-3 rounded-full" 
                    style={{ width: `${100 - platformFeePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-emerald-600 mt-1 sm:mt-2">
                  {formatCurrency(revenue.productEarnings)} {t('revenueDashboard.onProducts')}
                </p>
              </div>

              {/* Platform Commission */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-medium text-red-700">{t('revenueDashboard.platformCommission')}</span>
                  <span className="text-sm sm:text-lg font-bold text-red-900">
                    {platformFeePercentage}%
                  </span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2 sm:h-3">
                  <div 
                    className="bg-red-500 h-2 sm:h-3 rounded-full" 
                    style={{ width: `${platformFeePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-red-600 mt-1 sm:mt-2">
                  {formatCurrency(revenue.totalCommission)} {t('revenueDashboard.onProducts')}
                </p>
              </div>

              {revenue.deliveryRevenue > 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-cyan-700">{t('revenueDashboard.deliveryRevenue')}</span>
                    <span className="text-sm sm:text-lg font-bold text-cyan-900">100%</span>
                  </div>
                  <div className="w-full bg-cyan-200 rounded-full h-2 sm:h-3">
                    <div className="bg-cyan-500 h-2 sm:h-3 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs text-cyan-600 mt-1 sm:mt-2">
                    {formatCurrency(revenue.deliveryRevenue)} ({t('revenueDashboard.deliveryRevenuePercent')})
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm text-gray-600">{t('revenueDashboard.totalRevenue')}</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {formatCurrency(revenue.totalGrossAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm text-gray-600">{t('revenueDashboard.platformCommission')}</span>
                <span className="text-xs sm:text-sm font-semibold text-red-600">
                  -{formatCurrency(revenue.totalCommission)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm sm:text-base font-semibold text-gray-800">{t('revenueDashboard.netEarnings')}</span>
                <span className="text-base sm:text-lg font-bold text-emerald-600">
                  {formatCurrency(revenue.totalEarnings)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Breakdown */}
      {revenue.deliveryRevenue > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            {t('revenueDashboard.deliveryBreakdown')}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Pickup Orders */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Pickup Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">
                  {formatNumber(revenue.pickupOrders)}
                </p>
                <p className="text-xs text-gray-500">No delivery fee</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-600 mt-1 sm:mt-2">$0.00</p>
              </div>
            </div>

            {/* Personal Delivery */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Personal Delivery</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-900 mb-1">
                  {formatNumber(revenue.personalDeliveryOrders)}
                </p>
                <p className="text-xs text-blue-600">100% to you</p>
                <p className="text-sm sm:text-lg font-semibold text-blue-600 mt-1 sm:mt-2">
                  {formatCurrency(deliveryBreakdown.personal?.revenue || revenue.deliveryRevenue)}
                </p>
              </div>
            </div>

            {/* Professional Delivery */}
            <div className="bg-emerald-50 rounded-lg p-3 sm:p-4 border border-emerald-200">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 mb-1">Professional Delivery</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-900 mb-1">
                  {formatNumber(revenue.professionalDeliveryOrders)}
                </p>
                <p className="text-xs text-emerald-600">Handled by service</p>
                <p className="text-sm sm:text-lg font-semibold text-emerald-600 mt-1 sm:mt-2">$0.00</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trends - Mobile Optimized */}
      {trends && trends.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mr-2" />
            Revenue Trends
          </h2>
          
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Product Rev.
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Delivery Rev.
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trends.map((trend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                      {trend.date}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-gray-500">
                      {formatNumber(trend.orders)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-purple-600 font-medium hidden sm:table-cell">
                      {formatCurrency(trend.productRevenue)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-cyan-600 font-medium hidden sm:table-cell">
                      {formatCurrency(trend.deliveryRevenue)}
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-green-600 font-semibold">
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
    </div>
  );
}
