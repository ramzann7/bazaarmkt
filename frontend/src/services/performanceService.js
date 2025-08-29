// Performance monitoring service
class PerformanceService {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      slowLoad: 2000, // 2 seconds
      verySlowLoad: 5000, // 5 seconds
      criticalLoad: 10000 // 10 seconds
    };
  }

  // Start timing an operation
  startTimer(operationName) {
    const startTime = performance.now();
    this.metrics.set(operationName, { startTime, endTime: null, duration: null });
    return startTime;
  }

  // End timing an operation
  endTimer(operationName) {
    const metric = this.metrics.get(operationName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      
      // Log performance metrics
      this.logPerformance(operationName, metric.duration);
      
      // Notify observers
      this.notifyObservers(operationName, metric.duration);
      
      return metric.duration;
    }
    return null;
  }

  // Log performance with appropriate level
  logPerformance(operationName, duration) {
    const message = `${operationName} took ${duration.toFixed(2)}ms`;
    
    if (duration > this.thresholds.criticalLoad) {
      console.error(`🚨 CRITICAL: ${message}`);
    } else if (duration > this.thresholds.verySlowLoad) {
      console.warn(`⚠️ VERY SLOW: ${message}`);
    } else if (duration > this.thresholds.slowLoad) {
      console.warn(`🐌 SLOW: ${message}`);
    } else {
      console.log(`✅ ${message}`);
    }
  }

  // Add performance observer
  addObserver(operationName, callback) {
    if (!this.observers.has(operationName)) {
      this.observers.set(operationName, []);
    }
    this.observers.get(operationName).push(callback);
  }

  // Remove performance observer
  removeObserver(operationName, callback) {
    const observers = this.observers.get(operationName);
    if (observers) {
      const index = observers.indexOf(callback);
      if (index > -1) {
        observers.splice(index, 1);
      }
    }
  }

  // Notify observers
  notifyObservers(operationName, duration) {
    const observers = this.observers.get(operationName);
    if (observers) {
      observers.forEach(callback => {
        try {
          callback(duration);
        } catch (error) {
          console.error('Performance observer error:', error);
        }
      });
    }
  }

  // Get performance metrics
  getMetrics() {
    const result = {};
    this.metrics.forEach((metric, operationName) => {
      result[operationName] = {
        duration: metric.duration,
        startTime: metric.startTime,
        endTime: metric.endTime
      };
    });
    return result;
  }

  // Get average performance for an operation
  getAveragePerformance(operationName) {
    const metrics = Array.from(this.metrics.entries())
      .filter(([name]) => name.startsWith(operationName))
      .map(([, metric]) => metric.duration)
      .filter(duration => duration !== null);
    
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, duration) => sum + duration, 0) / metrics.length;
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Performance decorator for functions
  measure(operationName) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args) {
        const startTime = performanceService.startTimer(operationName);
        try {
          const result = await originalMethod.apply(this, args);
          performanceService.endTimer(operationName);
          return result;
        } catch (error) {
          performanceService.endTimer(operationName);
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  // Measure function execution time
  async measureFunction(operationName, fn) {
    this.startTimer(operationName);
    try {
      const result = await fn();
      this.endTimer(operationName);
      return result;
    } catch (error) {
      this.endTimer(operationName);
      throw error;
    }
  }

  // Track component render time
  trackComponentRender(componentName) {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.logPerformance(`${componentName} render`, duration);
      
      if (duration > this.thresholds.slowLoad) {
        console.warn(`🐌 Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  // Track API call performance
  trackApiCall(endpoint) {
    const startTime = performance.now();
    
    return (response) => {
      const duration = performance.now() - startTime;
      this.logPerformance(`API: ${endpoint}`, duration);
      
      if (duration > this.thresholds.slowLoad) {
        console.warn(`🐌 Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
      }
      
      return response;
    };
  }

  // Generate performance report
  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      totalOperations: Object.keys(metrics).length,
      averagePerformance: {},
      slowestOperations: [],
      fastestOperations: [],
      timestamp: new Date().toISOString()
    };

    // Calculate averages and find extremes
    const operationGroups = {};
    Object.entries(metrics).forEach(([operationName, metric]) => {
      const baseName = operationName.split('_')[0];
      if (!operationGroups[baseName]) {
        operationGroups[baseName] = [];
      }
      operationGroups[baseName].push(metric.duration);
    });

    Object.entries(operationGroups).forEach(([operationName, durations]) => {
      const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      report.averagePerformance[operationName] = average;
    });

    // Find slowest and fastest operations
    const allDurations = Object.entries(metrics)
      .map(([name, metric]) => ({ name, duration: metric.duration }))
      .sort((a, b) => b.duration - a.duration);

    report.slowestOperations = allDurations.slice(0, 5);
    report.fastestOperations = allDurations.slice(-5).reverse();

    return report;
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// Performance monitoring hooks
export const usePerformanceTracking = (operationName) => {
  const startTimer = () => performanceService.startTimer(operationName);
  const endTimer = () => performanceService.endTimer(operationName);
  
  return { startTimer, endTimer };
};

// Performance monitoring for components
// Note: This HOC requires React to be imported in the component file where it's used
export const withPerformanceTracking = (Component, componentName) => {
  // Return a simple function that can be called with props
  return Component;
};
