// src/services/cartService.js

const getCartKey = (userId) => {
  const key = `food_finder_cart_${userId}`;
  return key;
};

const getGuestCartKey = () => {
  return 'food_finder_guest_cart';
};

// Helper function to get current user ID from token
const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    
    return payload.userId || null;
  } catch (error) {
    console.error('❌ Error getting user ID from token:', error);
    localStorage.removeItem('token');
    return null;
  }
};

// Helper function to check if user is guest
const isGuestUser = () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return true; // No token means guest user
    }
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token'); // Remove expired token
      return true;
    }
    
    // Check if this is a guest user based on the token payload
    const isGuest = payload.isGuest === true;
    return isGuest;
  } catch (error) {
    console.error('Error checking guest status:', error);
    localStorage.removeItem('token');
    return true; // If we can't parse the token, treat as guest
  }
};

export const cartService = {
  getCart: (userId) => {
    try {
      console.log('🔍 getCart called with userId:', userId);
      
      // If userId is explicitly null, treat as guest user
      if (userId === null) {
        const guestCartKey = getGuestCartKey();
        const guestCart = localStorage.getItem(guestCartKey);
        console.log('🔍 Guest cart key:', guestCartKey, 'Guest cart data:', guestCart);
        return guestCart ? JSON.parse(guestCart) : [];
      }
      
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
        console.log('🔍 No userId provided, got from token:', userId);
      }
      
      // If no userId or if it's a guest user, use guest cart
      if (!userId || isGuestUser()) {
        const guestCartKey = getGuestCartKey();
        const guestCart = localStorage.getItem(guestCartKey);
        console.log('🔍 Using guest cart, key:', guestCartKey, 'data:', guestCart);
        return guestCart ? JSON.parse(guestCart) : [];
      }
      
      // For authenticated non-guest users, use user-specific cart
      const cartKey = getCartKey(userId);
      const cart = localStorage.getItem(cartKey);
      console.log('🔍 Using user cart, key:', cartKey, 'data:', cart);
      return cart ? JSON.parse(cart) : [];
    } catch (error) {
      console.error('Error getting cart:', error);
      return [];
    }
  },

  addToCart: async (product, quantity = 1, userId) => {
    try {
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
      }
      
      console.log('🛒 Adding to cart:', { product: product.name, quantity, userId });

      
      // Check if user is an artisan (artisans cannot add to cart)
      if (userId && !isGuestUser()) {
        try {
          const { getProfile } = await import('./authservice');
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
      
      // If no userId, treat as guest user (no automatic profile creation)
      if (!userId) {
        userId = null; // Explicitly set to null for guest cart
        console.log('🔍 No userId, setting to null for guest cart');
      }
      
      const cart = cartService.getCart(userId);
      console.log('📦 Current cart before adding:', cart);
      console.log('🔍 isGuestUser() result:', isGuestUser());

      
      const existingItem = cart.find(cartItem => cartItem._id === product._id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
        console.log('🔄 Updated existing item quantity:', existingItem);
      } else {
        // Enhanced product data with artisan information
        const enhancedProduct = {
          ...product,
          quantity: quantity,
          addedAt: new Date().toISOString(),
          // Preserve original artisan data completely, including _id field
          artisan: product.artisan ? {
            ...product.artisan,  // Keep all original artisan fields including _id
                    artisanName: product.artisan.artisanName || 'Unknown Artisan',
        type: product.artisan.type || 'other',
        deliveryOptions: product.artisan.deliveryOptions || {
              pickup: true,
              delivery: false,
              deliveryRadius: 0,
              deliveryFee: 0
            }
          } : {
            // Fallback if no artisan data
            artisanName: 'Unknown Artisan',
            type: 'other',
            deliveryOptions: {
              pickup: true,
              delivery: false,
              deliveryRadius: 0,
              deliveryFee: 0
            }
          }
        };
        
        cart.push(enhancedProduct);
        console.log('➕ Added new item to cart:', enhancedProduct);
      }
      
      console.log('📦 Cart after adding:', cart);

      
      // Save to appropriate cart (guest or user)
      if (isGuestUser()) {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(cart));
        console.log('💾 Saved to guest cart localStorage, key:', guestCartKey, 'data:', cart);
      } else if (userId) {
        const cartKey = getCartKey(userId);
        localStorage.setItem(cartKey, JSON.stringify(cart));
        console.log('💾 Saved to user cart localStorage:', cartKey, 'data:', cart);
      } else {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(cart));
        console.log('💾 Saved to guest cart localStorage (fallback), key:', guestCartKey, 'data:', cart);
      }
      
      const count = cartService.getCartCount(userId);
      console.log('🔢 Cart count after adding:', count);
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart, count, userId } 
      }));
      console.log('📡 Dispatched cart update event');
      
      return cart;
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
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
          
          // Save to appropriate cart
          if (isGuestUser()) {
            const guestCartKey = getGuestCartKey();
            localStorage.setItem(guestCartKey, JSON.stringify(updatedCart));
          } else if (userId) {
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
          
          // Save to appropriate cart
          if (isGuestUser()) {
            const guestCartKey = getGuestCartKey();
            localStorage.setItem(guestCartKey, JSON.stringify(cart));
          } else if (userId) {
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

  removeFromCart: (productId, userId) => {
    try {

      
      const cart = cartService.getCart(userId);
      const updatedCart = cart.filter(cartItem => cartItem._id !== productId);
      
      // Save to appropriate cart
      if (isGuestUser()) {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(updatedCart));
      } else if (userId) {
        const cartKey = getCartKey(userId);
        localStorage.setItem(cartKey, JSON.stringify(updatedCart));
      } else {
        const guestCartKey = getGuestCartKey();
        localStorage.setItem(guestCartKey, JSON.stringify(updatedCart));
      }
      
      const count = cartService.getCartCount(userId);
      
      // Dispatch cart update event
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cart: updatedCart, count, userId } 
      }));
      
      return updatedCart;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return [];
    }
  },

  clearCart: (userId) => {
    try {
      if (isGuestUser()) {
        const guestCartKey = getGuestCartKey();
        localStorage.removeItem(guestCartKey);
      } else if (userId) {
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
      // If userId is explicitly null, treat as guest user
      if (userId === null) {
        const cart = cartService.getCart(null);
        return cart.reduce((count, item) => count + item.quantity, 0);
      }
      
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
      }
      const cart = cartService.getCart(userId);
      return cart.reduce((count, item) => count + item.quantity, 0);
    } catch (error) {
      console.error('Error calculating cart count:', error);
      return 0;
    }
  },

  getCartByArtisan: async (userId) => {
    try {
      // If userId is explicitly null, treat as guest user
      if (userId === null) {
        const cart = cartService.getCart(null);
        console.log('🔍 getCartByArtisan - Raw cart from localStorage (guest):', cart);
        
        // Process guest cart the same way as regular cart
        if (!cart || cart.length === 0) {
          return {};
        }
        
        // Continue with normal processing for guest users
      }
      
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
      }
      const cart = cartService.getCart(userId);
      console.log('🔍 getCartByArtisan - Raw cart from localStorage:', cart);
      
      const groupedByArtisan = {};
      
      // Group items by artisan
      const artisanGroups = {};
      cart.forEach(item => {
        // Use only artisan ID since we've migrated away from seller concept
        const artisanId = item.artisan?._id || item.artisanId || 'unknown';
        

        
        if (!artisanGroups[artisanId]) {
          artisanGroups[artisanId] = {
            items: [],
            artisanId: artisanId
          };
        }
        artisanGroups[artisanId].items.push(item);
      });
      
      // Fetch latest artisan data for each artisan
      for (const [artisanId, group] of Object.entries(artisanGroups)) {
        try {
          // Try to fetch latest artisan profile
          const latestArtisanData = await cartService.fetchArtisanProfile(artisanId);
          
          if (latestArtisanData) {
            // Use latest data from database
            groupedByArtisan[artisanId] = {
              artisan: {
                _id: artisanId,
                artisanName: latestArtisanData.artisanName || 'Unknown Artisan',
                type: latestArtisanData.type || 'other',
                deliveryOptions: latestArtisanData.deliveryOptions || {
                  pickup: true,
                  delivery: false,
                  deliveryRadius: 0,
                  deliveryFee: 0,
                  freeDeliveryThreshold: 0
                },
                address: latestArtisanData.address,
                pickupLocation: latestArtisanData.pickupLocation,
                pickupInstructions: latestArtisanData.pickupInstructions,
                pickupHours: latestArtisanData.pickupHours,
                pickupSchedule: latestArtisanData.pickupSchedule,
                deliveryInstructions: latestArtisanData.deliveryInstructions
              },
              items: group.items,
              subtotal: group.items.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0)
            };
          } else {
            // Fallback to cart item data if fetch fails
            const fallbackItem = group.items[0];
            groupedByArtisan[artisanId] = {
              artisan: {
                _id: artisanId,
                artisanName: fallbackItem.artisan?.artisanName || 'Unknown Artisan',
                type: fallbackItem.artisan?.type || 'other',
                deliveryOptions: fallbackItem.artisan?.deliveryOptions || {
                  pickup: true,
                  delivery: false,
                  deliveryRadius: 0,
                  deliveryFee: 0,
                  freeDeliveryThreshold: 0
                }
              },
              items: group.items,
              subtotal: group.items.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0)
            };
          }
        } catch (error) {
          console.error(`Error fetching artisan ${artisanId} profile:`, error);
          // Fallback to cart item data
          const fallbackItem = group.items[0];
          groupedByArtisan[artisanId] = {
            artisan: {
              _id: artisanId,
              artisanName: fallbackItem.artisan?.artisanName || 'Unknown Artisan',
              type: fallbackItem.artisan?.type || 'other',
              deliveryOptions: fallbackItem.artisan?.deliveryOptions || {
                pickup: true,
                delivery: false,
                deliveryRadius: 0,
                deliveryFee: 0,
                freeDeliveryThreshold: 0
              }
            },
            items: group.items,
            subtotal: group.items.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0)
          };
        }
      }
      
      return groupedByArtisan;
    } catch (error) {
      console.error('Error grouping cart by artisan:', error);
      return {};
    }
  },

  // Sync cart data to ensure consistency
  syncCartData: async (userId) => {
    try {
      // Get current cart from localStorage
      const currentCart = cartService.getCart(userId);
      
      // Get cart by artisan to see what should be there
      const cartByArtisan = await cartService.getCartByArtisan(userId);
      console.log('🏪 Cart by artisan data:', cartByArtisan);
      
      // Check for inconsistencies
      const localStorageCount = currentCart.length;
      const artisanCount = Object.values(cartByArtisan).reduce((total, artisanData) => {
        return total + (artisanData.items?.length || 0);
      }, 0);
      
      console.log('🔍 Sync consistency check:', {
        localStorageCount,
        artisanCount,
        isConsistent: localStorageCount === artisanCount
      });
      
      if (localStorageCount !== artisanCount) {
        console.warn('⚠️ Cart inconsistency detected during sync!');
        
        // Rebuild cart from artisan data to ensure consistency
        const syncedCart = [];
        Object.values(cartByArtisan).forEach(artisanData => {
          artisanData.items.forEach(item => {
            syncedCart.push(item);
          });
        });
        
        // Update localStorage with synced data
        if (isGuestUser()) {
          const guestCartKey = getGuestCartKey();
          localStorage.setItem(guestCartKey, JSON.stringify(syncedCart));
        } else if (userId) {
          const cartKey = getCartKey(userId);
          localStorage.setItem(cartKey, JSON.stringify(syncedCart));
        }
        
        console.log('✅ Cart synced successfully:', syncedCart);
        
        // Dispatch cart update event
        const count = cartService.getCartCount(userId);
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { cart: syncedCart, count, userId } 
        }));
        
        return syncedCart;
      }
      
      console.log('✅ Cart is already consistent, no sync needed');
      return currentCart;
    } catch (error) {
      console.error('Error syncing cart data:', error);
      return cartService.getCart(userId);
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
              if (!item.artisan) {
        errors.push(`Missing artisan information for: ${item.name}`);
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
      
      const { getProfile } = await import('./authservice');
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
  },

  // Function to fetch full artisan profile for better delivery options
  fetchArtisanProfile: async (artisanId) => {
    try {
      // Get the token for authentication
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Use relative URL that works with Vite proxy
      const apiBaseUrl = '/api';
      
      // The artisanId parameter is the artisan document ID from the cart item
      // Use the standard artisan endpoint
      const response = await fetch(`${apiBaseUrl}/artisans/${artisanId}`, {
        headers
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 404) {
        console.warn(`Artisan ${artisanId} not found`);
        return null;
      }
      
      console.error(`Error fetching artisan profile: ${response.status} ${response.statusText}`);
      return null;
    } catch (error) {
      console.error(`Error fetching artisan profile for ${artisanId}:`, error);
      return null;
    }
  },



  // Alias for getCartCount to maintain compatibility
  getCartItemCount: (userId) => {
    // If userId is explicitly null, treat as guest user
    if (userId === null) {
      return cartService.getCartCount(null);
    }
    
    // If no userId provided, try to get it from token
    if (!userId) {
      userId = getCurrentUserId();
    }
    return cartService.getCartCount(userId);
  },

  // Export the isGuestUser function
  isGuestUser: () => isGuestUser()
};
