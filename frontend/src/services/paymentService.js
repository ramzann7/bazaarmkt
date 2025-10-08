// src/services/paymentService.js
import api from './apiClient';
import config from '../config/environment.js';

// Create axios instance for payment API calls
const paymentApi = api.create({
  baseURL: config.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
paymentApi.interceptors.request.use(
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

export const paymentService = {
  // Get user's saved payment methods
  getPaymentMethods: async () => {
    try {
      const response = await paymentApi.get('/profile/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  // Add a new payment method
  addPaymentMethod: async (paymentData) => {
    try {
      const response = await paymentApi.post('/profile/payment-methods', paymentData);
      return response.data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  // Remove a payment method
  removePaymentMethod: async (paymentMethodId) => {
    try {
      const response = await paymentApi.delete(`/profile/payment-methods/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (paymentMethodId) => {
    try {
      const response = await paymentApi.patch(`/profile/payment-methods/${paymentMethodId}/default`);
      return response.data;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  },

  // Process payment for an order
  processPayment: async (orderData, paymentMethodId) => {
    try {
      const response = await paymentApi.post('/payments/process', {
        orderData,
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  },

  // Validate credit card number (Luhn algorithm)
  validateCreditCard: (cardNumber) => {
    if (!cardNumber) return false;
    
    // Remove spaces and dashes
    const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleanNumber)) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },

  // Format credit card number for display
  formatCreditCardNumber: (cardNumber) => {
    if (!cardNumber) return '';
    
    const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
    const groups = cleanNumber.match(/.{1,4}/g);
    
    return groups ? groups.join(' ') : cleanNumber;
  },

  // Mask credit card number for security
  maskCreditCardNumber: (cardNumber) => {
    if (!cardNumber) return '';
    
    const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
    if (cleanNumber.length < 4) return cleanNumber;
    
    const last4 = cleanNumber.slice(-4);
    const masked = '*'.repeat(cleanNumber.length - 4);
    
    return masked + last4;
  },

  // Get card brand from number
  getCardBrand: (cardNumber) => {
    if (!cardNumber) return 'unknown';
    
    const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
    
    // Visa
    if (/^4/.test(cleanNumber)) return 'visa';
    
    // Mastercard
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
    
    // American Express
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    
    // Discover
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  },

  // Validate expiry date
  validateExpiryDate: (month, year) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const inputYear = parseInt(year);
    const inputMonth = parseInt(month);
    
    if (inputYear < currentYear) return false;
    if (inputYear === currentYear && inputMonth < currentMonth) return false;
    if (inputMonth < 1 || inputMonth > 12) return false;
    
    return true;
  },

  // Validate CVV
  validateCVV: (cvv, cardBrand) => {
    if (!cvv) return false;
    
    const cvvLength = cardBrand === 'amex' ? 4 : 3;
    return /^\d+$/.test(cvv) && cvv.length === cvvLength;
  }
};

export default paymentService;
