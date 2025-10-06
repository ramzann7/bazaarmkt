// API Client - Configured axios instance with authentication
import axios from 'axios';
import config from '../config/environment.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear cache and token on auth error
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
    }
    return Promise.reject(error);
  }
);

export default api;
