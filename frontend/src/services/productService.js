import axios from 'axios';
import { normalizeProductData, logCategoryUsage } from '../utils/categoryUtils';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/products` : 'http://localhost:4000/api/products';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache helper functions
const getCacheKey = (endpoint, params = {}) => {
  return `${endpoint}?${JSON.stringify(params)}`;
};

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const clearCache = () => {
  cache.clear();
};

// Clear product cache for specific artisan
const clearProductCache = (artisanId = null) => {
  if (artisanId) {
    // Clear cache for products from specific artisan
    const keysToDelete = [];
    for (const [key] of cache) {
      if (key.includes('all-products') || key.includes('featured-products') || key.includes('popular-products')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => cache.delete(key));
  } else {
    // Clear all product cache
    cache.clear();
  }
};

// Export clearCache for debugging
export { clearCache, clearProductCache };

// Get all products (for discover page)
export const getAllProducts = async (filters = {}) => {
  const cacheKey = getCacheKey('all-products', filters);
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const response = await axios.get(`${API_URL}?${params.toString()}`);
  // Extract products array from response if it exists, otherwise return the data as is
  const productsData = response.data.products || response.data;
  setCache(cacheKey, productsData);
  return productsData;
};

// Get featured products
export const getFeaturedProducts = async () => {
  const cacheKey = getCacheKey('featured-products');
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    console.log('Returning cached featured products:', cached);
    return cached;
  }
  
  console.log('Fetching featured products from API...');
  const response = await axios.get(`${API_URL}/featured`);
  console.log('Featured products API response:', response.data);
  
  // Return the full response data which includes success, products, and count
  setCache(cacheKey, response.data);
  return response.data;
};

// Clear featured products cache (for testing)
export const clearFeaturedProductsCache = () => {
  const cacheKey = getCacheKey('featured-products');
  cache.delete(cacheKey);
};

// Get popular products
export const getPopularProducts = async () => {
  const cacheKey = getCacheKey('popular-products');
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    console.log('Returning cached popular products:', cached);
    return cached;
  }
  
  console.log('Fetching popular products from API...');
  const response = await axios.get(`${API_URL}/popular`);
  console.log('Popular products API response:', response.data);
  
  // Return the full response data which includes success, products, and count
  setCache(cacheKey, response.data);
  return response.data;
};

// Clear popular products cache (for testing)
export const clearPopularProductsCache = () => {
  const cacheKey = getCacheKey('popular-products');
  cache.delete(cacheKey);
};

// Search products with enhanced filters
export const searchProducts = async (searchQuery, filters = {}) => {
  const params = new URLSearchParams();
  
  // Add search query if provided
  if (searchQuery) {
    params.append('search', searchQuery);
  }
  
  // Add all filters
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  // Use the main endpoint which supports both search and filters
  const response = await axios.get(`${API_URL}?${params.toString()}`);
  // Extract products array from response if it exists, otherwise return the data as is
  return response.data.products || response.data;
};

// Get search suggestions
export const getSearchSuggestions = async (query) => {
  if (!query || query.length < 2) {
    return { suggestions: [] };
  }
  
  const response = await axios.get(`${API_URL}/suggestions?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Get seller's products
export const getMyProducts = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/my-products`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Get products by producer ID
export const getProductsByProducer = async (producerId) => {
  const response = await axios.get(`${API_URL}/producer/${producerId}`);
  return response.data;
};

// Get single product by ID
export const getProductById = async (productId) => {
  const response = await axios.get(`${API_URL}/${productId}`);
  return response.data;
};

// Create new product
export const createProduct = async (productData) => {
  const token = localStorage.getItem('token');
  
  // Normalize and validate product data
  const normalizedData = normalizeProductData(productData);
  logCategoryUsage('ProductService', 'createProduct', normalizedData);
  
  let requestData;
  let headers = { 
    Authorization: `Bearer ${token}`
  };
  
  // Check if there's an image file to upload
  if (normalizedData.image instanceof File) {
    // Use FormData for file upload
    requestData = new FormData();
    
    Object.keys(normalizedData).forEach(key => {
      if (key === 'image') {
        requestData.append('image', normalizedData.image);
      } else if (key === 'tags' && Array.isArray(normalizedData[key])) {
        requestData.append('tags', JSON.stringify(normalizedData[key]));
      } else if (key === 'scheduleDetails' && typeof normalizedData[key] === 'object') {
        requestData.append('scheduleDetails', JSON.stringify(normalizedData[key]));
      } else if (normalizedData[key] !== undefined && normalizedData[key] !== null) {
        requestData.append(key, normalizedData[key]);
      }
    });
    
    // Don't set Content-Type for FormData, let browser set it with boundary
  } else {
    // Use JSON for data without files
    requestData = normalizedData;
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await axios.post(API_URL, requestData, { headers });
  return response.data;
};

// Update product
export const updateProduct = async (productId, productData) => {
  const token = localStorage.getItem('token');
  
  // Normalize and validate product data
  const normalizedData = normalizeProductData(productData);
  logCategoryUsage('ProductService', 'updateProduct', normalizedData);
  
  let requestData;
  let headers = { Authorization: `Bearer ${token}` };
  
  // Check if there's an image file to upload
  const hasImageFile = normalizedData.image instanceof File;
  
  if (hasImageFile) {
    // Use FormData for image upload
    const formData = new FormData();
    
    Object.keys(normalizedData).forEach(key => {
      if (key === 'image' && normalizedData[key] instanceof File) {
        formData.append('image', normalizedData[key]);
      } else if (key === 'tags' && Array.isArray(normalizedData[key])) {
        formData.append('tags', JSON.stringify(normalizedData[key]));
      } else if (key === 'scheduleDetails' && typeof normalizedData[key] === 'object') {
        formData.append('scheduleDetails', JSON.stringify(normalizedData[key]));
      } else if (normalizedData[key] !== undefined && normalizedData[key] !== null) {
        formData.append(key, normalizedData[key]);
      }
    });
    
    requestData = formData;
    // Don't set Content-Type for FormData, let browser set it with boundary
  } else {
    // Use JSON for data without files
    requestData = normalizedData;
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await axios.put(`${API_URL}/${productId}`, requestData, { headers });
  return response.data;
};

// Update product inventory
export const updateInventory = async (productId, inventoryData) => {
  const token = localStorage.getItem('token');
  const response = await axios.patch(`${API_URL}/${productId}/inventory`, inventoryData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Reduce product inventory (for purchases)
export const reduceInventory = async (productId, quantity) => {
  const token = localStorage.getItem('token');
  const response = await axios.patch(`${API_URL}/${productId}/reduce-inventory`, 
    { quantity },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Delete product
export const deleteProduct = async (productId) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(`${API_URL}/${productId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Update product stock (for purchases)
export const updateProductStock = async (productId, quantity) => {
  const token = localStorage.getItem('token');
  const response = await axios.patch(`${API_URL}/${productId}/stock`, 
    { quantity },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// Get product categories
export const getProductCategories = async () => {
  const response = await axios.get(`${API_URL}/categories/list`);
  return response.data;
};



// Upload image to server (if you have image upload endpoint)
export const uploadImage = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('photo', file);
  
        const response = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/upload/photo`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Convert file to base64 for preview (fallback if no upload endpoint)
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Export all functions as a productService object for backward compatibility
export const productService = {
  getAllProducts,
  getMyProducts,
  getProductsByProducer,
  getProductById,
  createProduct,
  updateProduct,
  updateInventory,
  reduceInventory,
  deleteProduct,
  updateProductStock,
  getProductCategories,
  uploadImage,
  fileToBase64
};
