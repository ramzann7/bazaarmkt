/**
 * Environment Configuration Module
 * Validates and provides environment variables with defaults
 */

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  PORT: 4000,
  CORS_ORIGIN: null,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_MAX_REQUESTS_DEV: 100000
};

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Get environment configuration with defaults
 */
function getEnvironmentConfig() {
  const config = {};
  
  // Set required variables
  requiredEnvVars.forEach(envVar => {
    config[envVar] = process.env[envVar];
  });
  
  // Set optional variables with defaults
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    config[key] = process.env[key] || defaultValue;
  });
  
  return config;
}

/**
 * Get CORS origins configuration
 */
function getCorsOrigins() {
  const allowedOrigins = [
    'http://localhost:5180',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://bazaarmkt.ca',
    'https://www.bazaarmkt.ca',
    /^https:\/\/bazaarmkt-.*\.vercel\.app$/
  ];

  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }

  return allowedOrigins;
}

/**
 * Get rate limiting configuration
 */
function getRateLimitConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || optionalEnvVars.RATE_LIMIT_WINDOW_MS,
    max: isDevelopment 
      ? (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_DEV) || optionalEnvVars.RATE_LIMIT_MAX_REQUESTS_DEV)
      : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || optionalEnvVars.RATE_LIMIT_MAX_REQUESTS),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    }
  };
}

module.exports = {
  validateEnvironment,
  getEnvironmentConfig,
  getCorsOrigins,
  getRateLimitConfig
};
