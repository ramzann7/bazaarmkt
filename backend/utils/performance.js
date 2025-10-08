/**
 * Performance Monitoring and Optimization Utilities
 */

const { logPerformance } = require('./logger');

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      slow: 1000, // 1 second
      verySlow: 5000, // 5 seconds
      critical: 10000 // 10 seconds
    };
  }

  /**
   * Start timing an operation
   */
  start(operationId) {
    this.metrics.set(operationId, {
      startTime: Date.now(),
      endTime: null,
      duration: null
    });
  }

  /**
   * End timing an operation
   */
  end(operationId, metadata = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found for operation: ${operationId}`);
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.metadata = metadata;

    // Log performance
    logPerformance(operationId, metric.duration, metadata);

    // Check thresholds
    this.checkThresholds(operationId, metric);

    return metric;
  }

  /**
   * Check performance thresholds
   */
  checkThresholds(operationId, metric) {
    const { duration } = metric;
    
    if (duration > this.thresholds.critical) {
      console.error(`🚨 CRITICAL: Operation ${operationId} took ${duration}ms`);
    } else if (duration > this.thresholds.verySlow) {
      console.warn(`⚠️ VERY SLOW: Operation ${operationId} took ${duration}ms`);
    } else if (duration > this.thresholds.slow) {
      console.warn(`🐌 SLOW: Operation ${operationId} took ${duration}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {
      total: this.metrics.size,
      slow: 0,
      verySlow: 0,
      critical: 0,
      average: 0,
      min: Infinity,
      max: 0
    };

    let totalDuration = 0;

    for (const [operationId, metric] of this.metrics.entries()) {
      if (metric.duration !== null) {
        totalDuration += metric.duration;
        stats.min = Math.min(stats.min, metric.duration);
        stats.max = Math.max(stats.max, metric.duration);

        if (metric.duration > this.thresholds.critical) {
          stats.critical++;
        } else if (metric.duration > this.thresholds.verySlow) {
          stats.verySlow++;
        } else if (metric.duration > this.thresholds.slow) {
          stats.slow++;
        }
      }
    }

    if (stats.total > 0) {
      stats.average = totalDuration / stats.total;
    }

    if (stats.min === Infinity) {
      stats.min = 0;
    }

    return stats;
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics.clear();
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for methods
 */
function measurePerformance(operationName) {
  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const operationId = `${operationName || target.constructor.name}.${propertyName}`;
      performanceMonitor.start(operationId);

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(operationId, { success: true });
        return result;
      } catch (error) {
        performanceMonitor.end(operationId, { success: false, error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Performance wrapper for functions
 */
function withPerformanceMeasurement(operationName, fn) {
  return async function(...args) {
    const operationId = operationName || fn.name;
    performanceMonitor.start(operationId);

    try {
      const result = await fn.apply(this, args);
      performanceMonitor.end(operationId, { success: true });
      return result;
    } catch (error) {
      performanceMonitor.end(operationId, { success: false, error: error.message });
      throw error;
    }
  };
}

/**
 * Database query optimization utilities
 */
class QueryOptimizer {
  /**
   * Optimize MongoDB aggregation pipeline
   */
  static optimizeAggregationPipeline(pipeline) {
    const optimized = [...pipeline];

    // Move $match stages to the beginning
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);

    // Move $sort after $match but before $group
    const sortStages = otherStages.filter(stage => stage.$sort);
    const groupStages = otherStages.filter(stage => stage.$group);
    const remainingStages = otherStages.filter(stage => !stage.$sort && !stage.$group);

    // Reconstruct pipeline
    const newPipeline = [
      ...matchStages,
      ...sortStages,
      ...groupStages,
      ...remainingStages
    ];

    return newPipeline;
  }

  /**
   * Add pagination to query
   */
  static addPagination(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return {
      ...query,
      skip,
      limit
    };
  }

  /**
   * Add sorting to query
   */
  static addSorting(query, sortField = 'createdAt', sortOrder = -1) {
    return {
      ...query,
      sort: { [sortField]: sortOrder }
    };
  }

  /**
   * Optimize projection
   */
  static optimizeProjection(fields) {
    const projection = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    return projection;
  }
}

/**
 * Memory usage monitoring
 */
class MemoryMonitor {
  constructor() {
    this.initialMemory = process.memoryUsage();
    this.peakMemory = { ...this.initialMemory };
  }

  /**
   * Get current memory usage
   */
  getCurrentMemory() {
    return process.memoryUsage();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const current = this.getCurrentMemory();
    
    return {
      current,
      initial: this.initialMemory,
      peak: this.peakMemory,
      delta: {
        rss: current.rss - this.initialMemory.rss,
        heapTotal: current.heapTotal - this.initialMemory.heapTotal,
        heapUsed: current.heapUsed - this.initialMemory.heapUsed,
        external: current.external - this.initialMemory.external
      }
    };
  }

  /**
   * Update peak memory
   */
  updatePeakMemory() {
    const current = this.getCurrentMemory();
    
    if (current.rss > this.peakMemory.rss) {
      this.peakMemory = { ...current };
    }
  }

  /**
   * Check for memory leaks
   */
  checkMemoryLeaks() {
    const stats = this.getMemoryStats();
    const threshold = 100 * 1024 * 1024; // 100MB

    if (stats.delta.heapUsed > threshold) {
      console.warn('⚠️ Potential memory leak detected:', stats.delta);
      return true;
    }

    return false;
  }
}

// Global memory monitor instance
const memoryMonitor = new MemoryMonitor();

/**
 * Response time optimization
 */
class ResponseTimeOptimizer {
  constructor() {
    this.responseTimes = new Map();
  }

  /**
   * Record response time
   */
  recordResponseTime(endpoint, method, duration) {
    const key = `${method}:${endpoint}`;
    
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }

    const times = this.responseTimes.get(key);
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Get average response time for endpoint
   */
  getAverageResponseTime(endpoint, method) {
    const key = `${method}:${endpoint}`;
    const times = this.responseTimes.get(key);

    if (!times || times.length === 0) {
      return 0;
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit = 10) {
    const averages = [];

    for (const [key, times] of this.responseTimes.entries()) {
      if (times.length > 0) {
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        averages.push({ endpoint: key, average, count: times.length });
      }
    }

    return averages
      .sort((a, b) => b.average - a.average)
      .slice(0, limit);
  }
}

// Global response time optimizer instance
const responseTimeOptimizer = new ResponseTimeOptimizer();

/**
 * Performance middleware for Express
 */
function performanceMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    responseTimeOptimizer.recordResponseTime(req.path, req.method, duration);
    
    if (duration > 1000) {
      console.warn(`🐌 Slow response: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
}

/**
 * Performance health check
 */
function getPerformanceHealth() {
  const memoryStats = memoryMonitor.getMemoryStats();
  const performanceStats = performanceMonitor.getStats();
  const slowestEndpoints = responseTimeOptimizer.getSlowestEndpoints(5);

  return {
    memory: {
      current: memoryStats.current,
      delta: memoryStats.delta,
      leakDetected: memoryMonitor.checkMemoryLeaks()
    },
    performance: performanceStats,
    slowestEndpoints,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  PerformanceMonitor,
  performanceMonitor,
  measurePerformance,
  withPerformanceMeasurement,
  QueryOptimizer,
  MemoryMonitor,
  memoryMonitor,
  ResponseTimeOptimizer,
  responseTimeOptimizer,
  performanceMiddleware,
  getPerformanceHealth
};
