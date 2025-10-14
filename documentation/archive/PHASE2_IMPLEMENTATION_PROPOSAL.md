# Phase 2 Advanced Search Features - Implementation Proposal

## Overview

This document outlines all backend endpoint changes and new database collections required for Phase 2 implementation. **Please review and approve before implementation.**

## 🗄️ New Database Collections

### 1. `search_analytics` Collection

**Purpose**: Track all search queries, performance metrics, and user behavior

**Schema**:
```javascript
{
  _id: ObjectId,
  query: String,              // Search query text
  userId: ObjectId,           // User who performed search (optional)
  timestamp: Date,            // When search was performed
  resultsCount: Number,       // Number of results returned
  responseTime: Number,       // Server response time in ms
  filters: {                  // Applied filters
    category: String,
    priceRange: [Number, Number],
    location: Object
  },
  zeroResults: Boolean,       // Whether search returned 0 results
  selectedResultId: ObjectId, // Product clicked (tracked via separate call)
  selectedResultPosition: Number, // Position of clicked result
  sessionId: String,          // Browser session ID
  ipAddress: String,          // User IP (anonymized)
  userAgent: String          // Browser info
}
```

**Indexes Needed**:
```javascript
db.search_analytics.createIndex({ timestamp: -1 });
db.search_analytics.createIndex({ query: 1, timestamp: -1 });
db.search_analytics.createIndex({ userId: 1, timestamp: -1 });
db.search_analytics.createIndex({ zeroResults: 1, timestamp: -1 });
```

**Privacy Considerations**:
- Store IP addresses in anonymized form (last octet removed)
- Allow users to opt-out of tracking
- Comply with data retention policies (auto-delete after 90 days)

---

## 🔌 New Backend Endpoints

### 1. Search Analytics Endpoint

**Endpoint**: `POST /api/search/analytics`

**Purpose**: Track search events and user interactions

**Request Body**:
```javascript
{
  query: "handmade pottery",
  resultsCount: 15,
  responseTime: 145,
  filters: {
    category: "Home & Decor",
    priceRange: [0, 100000]
  }
}
```

**Response**:
```javascript
{
  success: true,
  message: "Analytics tracked",
  analyticsId: "analytics_id_here"
}
```

**Implementation Location**: New file `backend/routes/search/analytics.js`

**Authentication**: Optional (tracks anonymous users too)

---

### 2. Search Result Click Tracking

**Endpoint**: `POST /api/search/analytics/:analyticsId/click`

**Purpose**: Track which search result was clicked

**Request Body**:
```javascript
{
  productId: "product_id",
  position: 3  // Position in search results (0-indexed)
}
```

**Response**:
```javascript
{
  success: true,
  message: "Click tracked"
}
```

**Implementation Location**: `backend/routes/search/analytics.js`

---

### 3. Search Insights Dashboard Endpoint

**Endpoint**: `GET /api/admin/search/insights`

**Purpose**: Get aggregated search analytics for admin dashboard

**Query Parameters**:
- `timeRange`: "24h" | "7d" | "30d" | "90d"
- `metric`: "popular" | "zero-results" | "slow-queries"

**Response**:
```javascript
{
  success: true,
  data: {
    totalSearches: 1542,
    avgResponseTime: 165,
    zeroResultsRate: 8.5,
    popularSearches: [
      { query: "pottery", count: 145 },
      { query: "tables", count: 98 }
    ],
    zeroResultSearches: [
      { query: "unicorn horn", count: 23 }
    ],
    slowQueries: [
      { query: "handmade furniture", avgTime: 850, count: 5 }
    ]
  }
}
```

**Implementation Location**: `backend/routes/admin/searchInsights.js`

**Authentication**: Admin only

---

## 🔧 Modifications to Existing Endpoints

### 1. Enhanced `GET /api/products` Endpoint

**Current Behavior**: Basic product search with text search

**Proposed Changes**: Add advanced ranking algorithm

**What Changes**:
```javascript
// ADD: Advanced relevance scoring in aggregation pipeline
{
  $addFields: {
    relevanceScore: {
      $add: [
        { $multiply: [{ $meta: "textScore" }, 0.4] },
        { $multiply: [{ $ifNull: ["$views", 0] }, 0.0001] },
        { $multiply: [{ $ifNull: ["$soldCount", 0] }, 0.001] },
        { $cond: [{ $eq: ["$isFeatured", true] }, 50, 0] },
        { $cond: [{ $gte: ["$createdAt", recentDate] }, 25, 0] }
      ]
    }
  }
}

// ADD: Sort by relevance score (in addition to text score)
{ $sort: { relevanceScore: -1 } }
```

**Breaking Changes**: None (additive only)

**Backward Compatible**: Yes ✅

---

### 2. Enhanced `GET /api/products/enhanced-search` Endpoint

**Current Behavior**: Enhanced search with location support

**Proposed Changes**: Add geospatial optimization using `$geoNear`

**What Changes**:
```javascript
// REPLACE: Current aggregation with $geoNear when location provided
// BEFORE: Manual distance calculation after $lookup
// AFTER: $geoNear as first stage (more efficient)

if (userLat && userLng) {
  pipeline.unshift({
    $geoNear: {
      near: {
        type: "Point",
        coordinates: [parseFloat(userLng), parseFloat(userLat)]
      },
      distanceField: "distance",
      maxDistance: radiusInMeters,
      spherical: true,
      query: matchQuery  // Apply all filters
    }
  });
}
```

**Breaking Changes**: None (output format stays the same)

**Backward Compatible**: Yes ✅

**Note**: Requires 2dsphere index on artisan coordinates (already exists)

---

## 📊 New Backend Services

### 1. Search Analytics Service

**File**: `backend/services/searchAnalyticsService.js`

**Purpose**: Centralized service for tracking and querying search analytics

**Key Methods**:
```javascript
class SearchAnalyticsService {
  async trackSearch(searchData)
  async trackClick(analyticsId, clickData)
  async getInsights(timeRange, metric)
  async getPopularSearches(limit)
  async getZeroResultSearches(limit)
  async getSlowQueries(limit)
  async cleanupOldAnalytics(daysToKeep)
}
```

**Dependencies**: MongoDB connection only

---

### 2. Search Performance Monitor Service

**File**: `backend/services/searchPerformanceMonitor.js`

**Purpose**: Monitor search performance and alert on issues

**Key Methods**:
```javascript
class SearchPerformanceMonitor {
  async recordSearchPerformance(metrics)
  async checkPerformanceThresholds()
  async getPerformanceStats(timeRange)
  async generatePerformanceReport()
}
```

**Integration**: Hooks into existing search endpoints

---

## 🎨 Frontend Components (No Backend Changes)

### 1. Search Analytics Dashboard

**File**: `frontend/src/components/admin/SearchAnalyticsDashboard.jsx`

**Purpose**: Admin dashboard to view search analytics

**Features**:
- Popular searches list
- Zero-result searches
- Average response time chart
- Click-through rate metrics
- Time range selector

---

### 2. Enhanced Search Results Tracking

**File**: Modify `frontend/src/components/SearchResults.jsx`

**Changes**: Add analytics tracking on search and click

**Implementation**:
```javascript
// Track search when results load
useEffect(() => {
  if (searchQuery && products.length > 0) {
    trackSearch(searchQuery, products.length, responseTime);
  }
}, [products]);

// Track click on product
const handleProductClick = (product, position) => {
  trackProductClick(analyticsId, product._id, position);
  // ... existing click handler
};
```

---

## 🔒 Security & Privacy Considerations

### 1. Data Privacy
- [ ] Anonymize IP addresses (remove last octet)
- [ ] Don't store sensitive search queries
- [ ] Allow users to opt-out via settings
- [ ] Comply with GDPR/privacy laws

### 2. Rate Limiting
- [ ] Add rate limiting to analytics endpoints
- [ ] Prevent analytics spam/abuse
- [ ] Validate all input data

### 3. Admin Access
- [ ] Ensure only admins can view analytics
- [ ] Audit log for analytics access
- [ ] No PII in analytics dashboard

---

## 📈 Database Size Estimates

### search_analytics Collection Growth

**Assumptions**:
- 1000 searches per day
- Average document size: 500 bytes
- 90-day retention policy

**Storage Calculation**:
```
Daily: 1000 × 500 bytes = 500 KB/day
Monthly: 500 KB × 30 = 15 MB/month
90 days: 500 KB × 90 = 45 MB
```

**With Indexes**: ~100 MB total (manageable)

---

## 🚀 Rollout Plan

### Step 1: Create Database Collections ⏳
```bash
# Run this in MongoDB shell after approval
use bazaarMKT;
db.createCollection("search_analytics");
db.search_analytics.createIndex({ timestamp: -1 });
db.search_analytics.createIndex({ query: 1, timestamp: -1 });
```

### Step 2: Deploy Backend Services ⏳
1. Add `searchAnalyticsService.js`
2. Add `searchPerformanceMonitor.js`
3. Add analytics routes
4. Test endpoints

### Step 3: Update Existing Endpoints ⏳
1. Add advanced ranking to `getProducts()`
2. Add $geoNear to `enhancedSearch()`
3. Test backward compatibility
4. Monitor performance

### Step 4: Deploy Frontend Changes ⏳
1. Add analytics tracking to SearchResults
2. Create admin dashboard
3. Test analytics flow end-to-end

### Step 5: Enable & Monitor ⏳
1. Enable analytics tracking
2. Monitor database growth
3. Check performance impact
4. Gather initial insights

---

## ❓ Questions for Review

### Database Questions
1. **Retention Period**: Is 90 days acceptable for search analytics data?
2. **Collection Size**: Is ~100MB acceptable for analytics collection?
3. **Indexes**: Should we add any additional indexes?

### Endpoint Questions
1. **Rate Limiting**: What rate limits for analytics endpoints?
2. **Authentication**: Should anonymous searches be tracked?
3. **Admin Access**: Which admin roles should see analytics?

### Implementation Questions
1. **Ranking Weights**: Are the proposed relevance weights appropriate?
   - Text score: 40%
   - Views: 0.01%
   - Sales: 0.1%
   - Featured: +50 points
   - Recent: +25 points

2. **GeoNear Radius**: Default 50km radius for location searches?

3. **Performance Monitoring**: Alert threshold for slow queries? (current: >1000ms)

---

## ✅ Approval Checklist

Please review and approve each section:

- [ ] **New Collections**: `search_analytics` schema and indexes
- [ ] **New Endpoints**: Analytics tracking endpoints
- [ ] **Endpoint Modifications**: Advanced ranking and geoNear optimization
- [ ] **New Services**: Analytics and performance monitoring services
- [ ] **Frontend Changes**: Analytics tracking in SearchResults
- [ ] **Privacy Considerations**: Data anonymization and retention
- [ ] **Rollout Plan**: Implementation steps

---

## 📝 Next Steps After Approval

1. I'll create all new backend services (no endpoint changes yet)
2. Create frontend components (read-only)
3. Wait for your approval on each endpoint modification
4. Implement approved changes incrementally
5. Test each change thoroughly
6. Monitor performance impact

**Please review this proposal and let me know:**
1. Which parts you approve
2. Which parts need modification
3. Any concerns or questions

Once approved, I'll begin implementation! 🚀

