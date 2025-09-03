import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Environment validation
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PORT'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Environment configuration object
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI,
    uriLocal: process.env.MONGODB_URI_LOCAL,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    algorithm: 'HS256'
  },

  // Email services
  email: {
    brevo: {
      apiKey: process.env.BREVO_API_KEY,
      enabled: !!process.env.BREVO_API_KEY
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
    }
  },

  // Payment processing
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      enabled: !!process.env.STRIPE_SECRET_KEY
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
    }
  },

  // File upload configuration
  upload: {
    path: process.env.UPLOAD_PATH || './public/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },

  // Monitoring and logging
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentry: {
      dsn: process.env.SENTRY_DSN,
      enabled: !!process.env.SENTRY_DSN
    },
    newRelic: {
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      enabled: !!process.env.NEW_RELIC_LICENSE_KEY
    }
  },

  // External services
  external: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      enabled: !!process.env.GOOGLE_MAPS_API_KEY
    },
    geocoding: {
      apiKey: process.env.GEOCODING_API_KEY,
      enabled: !!process.env.GEOCODING_API_KEY
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      enabled: !!process.env.REDIS_URL
    }
  },

  // Feature flags
  features: {
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
    smsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
    pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
    analytics: process.env.ENABLE_ANALYTICS !== 'false'
  }
};

// Validation functions
export const validateConfig = () => {
  const issues = [];

  // Validate JWT secret strength
  if (config.jwt.secret.length < 32) {
    issues.push('JWT_SECRET must be at least 32 characters long');
  }

  // Validate MongoDB URI format
  if (!config.database.uri.includes('mongodb')) {
    issues.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Validate email configuration
  if (!config.email.brevo.enabled && !config.email.smtp.enabled) {
    issues.push('At least one email service must be configured (Brevo or SMTP)');
  }

  // Validate payment configuration
  if (!config.payments.stripe.enabled && !config.payments.paypal.enabled) {
    console.warn('⚠️ No payment processor configured - payment features will be disabled');
  }

  if (issues.length > 0) {
    console.error('❌ Configuration validation failed:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }

  console.log('✅ Configuration validation passed');
  return true;
};

// Get configuration for specific environment
export const getConfig = (section) => {
  if (section) {
    return config[section];
  }
  return config;
};

// Export individual sections for convenience
export const { server, database, jwt, email, payments, upload, security, monitoring, external, features } = config;

export default config;
