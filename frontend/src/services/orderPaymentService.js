// src/services/orderPaymentService.js
import api from './apiClient';
import config from '../config/environment.js';
import { clearProductCache, clearFeaturedProductsCache, clearPopularProductsCache } from './productService';
import { cacheService, CACHE_KEYS } from './cacheService';

// Use the existing api instance which already has authentication and base configuration
const orderPaymentApi = api;

export const orderPaymentService = {
  // Create payment intent for authenticated user order
  createPaymentIntent: async (orderData) => {
    try {
      const response = await orderPaymentApi.post('/orders/payment-intent', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Create payment intent for guest user order
  createGuestPaymentIntent: async (orderData) => {
    try {
      const response = await orderPaymentApi.post('/orders/guest/payment-intent', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating guest payment intent:', error);
      throw error;
    }
  },

  // Confirm payment and create order
  confirmPaymentAndCreateOrder: async (paymentIntentId, orderData) => {
    try {
      const response = await orderPaymentApi.post('/orders/confirm-payment', {
        paymentIntentId,
        orderData
      });
      
      // Clear all product caches after successful order creation
      console.log('🧹 Clearing product caches after order creation...');
      
      // Clear productService Map cache
      clearProductCache(); // Clears all products
      clearFeaturedProductsCache(); // Specifically clear featured
      clearPopularProductsCache(); // Specifically clear popular
      
      // Clear cacheService global cache
      cacheService.delete(CACHE_KEYS.FEATURED_PRODUCTS);
      cacheService.delete(CACHE_KEYS.POPULAR_PRODUCTS);
      cacheService.delete(CACHE_KEYS.NEARBY_PRODUCTS);
      cacheService.delete(CACHE_KEYS.PRODUCT_DETAILS);
      
      console.log('✅ Product caches cleared after order creation (both Map and global cache)');
      
      return response.data;
    } catch (error) {
      console.error('Error confirming payment and creating order:', error);
      console.error('Error response data:', error.response?.data);
      throw error;
    }
  },

  // Save payment method with Stripe PaymentMethod ID
  savePaymentMethod: async (paymentMethodData) => {
    try {
      // Backend expects payment method data wrapped in a 'paymentMethod' object
      const response = await orderPaymentApi.post('/profile/payment-methods', {
        paymentMethod: paymentMethodData
      });
      return response.data;
    } catch (error) {
      console.error('Error saving payment method:', error);
      console.error('Error response data:', error.response?.data);
      throw error;
    }
  }
};
