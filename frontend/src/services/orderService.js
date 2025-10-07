import api from './apiClient';
import { cacheService, CACHE_KEYS } from './cacheService';
import { clearProductCache } from './productService';
import { cartService } from './cartService';
import config from '../config/environment.js';

const API_URL = config.API_URL;

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
  // Get orders for the current user (patron) - active orders by default
  getPatronOrders: async (includeAll = false) => {
    try {
      const response = await api.get(`${API_URL}/orders/buyer`, {
        params: {
          _t: Date.now(), // Cache busting parameter
          ...(includeAll && { all: 'true' }) // Include all orders if requested
        }
      });
      // API returns { success: true, data: { orders: [...] }, count: N }
      return response.data.data?.orders || response.data.orders || [];
    } catch (error) {
      console.error('Error fetching patron orders:', error);
      throw error;
    }
  },

  // Get orders for the current artisan - active orders by default
  getArtisanOrders: async (includeAll = false) => {
    try {
      const response = await api.get(`${API_URL}/orders/artisan`, {
        params: {
          _t: Date.now(), // Cache busting parameter
          ...(includeAll && { all: 'true' }) // Include all orders if requested
        }
      });
      // API returns { success: true, data: { orders: [...] }, count: N }
      return response.data.data?.orders || response.data.orders || [];
    } catch (error) {
      console.error('Error fetching artisan orders:', error);
      throw error;
    }
  },

  // Get a specific order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await api.get(`${API_URL}/orders/${orderId}`);
      // API returns { success: true, data: { order: {...} } }
      return response.data.data?.order || response.data.order || response.data;
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

      
      const response = await api.post(`${API_URL}/orders`, orderData);
      
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
      const response = await api.put(`${API_URL}/orders/${orderId}/status`, statusData);
      
      // Clear product cache after status update as inventory might be restored
      clearProductCaches();
      
      // Clear order-related caches to ensure fresh data
      const { cacheService, CACHE_KEYS } = await import('./cacheService');
      cacheService.clear(); // Clear all caches to ensure fresh data
      
      // Trigger toast notification for order status update
      try {
        const { orderNotificationService } = await import('./orderNotificationService');
        const { getProfile } = await import('./authservice');
        const profile = await getProfile();
        const userRole = profile.role || profile.userType;
        
        // Get the updated order data from response
        const updatedOrder = response.data?.data?.order || response.data?.order;
        if (updatedOrder && statusData.status) {
          orderNotificationService.triggerOrderStatusUpdateNotification(updatedOrder, statusData.status, userRole);
          console.log('✅ Order status update toast notification triggered');
        }
      } catch (toastError) {
        console.error('❌ Error triggering toast notification:', toastError);
        // Don't fail the status update if toast notification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (orderId, paymentStatus) => {
    try {
      const response = await api.put(`${API_URL}/orders/${orderId}/payment`, { paymentStatus });
      return response.data;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Cancel order (patron only)
  cancelOrder: async (orderId, reason = null) => {
    try {
      const response = await api.put(`${API_URL}/orders/${orderId}/cancel`, { reason });
      
      // Send notification to patron about successful cancellation
      try {
        const { notificationService } = await import('./notificationService');
        const { authService } = await import('./authservice');
        
        // Get current user info
        const user = await authService.getProfile();
        if (user && user.id) {
          const notificationData = {
            type: 'order_cancelled',
            userId: user.id,
            orderId: orderId,
            userEmail: user.email,
            userPhone: user.phone,
            userName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || 'Customer'),
            isGuest: false,
            orderDetails: {
              orderNumber: orderId,
              status: 'cancelled',
              orderDate: new Date().toLocaleDateString(),
              orderTime: new Date().toLocaleTimeString(),
              cancellationReason: reason
            },
            timestamp: new Date().toISOString()
          };

          // Send platform notification
          await notificationService.sendPlatformNotification(notificationData);
          
          // Send email notification if user has email
          if (user.email) {
            try {
              const preferences = await notificationService.getNotificationPreferences(user.id);
              if (preferences?.email?.orderUpdates) {
                await notificationService.sendOrderUpdateEmail(notificationData);
              }
            } catch (preferencesError) {
              console.warn('⚠️ Could not get notification preferences for cancellation, using defaults:', preferencesError);
              // Default to sending email if preferences can't be retrieved
              await notificationService.sendOrderUpdateEmail(notificationData);
            }
          }
          
          console.log('✅ Order cancellation notification sent to patron');
        }
      } catch (notificationError) {
        console.error('❌ Error sending cancellation notification to patron:', notificationError);
        // Don't fail the cancellation if notification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },

  // Decline order (artisan only)
  declineOrder: async (orderId, reason) => {
    try {
      // Use the status update endpoint with 'declined' or 'cancelled' status
      const response = await api.put(`${API_URL}/orders/${orderId}/status`, { 
        status: 'declined',
        updateReason: reason 
      });
      
      // Clear product cache after order decline as inventory might be restored
      clearProductCaches();
      
      // Clear order-related caches to ensure fresh data
      const { cacheService, CACHE_KEYS } = await import('./cacheService');
      cacheService.clear(); // Clear all caches to ensure fresh data
      
      return response.data;
    } catch (error) {
      console.error('❌ Error declining order:', error);
      throw error;
    }
  },

  // Patron confirms order receipt (patron only)
  confirmOrderReceipt: async (orderId) => {
    try {
      const response = await api.post(`${API_URL}/orders/${orderId}/confirm-receipt`, {});
      
      return response.data;
    } catch (error) {
      console.error('❌ Error confirming order receipt:', error);
      throw error;
    }
  },

  // Get artisan statistics
  getArtisanStats: async () => {
    try {
      const response = await api.get(`${API_URL}/orders/artisan/stats`);
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
