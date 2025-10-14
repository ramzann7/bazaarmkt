import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  ShoppingBagIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../contexts/AuthContext';
import OptimizedImage from '../OptimizedImage';
import toast from 'react-hot-toast';

/**
 * MobileCartSidebar - Slide-out cart for mobile quick access
 * 
 * Features:
 * - Slide from right animation
 * - Touch-optimized controls
 * - Quick quantity adjustment
 * - Direct checkout access
 * - Real-time cart updates
 */
const MobileCartSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState(null);

  // Load cart
  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const userId = user ? user._id : null;
      const cartData = await cartService.getCart(userId);
      setCart(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  // Update quantity
  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }

    try {
      setUpdatingItem(productId);
      const userId = user ? user._id : null;
      await cartService.updateQuantity(productId, newQuantity, userId);
      await loadCart(); // Reload cart to get updated totals
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingItem(null);
    }
  };

  // Remove item
  const removeItem = async (productId) => {
    try {
      setUpdatingItem(productId);
      const userId = user ? user._id : null;
      await cartService.removeFromCart(productId, userId);
      await loadCart();
      toast.success('Item removed');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    } finally {
      setUpdatingItem(null);
    }
  };

  // Go to checkout
  const handleCheckout = () => {
    onClose();
    navigate('/cart');
  };

  // Calculate total
  const calculateTotal = () => {
    if (!cart || !cart.items || cart.items.length === 0) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  const total = calculateTotal();
  const itemCount = cart?.items?.length || 0;

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 lg:hidden transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="w-6 h-6 text-[#D77A61]" />
            <h2 className="text-lg font-bold text-gray-900">
              Cart ({itemCount})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close cart"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto pb-32">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D77A61]"></div>
            </div>
          ) : cart && cart.items && cart.items.length > 0 ? (
            <div className="px-4 py-4 space-y-4">
              {cart.items.map((item) => {
                const product = item.product;
                if (!product) return null;

                const isUpdating = updatingItem === product._id;

                return (
                  <div 
                    key={product._id}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3"
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <OptimizedImage
                        src={product.images?.[0] || product.image}
                        alt={product.name}
                        className="w-20 h-20 rounded-lg"
                        aspectRatio="1/1"
                        objectFit="cover"
                        priority={true}
                        fallbackSrc="/images/product-placeholder.png"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate mb-1">
                        {product.name}
                      </h3>
                      <p className="text-lg font-bold text-[#D77A61] mb-2">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product._id, item.quantity - 1)}
                          disabled={isUpdating}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 
                                   rounded-full transition-colors disabled:opacity-50"
                        >
                          <MinusIcon className="w-4 h-4 text-gray-700" />
                        </button>
                        
                        <span className="w-10 text-center font-semibold text-gray-900">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateQuantity(product._id, item.quantity + 1)}
                          disabled={isUpdating}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 
                                   rounded-full transition-colors disabled:opacity-50"
                        >
                          <PlusIcon className="w-4 h-4 text-gray-700" />
                        </button>

                        <button
                          onClick={() => removeItem(product._id)}
                          disabled={isUpdating}
                          className="ml-auto w-8 h-8 flex items-center justify-center text-red-500 
                                   hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ShoppingBagIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center mb-4">Your cart is empty</p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
                className="px-6 py-2 bg-[#D77A61] text-white rounded-lg font-semibold 
                         hover:bg-[#C06A51] transition-colors"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer - Checkout */}
        {cart && cart.items && cart.items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3"
               style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-2xl font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full bg-[#D77A61] text-white font-bold py-4 rounded-lg 
                       hover:bg-[#C06A51] active:bg-[#B05941] transition-colors
                       flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MobileCartSidebar;

