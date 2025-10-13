/**
 * Search Performance Monitor
 * Monitors search performance and generates alerts for issues
 */

class SearchPerformanceMonitor {
  constructor() {
    this.thresholds = {
      slowQueryTime: 1000,      // 1 second
      verySlowQueryTime: 2000,  // 2 seconds
      highZeroResultRate: 15,   // 15%
      lowClickThroughRate: 10   // 10%
    };
    
    this.performanceLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Record search performance metrics
   */
  recordSearchPerformance(metrics) {
    const record = {
      timestamp: new Date(),
      query: metrics.query,
      responseTime: metrics.responseTime,
      resultsCount: metrics.resultsCount,
      zeroResults: metrics.resultsCount === 0,
      userId: metrics.userId
    };

    this.performanceLog.push(record);

    // Keep log size manageable
    if (this.performanceLog.length > this.maxLogSize) {
      this.performanceLog.shift();
    }

    // Check for performance issues
    this.checkPerformanceThresholds(record);

    return record;
  }

  /**
   * Check if performance metrics exceed thresholds
   */
  checkPerformanceThresholds(record) {
    const alerts = [];

    // Check for slow queries
    if (record.responseTime >= this.thresholds.verySlowQueryTime) {
      alerts.push({
        level: 'critical',
        type: 'very_slow_query',
        message: `Very slow query detected: "${record.query}" took ${record.responseTime}ms`,
        record
      });
      console.error(`🚨 CRITICAL: Very slow search query - ${record.responseTime}ms for "${record.query}"`);
    } else if (record.responseTime >= this.thresholds.slowQueryTime) {
      alerts.push({
        level: 'warning',
        type: 'slow_query',
        message: `Slow query detected: "${record.query}" took ${record.responseTime}ms`,
        record
      });
      console.warn(`⚠️  WARNING: Slow search query - ${record.responseTime}ms for "${record.query}"`);
    }

    // Check for zero results
    if (record.zeroResults && record.query && record.query.trim().length > 0) {
      console.log(`ℹ️  INFO: Zero results for "${record.query}"`);
    }

    return alerts;
  }

  /**
   * Get performance statistics for a time period
   */
  getPerformanceStats(timeRangeMinutes = 60) {
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const recentRecords = this.performanceLog.filter(
      record => record.timestamp >= cutoffTime
    );

    if (recentRecords.length === 0) {
      return {
        count: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        zeroResultsRate: 0,
        slowQueriesCount: 0
      };
    }

    const responseTimes = recentRecords.map(r => r.responseTime);
    const zeroResultsCount = recentRecords.filter(r => r.zeroResults).length;
    const slowQueriesCount = recentRecords.filter(
      r => r.responseTime >= this.thresholds.slowQueryTime
    ).length;

    return {
      count: recentRecords.length,
      avgResponseTime: Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      ),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      zeroResultsRate: Math.round((zeroResultsCount / recentRecords.length) * 100),
      slowQueriesCount,
      percentile95: this.calculatePercentile(responseTimes, 0.95),
      percentile99: this.calculatePercentile(responseTimes, 0.99)
    };
  }

  /**
   * Calculate percentile value
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRangeMinutes = 60) {
    const stats = this.getPerformanceStats(timeRangeMinutes);
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const recentRecords = this.performanceLog.filter(
      record => record.timestamp >= cutoffTime
    );

    // Find slowest queries
    const slowestQueries = recentRecords
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5)
      .map(r => ({
        query: r.query,
        responseTime: r.responseTime,
        resultsCount: r.resultsCount
      }));

    // Find queries with zero results
    const zeroResultQueries = recentRecords
      .filter(r => r.zeroResults)
      .reduce((acc, r) => {
        const existing = acc.find(q => q.query === r.query);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ query: r.query, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      timeRange: `${timeRangeMinutes} minutes`,
      generatedAt: new Date(),
      stats,
      slowestQueries,
      zeroResultQueries,
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Generate recommendations based on performance
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.avgResponseTime > 500) {
      recommendations.push({
        priority: 'high',
        issue: 'High average response time',
        recommendation: 'Review database indexes and consider implementing caching'
      });
    }

    if (stats.percentile95 > 1000) {
      recommendations.push({
        priority: 'high',
        issue: '95th percentile exceeds 1 second',
        recommendation: 'Optimize slow queries identified in the report'
      });
    }

    if (stats.zeroResultsRate > 15) {
      recommendations.push({
        priority: 'medium',
        issue: 'High zero-results rate',
        recommendation: 'Review zero-result queries and expand product catalog or improve synonyms'
      });
    }

    if (stats.slowQueriesCount > stats.count * 0.1) {
      recommendations.push({
        priority: 'medium',
        issue: 'More than 10% of queries are slow',
        recommendation: 'Investigate common patterns in slow queries and optimize indexes'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'none',
        issue: 'No issues detected',
        recommendation: 'Search performance is within acceptable thresholds'
      });
    }

    return recommendations;
  }

  /**
   * Clear performance log
   */
  clearLog() {
    this.performanceLog = [];
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };
  }
}

// Create singleton instance
const searchPerformanceMonitor = new SearchPerformanceMonitor();

module.exports = searchPerformanceMonitor;

