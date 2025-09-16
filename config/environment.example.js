// Environment Configuration Example
// Copy this file to environment.js and update the values

module.exports = {
  // Application Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/bazaarmkt-app',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Server Configuration
  PORT: process.env.PORT || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5180',
  
  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT || 587,
    USER: process.env.EMAIL_USER || '',
    PASS: process.env.EMAIL_PASS || '',
    FROM: process.env.EMAIL_FROM || 'noreply@bazaarmkt.com'
  },
  
  // Payment Configuration
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || ''
  },
  
  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    UPLOAD_PATH: process.env.UPLOAD_PATH || './public/uploads',
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  
  // Redis Configuration
  REDIS: {
    URL: process.env.REDIS_URL || 'redis://localhost:6379',
    TTL: parseInt(process.env.REDIS_TTL) || 3600 // 1 hour
  },
  
  // Google Maps API
  GOOGLE_MAPS: {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
  },
  
  // Security Configuration
  SECURITY: {
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    RATE_LIMIT: {
      WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },
  
  // Logging Configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FILE: process.env.LOG_FILE || './logs/app.log',
    MAX_SIZE: process.env.LOG_MAX_SIZE || '20m',
    MAX_FILES: process.env.LOG_MAX_FILES || '14d'
  },
  
  // CORS Configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5180', 'http://localhost:3000'],
    CREDENTIALS: true
  },
  
  // Session Configuration
  SESSION: {
    SECRET: process.env.SESSION_SECRET || 'your-session-secret-key',
    MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 86400000 // 24 hours
  },
  
  // API Configuration
  API: {
    VERSION: process.env.API_VERSION || 'v1',
    PREFIX: process.env.API_PREFIX || '/api'
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_REGISTRATION: process.env.ENABLE_REGISTRATION !== 'false',
    ENABLE_PAYMENTS: process.env.ENABLE_PAYMENTS === 'true',
    ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== 'false',
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true'
  }
};
