// src/services/paymentService.js
import axios from 'axios';

const API_URL = '/api';

export const paymentService = {
  // Get user's payment methods
  getPaymentMethods: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.paymentMethods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  },

  // Add a new payment method
  addPaymentMethod: async (paymentData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/profile/payment-methods`, paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  // Update a payment method
  updatePaymentMethod: async (paymentMethodId, paymentData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/profile/payment-methods/${paymentMethodId}`, paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  },

  // Delete a payment method
  deletePaymentMethod: async (paymentMethodId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/profile/payment-methods/${paymentMethodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (paymentMethodId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${API_URL}/profile/payment-methods/${paymentMethodId}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  },

  // Validate card number (Luhn algorithm) - More flexible for different card types
  validateCardNumber: (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Check if it's a test card number (for development)
    const testCards = [
      '4111111111111111', // Visa test
      '5555555555554444', // Mastercard test
      '378282246310005',  // Amex test
      '6011111111111117', // Discover test
      '4242424242424242', // Visa test
      '4000056655665556', // Visa test
      '5555555555554444', // Mastercard test
      '2223003122003222', // Mastercard test
      '5200828282828210', // Mastercard test
      '5105105105105100', // Mastercard test
      '378734493671000',  // Amex test
      '371449635398431',  // Amex test
      '6011111111111117', // Discover test
      '6011000990139424', // Discover test
      '3056930009020004', // Diners Club test
      '3566002020360505', // JCB test
    ];
    
    // Allow test cards in development
    if (testCards.includes(cleanNumber)) {
      return true;
    }
    
    // Basic format check - more flexible for different card types
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return false;
    }

    // Get card brand to validate length
    const brand = paymentService.getCardBrand(cleanNumber);
    const validLengths = {
      'visa': [13, 16, 19],
      'mastercard': [16],
      'amex': [15],
      'discover': [16, 19],
      'diners': [14, 16, 19],
      'jcb': [16, 19],
      'unionpay': [16, 17, 18, 19],
      'unknown': [13, 14, 15, 16, 17, 18, 19] // Allow unknown cards with standard lengths
    };
    
    const allowedLengths = validLengths[brand] || validLengths.unknown;
    if (!allowedLengths.includes(cleanNumber.length)) {
      return false;
    }

    // Luhn algorithm validation
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

  // Get validation error message for card number
  getCardNumberError: (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (!cleanNumber) {
      return 'Card number is required';
    }
    
    if (!/^\d+$/.test(cleanNumber)) {
      return 'Card number must contain only digits';
    }
    
    if (cleanNumber.length < 13) {
      return 'Card number is too short';
    }
    
    if (cleanNumber.length > 19) {
      return 'Card number is too long';
    }
    
    // Check if it's a valid card brand
    const brand = paymentService.getCardBrand(cleanNumber);
    if (brand === 'unknown') {
      return 'Unsupported card type';
    }
    
    // If it passes all checks but fails Luhn, it's invalid
    if (!paymentService.validateCardNumber(cleanNumber)) {
      return 'Invalid card number';
    }
    
    return null; // No error
  },

  // Get card brand from number - Enhanced for more card types
  getCardBrand: (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Visa
    if (/^4/.test(cleanNumber)) {
      return 'visa';
    }
    // Mastercard (including new 2-series)
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
      return 'mastercard';
    }
    // American Express
    if (/^3[47]/.test(cleanNumber)) {
      return 'amex';
    }
    // Discover
    if (/^6(?:011|5)/.test(cleanNumber)) {
      return 'discover';
    }
    // Diners Club
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) {
      return 'diners';
    }
    // JCB
    if (/^(?:2131|1800|35)/.test(cleanNumber)) {
      return 'jcb';
    }
    // UnionPay
    if (/^62/.test(cleanNumber)) {
      return 'unionpay';
    }
    
    return 'unknown';
  },

  // Format card number for display
  formatCardNumber: (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    const brand = paymentService.getCardBrand(cleanNumber);
    
    if (brand === 'amex') {
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      return cleanNumber.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
    }
  },

  // Mask card number for display
  maskCardNumber: (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    const last4 = cleanNumber.slice(-4);
    return `**** **** **** ${last4}`;
  },

  // Validate expiry date
  validateExpiryDate: (month, year) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);
    
    if (expYear < currentYear) {
      return false;
    }
    
    if (expYear === currentYear && expMonth < currentMonth) {
      return false;
    }
    
    return expMonth >= 1 && expMonth <= 12;
  },

  // Validate CVV
  validateCVV: (cvv, cardBrand) => {
    const cleanCVV = cvv.replace(/\s/g, '');
    
    if (cardBrand === 'amex') {
      return /^\d{4}$/.test(cleanCVV);
    } else {
      return /^\d{3}$/.test(cleanCVV);
    }
  }
};
