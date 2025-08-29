import axios from 'axios';
import { authToken } from './authService';
import { cartService } from './cartService';
import { orderService } from './orderService';
import toast from 'react-hot-toast';

const API_URL = '/api/orders';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${authToken.getToken()}`,
  'Content-Type': 'application/json'
});

export const checkoutService = {
  // Validate cart before checkout
  validateCheckout: async (userId) => {
    try {
      const cart = cartService.getCart(userId);
      const validation = cartService.validateCart(userId);
      
      if (!validation.isValid) {
        throw new Error(`Cart validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }
      
      return {
        isValid: true,
        cart,
        total: cartService.getCartTotal(userId),
        groupedByArtisan: cartService.getCartByArtisan(userId)
      };
    } catch (error) {
      console.error('Checkout validation error:', error);
      throw error;
    }
  },

  // Process checkout and create orders
  processCheckout: async (checkoutData, userId) => {
    try {
      const { deliveryAddress, paymentMethod, specialRequests } = checkoutData;
      
      // Validate checkout data
      if (!deliveryAddress) {
        throw new Error('Delivery address is required');
      }
      
      // Get cart grouped by artisan
      const groupedByArtisan = cartService.getCartByArtisan(userId);
      const orders = [];
      
      // Create separate orders for each artisan
      for (const [artisanId, artisanData] of Object.entries(groupedByArtisan)) {
        const orderData = {
          artisan: artisanId,
          items: artisanData.items.map(item => ({
            product: item._id,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity
          })),
          totalAmount: artisanData.subtotal,
          deliveryAddress,
          paymentMethod,
          specialRequests,
          status: 'pending',
          paymentStatus: 'pending',
          preparationStage: 'order_received'
        };
        
        // Create order
        const order = await orderService.createOrder(orderData);
        orders.push(order);
      }
      
      // Clear cart after successful order creation
      cartService.clearCart(userId);
      
      return {
        success: true,
        orders,
        message: `Successfully created ${orders.length} order${orders.length > 1 ? 's' : ''}`
      };
    } catch (error) {
      console.error('Checkout processing error:', error);
      throw error;
    }
  },

  // Process payment for an order
  processPayment: async (orderId, paymentData) => {
    try {
      // In a real application, this would integrate with a payment processor
      // For now, we'll simulate payment processing
      
      const paymentResult = await axios.post(`${API_URL}/${orderId}/payment`, paymentData, {
        headers: getAuthHeaders()
      });
      
      return paymentResult.data;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  },

  // Get checkout summary
  getCheckoutSummary: (userId) => {
    try {
      const cart = cartService.getCart(userId);
      const groupedByArtisan = cartService.getCartByArtisan(userId);
      const total = cartService.getCartTotal(userId);
      
      return {
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: total,
        artisanCount: Object.keys(groupedByArtisan).length,
        cartItems: cart,
        groupedByArtisan
      };
    } catch (error) {
      console.error('Error getting checkout summary:', error);
      throw error;
    }
  },

  // Calculate delivery fees
  calculateDeliveryFees: (deliveryAddress, artisanData) => {
    // This would integrate with a delivery service API
    // For now, return a simple calculation
    const baseFee = 5.00;
    const distanceMultiplier = 1.5; // Would be calculated based on distance
    
    return {
      baseFee,
      distanceFee: baseFee * distanceMultiplier,
      totalFee: baseFee + (baseFee * distanceMultiplier)
    };
  },

  // Validate delivery address
  validateDeliveryAddress: (address) => {
    const errors = [];
    
    if (!address.street || address.street.trim() === '') {
      errors.push('Street address is required');
    }
    
    if (!address.city || address.city.trim() === '') {
      errors.push('City is required');
    }
    
    if (!address.state || address.state.trim() === '') {
      errors.push('State/Province is required');
    }
    
    if (!address.zipCode || address.zipCode.trim() === '') {
      errors.push('ZIP/Postal code is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Get estimated delivery time
  getEstimatedDeliveryTime: (artisanData) => {
    // This would be calculated based on artisan's preparation time and delivery options
    const baseTime = 2; // hours
    const preparationTime = artisanData.leadTimeHours || 24;
    
    return {
      preparationTime,
      deliveryTime: baseTime,
      totalTime: preparationTime + baseTime,
      estimatedDelivery: new Date(Date.now() + (preparationTime + baseTime) * 60 * 60 * 1000)
    };
  },

  // Save checkout preferences
  saveCheckoutPreferences: async (preferences) => {
    try {
      const response = await axios.post('/api/profile/checkout-preferences', preferences, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error saving checkout preferences:', error);
      throw error;
    }
  },

  // Get saved checkout preferences
  getCheckoutPreferences: async () => {
    try {
      const response = await axios.get('/api/profile/checkout-preferences', {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting checkout preferences:', error);
      return null;
    }
  }
};
