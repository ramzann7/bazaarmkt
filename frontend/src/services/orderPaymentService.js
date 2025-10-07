// src/services/orderPaymentService.js
import api from './apiClient';
import config from '../config/environment.js';

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
      console.log('🔍 OrderPaymentService - Sending guest order data:', orderData);
      const response = await orderPaymentApi.post('/orders/guest/payment-intent', orderData);
      console.log('✅ OrderPaymentService - Guest payment intent created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ OrderPaymentService - Error creating guest payment intent:', error);
      if (error.response?.data) {
        console.error('❌ OrderPaymentService - Error response data:', error.response.data);
      }
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
