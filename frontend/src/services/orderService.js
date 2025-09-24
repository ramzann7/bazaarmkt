import axios from 'axios';
import { authToken } from './authservice';
import { cacheService, CACHE_KEYS } from './cacheService';
import { clearProductCache } from './productService';
import { cartService } from './cartService';
import config from '../config/environment.js';

const API_URL = config.API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${authToken.getToken()}`,
  'Content-Type': 'application/json'
});

// Helper function to clear all product-related caches after order creation
const clearProductCaches = () => {
  console.log('🧹 Clearing all product-related caches after order creation');
  clearProductCache();
  cacheService.delete(CACHE_KEYS.FEATURED_PRODUCTS);
  cacheService.delete(CACHE_KEYS.POPULAR_PRODUCTS);
  cacheService.delete(CACHE_KEYS.NEARBY_PRODUCTS);
  cacheService.delete(CACHE_KEYS.PRODUCT_DETAILS);
  // Clear cart cache to ensure fresh product availability checks
  cartService.clearCartCache();
};

export const orderService = {
  // Get all orders for the current user (patron)
  getPatronOrders: async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/buyer`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching patron orders:', error);
      throw error;
    }
  },

  // Get all orders for the current artisan
  getArtisanOrders: async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/artisan`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan orders:', error);
      throw error;
    }
  },

  // Get a specific order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Create a guest order (no authentication required)
  createGuestOrder: async (orderData) => {
    try {
      const response = await axios.post(`${API_URL}/orders/guest`, orderData);
      
      // Clear product cache after successful order creation to ensure fresh inventory data
      clearProductCaches();
      
      return response.data;
    } catch (error) {
      console.error('Error creating guest order:', error);
      throw error;
    }
  },

  // Create a new order
  createOrder: async (orderData) => {
    try {
      // Check if user is guest and redirect to guest order endpoint if needed
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.isGuest === true) {
            // For guest users, prepare guest order data and use the guest endpoint
            const guestOrderData = {
              ...orderData,
              guestInfo: {
                firstName: payload.firstName || 'Guest',
                lastName: payload.lastName || 'User',
                email: payload.email || 'guest@example.com',
                phone: payload.phone || ''
              },
              paymentDetails: {
                method: orderData.paymentMethod || 'credit_card',
                cardNumber: '****', // Masked for security
                expiryDate: '**/**',
                cvv: '***',
                cardholderName: 'Guest User'
              }
            };
            const result = await orderService.createGuestOrder(guestOrderData);
            
            // Clear product cache after successful guest order creation
            clearProductCaches();
            
            return result;
          }
        } catch (parseError) {
          console.warn('Could not parse token for guest check:', parseError);
        }
      }

      
      const response = await axios.post(`${API_URL}/orders`, orderData, {
        headers: getAuthHeaders()
      });
      
      // Clear product cache after successful order creation to ensure fresh inventory data
      clearProductCaches();
      
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Update order status (artisan only)
  updateOrderStatus: async (orderId, statusData) => {
    try {
      const response = await axios.put(`${API_URL}/orders/${orderId}/status`, statusData, {
        headers: getAuthHeaders()
      });
      
      // Clear product cache after status update as inventory might be restored
      clearProductCaches();
      
      return response.data;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (orderId, paymentStatus) => {
    try {
      const response = await axios.put(`${API_URL}/orders/${orderId}/payment`, { paymentStatus }, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Cancel order (patron only)
  cancelOrder: async (orderId) => {
    try {
      const response = await axios.put(`${API_URL}/orders/${orderId}/cancel`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },

  // Decline order (artisan only)
  declineOrder: async (orderId, reason) => {
    try {
      
      const response = await axios.put(`${API_URL}/orders/${orderId}/decline`, { reason }, {
        headers: getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Order Service Debug - Decline Error:', error);
      console.error('❌ Order Service Debug - Error Response:', error.response?.data);
      throw error;
    }
  },

  // Get artisan statistics
  getArtisanStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/artisan/stats`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan stats:', error);
      throw error;
    }
  },

  // Helper function to format order status
  formatOrderStatus: (status) => {
    const statusMap = {
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      'confirmed': { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      'preparing': { label: 'Preparing', color: 'bg-orange-100 text-orange-800' },
      'ready': { label: 'Ready', color: 'bg-green-100 text-green-800' },
      'delivering': { label: 'Delivering', color: 'bg-purple-100 text-purple-800' },
      'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-800' },
      'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  },

  // Helper function to format payment status
  formatPaymentStatus: (status) => {
    const statusMap = {
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      'paid': { label: 'Paid', color: 'bg-green-100 text-green-800' },
      'failed': { label: 'Failed', color: 'bg-red-100 text-red-800' },
      'refunded': { label: 'Refunded', color: 'bg-gray-100 text-gray-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  },

  // Helper function to format preparation stage
  formatPreparationStage: (stage) => {
    const stageMap = {
      'order_received': 'Order Received',
      'ingredients_gathered': 'Ingredients Gathered',
      'production_started': 'Production Started',
      'quality_check': 'Quality Check',
      'packaging': 'Packaging',
      'ready_for_delivery': 'Ready for Delivery'
    };
    return stageMap[stage] || stage;
  }
};
