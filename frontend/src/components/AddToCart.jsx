import React, { useState, useEffect } from 'react';
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  MinusIcon, 
  HeartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { cartService } from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AddToCart = ({ 
  product, 
  variant = 'default', // 'default', 'compact', 'inline', 'modal'
  onSuccess,
  onError,
  className = '',
  showQuantity = true,
  showReadinessInfo = true
}) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get product readiness info (simplified)
  const getReadinessInfo = () => {
    if (!product) return null;
    
    switch (product.productType) {
      case 'ready_to_ship':
        if (product.stock > 0) {
          return {
            icon: '📦',
            status: 'Ready Now',
            description: `${product.stock} available for immediate pickup`,
            color: 'text-green-600'
          };
        } else {
          return {
            icon: '❌',
            status: 'Out of Stock',
            description: 'Currently unavailable',
            color: 'text-red-600'
          };
        }
      
      case 'made_to_order':
        return {
          icon: '⚙️',
          status: 'Made to Order',
          description: `${product.leadTime || 1} ${product.leadTimeUnit || 'days'} lead time • Max ${product.maxOrderQuantity || 10} per order • Total capacity: ${product.totalCapacity || 10}`,
          color: 'text-blue-600'
        };
      
      case 'scheduled_order':
        if (product.nextAvailableDate) {
          const nextDate = new Date(product.nextAvailableDate);
          const today = new Date();
          const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
          const availableQty = product.availableQuantity || 0;
          
          return {
            icon: '📅',
            status: 'Scheduled',
            description: `${daysUntil > 0 ? `Ready in ${daysUntil} days` : 'Ready today'} • ${availableQty} available • Max ${product.maxOrderQuantity || 10} per order`,
            color: 'text-purple-600'
          };
        } else {
          return {
            icon: '❓',
            status: 'Schedule TBD',
            description: `Contact artisan for availability • Max ${product.maxOrderQuantity || 10} per order`,
            color: 'text-gray-600'
          };
        }
      
      default:
        return null;
    }
  };

  const readinessInfo = getReadinessInfo();
  
  // Calculate max quantity based on product type
  const getMaxQuantity = () => {
    switch (product.productType) {
      case 'ready_to_ship':
        // For ready to ship, use actual stock
        return product.stock || 0;
      
      case 'made_to_order':
        // For made to order, use maxOrderQuantity (per order limit) or default to 10
        return product.maxOrderQuantity || 10;
      
      case 'scheduled_order':
        // For scheduled orders, use availableQuantity (production capacity for that date)
        return product.availableQuantity || 0;
      
      default:
        // Fallback for unknown types
        return product.stock || 10;
    }
  };
  
  const maxQuantity = getMaxQuantity();
  const isOutOfStock = product.productType === 'ready_to_ship' && maxQuantity <= 0;
  const canAddToCart = !isOutOfStock && quantity > 0 && quantity <= maxQuantity;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!canAddToCart) return;

    setIsAdding(true);
    try {
      // For guest users, pass null as userId to use guest cart
      const userId = user ? user._id : null;
      await cartService.addToCart(product, quantity, userId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      if (onSuccess) {
        onSuccess(product, quantity);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to save favorites');
      return;
    }
    // Simple favorite toggle - you can implement actual favorite logic later
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  // Compact variant for product cards
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex items-center justify-center px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCartIcon className="w-4 h-4 mr-1" />
          {isAdding ? 'Adding...' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart')}
        </button>
        <div className="text-xs text-gray-500 text-center">
          {product.productType === 'ready_to_ship' 
            ? `${maxQuantity} in stock` 
            : `Max ${maxQuantity} per order`
          }
        </div>
      </div>
    );
  }

  // Inline variant for search results
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showQuantity && (
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-gray-900 font-medium min-w-[2rem] text-center text-sm">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="px-2 py-1 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="text-xs text-gray-500">
          {product.productType === 'ready_to_ship' 
            ? `${maxQuantity} in stock` 
            : `Max ${maxQuantity}`
          }
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCartIcon className="w-4 h-4 mr-1" />
          {isAdding ? 'Adding...' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart')}
        </button>
      </div>
    );
  }

  // Default/Modal variant (simplified)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Simplified Product Readiness Information */}
      {showReadinessInfo && readinessInfo && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{readinessInfo.icon}</span>
            <div>
              <span className={`text-sm font-medium ${readinessInfo.color}`}>
                {readinessInfo.status}
              </span>
              <p className="text-xs text-gray-600">
                {readinessInfo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Quantity Selector */}
      {showQuantity && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-medium text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {product.productType === 'ready_to_ship' 
              ? `${maxQuantity} in stock` 
              : product.productType === 'made_to_order'
              ? `Max ${maxQuantity} per order`
              : `Max ${maxQuantity} per order`
            }
          </p>
        </div>
      )}

      {/* Total Price */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-lg font-bold text-amber-600">
            ${(product.price * quantity).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleFavorite}
          className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {isFavorite ? (
            <HeartIconSolid className="w-4 h-4 mr-2 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 mr-2" />
          )}
          {isFavorite ? 'Saved' : 'Save'}
        </button>
        
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCartIcon className="w-4 h-4 mr-2" />
          {isAdding ? 'Adding...' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart')}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <span className="text-green-800 text-sm font-medium">
            ✓ Added to cart successfully!
          </span>
        </div>
      )}
    </div>
  );
};

export default AddToCart;
