// Environment configuration for bazaarmkt.ca
const environment = {
  development: {
    API_URL: 'http://localhost:4000/api',
    BASE_URL: 'http://localhost:4000',
    UPLOADS_URL: 'http://localhost:4000/uploads',
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    BREVO_API_KEY: import.meta.env.VITE_BREVO_API_KEY || '',
    NODE_ENV: 'development',
    // Vecteezy images - use local in development, Vercel Blob in production
    VECTEEZY_SPINNING_WHEEL: '/vecteezy_a-man-is-spinning-yarn-on-a-spinning-wheel_69187328.jpg',
    VECTEEZY_CRAFTSMAN: '/vecteezy_craftsman-meticulously-paints-miniature-soldiers_69823529.jpg',
    VECTEEZY_WOMAN_WORKSHOP: '/vecteezy_a-woman-working-on-a-wooden-box-in-a-workshop_68945818.jpeg',
    VECTEEZY_ARTISAN_MARKET: '/vecteezy_exploring-a-vibrant-artisan-market-and-selecting-pottery-on_70827611.jpeg'
  },
  
  production: {
    // Use Vercel environment variables if available, otherwise fallback to hardcoded values
    API_URL: import.meta.env.VITE_API_URL || 'https://www.bazaarmkt.ca/api',
    BASE_URL: import.meta.env.VITE_BASE_URL || 'https://www.bazaarmkt.ca',
    UPLOADS_URL: import.meta.env.VITE_UPLOADS_URL || 'https://www.bazaarmkt.ca/api/upload',
    VERCEL_BLOB_DOMAIN: import.meta.env.VITE_VERCEL_BLOB_DOMAIN || 'blob.vercel-storage.com',
    VERCEL_BLOB_URL: import.meta.env.VITE_VERCEL_BLOB_URL || 'https://blob.vercel-storage.com',
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    BREVO_API_KEY: import.meta.env.VITE_BREVO_API_KEY || '',
    NODE_ENV: import.meta.env.VITE_NODE_ENV || 'production',
    // Vecteezy images from Vercel Blob
    VECTEEZY_SPINNING_WHEEL: import.meta.env.VITE_VECTEEZY_SPINNING_WHEEL || 'https://blob.vercel-storage.com/vecteezy_a-man-is-spinning-yarn-on-a-spinning-wheel_69187328.jpg',
    VECTEEZY_CRAFTSMAN: import.meta.env.VITE_VECTEEZY_CRAFTSMAN || 'https://blob.vercel-storage.com/vecteezy_craftsman-meticulously-paints-miniature-soldiers_69823529.jpg',
    VECTEEZY_WOMAN_WORKSHOP: import.meta.env.VITE_VECTEEZY_WOMAN_WORKSHOP || 'https://blob.vercel-storage.com/vecteezy_a-woman-working-on-a-wooden-box-in-a-workshop_68945818.jpeg',
    VECTEEZY_ARTISAN_MARKET: import.meta.env.VITE_VECTEEZY_ARTISAN_MARKET || 'https://blob.vercel-storage.com/vecteezy_exploring-a-vibrant-artisan-market-and-selecting-pottery-on_70827611.jpeg'
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
  VERCEL_BLOB_DOMAIN,
  VERCEL_BLOB_URL,
  STRIPE_PUBLISHABLE_KEY,
  GOOGLE_MAPS_API_KEY,
  BREVO_API_KEY,
  NODE_ENV,
  VECTEEZY_SPINNING_WHEEL,
  VECTEEZY_CRAFTSMAN,
  VECTEEZY_WOMAN_WORKSHOP,
  VECTEEZY_ARTISAN_MARKET
} = config;

// Helper functions
export const isDev = () => NODE_ENV === 'development';
export const isProd = () => NODE_ENV === 'production';
// Cache bust 1758684138
