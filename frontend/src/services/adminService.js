import axios from 'axios';
import { authToken } from './authService';

const API_BASE_URL = '/api';

// Create axios instance with auth token
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = authToken.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    }
    if (error.response?.status === 403) {
      // Forbidden - admin access required
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// User Management
export const adminService = {
  // Get all users
  getUsers: async () => {
    const response = await adminApi.get('/admin/users');
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, isActive) => {
    const response = await adminApi.patch(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    const response = await adminApi.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  // Product Management
  getProducts: async () => {
    const response = await adminApi.get('/admin/products');
    return response.data;
  },

  updateProductStatus: async (productId, isActive) => {
    const response = await adminApi.patch(`/admin/products/${productId}/status`, { isActive });
    return response.data;
  },

  updateProductFeatured: async (productId, isFeatured) => {
    const response = await adminApi.patch(`/admin/products/${productId}/featured`, { isFeatured });
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await adminApi.delete(`/admin/products/${productId}`);
    return response.data;
  },

  // Artisan Management
  getArtisans: async () => {
    const response = await adminApi.get('/admin/artisans');
    return response.data;
  },

  updateArtisanStatus: async (artisanId, isActive) => {
    const response = await adminApi.patch(`/admin/artisans/${artisanId}/status`, { isActive });
    return response.data;
  },

  updateArtisanVerification: async (artisanId, isVerified) => {
    const response = await adminApi.patch(`/admin/artisans/${artisanId}/verification`, { isVerified });
    return response.data;
  },

  // Dashboard Stats
  getStats: async () => {
    const response = await adminApi.get('/admin/stats');
    return response.data;
  },

  // Analytics
  getAnalytics: async (period = 30) => {
    const response = await adminApi.get(`/admin/analytics?period=${period}`);
    return response.data;
  },
};

export default adminService;
