/**
 * Search Analytics Service
 * Tracks search queries, performance metrics, and user behavior
 */

class SearchAnalyticsService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('search_analytics');
  }

  /**
   * Track a search query
   */
  async trackSearch(searchData) {
    try {
      const analytics = {
        query: searchData.query,
        userId: searchData.userId || null,
        timestamp: new Date(),
        resultsCount: searchData.resultsCount || 0,
        responseTime: searchData.responseTime || 0,
        filters: searchData.filters || {},
        zeroResults: (searchData.resultsCount || 0) === 0,
        sessionId: searchData.sessionId || null,
        ipAddress: this.anonymizeIP(searchData.ipAddress),
        userAgent: searchData.userAgent || null,
        selectedResultId: null,
        selectedResultPosition: null
      };

      const result = await this.collection.insertOne(analytics);
      
      return {
        success: true,
        analyticsId: result.insertedId.toString(),
        message: 'Search tracked successfully'
      };
    } catch (error) {
      console.error('Error tracking search:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Track when a user clicks on a search result
   */
  async trackClick(analyticsId, clickData) {
    try {
      const { ObjectId } = require('mongodb');
      
      if (!ObjectId.isValid(analyticsId)) {
        throw new Error('Invalid analytics ID');
      }

      const result = await this.collection.updateOne(
        { _id: new ObjectId(analyticsId) },
        {
          $set: {
            selectedResultId: new ObjectId(clickData.productId),
            selectedResultPosition: clickData.position,
            clickedAt: new Date()
          }
        }
      );

      return {
        success: result.matchedCount > 0,
        message: result.matchedCount > 0 ? 'Click tracked successfully' : 'Analytics record not found'
      };
    } catch (error) {
      console.error('Error tracking click:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 10, timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);

      const results = await this.collection.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            zeroResults: false,
            query: { $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            avgResults: { $avg: '$resultsCount' },
            clickThroughRate: {
              $avg: {
                $cond: [{ $ne: ['$selectedResultId', null] }, 1, 0]
              }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            query: '$_id',
            count: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 0] },
            avgResults: { $round: ['$avgResults', 0] },
            clickThroughRate: { $multiply: [{ $round: ['$clickThroughRate', 2] }, 100] }
          }
        }
      ]).toArray();

      return results;
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  /**
   * Get zero-result searches
   */
  async getZeroResultSearches(limit = 10, timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);

      const results = await this.collection.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            zeroResults: true,
            query: { $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            query: '$_id',
            count: 1,
            lastOccurrence: 1
          }
        }
      ]).toArray();

      return results;
    } catch (error) {
      console.error('Error getting zero-result searches:', error);
      return [];
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit = 10, threshold = 1000, timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);

      const results = await this.collection.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            responseTime: { $gte: threshold },
            query: { $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' }
          }
        },
        { $sort: { avgResponseTime: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            query: '$_id',
            count: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 0] },
            maxResponseTime: { $round: ['$maxResponseTime', 0] }
          }
        }
      ]).toArray();

      return results;
    } catch (error) {
      console.error('Error getting slow queries:', error);
      return [];
    }
  }

  /**
   * Get comprehensive search insights
   */
  async getInsights(timeRange = '7d') {
    try {
      const startDate = this.getStartDate(timeRange);

      const [stats] = await this.collection.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSearches: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            zeroResultsCount: {
              $sum: { $cond: ['$zeroResults', 1, 0] }
            },
            clickThroughCount: {
              $sum: { $cond: [{ $ne: ['$selectedResultId', null] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalSearches: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 0] },
            zeroResultsRate: {
              $multiply: [
                { $divide: ['$zeroResultsCount', '$totalSearches'] },
                100
              ]
            },
            clickThroughRate: {
              $multiply: [
                { $divide: ['$clickThroughCount', '$totalSearches'] },
                100
              ]
            }
          }
        }
      ]).toArray();

      const [popularSearches, zeroResultSearches, slowQueries] = await Promise.all([
        this.getPopularSearches(10, timeRange),
        this.getZeroResultSearches(10, timeRange),
        this.getSlowQueries(10, 1000, timeRange)
      ]);

      return {
        summary: stats || {
          totalSearches: 0,
          avgResponseTime: 0,
          zeroResultsRate: 0,
          clickThroughRate: 0
        },
        popularSearches,
        zeroResultSearches,
        slowQueries,
        timeRange,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting insights:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldAnalytics(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.collection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old search analytics records`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up old analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeRange = '24h') {
    try {
      const startDate = this.getStartDate(timeRange);

      const stats = await this.collection.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate }
          }
        },
        {
          $bucket: {
            groupBy: '$responseTime',
            boundaries: [0, 100, 200, 500, 1000, 2000, 5000, Infinity],
            default: 'other',
            output: {
              count: { $sum: 1 },
              avgResults: { $avg: '$resultsCount' }
            }
          }
        }
      ]).toArray();

      return stats;
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return [];
    }
  }

  /**
   * Anonymize IP address (remove last octet)
   */
  anonymizeIP(ipAddress) {
    if (!ipAddress) return null;
    
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      // IPv4: replace last octet with 0
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    // IPv6 or invalid: return null
    return null;
  }

  /**
   * Get start date based on time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    const ranges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const offset = ranges[timeRange] || ranges['7d'];
    return new Date(now.getTime() - offset);
  }

  /**
   * Create necessary indexes
   */
  async createIndexes() {
    try {
      const indexes = [
        { key: { timestamp: -1 }, name: 'timestamp_desc' },
        { key: { query: 1, timestamp: -1 }, name: 'query_timestamp' },
        { key: { userId: 1, timestamp: -1 }, name: 'user_timestamp' },
        { key: { zeroResults: 1, timestamp: -1 }, name: 'zero_results_timestamp' },
        { key: { responseTime: -1, timestamp: -1 }, name: 'response_time_timestamp' }
      ];
      
      for (const indexSpec of indexes) {
        try {
          await this.collection.createIndex(indexSpec.key, { 
            name: indexSpec.name,
            background: true, // Don't block other operations
            sparse: true // Skip documents that don't have the indexed fields
          });
        } catch (indexError) {
          // Log but don't fail if index already exists
          if (indexError.code !== 85) { // 85 = IndexOptionsConflict (index already exists)
            console.warn(`⚠️ Could not create index ${indexSpec.name}:`, indexError.message);
          }
        }
      }
      
      console.log('✅ Search analytics indexes created/verified');
    } catch (error) {
      console.error('Error creating search analytics indexes:', error);
      // Don't throw - allow service to continue without indexes
    }
  }
}

module.exports = SearchAnalyticsService;

