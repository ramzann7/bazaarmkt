import api from './apiClient';

import config from '../config/environment.js';

const API_BASE_URL = config.API_URL;

// Create axios instance with default config
const reviewApi = api.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
reviewApi.interceptors.request.use(
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

// Add response interceptor for error handling
reviewApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const reviewService = {
  // Get all reviews for an artisan (public)
  getArtisanReviews: async (artisanId) => {
    try {
      const response = await reviewApi.get(`/reviews/artisan/${artisanId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan reviews:', error);
      throw error;
    }
  },

  // Add a new review for an artisan (requires patron authentication)
  addReview: async (artisanId, reviewData) => {
    try {
      console.log('🔍 ReviewService: Adding new review for artisan:', artisanId, 'with data:', reviewData);
      const response = await reviewApi.post(`/reviews/artisan/${artisanId}`, reviewData);
      console.log('🔍 ReviewService: Review added successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding review:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Please sign in to leave a review');
      } else if (error.response?.status === 403) {
        const message = error.response.data?.message || 'You are not authorized to leave reviews';
        throw new Error(message);
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || 'Invalid review data';
        throw new Error(message);
      } else {
        throw new Error('Failed to add review. Please try again.');
      }
    }
  },

  // Update an existing review (requires patron authentication)
  updateReview: async (reviewId, reviewData) => {
    try {
      console.log('🔍 ReviewService: Updating review:', reviewId, 'with data:', reviewData);
      const response = await reviewApi.put(`/reviews/${reviewId}`, reviewData);
      console.log('🔍 ReviewService: Review updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating review:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Please sign in to update your review');
      } else if (error.response?.status === 403) {
        const message = error.response.data?.message || 'You are not authorized to update this review';
        throw new Error(message);
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || 'Invalid review data';
        throw new Error(message);
      } else {
        throw new Error('Failed to update review. Please try again.');
      }
    }
  },

  // Delete a review (requires patron authentication)
  deleteReview: async (reviewId) => {
    try {
      const response = await reviewApi.delete(`/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting review:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Please sign in to delete your review');
      } else if (error.response?.status === 403) {
        const message = error.response.data?.message || 'You are not authorized to delete this review';
        throw new Error(message);
      } else {
        throw new Error('Failed to delete review. Please try again.');
      }
    }
  },

  // Get user's review for an artisan (requires authentication)
  getUserReview: async (artisanId) => {
    try {
      console.log('🔍 ReviewService: Fetching user review for artisan:', artisanId);
      const response = await reviewApi.get(`/reviews/artisan/${artisanId}/user`);
      console.log('🔍 ReviewService: User review found:', response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('🔍 ReviewService: No user review found (404)');
        return null; // User hasn't reviewed this artisan yet
      } else if (error.response?.status === 401) {
        console.log('🔍 ReviewService: User not authenticated (401)');
        return null; // User not authenticated
      }
      console.error('Error fetching user review:', error);
      throw error;
    }
  },

  // Get review statistics for an artisan (public)
  getArtisanReviewStats: async (artisanId) => {
    try {
      const response = await reviewApi.get(`/reviews/artisan/${artisanId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching review stats:', error);
      throw error;
    }
  },

  // Check if user can leave reviews (helper function)
  canUserLeaveReview: (user) => {
    if (!user) return false;
    if (user.isGuest) return false;
    if (user.role === 'admin') return false;
    if (user.role === 'artisan') return false;
    return user.role === 'patron';
  }
};

export default reviewService;
