import winston from 'winston';
import path from 'path';
import { config } from '../config/environment.js';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.monitoring.logLevel,
  format: logFormat,
  defaultMeta: { service: 'bazaar-market-api' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transports for production
if (config.server.isProduction) {
  // Error log file
  logger.add(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  // Combined log file
  logger.add(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    maxsize: 5242880,
    maxFiles: 5
  })
);

// Enhanced logging methods
export const enhancedLogger = {
  // Standard logging methods
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  verbose: (message, meta = {}) => logger.verbose(message, meta),

  // Request logging
  request: (req, res, responseTime) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length') || 0
    });
  },

  // Database operation logging
  db: {
    query: (operation, collection, duration, meta = {}) => {
      logger.debug('Database Query', {
        operation,
        collection,
        duration: `${duration}ms`,
        ...meta
      });
    },
    error: (operation, collection, error, meta = {}) => {
      logger.error('Database Error', {
        operation,
        collection,
        error: error.message,
        stack: error.stack,
        ...meta
      });
    }
  },

  // Authentication logging
  auth: {
    login: (userId, method, success, meta = {}) => {
      const level = success ? 'info' : 'warn';
      logger[level]('Authentication', {
        event: 'login',
        userId,
        method,
        success,
        ...meta
      });
    },
    logout: (userId, meta = {}) => {
      logger.info('Authentication', {
        event: 'logout',
        userId,
        ...meta
      });
    },
    failed: (method, ip, userAgent, meta = {}) => {
      logger.warn('Authentication Failed', {
        method,
        ip,
        userAgent,
        ...meta
      });
    }
  },

  // Business logic logging
  business: {
    order: (event, orderId, userId, meta = {}) => {
      logger.info('Business Event', {
        event,
        orderId,
        userId,
        ...meta
      });
    },
    payment: (event, orderId, amount, method, meta = {}) => {
      logger.info('Payment Event', {
        event,
        orderId,
        amount,
        method,
        ...meta
      });
    },
    notification: (type, recipient, success, meta = {}) => {
      const level = success ? 'info' : 'warn';
      logger[level]('Notification', {
        type,
        recipient,
        success,
        ...meta
      });
    }
  },

  // Performance logging
  performance: {
    slowQuery: (operation, duration, threshold, meta = {}) => {
      if (duration > threshold) {
        logger.warn('Slow Query Detected', {
          operation,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          ...meta
        });
      }
    },
    memoryUsage: () => {
      const usage = process.memoryUsage();
      logger.debug('Memory Usage', {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      });
    }
  }
};

// Export both the standard logger and enhanced logger
export { logger };
export default enhancedLogger;
