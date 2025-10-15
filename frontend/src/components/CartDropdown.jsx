import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ShoppingBagIcon, TrashIcon, PlusIcon, MinusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cartService } from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUtils.js';
import toast from 'react-hot-toast';

export default function CartDropdown({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());

  // Load cart items
  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen, user]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isOpen) {
        loadCart();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [isOpen]);

  const loadCart = () => {
    setIsLoading(true);
    try {
      // Use the same logic as cartService - get userId from token if user object is not available
      let userId = user?._id || null;
      
      // If user object is not available, try to get userId from token (same as cartService logic)
      if (!userId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
          }
        } catch (tokenError) {
          console.warn('Could not get userId from token:', tokenError);
        }
      }
      
      const cartItems = cartService.getCart(userId);
      setCart(cartItems || []);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Prevent multiple simultaneous updates
    if (updatingItems.has(productId)) return;
    
    try {
      const item = cart.find(i => i._id === productId);
      if (!item) return;

      // Check inventory limits based on product type
      if (newQuantity > item.quantity) {
        // User is trying to increase quantity - check limits
        const maxAllowed = getMaxAllowedQuantity(item);
        
        if (newQuantity > maxAllowed) {
          const limitType = item.productType === 'ready_to_ship' ? t('products.inStock')
            : item.productType === 'made_to_order' ? t('productDetails.capacityAvailable')
            : t('productDetails.available');
          toast.error(`${t('common.only')} ${maxAllowed} ${limitType}`, { duration: 3000 });
          return;
        }
      }
      
      // Add to updating set for instant UI feedback
      setUpdatingItems(prev => new Set([...prev, productId]));
      
      // Use the same logic as cartService - get userId from token if user object is not available
      let userId = user?._id || null;
      if (!userId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
          }
        } catch (tokenError) {
          console.warn('Could not get userId from token:', tokenError);
        }
      }
      
      // Optimistically update the UI immediately
      setCart(prevCart => 
        prevCart.map(item => 
          item._id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
      
      // Update in background (correct parameter order: productId, quantity, userId)
      const updatedCartResult = cartService.updateQuantity(productId, newQuantity, userId);
      
      if (updatedCartResult && Array.isArray(updatedCartResult)) {
        toast.success(t('cart.quantityUpdated'), { duration: 1500 });
        
        // Reload cart to show updated data
        loadCart();
        
        // Dispatch cart update event for navbar
        const totalItems = updatedCartResult.reduce((sum, item) => sum + item.quantity, 0);
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { count: totalItems, userId, cart: updatedCartResult }
        }));
      } else {
        // Revert on failure
        loadCart();
        toast.error(t('cart.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      loadCart(); // Reload to ensure consistency
      toast.error(t('cart.updateFailed'));
    } finally {
      // Remove from updating set after a short delay for smooth animation
      setTimeout(() => {
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }, 300);
    }
  };

  // Get maximum allowed quantity based on product type and inventory
  // This matches the logic in AddToCart.jsx
  const getMaxAllowedQuantity = (item) => {
    switch (item.productType) {
      case 'ready_to_ship':
        // For ready to ship, use actual stock
        return item.stock || 0;
      
      case 'made_to_order':
        // For made to order, check BOTH capacity AND per-order limit
        const capacity = item.remainingCapacity || item.totalCapacity || 0;
        const orderLimit = item.maxOrderQuantity || 10;
        // Return the smaller of the two (whichever is more restrictive)
        return Math.min(capacity, orderLimit);
      
      case 'scheduled_order':
        // For scheduled orders, use availableQuantity (production capacity for that date)
        return item.availableQuantity || 0;
      
      default:
        // Fallback for unknown types
        return item.stock || 10;
    }
  };

  const handleRemoveItem = async (productId) => {
    // Prevent multiple simultaneous updates
    if (updatingItems.has(productId)) return;
    
    try {
      // Add to updating set for instant UI feedback
      setUpdatingItems(prev => new Set([...prev, productId]));
      
      // Use the same logic as cartService - get userId from token if user object is not available
      let userId = user?._id || null;
      if (!userId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
          }
        } catch (tokenError) {
          console.warn('Could not get userId from token:', tokenError);
        }
      }
      
      // Optimistically remove from UI
      setCart(prevCart => prevCart.filter(item => item._id !== productId));
      
      // Update in background (correct parameter order: productId, userId)
      const updatedCartResult = cartService.removeFromCart(productId, userId);
      
      if (updatedCartResult && Array.isArray(updatedCartResult)) {
        toast.success(t('cart.removedFromCart'), { duration: 1500 });
        
        // Reload cart to show updated data
        loadCart();
        
        // Dispatch cart update event for navbar
        const totalItems = updatedCartResult.reduce((sum, item) => sum + item.quantity, 0);
        window.dispatchEvent(new CustomEvent('cartUpdated', {
          detail: { count: totalItems, userId, cart: updatedCartResult }
        }));
      } else {
        // Revert on failure
        loadCart();
        toast.error(t('cart.removeFailed'));
      }
    } catch (error) {
      console.error('Error removing item:', error);
      loadCart(); // Reload to ensure consistency
      toast.error(t('cart.removeFailed'));
    } finally {
      // Remove from updating set
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/cart');
  };

  const handleImageError = (e, itemId) => {
    console.error('❌ CartDropdown - Image failed to load:', e.target.src);
    setImageErrors(prev => new Set([...prev, itemId]));
    // Hide the broken image, show placeholder
    e.target.style.display = 'none';
    if (e.target.nextElementSibling) {
      e.target.nextElementSibling.style.display = 'flex';
    }
  };

  const handleImageLoad = (e, itemId) => {
    console.log('✅ CartDropdown - Image loaded successfully:', e.target.src);
    // Remove from error set if it was there
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Dropdown Panel */}
      <div className="fixed right-0 top-16 w-full max-w-md h-[calc(100vh-4rem)] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="w-6 h-6 text-stone-700" />
            <h2 className="text-xl font-bold text-stone-800 font-display">Your Cart</h2>
            {cart.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                {cart.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-stone-700" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBagIcon className="w-20 h-20 text-stone-300 mb-4" />
              <h3 className="text-lg font-semibold text-stone-800 mb-2 font-display">Your cart is empty</h3>
              <p className="text-stone-500 mb-6">Add some products to get started!</p>
              <button
                onClick={onClose}
                className="btn-primary px-6 py-2"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const isUpdating = updatingItems.has(item._id);
                const hasImageError = imageErrors.has(item._id);
                const maxQuantity = getMaxAllowedQuantity(item);
                const isAtMaxQuantity = item.quantity >= maxQuantity;
                const isAtMaxOrder = item.maxOrderQuantity && item.quantity >= item.maxOrderQuantity;

                return (
                <div 
                  key={item._id} 
                  className={`card p-3 hover:shadow-md transition-all ${
                    isUpdating ? 'opacity-70 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="w-20 h-20 flex-shrink-0 bg-stone-100 rounded-lg overflow-hidden relative">
                      {item.image && !hasImageError ? (
                        <>
                          <img
                            src={getImageUrl(item.image, { width: 64, height: 64, quality: 80 })}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e, item._id)}
                            onLoad={(e) => handleImageLoad(e, item._id)}
                          />
                          {/* Loading skeleton while image loads */}
                          <div className="absolute inset-0 bg-gray-200 animate-pulse" style={{ display: 'none' }}></div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                          <ShoppingBagIcon className="w-10 h-10 text-stone-400" />
                        </div>
                      )}
                      {/* Updating spinner overlay */}
                      {isUpdating && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-stone-800 text-sm mb-1 line-clamp-2">
                        {item.name}
                      </h4>
                      
                      {/* Artisan Name */}
                      {(item.artisanName || item.artisan?.artisanName || item.artisan?.businessName) && (
                        <p className="text-xs text-stone-500 mb-2">
                          by {item.artisanName || item.artisan?.artisanName || item.artisan?.businessName}
                        </p>
                      )}

                      {/* Price and Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              item.quantity <= 1 || isUpdating
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-110'
                            }`}
                          >
                            {isUpdating ? (
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <MinusIcon className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-sm font-semibold text-stone-800 w-8 text-center">
                            {isUpdating ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            disabled={isUpdating || isAtMaxQuantity || isAtMaxOrder}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isUpdating || isAtMaxQuantity || isAtMaxOrder
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#3C6E47] hover:bg-[#2E5A3A] text-white hover:scale-110'
                            }`}
                            title={isAtMaxOrder ? `Max ${item.maxOrderQuantity} per order` : isAtMaxQuantity ? `Only ${maxQuantity} available` : 'Increase quantity'}
                          >
                            {isUpdating ? (
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <PlusIcon className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800">
                            ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item._id)}
                            disabled={isUpdating}
                            className={`p-1.5 rounded-full transition-all ${
                              isUpdating 
                                ? 'text-red-400 cursor-not-allowed'
                                : 'text-red-600 hover:bg-red-50 hover:scale-110'
                            }`}
                            title="Remove item"
                          >
                            {isUpdating ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Stock/Capacity Warning */}
                      {(isAtMaxQuantity || isAtMaxOrder) && (
                        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          <span>
                            {isAtMaxOrder 
                              ? `Max ${item.maxOrderQuantity} per order`
                              : item.productType === 'ready_to_ship'
                              ? `Only ${maxQuantity} in stock`
                              : item.productType === 'made_to_order'
                              ? `Only ${maxQuantity} capacity left`
                              : `Only ${maxQuantity} available`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Footer with Total and Checkout Button */}
        {cart.length > 0 && (
          <div className="border-t border-stone-200 p-4 bg-stone-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-stone-800">Total:</span>
              <span className="text-2xl font-bold text-amber-600">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full py-3 btn-primary font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
            >
              Continue to Checkout
            </button>
            
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 text-stone-600 hover:text-stone-800 font-medium transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

