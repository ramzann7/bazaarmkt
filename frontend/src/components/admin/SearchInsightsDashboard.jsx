/**
 * Search Insights Dashboard
 * Admin dashboard to view search analytics and performance metrics
 */

import React, { useState, useEffect } from 'react';
import searchAnalyticsService from '../../services/searchAnalyticsService';
import { 
  MagnifyingGlassIcon, 
  ChartBarIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon
} from '@heroicons/react/24/outline';

const SearchInsightsDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchAnalyticsService.getSearchInsights(timeRange);
      console.log('📊 Search insights data received:', data);
      setInsights(data);
    } catch (err) {
      console.error('Failed to load search insights:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadInsights}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = insights?.summary || {};
  const popularSearches = Array.isArray(insights?.popularSearches) ? insights.popularSearches : [];
  const zeroResultSearches = Array.isArray(insights?.zeroResultSearches) ? insights.zeroResultSearches : [];
  const slowQueries = Array.isArray(insights?.slowQueries) ? insights.slowQueries : [];

  console.log('📊 Component state:', {
    summary,
    popularSearches: popularSearches.length,
    zeroResultSearches: zeroResultSearches.length,
    slowQueries: slowQueries.length
  });

  console.log('📊 First popular search:', popularSearches[0]);
  console.log('📊 Type of first popular search:', typeof popularSearches[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MagnifyingGlassIcon className="w-8 h-8 text-blue-600" />
              Search Analytics
            </h2>
            <p className="text-gray-600 mt-1">
              Insights into user search behavior and performance
            </p>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Searches"
          value={summary.totalSearches || 0}
          icon={<MagnifyingGlassIcon className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${summary.avgResponseTime || 0}ms`}
          icon={<ClockIcon className="w-6 h-6" />}
          color="green"
          subtitle={summary.avgResponseTime < 200 ? 'Excellent' : summary.avgResponseTime < 500 ? 'Good' : 'Needs improvement'}
        />
        <MetricCard
          title="Zero Results Rate"
          value={`${(typeof summary.zeroResultsRate === 'number' ? summary.zeroResultsRate.toFixed(1) : 0)}%`}
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          color="yellow"
          subtitle={(typeof summary.zeroResultsRate === 'number' && summary.zeroResultsRate < 10) ? 'Good' : 'Review queries'}
        />
        <MetricCard
          title="Click-Through Rate"
          value={`${(typeof summary.clickThroughRate === 'number' ? summary.clickThroughRate.toFixed(1) : 0)}%`}
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="purple"
          subtitle={(typeof summary.clickThroughRate === 'number') ? (summary.clickThroughRate > 30 ? 'Excellent' : summary.clickThroughRate > 15 ? 'Good' : 'Can improve') : 'No data'}
        />
      </div>

      {/* Popular Searches & Zero Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Searches */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-orange-500" />
              Popular Searches
            </h3>
            <p className="text-sm text-gray-600 mt-1">Most searched terms</p>
          </div>
          <div className="p-6">
            {popularSearches.length > 0 ? (
              <div className="space-y-3">
                {popularSearches.map((search, index) => {
                  // Defensive check for search object
                  if (!search || typeof search !== 'object') {
                    console.error('Invalid search object:', search, 'at index:', index);
                    return null;
                  }
                  return (
                  <div 
                    key={`popular-${index}-${search.query || 'unknown'}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg font-bold text-gray-400 w-6">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{search.query || 'Unknown'}</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          <span>{search.count || 0} searches</span>
                          <span>~{search.avgResults || 0} results</span>
                          <span>{search.avgResponseTime || 0}ms</span>
                          <span className="text-green-600">{(search.clickThroughRate || 0).toFixed(0)}% CTR</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {search.count || 0}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No search data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Zero Result Searches */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              Zero Result Searches
            </h3>
            <p className="text-sm text-gray-600 mt-1">Searches that found nothing</p>
          </div>
          <div className="p-6">
            {zeroResultSearches.length > 0 ? (
              <div className="space-y-3">
                {zeroResultSearches.map((search, index) => {
                  if (!search || typeof search !== 'object') {
                    console.error('Invalid zero-result search object:', search);
                    return null;
                  }
                  return (
                  <div 
                    key={`zero-${index}-${search.query || 'unknown'}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-red-900">{search.query || 'Unknown'}</p>
                      <p className="text-xs text-red-600 mt-1">
                        {search.count || 0} attempt{(search.count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-red-200 text-red-900 rounded-full text-xs font-semibold">
                        Fix this
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-green-600 font-medium">🎉 All searches return results!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slow Queries */}
      {slowQueries.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-yellow-500" />
              Slow Queries
            </h3>
            <p className="text-sm text-gray-600 mt-1">Searches taking &gt;1 second</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {slowQueries.map((query, index) => {
                if (!query || typeof query !== 'object') {
                  console.error('Invalid slow query object:', query);
                  return null;
                }
                return (
                <div 
                  key={`slow-${index}-${query.query || 'unknown'}`}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">{query.query || 'Unknown'}</p>
                    <div className="flex gap-4 mt-1 text-xs text-yellow-700">
                      <span>{query.count || 0} occurrences</span>
                      <span>Avg: {query.avgResponseTime || 0}ms</span>
                      <span>Max: {query.maxResponseTime || 0}ms</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-xs font-semibold">
                      Optimize
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Optimization Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">For Zero-Result Searches:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Add missing products to catalog</li>
              <li>• Update product tags and descriptions</li>
              <li>• Consider spelling variations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 mb-2">For Slow Queries:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• Check database indexes</li>
              <li>• Review query complexity</li>
              <li>• Consider caching strategies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Metric Card Component
 */
const MetricCard = ({ title, value, subtitle, icon, color }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  const iconBgStyles = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className={`${colorStyles[color]} border rounded-lg p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBgStyles[color]} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-600">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default SearchInsightsDashboard;

