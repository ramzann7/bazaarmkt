/**
 * Logging Utility
 * Centralized logging with different levels and formats
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Enhanced logger with context and performance tracking
 */
class EnhancedLogger {
  constructor(baseLogger) {
    this.logger = baseLogger;
    this.requestId = 0;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return ++this.requestId;
  }

  /**
   * Log with context
   */
  logWithContext(level, message, context = {}) {
    const logData = {
      message,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory: process.memoryUsage()
      }
    };

    this.logger[level](JSON.stringify(logData));
  }

  /**
   * Log HTTP requests
   */
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId || 'anonymous'
    };

    this.logWithContext('http', 'HTTP Request', logData);
  }

  /**
   * Log database operations
   */
  logDatabase(operation, collection, query, duration, result) {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
      resultCount: result?.length || 1,
      success: true
    };

    this.logWithContext('debug', 'Database Operation', logData);
  }

  /**
   * Log database errors
   */
  logDatabaseError(operation, collection, query, error) {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      error: error.message,
      stack: error.stack,
      success: false
    };

    this.logWithContext('error', 'Database Error', logData);
  }

  /**
   * Log service operations
   */
  logService(serviceName, method, params, duration, result) {
    const logData = {
      service: serviceName,
      method,
      params: JSON.stringify(params),
      duration: `${duration}ms`,
      success: true
    };

    this.logWithContext('debug', 'Service Operation', logData);
  }

  /**
   * Log service errors
   */
  logServiceError(serviceName, method, params, error) {
    const logData = {
      service: serviceName,
      method,
      params: JSON.stringify(params),
      error: error.message,
      stack: error.stack,
      success: false
    };

    this.logWithContext('error', 'Service Error', logData);
  }

  /**
   * Log cache operations
   */
  logCache(operation, key, hit, duration) {
    const logData = {
      operation,
      key,
      hit,
      duration: `${duration}ms`
    };

    this.logWithContext('debug', 'Cache Operation', logData);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, metadata = {}) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...metadata
    };

    if (duration > 1000) {
      this.logWithContext('warn', 'Slow Operation', logData);
    } else {
      this.logWithContext('debug', 'Performance Metric', logData);
    }
  }

  /**
   * Log security events
   */
  logSecurity(event, details) {
    const logData = {
      event,
      ...details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    };

    this.logWithContext('warn', 'Security Event', logData);
  }

  /**
   * Log business events
   */
  logBusiness(event, details) {
    const logData = {
      event,
      ...details,
      timestamp: new Date().toISOString()
    };

    this.logWithContext('info', 'Business Event', logData);
  }
}

// Create enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger);

/**
 * Performance monitoring decorator
 */
function withPerformanceLogging(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args) {
    const start = Date.now();
    const className = target.constructor.name;
    const methodName = propertyName;

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - start;
      
      enhancedLogger.logService(className, methodName, args, duration, result);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      enhancedLogger.logServiceError(className, methodName, args, error);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Express middleware for request logging
 */
function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();
  const requestId = enhancedLogger.generateRequestId();
  
  // Add request ID to request object
  req.requestId = requestId;

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    enhancedLogger.logRequest(req, res, duration);
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Database operation logger
 */
function logDatabaseOperation(operation, collection, query, duration, result) {
  enhancedLogger.logDatabase(operation, collection, query, duration, result);
}

/**
 * Cache operation logger
 */
function logCacheOperation(operation, key, hit, duration) {
  enhancedLogger.logCache(operation, key, hit, duration);
}

/**
 * Security event logger
 */
function logSecurityEvent(event, details) {
  enhancedLogger.logSecurity(event, details);
}

/**
 * Business event logger
 */
function logBusinessEvent(event, details) {
  enhancedLogger.logBusiness(event, details);
}

/**
 * Performance logger
 */
function logPerformance(operation, duration, metadata) {
  enhancedLogger.logPerformance(operation, duration, metadata);
}

// Export both basic and enhanced loggers
module.exports = {
  logger,
  enhancedLogger,
  withPerformanceLogging,
  requestLoggingMiddleware,
  logDatabaseOperation,
  logCacheOperation,
  logSecurityEvent,
  logBusinessEvent,
  logPerformance
};
