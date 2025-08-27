// src/services/cartService.js

const getCartKey = (userId) => {
  const key = `food_finder_cart_${userId}`;
  return key;
};

const getGuestCartKey = () => {
  return 'food_finder_guest_cart';
};

export const cartService = {
  getCart: (userId) => {
    try {
      if (!userId) {
        // Return guest cart if no userId
        const guestCartKey = getGuestCartKey();
        const guestCart = localStorage.getItem(guestCartKey);
        return guestCart ? JSON.parse(guestCart) : [];
      }
      const cartKey = getCartKey(userId);
      const cart = localStorage.getItem(cartKey);
      const parsedCart = cart ? JSON.parse(cart) : [];
      return parsedCart;
    } catch (error) {
      console.error('Error getting cart:', error);
      return [];
    }
  },

  addToCart: async (product, quantity = 1, userId) => {
    try {
      console.log('Adding to cart:', { product: product.name, quantity, userId });
      
      // If no userId, create guest user automatically
      if (!userId) {
        try {
          const { guestService } = await import('./guestService');
          const guestData = await guestService.ensureGuestUser();
          userId = guestData.userId;
          console.log('Created guest user for cart:', userId);
        } catch (error) {
          console.error('Failed to create guest user:', error);
          // Continue with guest cart in localStorage
        }
      }
      
      const cart = cartService.getCart(userId);
      console.log('Current cart:', cart);
      
      const existingItem = cart.find(cartItem => cartItem._id === product._id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({ 
          ...product, 
          quantity: quantity,
          addedAt: new Date().toISOString()
        });
      }
      
      console.log('Updated cart:', cart);
      
      if (userId) {
        const cartKey = getCartKey(userId);
        localStorage.setItem(cartKey, JSON.stringify(cart));
        console.log('Saved to user cart:', cartKey);
      } else {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(cart));
        console.log('Saved to guest cart:', guestCartKey);
      }
      
      const count = cartService.getCartCount(userId);
      console.log('Cart count:', count);
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart, count, userId } 
      }));
      
      return cart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return [];
    }
  },

  removeFromCart: (itemId, userId) => {
    try {
      const cart = cartService.getCart(userId);
      const updatedCart = cart.filter(item => item._id !== itemId);
      
      if (userId) {
        const cartKey = getCartKey(userId);
        localStorage.setItem(cartKey, JSON.stringify(updatedCart));
      } else {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(updatedCart));
      }
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: updatedCart, count: cartService.getCartCount(userId), userId } 
      }));
      
      return updatedCart;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return [];
    }
  },

  updateQuantity: (itemId, quantity, userId) => {
    try {
      const cart = cartService.getCart(userId);
      const item = cart.find(cartItem => cartItem._id === itemId);
      
      if (item) {
        if (quantity <= 0) {
          return cartService.removeFromCart(itemId, userId);
        } else {
          item.quantity = quantity;
          
          if (userId) {
            const cartKey = getCartKey(userId);
            localStorage.setItem(cartKey, JSON.stringify(cart));
          } else {
            const guestCartKey = getGuestCartKey();
            localStorage.setItem(guestCartKey, JSON.stringify(cart));
          }
          
          // Dispatch cart update event
          window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { cart, count: cartService.getCartCount(userId), userId } 
          }));
          
          return cart;
        }
      }
      
      return cart;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return [];
    }
  },

  clearCart: (userId) => {
    try {
      if (userId) {
        const cartKey = getCartKey(userId);
        localStorage.removeItem(cartKey);
      } else {
        const guestCartKey = getGuestCartKey();
        localStorage.removeItem(guestCartKey);
      }
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: [], count: 0, userId } 
      }));
      
      return [];
    } catch (error) {
      console.error('Error clearing cart:', error);
      return [];
    }
  },

  getCartTotal: (userId) => {
    try {
      const cart = cartService.getCart(userId);
      return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    } catch (error) {
      console.error('Error calculating cart total:', error);
      return 0;
    }
  },

  getCartCount: (userId) => {
    try {
      const cart = cartService.getCart(userId);
      return cart.reduce((count, item) => count + item.quantity, 0);
    } catch (error) {
      console.error('Error calculating cart count:', error);
      return 0;
    }
  },

  getCartByArtisan: (userId) => {
    try {
      const cart = cartService.getCart(userId);
      const groupedByArtisan = {};
      
      cart.forEach(item => {
        const artisanId = item.seller?._id || 'unknown';
        if (!groupedByArtisan[artisanId]) {
          groupedByArtisan[artisanId] = {
            artisan: item.seller,
            items: [],
            subtotal: 0
          };
        }
        
        groupedByArtisan[artisanId].items.push(item);
        groupedByArtisan[artisanId].subtotal += item.price * item.quantity;
      });
      
      return groupedByArtisan;
    } catch (error) {
      console.error('Error grouping cart by artisan:', error);
      return {};
    }
  },

  validateCart: (userId) => {
    try {
      const cart = cartService.getCart(userId);
      const errors = [];
      
      cart.forEach(item => {
        if (!item._id) {
          errors.push(`Invalid product: ${item.name}`);
        }
        if (!item.price || item.price <= 0) {
          errors.push(`Invalid price for: ${item.name}`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Invalid quantity for: ${item.name}`);
        }
        if (!item.seller?._id) {
          errors.push(`Missing seller information for: ${item.name}`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        isValid: false,
        errors: ['Cart validation failed']
      };
    }
  },

  // Clear all carts (useful for logout)
  clearAllCarts: () => {
    try {
      const keys = Object.keys(localStorage);
      const cartKeys = keys.filter(key => key.startsWith('food_finder_cart_'));
      cartKeys.forEach(key => localStorage.removeItem(key));
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: [], count: 0, userId: null } 
      }));
      
      return [];
    } catch (error) {
      console.error('Error clearing all carts:', error);
      return [];
    }
  }
};
