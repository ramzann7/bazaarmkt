// src/services/orderPaymentService.js
import axios from 'axios';
import config from '../config/environment.js';

// Create axios instance for order payment API calls
const orderPaymentApi = axios.create({
  baseURL: config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
orderPaymentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔍 OrderPaymentService - Token being sent:', token ? `${token.slice(0, 20)}...` : 'No token');
    } else {
      console.log('🔍 OrderPaymentService - No token found in localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      return response.data;
    } catch (error) {
      console.error('Error confirming payment and creating order:', error);
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
      throw error;
    }
  }
};
