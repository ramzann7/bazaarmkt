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
  
  // Handle base64 data URLs (already complete)
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Handle HTTP URLs (including Vercel Blob URLs)
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Handle Vercel Blob URLs that might be stored as filenames
  if (imagePath.includes('.public.blob.vercel-storage.com')) {
    return imagePath;
  }
  
  // Environment-specific handling
  if (config.NODE_ENV === 'production') {
    // Production: Use Vercel Blob or CDN URLs
    return getProductionImageUrl(imagePath, options);
  } else {
    // Development: Use optimized local server URLs
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
  // If it's already a Vercel Blob URL, return as is
  if (imagePath.includes('.public.blob.vercel-storage.com')) {
    return imagePath;
  }
  
  // For production, we'll use Vercel Blob or CDN with optimization
  // This will be implemented when Vercel Blob is set up
  if (imagePath.startsWith('/uploads/')) {
    const { width = 400, height = 400, quality = 80 } = options;
    // Convert to Vercel Blob URL format with optimization
    return `https://${process.env.VITE_VERCEL_BLOB_DOMAIN || 'blob.vercel-storage.com'}/uploads${imagePath.replace('/uploads', '')}?w=${width}&h=${height}&q=${quality}`;
  }
  
  // Handle other paths
  return `${config.UPLOADS_URL}/${imagePath}`;
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
  const fallbackUrl = getFallbackImageUrl(fallbackType);
  
  // Only set fallback if it's not already a fallback
  if (!img.src.includes('fallback-')) {
    img.src = fallbackUrl;
  } else {
    // Hide image if fallback also fails
    img.style.display = 'none';
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
