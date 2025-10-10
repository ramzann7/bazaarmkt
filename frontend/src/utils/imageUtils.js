/**
 * Image URL Utility
 * Handles image URL generation for both development and production environments
 */

import config from '../config/environment.js';

/**
 * Get the appropriate image URL based on environment and image path
 * @param {string} imagePath - The image path from the database
 * @param {Object} options - Optimization options {width, height, quality}
 * @returns {string|null} - The complete image URL or null if no image
 */
export const getImageUrl = (imagePath, options = {}) => {
  if (!imagePath) return null;
  
  // Ensure imagePath is a string
  if (typeof imagePath !== 'string') {
    console.warn('⚠️ getImageUrl: imagePath is not a string:', imagePath);
    return null;
  }
  
  // Handle base64 data URLs (already complete)
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Handle HTTP URLs (including Vercel Blob URLs) - return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Handle Vercel Blob URLs that might be stored without protocol
  if (imagePath.includes('.public.blob.vercel-storage.com') || 
      imagePath.includes('blob.vercel-storage.com')) {
    // If missing protocol, add https
    return imagePath.startsWith('//') ? `https:${imagePath}` : 
           imagePath.startsWith('http') ? imagePath : 
           `https://${imagePath}`;
  }
  
  // Detect environment - use multiple signals for reliability
  const isProduction = 
    import.meta.env.MODE === 'production' ||
    import.meta.env.PROD === true ||
    (typeof window !== 'undefined' && 
     (window.location.hostname.includes('bazaarmkt.ca') || 
      window.location.hostname.includes('vercel.app')));
  
  // Always log in development, optionally in production
  const shouldLog = !isProduction || (typeof window !== 'undefined' && window.location.search.includes('debug=true'));
  
  if (shouldLog) {
    console.log(isProduction ? '🌐 Production mode - processing image:' : '💻 Development mode - processing image:', imagePath);
  }
  
  if (isProduction) {
    return getProductionImageUrl(imagePath, options);
  } else {
    return getDevelopmentImageUrl(imagePath, options);
  }
};

/**
 * Get image URL for development environment with optimization
 * @param {string} imagePath - The image path from the database
 * @param {Object} options - Optimization options {width, height, quality}
 * @returns {string} - The complete development image URL
 */
const getDevelopmentImageUrl = (imagePath, options = {}) => {
  const { width = 400, height = 400, quality = 80 } = options;
  
  // Ensure imagePath is a string
  if (typeof imagePath !== 'string') {
    console.warn('getDevelopmentImageUrl: imagePath is not a string:', imagePath);
    return null;
  }
  
  // Use optimized image endpoint for local uploads
  if (imagePath.startsWith('/uploads/')) {
    const imagePathWithoutPrefix = imagePath.replace('/uploads/', '');
    return `${config.BASE_URL}/api/images/optimize/${imagePathWithoutPrefix}?width=${width}&height=${height}&quality=${quality}`;
  }
  
  // Handle paths with leading slash
  if (imagePath.startsWith('/')) {
    return `${config.BASE_URL}/api/images/optimize/${imagePath.substring(1)}?width=${width}&height=${height}&quality=${quality}`;
  }
  
  // Handle paths without leading slash
  return `${config.BASE_URL}/api/images/optimize/${imagePath}?width=${width}&height=${height}&quality=${quality}`;
};

/**
 * Get image URL for production environment
 * @param {string} imagePath - The image path from the database
 * @param {Object} options - Optimization options {width, height, quality}
 * @returns {string} - The complete production image URL
 */
const getProductionImageUrl = (imagePath, options = {}) => {
  // Ensure imagePath is a string
  if (typeof imagePath !== 'string') {
    console.warn('⚠️ getProductionImageUrl: imagePath is not a string:', imagePath);
    return null;
  }
  
  // Debug logging (can be enabled with ?debug=true)
  const shouldLog = typeof window !== 'undefined' && window.location.search.includes('debug=true');
  if (shouldLog) {
    console.log('📸 Processing production image path:', imagePath);
  }
  
  // If it's already a Vercel Blob URL, return as is
  if (imagePath.includes('blob.vercel-storage.com') || 
      imagePath.includes('.vercel-storage.com') ||
      imagePath.includes('public.blob.vercel')) {
    if (shouldLog) console.log('✅ Vercel Blob URL detected:', imagePath);
    return imagePath;
  }
  
  // CRITICAL: In production, /uploads/ paths don't exist!
  // These need to be Vercel Blob URLs or base64
  if (imagePath.startsWith('/uploads/')) {
    if (shouldLog) console.warn('⚠️ Legacy /uploads/ path in production - image may not load:', imagePath);
    // Return as-is but it probably won't work - images should be in Vercel Blob
    return imagePath;
  }
  
  // Static assets in public folder (like /images/fallback-product.jpg)
  if (imagePath.startsWith('/images/') || imagePath.startsWith('/public/')) {
    if (shouldLog) console.log('📁 Static asset path:', imagePath);
    return imagePath;
  }
  
  // Other paths with leading slash - treat as static assets
  if (imagePath.startsWith('/')) {
    if (shouldLog) console.log('📁 Static path with leading slash:', imagePath);
    return imagePath;
  }
  
  // Relative paths without leading slash - add leading slash for static assets
  if (shouldLog) console.log('📁 Relative path, adding leading slash:', imagePath);
  return `/${imagePath}`;
};

/**
 * Check if an image URL is valid
 * @param {string} url - The image URL to validate
 * @returns {boolean} - True if the URL is valid
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  
  // Check for valid protocols
  const validProtocols = ['http:', 'https:', 'data:'];
  try {
    const urlObj = new URL(url);
    return validProtocols.includes(urlObj.protocol);
  } catch {
    // If URL parsing fails, check if it's a data URL
    return url.startsWith('data:');
  }
};

/**
 * Get fallback image URL
 * @param {string} type - The type of fallback image ('product', 'profile', 'artisan')
 * @returns {string} - The fallback image URL
 */
export const getFallbackImageUrl = (type = 'product') => {
  const fallbackImages = {
    product: '/images/fallback-product.jpg',
    profile: '/images/fallback-profile.jpg',
    artisan: '/images/fallback-artisan.jpg'
  };
  
  const fallbackPath = fallbackImages[type] || fallbackImages.product;
  return getImageUrl(fallbackPath);
};

/**
 * Preload image for better performance
 * @param {string} url - The image URL to preload
 * @returns {Promise} - Promise that resolves when image is loaded
 */
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Get image dimensions
 * @param {string} url - The image URL
 * @returns {Promise<{width: number, height: number}>} - Promise with image dimensions
 */
export const getImageDimensions = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Generate responsive image URLs for different sizes
 * @param {string} imagePath - The base image path
 * @param {string[]} sizes - Array of sizes (e.g., ['thumbnail', 'medium', 'large'])
 * @returns {Object} - Object with size keys and URL values
 */
export const getResponsiveImageUrls = (imagePath, sizes = ['thumbnail', 'medium', 'large']) => {
  if (!imagePath) return {};
  
  const baseUrl = getImageUrl(imagePath);
  const responsiveUrls = {};
  
  sizes.forEach(size => {
    responsiveUrls[size] = `${baseUrl}?size=${size}`;
  });
  
  return responsiveUrls;
};

/**
 * Handle image loading errors gracefully
 * @param {Event} event - The error event
 * @param {string} fallbackType - The type of fallback image to show
 */
export const handleImageError = (event, fallbackType = 'product') => {
  const img = event.target;
  console.error('❌ Image failed to load:', img.src);
  
  // Only set fallback if it's not already a fallback or placeholder
  if (!img.src.includes('fallback-') && !img.src.includes('placeholder')) {
    const fallbackUrl = getFallbackImageUrl(fallbackType);
    console.log('🔄 Setting fallback image:', fallbackUrl);
    img.src = fallbackUrl;
  } else {
    // Use a placeholder image from a reliable CDN as last resort
    if (!img.src.includes('placeholder')) {
      console.log('🔄 Using placeholder image from CDN');
      img.src = `https://placehold.co/400x400/F5F1EA/3C6E47?text=${fallbackType}`;
    } else {
      // Hide image if even placeholder fails
      console.log('❌ All image loading attempts failed, hiding image');
      img.style.display = 'none';
    }
  }
};

export default {
  getImageUrl,
  isValidImageUrl,
  getFallbackImageUrl,
  preloadImage,
  getImageDimensions,
  getResponsiveImageUrls,
  handleImageError
};
