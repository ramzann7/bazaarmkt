# Search Optimization Implementation Examples

## Backend Implementation Examples

### 1. Optimized Product Search Endpoint

```javascript
// backend/routes/products/optimizedSearch.js
const express = require('express');
const router = express.Router();

// Optimized search with native MongoDB text search
const optimizedProductSearch = async (req, res) => {
  try {
    const startTime = Date.now();
    const { 
      q: searchQuery, 
      category, 
      subcategory, 
      minPrice, 
      maxPrice, 
      lat, 
      lng, 
      radius = 50,
      limit = 20,
      offset = 0,
      sortBy = 'relevance' 
    } = req.query;

    const db = req.db;
    const productsCollection = db.collection('products');
    
    // Build optimized aggregation pipeline
    const pipeline = [];
    
    // Stage 1: Initial match with text search
    const matchStage = {
      status: 'active',
      $or: [
        { productType: 'ready_to_ship', stock: { $gt: 0 } },
        { productType: 'made_to_order', remainingCapacity: { $gt: 0 } },
        { productType: 'scheduled_order', availableQuantity: { $gt: 0 } }
      ]
    };
    
    if (searchQuery) {
      matchStage.$text = { $search: searchQuery };
    }
    
    if (category) matchStage.category = category;
    if (subcategory) matchStage.subcategory = subcategory;
    if (minPrice || maxPrice) {
      matchStage.price = {};
      if (minPrice) matchStage.price.$gte = parseFloat(minPrice);
      if (maxPrice) matchStage.price.$lte = parseFloat(maxPrice);
    }
    
    pipeline.push({ $match: matchStage });
    
    // Stage 2: Add relevance scoring
    if (searchQuery) {
      pipeline.push({
        $addFields: {
          textScore: { $meta: "textScore" },
          relevanceScore: {
            $add: [
              { $multiply: [{ $meta: "textScore" }, 0.6] }, // Text relevance weight
              { $multiply: [{ $ifNull: ["$views", 0] }, 0.0001] }, // Popularity
              { $multiply: [{ $ifNull: ["$soldCount", 0] }, 0.001] }, // Sales history
              { $cond: [{ $eq: ["$isFeatured", true] }, 50, 0] }, // Featured boost
              { $cond: [{ $gte: ["$createdAt", new Date(Date.now() - 30*24*60*60*1000)] }, 25, 0] } // Recent boost
            ]
          }
        }
      });
    }
    
    // Stage 3: Geospatial filtering (if location provided)
    if (lat && lng) {
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo',
          pipeline: [{
            $geoNear: {
              near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
              distanceField: "distance",
              maxDistance: radius * 1000, // Convert km to meters
              spherical: true
            }
          }]
        }
      });
    } else {
      // Regular lookup for artisan info
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      });
    }
    
    // Stage 4: Unwind artisan info
    pipeline.push({
      $unwind: { path: '$artisanInfo', preserveNullAndEmptyArrays: true }
    });
    
    // Stage 5: Final projection to optimize data transfer
    pipeline.push({
      $project: {
        name: 1,
        description: 1,
        price: 1,
        images: 1,
        category: 1,
        subcategory: 1,
        productType: 1,
        stock: 1,
        remainingCapacity: 1,
        availableQuantity: 1,
        createdAt: 1,
        isFeatured: 1,
        views: 1,
        soldCount: 1,
        textScore: 1,
        relevanceScore: 1,
        'artisanInfo.artisanName': 1,
        'artisanInfo.businessName': 1,
        'artisanInfo.profileImage': 1,
        'artisanInfo.address.city': 1,
        'artisanInfo.address.state': 1,
        'artisanInfo.distance': 1
      }
    });
    
    // Stage 6: Sorting
    const sortStage = {};
    switch (sortBy) {
      case 'price-low':
        sortStage.price = 1;
        break;
      case 'price-high':
        sortStage.price = -1;
        break;
      case 'newest':
        sortStage.createdAt = -1;
        break;
      case 'popular':
        sortStage.views = -1;
        break;
      case 'distance':
        if (lat && lng) {
          sortStage['artisanInfo.distance'] = 1;
        } else {
          sortStage.relevanceScore = -1;
        }
        break;
      default: // relevance
        if (searchQuery) {
          sortStage.relevanceScore = -1;
        } else {
          sortStage.createdAt = -1;
        }
    }
    pipeline.push({ $sort: sortStage });
    
    // Stage 7: Pagination
    if (offset > 0) pipeline.push({ $skip: parseInt(offset) });
    pipeline.push({ $limit: parseInt(limit) });
    
    // Execute search
    const results = await productsCollection.aggregate(pipeline).toArray();
    
    // Get total count for pagination (run separately for performance)
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: "total" });
    const countResult = await productsCollection.aggregate(countPipeline).toArray();
    const totalCount = countResult[0]?.total || 0;
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log search analytics
    await logSearchAnalytics({
      query: searchQuery,
      filters: { category, subcategory, minPrice, maxPrice },
      resultCount: results.length,
      totalCount,
      responseTime,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      data: {
        products: results,
        pagination: {
          total: totalCount,
          page: Math.floor(offset / limit) + 1,
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        },
        searchMetadata: {
          query: searchQuery,
          responseTime,
          hasLocation: !!(lat && lng),
          sortedBy: sortBy
        }
      }
    });
    
  } catch (error) {
    console.error('Optimized search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

// Search suggestions endpoint
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const db = req.db;
    const productsCollection = db.collection('products');
    
    // Get product name suggestions using text search
    const productSuggestions = await productsCollection
      .find(
        { 
          $text: { $search: query },
          status: 'active'
        },
        { score: { $meta: "textScore" } }
      )
      .project({ name: 1, category: 1 })
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .toArray();
    
    // Get category suggestions
    const categorySuggestions = await productsCollection
      .distinct('category', {
        category: { $regex: query, $options: 'i' },
        status: 'active'
      });
    
    // Combine and format suggestions
    const suggestions = [
      ...productSuggestions.map(p => ({
        type: 'product',
        text: p.name,
        category: p.category
      })),
      ...categorySuggestions.slice(0, 3).map(cat => ({
        type: 'category',
        text: cat
      }))
    ];
    
    res.json({ suggestions });
    
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.json({ suggestions: [] });
  }
};

// Search analytics logging
const logSearchAnalytics = async (searchData) => {
  try {
    const db = req.db;
    await db.collection('search_analytics').insertOne({
      ...searchData,
      zeroResults: searchData.resultCount === 0,
      slowQuery: searchData.responseTime > 500
    });
  } catch (error) {
    console.error('Failed to log search analytics:', error);
  }
};

router.get('/optimized-search', optimizedProductSearch);
router.get('/suggestions', getSearchSuggestions);

module.exports = router;
```

### 2. Enhanced Database Indexes

```javascript
// backend/config/optimized-indexes.js
async function createOptimizedSearchIndexes(db) {
  const productsCollection = db.collection('products');
  
  // Compound text index with weights for better relevance
  await productsCollection.createIndex(
    {
      name: "text",
      description: "text", 
      tags: "text",
      category: "text"
    },
    {
      weights: {
        name: 10,
        tags: 5,
        category: 3,
        description: 1
      },
      name: "optimized_text_search"
    }
  );
  
  // Compound indexes for common filter combinations
  await productsCollection.createIndex({
    status: 1,
    category: 1,
    subcategory: 1,
    price: 1
  });
  
  await productsCollection.createIndex({
    status: 1,
    createdAt: -1,
    isFeatured: -1
  });
  
  await productsCollection.createIndex({
    status: 1,
    views: -1,
    soldCount: -1
  });
  
  // Geospatial index for artisans collection
  const artisansCollection = db.collection('artisans');
  await artisansCollection.createIndex({
    "address.coordinates": "2dsphere"
  });
  
  console.log('✅ Optimized search indexes created');
}
```

## Frontend Implementation Examples

### 3. Optimized Search Service

```javascript
// frontend/src/services/optimizedSearchService.js
import api from './apiClient';
import { debounce } from 'lodash';

class OptimizedSearchService {
  constructor() {
    this.searchCache = new Map();
    this.suggestionsCache = new Map();
    this.debouncedSuggestions = debounce(this._fetchSuggestions.bind(this), 300);
  }
  
  // Main search method
  async searchProducts(query, filters = {}, options = {}) {
    const cacheKey = this._generateCacheKey(query, filters);
    
    // Check cache first
    const cached = this._getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      // Add options
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      
      // Add user location if available
      const location = await this._getUserLocation();
      if (location) {
        params.append('lat', location.latitude);
        params.append('lng', location.longitude);
        if (filters.radius) params.append('radius', filters.radius);
      }
      
      const response = await api.get(`/api/products/optimized-search?${params}`);
      
      // Cache successful results
      this._setCachedResult(cacheKey, response.data);
      
      return response.data;
      
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
  
  // Search suggestions with caching and debouncing
  async getSearchSuggestions(query) {
    if (!query || query.length < 2) {
      return [];
    }
    
    // Check suggestions cache
    const cached = this.suggestionsCache.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.suggestions;
    }
    
    return new Promise((resolve) => {
      this.debouncedSuggestions(query, resolve);
    });
  }
  
  async _fetchSuggestions(query, resolve) {
    try {
      const response = await api.get(`/api/products/suggestions?q=${encodeURIComponent(query)}`);
      const suggestions = response.data.suggestions || [];
      
      // Cache suggestions
      this.suggestionsCache.set(query.toLowerCase(), {
        suggestions,
        timestamp: Date.now()
      });
      
      resolve(suggestions);
    } catch (error) {
      console.error('Suggestions error:', error);
      resolve([]);
    }
  }
  
  // Cache management
  _generateCacheKey(query, filters) {
    return JSON.stringify({ query, filters });
  }
  
  _getCachedResult(key) {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.data;
    }
    return null;
  }
  
  _setCachedResult(key, data) {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.searchCache.size > 100) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
  }
  
  // Get user location with caching
  async _getUserLocation() {
    if (this.cachedLocation && Date.now() - this.cachedLocation.timestamp < 600000) { // 10 minutes
      return this.cachedLocation.location;
    }
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });
      
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      this.cachedLocation = {
        location,
        timestamp: Date.now()
      };
      
      return location;
    } catch (error) {
      console.warn('Location access denied:', error);
      return null;
    }
  }
  
  // Clear caches
  clearCache() {
    this.searchCache.clear();
    this.suggestionsCache.clear();
    this.cachedLocation = null;
  }
}

export const optimizedSearchService = new OptimizedSearchService();
export default optimizedSearchService;
```

### 4. Enhanced Search Component

```jsx
// frontend/src/components/OptimizedSearchBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { optimizedSearchService } from '../services/optimizedSearchService';
import { useDebounce } from '../hooks/useDebounce';

const OptimizedSearchBar = ({ className = '', placeholder = 'Search products...' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Debounce query for suggestions
  const debouncedQuery = useDebounce(query, 300);
  
  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);
  
  const fetchSuggestions = useCallback(async (searchQuery) => {
    setIsLoading(true);
    try {
      const results = await optimizedSearchService.getSearchSuggestions(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.length < 2) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, []);
  
  const handleSearch = useCallback((searchQuery = query) => {
    if (!searchQuery.trim()) return;
    
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }, [query, navigate]);
  
  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  }, [handleSearch]);
  
  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSearch, handleSuggestionClick]);
  
  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions]);
  
  const handleBlur = useCallback((e) => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {suggestion.type === 'product' ? '🏷️' : '📂'}
                </span>
                <span className="text-gray-900">{suggestion.text}</span>
                {suggestion.category && (
                  <span className="text-xs text-gray-500">in {suggestion.category}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedSearchBar;
```

## Performance Monitoring Implementation

### 5. Search Analytics Dashboard Component

```jsx
// frontend/src/components/admin/SearchAnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const SearchAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);
  
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSearchAnalytics(timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load search analytics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Loading analytics...</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Search Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Searches"
          value={analytics?.totalSearches}
          change={analytics?.searchesChange}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analytics?.avgResponseTime}ms`}
          change={analytics?.responseTimeChange}
          isTime
        />
        <MetricCard
          title="Zero Results Rate"
          value={`${analytics?.zeroResultsRate}%`}
          change={analytics?.zeroResultsChange}
          inverted
        />
        <MetricCard
          title="Click-Through Rate"
          value={`${analytics?.clickThroughRate}%`}
          change={analytics?.ctrChange}
        />
      </div>
      
      {/* Popular Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Popular Searches</h3>
          <div className="space-y-2">
            {analytics?.popularSearches?.map((search, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{search.query}</span>
                <span className="text-sm text-gray-600">{search.count} searches</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Zero Result Searches</h3>
          <div className="space-y-2">
            {analytics?.zeroResultSearches?.map((search, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium text-red-900">{search.query}</span>
                <span className="text-sm text-red-600">{search.count} times</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change, isTime, inverted }) => {
  const isPositive = inverted ? change < 0 : change > 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changeIcon = isPositive ? '↗' : '↘';
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {change && (
        <div className={`text-sm ${changeColor}`}>
          {changeIcon} {Math.abs(change)}% from last period
        </div>
      )}
    </div>
  );
};

export default SearchAnalyticsDashboard;
```

These implementation examples provide practical, production-ready code that addresses the major search optimization needs identified in the analysis. The optimizations focus on:

1. **Performance**: Native text search, efficient aggregation pipelines, and intelligent caching
2. **User Experience**: Fast suggestions, debounced input, and comprehensive search results
3. **Scalability**: Optimized database queries and indexes that scale with data growth
4. **Monitoring**: Analytics and performance tracking to identify issues proactively

Implementing these optimizations will significantly improve search performance and prepare the system for large-scale product catalogs.
