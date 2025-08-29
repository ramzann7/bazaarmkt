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
      // Reduce logging to prevent console spam
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
      
      // Check if user is an artisan (artisans cannot add to cart)
      if (userId) {
        try {
          const { getProfile } = await import('./authService');
          const userProfile = await getProfile();
          if (userProfile.role === 'artisan') {
            throw new Error('Artisans cannot add products to cart. They are sellers, not buyers.');
          }
        } catch (error) {
          if (error.message.includes('Artisans cannot add products to cart')) {
            throw error;
          }
          // If it's not a role restriction error, continue (might be network error)
          console.warn('Could not verify user role, continuing with cart operation:', error.message);
        }
      }
      
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
        // Enhanced product data with artisan information
        const enhancedProduct = {
          ...product,
          quantity: quantity,
          addedAt: new Date().toISOString(),
          // Ensure artisan information is properly structured
          artisan: product.artisan || {
            artisanName: product.seller?.artisanName || 'Unknown Artisan',
            type: product.seller?.type || 'other',
            deliveryOptions: product.seller?.deliveryOptions || {
              pickup: true,
              delivery: false,
              deliveryRadius: 0,
              deliveryFee: 0
            }
          }
        };
        
        cart.push(enhancedProduct);
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
      throw error; // Re-throw to allow calling code to handle the error
    }
  },

  updateQuantity: (productId, quantity, userId) => {
    try {
      const cart = cartService.getCart(userId);
      const item = cart.find(cartItem => cartItem._id === productId);
      
      if (item) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          const updatedCart = cart.filter(cartItem => cartItem._id !== productId);
          
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
        } else {
          // Update quantity
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
        const artisanId = item.seller?._id || item.artisan?._id || 'unknown';
        if (!groupedByArtisan[artisanId]) {
          groupedByArtisan[artisanId] = {
            artisan: {
              _id: artisanId,
              artisanName: item.artisan?.artisanName || item.seller?.artisanName || `${item.seller?.firstName || 'Unknown'} ${item.seller?.lastName || 'Artisan'}`,
              type: item.artisan?.type || item.seller?.type || 'other',
              deliveryOptions: item.artisan?.deliveryOptions || item.seller?.deliveryOptions || {
                pickup: true,
                delivery: false,
                deliveryRadius: 0,
                deliveryFee: 0
              }
            },
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

  // New method to get delivery options for a specific artisan
  getArtisanDeliveryOptions: (artisanId, userId) => {
    try {
      const cartByArtisan = cartService.getCartByArtisan(userId);
      const artisanData = cartByArtisan[artisanId];
      
      if (!artisanData) {
        return {
          pickup: true,
          delivery: false,
          deliveryRadius: 0,
          deliveryFee: 0
        };
      }
      
      return artisanData.artisan.deliveryOptions || {
        pickup: true,
        delivery: false,
        deliveryRadius: 0,
        deliveryFee: 0
      };
    } catch (error) {
      console.error('Error getting artisan delivery options:', error);
      return {
        pickup: true,
        delivery: false,
        deliveryRadius: 0,
        deliveryFee: 0
      };
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
        if (!item.seller && !item.artisan) {
          errors.push(`Missing seller information for: ${item.name}`);
        }
      });
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        isValid: false,
        errors: ['Cart validation failed']
      };
    }
  },

  // Get user profile data for checkout
  getUserProfileData: async (userId) => {
    try {
      if (!userId) {
        return null; // Guest users don't have profile data
      }
      
      const { getProfile } = await import('./authService');
      const profile = await getProfile();
      
      return {
        addresses: profile.addresses || [],
        paymentMethods: profile.paymentMethods || [],
        defaultAddress: profile.addresses?.find(addr => addr.isDefault) || profile.addresses?.[0],
        defaultPaymentMethod: profile.paymentMethods?.find(pay => pay.isDefault) || profile.paymentMethods?.[0]
      };
    } catch (error) {
      console.error('Error getting user profile data:', error);
      return null;
    }
  },

  // Validate checkout data against user profile
  validateCheckoutData: async (userId, deliveryAddress, paymentMethod) => {
    try {
      if (!userId) {
        // For guest users, just validate the provided data
        return {
          isValid: !!(deliveryAddress && paymentMethod),
          errors: []
        };
      }
      
      const profileData = await cartService.getUserProfileData(userId);
      if (!profileData) {
        return {
          isValid: false,
          errors: ['Unable to load user profile data']
        };
      }
      
      const errors = [];
      
      // Validate delivery address
      if (!deliveryAddress) {
        errors.push('Delivery address is required');
      } else if (!profileData.addresses.some(addr => 
        addr.street === deliveryAddress.street && 
        addr.city === deliveryAddress.city && 
        addr.zipCode === deliveryAddress.zipCode
      )) {
        // Address should match one from user's profile
        errors.push('Delivery address must match one from your profile');
      }
      
      // Validate payment method
      if (!paymentMethod) {
        errors.push('Payment method is required');
      } else if (!profileData.paymentMethods.some(pay => pay._id === paymentMethod._id)) {
        // Payment method should be from user's profile
        errors.push('Payment method must be from your profile');
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      console.error('Error validating checkout data:', error);
      return {
        isValid: false,
        errors: ['Checkout validation failed']
      };
    }
  }
};
