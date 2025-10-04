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

// Simple in-memory cache for cart data to reduce localStorage reads
const cartCache = new Map();
const CART_CACHE_TTL = 5000; // 5 seconds

// Helper function to clear cart cache
const clearCartCache = (userId) => {
  if (userId === null) {
    // Clear guest cart cache
    const guestCartKey = getGuestCartKey();
    cartCache.delete(`guest_${guestCartKey}`);
  } else if (userId) {
    // Clear user cart cache
    const cartKey = getCartKey(userId);
    cartCache.delete(`user_${cartKey}`);
  } else {
    // Clear all cache
    cartCache.clear();
  }
};

export const cartService = {
  getCart: (userId) => {
    try {
      
      // If userId is explicitly null, treat as guest user
      if (userId === null) {
        const guestCartKey = getGuestCartKey();
        
        // Check cache first
        const cacheKey = `guest_${guestCartKey}`;
        const cached = cartCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CART_CACHE_TTL) {
          return cached.data;
        }
        
        const guestCart = localStorage.getItem(guestCartKey);
        const cartData = guestCart ? JSON.parse(guestCart) : [];
        
        // Cache the result
        cartCache.set(cacheKey, { data: cartData, timestamp: Date.now() });
        
        return cartData;
      }
      
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
      }
      
      // If no userId or if it's a guest user, use guest cart
      if (!userId || isGuestUser()) {
        const guestCartKey = getGuestCartKey();
        
        // Check cache first
        const cacheKey = `guest_${guestCartKey}`;
        const cached = cartCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CART_CACHE_TTL) {
          return cached.data;
        }
        
        const guestCart = localStorage.getItem(guestCartKey);
        const cartData = guestCart ? JSON.parse(guestCart) : [];
        
        // Cache the result
        cartCache.set(cacheKey, { data: cartData, timestamp: Date.now() });
        
        return cartData;
      }
      
      // For authenticated non-guest users, use user-specific cart
      const cartKey = getCartKey(userId);
      
      // Check cache first
      const cacheKey = `user_${cartKey}`;
      const cached = cartCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CART_CACHE_TTL) {
        return cached.data;
      }
      
      const cart = localStorage.getItem(cartKey);
      const cartData = cart ? JSON.parse(cart) : [];
      
      // Cache the result
      cartCache.set(cacheKey, { data: cartData, timestamp: Date.now() });
      
      return cartData;
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

      // Check product availability before adding to cart
      const availabilityCheck = await cartService.checkProductAvailability(product._id, quantity);
      if (!availabilityCheck.isAvailable) {
        throw new Error(availabilityCheck.message || 'Product is not available');
      }

      // Check if user is an artisan trying to order from themselves
      if (userId) {
        try {
          const { getProfile } = await import('./authservice');
          const userProfile = await getProfile();
          
          // Check if user is an artisan
          if (userProfile && ['artisan', 'producer', 'food_maker'].includes(userProfile.role)) {
            // Get user's artisan profile from main profile endpoint
            const { profileService } = await import('./profileService');
            const profileResponse = await profileService.getProfile();
            const artisanProfile = profileResponse.data?.user?.artisan;
            
            // Check if the product's artisan matches the current user's artisan profile
            if (artisanProfile && product.artisan && 
                (artisanProfile._id === product.artisan._id || 
                 artisanProfile._id === product.artisan)) {
              throw new Error('You cannot order from yourself. Artisans cannot purchase their own products.');
            }
          }
        } catch (error) {
          // If it's our custom error, re-throw it
          if (error.message.includes('cannot order from yourself')) {
            throw error;
          }
          // For other errors (like profile not found), continue with the cart operation
          console.log('Could not verify artisan status, allowing cart operation:', error.message);
        }
      }
      
      // If no userId, treat as guest user (no automatic profile creation)
      if (!userId) {
        userId = null; // Explicitly set to null for guest cart
      }
      
      const cart = cartService.getCart(userId);
      console.log('📦 Current cart before adding:', cart);

      // Check if adding this product would create multiple artisans
      if (cart.length > 0) {
        const currentArtisanIds = new Set(cart.map(item => {
          if (typeof item.artisan === 'string') {
            return item.artisan;
          } else if (item.artisan && item.artisan._id) {
            return item.artisan._id;
          }
          return null;
        }).filter(id => id !== null));

        const newProductArtisanId = typeof product.artisan === 'string' 
          ? product.artisan 
          : product.artisan?._id;

        if (newProductArtisanId && !currentArtisanIds.has(newProductArtisanId)) {
          throw new Error('Only one artisan per order is currently supported. Please complete your current order or remove items from other artisans before adding new items.');
        }
      }
      
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
          // Extract artisan name at top level for easier access
          artisanName: typeof product.artisan === 'object' && product.artisan 
            ? (product.artisan.artisanName || product.artisan.businessName || 'Unknown Artisan')
            : product.artisanName || 'Unknown Artisan',
          // Handle both string ID and object artisan data
          artisan: typeof product.artisan === 'string' 
            ? product.artisan  // Keep as string ID
            : product.artisan ? {
                ...product.artisan,  // Keep all original artisan fields including _id
                artisanName: product.artisan.artisanName || product.artisan.businessName || 'Unknown Artisan',
                type: product.artisan.type || 'other',
                deliveryOptions: product.artisan.deliveryOptions || {
                  pickup: true,
                  delivery: false,
                  deliveryRadius: 0,
                  deliveryFee: 0
                }
              } : 'unknown'
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
      
      // Calculate count directly from the cart array to avoid race conditions
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      console.log('🔢 Cart count after adding:', count);
      
      // Clear cache since cart data has changed
      clearCartCache(userId);
      
      // Dispatch cart update event with a small delay to ensure localStorage is updated
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: { cart, count, userId } 
        }));
        console.log('📡 Dispatched cart update event');
      }, 10);
      
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
          
          // Calculate count directly from the updated cart array
          const count = updatedCart.reduce((total, item) => total + item.quantity, 0);
          
          // Clear cache since cart data has changed
          clearCartCache(userId);
          
          // Dispatch cart update event
          window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { cart: updatedCart, count, userId } 
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
          
          // Calculate count directly from the cart array
          const count = cart.reduce((total, item) => total + item.quantity, 0);
          
          // Clear cache since cart data has changed
          clearCartCache(userId);
          
          // Dispatch cart update event
          window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { cart, count, userId } 
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
      
      // Calculate count directly from the updated cart array
      const count = updatedCart.reduce((total, item) => total + item.quantity, 0);
      
      // Clear cache since cart data has changed
      clearCartCache(userId);
      
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
      
      // Clear cache since cart data has changed
      clearCartCache(userId);
      
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
        const guestCartKey = getGuestCartKey();
        
        // Check cache first
        const cacheKey = `guest_${guestCartKey}`;
        const cached = cartCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CART_CACHE_TTL) {
          return cached.data.reduce((count, item) => count + item.quantity, 0);
        }
        
        // Get from localStorage directly without full cart processing
        const guestCart = localStorage.getItem(guestCartKey);
        if (!guestCart) return 0;
        
        const cartData = JSON.parse(guestCart);
        return cartData.reduce((count, item) => count + item.quantity, 0);
      }
      
      // If no userId provided, try to get it from token
      if (!userId) {
        userId = getCurrentUserId();
      }
      
      if (!userId) {
        // No user ID available, return 0
        return 0;
      }
      
      const cartKey = getCartKey(userId);
      
      // Check cache first
      const cacheKey = `user_${cartKey}`;
      const cached = cartCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CART_CACHE_TTL) {
        return cached.data.reduce((count, item) => count + item.quantity, 0);
      }
      
      // Get from localStorage directly without full cart processing
      const userCart = localStorage.getItem(cartKey);
      if (!userCart) return 0;
      
      const cartData = JSON.parse(userCart);
      return cartData.reduce((count, item) => count + item.quantity, 0);
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
      
      const groupedByArtisan = {};
      
      // Group items by artisan
      const artisanGroups = {};
      cart.forEach(item => {
        // Use only artisan ID since we've migrated away from seller concept
        // Handle both string ID (item.artisan) and object ID (item.artisan._id)
        const artisanId = typeof item.artisan === 'string' 
          ? item.artisan 
          : item.artisan?._id || item.artisanId || 'unknown';
        

        
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
                professionalDelivery: latestArtisanData.professionalDelivery || {
                  enabled: false,
                  uberDirectEnabled: false,
                  serviceRadius: 25,
                  regions: [],
                  packaging: '',
                  restrictions: ''
                },
                address: latestArtisanData.address,
                coordinates: latestArtisanData.coordinates,
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
                },
                professionalDelivery: fallbackItem.artisan?.professionalDelivery || {
                  enabled: false,
                  uberDirectEnabled: false,
                  serviceRadius: 25,
                  regions: [],
                  packaging: '',
                  restrictions: ''
                },
                address: fallbackItem.artisan?.address,
                coordinates: fallbackItem.artisan?.coordinates
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
        
        // Calculate count directly from the synced cart array
        const count = syncedCart.reduce((total, item) => total + item.quantity, 0);
        
        // Dispatch cart update event
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

  // Check product availability before adding to cart
  checkProductAvailability: async (productId, requestedQuantity = 1) => {
    try {
      // Get the token for authentication
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Use the correct backend API URL
      const apiBaseUrl = 'http://localhost:4000/api';
      
      // Fetch full product details with cache-busting to ensure fresh inventory data
      const response = await fetch(`${apiBaseUrl}/products/${productId}?t=${Date.now()}`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            isAvailable: false,
            message: 'Product not found'
          };
        }
        return {
          isAvailable: false,
          message: 'Unable to check product availability'
        };
      }
      
      const product = await response.json();
      
      // Check availability based on product type
      if (product.productType === 'ready_to_ship') {
        const availableStock = product.stock || 0;
        if (availableStock <= 0) {
          return {
            isAvailable: false,
            message: 'Product is out of stock'
          };
        }
        if (availableStock < requestedQuantity) {
          return {
            isAvailable: false,
            message: `Only ${availableStock} items available in stock`
          };
        }
      } else if (product.productType === 'made_to_order') {
        const remainingCapacity = product.remainingCapacity || product.totalCapacity || 0;
        if (remainingCapacity <= 0) {
          return {
            isAvailable: false,
            message: 'No capacity available for this custom order'
          };
        }
        if (remainingCapacity < requestedQuantity) {
          return {
            isAvailable: false,
            message: `Only ${remainingCapacity} capacity remaining for this order`
          };
        }
        // Also check maxOrderQuantity limit
        if (product.maxOrderQuantity && requestedQuantity > product.maxOrderQuantity) {
          return {
            isAvailable: false,
            message: `Maximum ${product.maxOrderQuantity} items per order`
          };
        }
      } else if (product.productType === 'scheduled_order') {
        const availableQuantity = product.availableQuantity || 0;
        if (availableQuantity <= 0) {
          return {
            isAvailable: false,
            message: 'Product is not available for the selected date'
          };
        }
        if (availableQuantity < requestedQuantity) {
          return {
            isAvailable: false,
            message: `Only ${availableQuantity} items available for the selected date`
          };
        }
      }
      
      return {
        isAvailable: true,
        message: 'Product is available'
      };
    } catch (error) {
      console.error(`Error checking product availability for ${productId}:`, error);
      return {
        isAvailable: false,
        message: 'Unable to check product availability'
      };
    }
  },

  // Function to fetch full product details for availability calculations
  fetchProductDetails: async (productId) => {
    try {
      // Get the token for authentication
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Use the correct backend API URL
      const apiBaseUrl = 'http://localhost:4000/api';
      
      // Fetch full product details with cache-busting to ensure fresh inventory data
      const response = await fetch(`${apiBaseUrl}/products/${productId}?t=${Date.now()}`, {
        headers
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 404) {
        console.warn(`Product ${productId} not found`);
        return null;
      }
      
      console.error(`Error fetching product details: ${response.status} ${response.statusText}`);
      return null;
    } catch (error) {
      console.error(`Error fetching product details for ${productId}:`, error);
      return null;
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
      
      // Use the correct backend API URL
      const apiBaseUrl = 'http://localhost:4000/api';
      
      // The artisanId parameter is the artisan document ID from the cart item
      // Use the standard artisan endpoint
      const response = await fetch(`${apiBaseUrl}/artisans/${artisanId}`, {
        headers
      });
      
      if (response.ok) {
        const responseData = await response.json();
        const artisanData = responseData.data || responseData; // Handle both wrapped and unwrapped responses
        console.log('🔍 Fetched artisan data from backend:', {
          artisanId,
          artisanName: artisanData.artisanName,
          address: artisanData.address,
          coordinates: artisanData.coordinates,
          deliveryOptions: artisanData.deliveryOptions,
          fullData: artisanData
        });
        return artisanData;
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
  isGuestUser: () => isGuestUser(),

  // Export the clearCartCache function
  clearCartCache: (userId) => clearCartCache(userId)
};
