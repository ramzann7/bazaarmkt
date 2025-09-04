import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  ArrowArrowTrendingUpIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { spotlightService } from '../services/spotlightService';
import { promotionalService } from '../services/promotionalService';
import toast from 'react-hot-toast';

export default function PromotionalDashboard() {
  const [spotlightStats, setSpotlightStats] = useState(null);
  const [activeSpotlights, setActiveSpotlights] = useState([]);
  const [promotionalStats, setPromotionalStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    loadPromotionalData();
  }, [selectedPeriod]);

  const loadPromotionalData = async () => {
    try {
      setIsLoading(true);
      const [spotlightRevenue, activeSpotlightsData, promotionalData] = await Promise.all([
        spotlightService.getSpotlightRevenue(selectedPeriod),
        spotlightService.getActiveSpotlights(),
        promotionalService.getPromotionalStats()
      ]);
      
      setSpotlightStats(spotlightRevenue);
      setActiveSpotlights(activeSpotlightsData.spotlights || []);
      setPromotionalStats(promotionalData);
    } catch (error) {
      console.error('Error loading promotional data:', error);
      toast.error('Failed to load promotional dashboard data');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRemainingDays = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promotional Dashboard</h2>
          <p className="text-gray-600">Track spotlight subscriptions and promotional revenue</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Spotlight Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(spotlightStats?.stats?.totalRevenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Spotlights</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeSpotlights.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {spotlightStats?.stats?.totalSubscriptions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(spotlightStats?.stats?.averageAmount || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Spotlights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-amber-500" />
            Active Spotlight Subscriptions
          </h3>
        </div>
        <div className="overflow-x-auto">
          {activeSpotlights.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artisan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeSpotlights.map((spotlight) => (
                  <tr key={spotlight.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {spotlight.artisan.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {spotlight.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {spotlight.artisan.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(spotlight.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(spotlight.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        spotlight.remainingDays <= 3 
                          ? 'bg-red-100 text-red-800' 
                          : spotlight.remainingDays <= 7 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {spotlight.remainingDays} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(spotlight.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <SparklesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Spotlights</h3>
              <p className="text-gray-600">No artisans currently have active spotlight subscriptions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      {spotlightStats?.dailyRevenue && spotlightStats.dailyRevenue.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Breakdown</h3>
          <div className="space-y-4">
            {spotlightStats.dailyRevenue.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    {day._id.month}/{day._id.day}/{day._id.year}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(day.revenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Subscriptions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {day.subscriptions}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-6">
        <div className="flex items-center mb-4">
          <ArrowTrendingUpIcon className="w-6 h-6 text-amber-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Period</p>
            <p className="text-lg font-semibold text-gray-900">
              Last {selectedPeriod} days
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(spotlightStats?.stats?.totalRevenue || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
            <p className="text-lg font-semibold text-gray-900">
              {activeSpotlights.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
