import React, { useState, useEffect } from 'react';
import searchTrackingService from '../services/searchTrackingService';

export default function SearchTrackingTest() {
  const [searchStats, setSearchStats] = useState(null);
  const [testQuery, setTestQuery] = useState('');

  // Load search statistics
  useEffect(() => {
    const stats = searchTrackingService.getSearchStats();
    setSearchStats(stats);
  }, []);

  // Test search tracking
  const handleTestSearch = () => {
    if (testQuery.trim()) {
      searchTrackingService.trackSearch(testQuery, 'all');
      setTestQuery('');
      // Refresh stats
      setTimeout(() => {
        const stats = searchTrackingService.getSearchStats();
        setSearchStats(stats);
      }, 100);
    }
  };

  // Clear all search data
  const handleClearData = () => {
    searchTrackingService.clearSearchData();
    setSearchStats(searchTrackingService.getSearchStats());
  };

  // Get popular searches
  const popularSearches = searchTrackingService.getPopularSearches(7);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Tracking Test</h1>
      
      {/* Test Search Input */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Search Tracking</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter a search term to track..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleTestSearch}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Track Search
          </button>
        </div>
      </div>

      {/* Search Statistics */}
      {searchStats && (
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Search Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{searchStats.totalSearches}</div>
              <div className="text-sm text-gray-600">Total Searches</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">{searchStats.uniqueSearches}</div>
              <div className="text-sm text-gray-600">Unique Searches</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{searchStats.recentSearches}</div>
              <div className="text-sm text-gray-600">Recent (7 days)</div>
            </div>
          </div>
        </div>
      )}

      {/* Popular Searches */}
      <div className="mb-8 p-4 bg-green-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Top 7 Popular Searches</h2>
        {popularSearches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200"
              >
                #{index + 1}: {search}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No searches tracked yet. Try searching for something!</p>
        )}
      </div>

      {/* Clear Data Button */}
      <div className="text-center">
        <button
          onClick={handleClearData}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Clear All Search Data
        </button>
        <p className="text-xs text-gray-500 mt-2">
          This will reset all search tracking data (for testing purposes)
        </p>
      </div>
    </div>
  );
}
