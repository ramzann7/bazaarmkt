import axios from 'axios';
import { authToken } from './authservice';

const API_URL = '/api/orders';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${authToken.getToken()}`,
  'Content-Type': 'application/json'
});

export const orderService = {
  // Get all orders for the current user (patron)
  getPatronOrders: async () => {
    try {
      const response = await axios.get(`${API_URL}/buyer`, {
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
      const response = await axios.get(`${API_URL}/artisan`, {
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
      const response = await axios.get(`${API_URL}/${orderId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Create a new order
  createOrder: async (orderData) => {
    try {
      // Check if user is guest and add guest info if needed
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.isGuest && !orderData.guestInfo) {
            // For guest users, ensure we have guest info
            orderData.guestInfo = {
              firstName: orderData.guestInfo?.firstName || 'Guest',
              lastName: orderData.guestInfo?.lastName || 'User',
              email: orderData.guestInfo?.email || 'guest@example.com',
              phone: orderData.guestInfo?.phone || ''
            };
          }
        } catch (parseError) {
          console.warn('Could not parse token for guest check:', parseError);
        }
      }

      const response = await axios.post(API_URL, orderData, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Update order status (artisan only)
  updateOrderStatus: async (orderId, statusData) => {
    try {
      console.log('🔍 Order Status Update Debug - Order ID:', orderId);
      console.log('🔍 Order Status Update Debug - Status Data:', statusData);
      console.log('🔍 Order Status Update Debug - API URL:', `${API_URL}/${orderId}/status`);
      console.log('🔍 Order Status Update Debug - Auth Headers:', getAuthHeaders());
      
      const response = await axios.put(`${API_URL}/${orderId}/status`, statusData, {
        headers: getAuthHeaders()
      });
      
      console.log('🔍 Order Status Update Debug - Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (orderId, paymentStatus) => {
    try {
      const response = await axios.put(`${API_URL}/${orderId}/payment`, { paymentStatus }, {
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
      const response = await axios.put(`${API_URL}/${orderId}/cancel`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },

  // Get artisan statistics
  getArtisanStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/artisan/stats`, {
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
