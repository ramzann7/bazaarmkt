// Environment configuration for bazaarmkt.ca
const environment = {
  development: {
    API_URL: 'http://localhost:4000/api',
    BASE_URL: 'http://localhost:4000',
    UPLOADS_URL: 'http://localhost:4000/uploads',
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    BREVO_API_KEY: import.meta.env.VITE_BREVO_API_KEY || '',
    NODE_ENV: 'development'
  },
  
  production: {
    // Use Vercel environment variables if available, otherwise fallback to hardcoded values
    API_URL: import.meta.env.VITE_API_URL || 'https://www.bazaarmkt.ca/api',
    BASE_URL: import.meta.env.VITE_BASE_URL || 'https://www.bazaarmkt.ca',
    UPLOADS_URL: import.meta.env.VITE_UPLOADS_URL || 'https://www.bazaarmkt.ca/api/upload',
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    BREVO_API_KEY: import.meta.env.VITE_BREVO_API_KEY || '',
    NODE_ENV: import.meta.env.VITE_NODE_ENV || 'production'
  }
};

// Determine current environment
const isProduction = import.meta.env.MODE === 'production' || 
                     import.meta.env.VITE_NODE_ENV === 'production' ||
                     import.meta.env.NODE_ENV === 'production' ||
                     (typeof window !== 'undefined' && (window.location.hostname === 'bazaarmkt.ca' || window.location.hostname === 'www.bazaarmkt.ca'));

const config = isProduction ? environment.production : environment.development;

// Export configuration
export default config;

// Individual exports for convenience
export const {
  API_URL,
  BASE_URL,
  UPLOADS_URL,
  STRIPE_PUBLISHABLE_KEY,
  GOOGLE_MAPS_API_KEY,
  BREVO_API_KEY,
  NODE_ENV
} = config;

// Helper functions
export const isDev = () => NODE_ENV === 'development';
export const isProd = () => NODE_ENV === 'production';
// Cache bust 1758684138
