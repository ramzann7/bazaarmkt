import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCartIcon, 
  PlusIcon, 
  MinusIcon, 
  HeartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import InventoryModel from '../models/InventoryModel';
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
  const { t } = useTranslation();
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
            status: t('productDetails.readyNow'),
            description: `${product.stock} ${t('productDetails.availableForPickup')}`,
            color: 'text-green-600'
          };
        } else {
          return {
            icon: '❌',
            status: t('productDetails.outOfStock'),
            description: t('productDetails.currentlyUnavailable'),
            color: 'text-red-600'
          };
        }
      
      case 'made_to_order':
        return {
          icon: '⚙️',
          status: t('productDetails.madeToOrder'),
          description: `${product.leadTime || 1} ${product.leadTimeUnit || t('productDetails.days')} ${t('productDetails.leadTime')} • ${t('productDetails.max')} ${product.maxOrderQuantity || 10} ${t('productDetails.perOrder')} • ${t('productDetails.totalCapacity')}: ${product.totalCapacity || 10}`,
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
            status: t('addToCart.scheduled'),
            description: `${daysUntil > 0 ? t('addToCart.readyInDays', { count: daysUntil }) : t('addToCart.readyToday')} • ${availableQty} ${t('addToCart.available')} • ${t('productDetails.max')} ${product.maxOrderQuantity || 10} ${t('productDetails.perOrder')}`,
            color: 'text-purple-600'
          };
        } else {
          return {
            icon: '❓',
            status: t('addToCart.scheduleTBD'),
            description: `${t('addToCart.contactArtisan')} • ${t('productDetails.max')} ${product.maxOrderQuantity || 10} ${t('productDetails.perOrder')}`,
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
        // For made to order, check BOTH capacity AND per-order limit
        const capacity = product.remainingCapacity || product.totalCapacity || 0;
        const orderLimit = product.maxOrderQuantity || 10;
        // Return the smaller of the two (whichever is more restrictive)
        return Math.min(capacity, orderLimit);
      
      case 'scheduled_order':
        // For scheduled orders, use availableQuantity (production capacity for that date)
        return product.availableQuantity || 0;
      
      default:
        // Fallback for unknown types
        return product.stock || 10;
    }
  };
  
  const maxQuantity = getMaxQuantity();
  
  // Check if product is out of stock using InventoryModel for consistency
  const isOutOfStock = () => {
    const inventoryModel = new InventoryModel(product);
    return inventoryModel.isOutOfStock();
  };
  
  const canAddToCart = !isOutOfStock() && quantity > 0 && quantity <= maxQuantity;

  // Show stock/availability message for all product types
  const getStockMessage = () => {
    const inventoryModel = new InventoryModel(product);
    const outOfStockStatus = inventoryModel.getOutOfStockStatus();
    
    if (outOfStockStatus.isOutOfStock) {
      return outOfStockStatus.message;
    }
    
    switch (product.productType) {
      case 'ready_to_ship':
        if (maxQuantity <= 5) {
          return `Only ${maxQuantity} left in stock`;
        } else {
          return `${maxQuantity} in stock`;
        }
      
      case 'made_to_order':
        const remainingCapacity = product.remainingCapacity || 0;
        const totalCapacity = product.totalCapacity || 0;
        if (remainingCapacity <= 1) {
          return `Only ${remainingCapacity} slot available`;
        } else {
          return `${remainingCapacity}/${totalCapacity} slots available`;
        }
      
      case 'scheduled_order':
        const availableQuantity = product.availableQuantity || 0;
        if (availableQuantity <= 5) {
          return `Only ${availableQuantity} available`;
        } else {
          return `${availableQuantity} available`;
        }
      
      default:
        return null;
    }
  };

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
      // Only show the specific error message, no generic fallback
      toast.error(error.message);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error(t('addToCart.loginToSave'));
      return;
    }
    // Simple favorite toggle - you can implement actual favorite logic later
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? t('addToCart.removedFromFavorites') : t('addToCart.addedToFavorites'));
  };

  // Compact variant for product cards
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex items-center justify-center px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCartIcon className="w-4 h-4 mr-1" />
          {isAdding ? t('addToCart.adding') : (isOutOfStock() ? t('addToCart.outOfStock') : t('addToCart.addToCart'))}
        </button>
        <div className={`text-xs text-center ${isOutOfStock() ? 'text-red-500' : 'text-stone-500'}`}>
{getStockMessage() || `Max ${maxQuantity} per order`}
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
              className="px-2 py-1 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-stone-800 font-medium min-w-[2rem] text-center text-sm">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="px-2 py-1 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`text-xs ${isOutOfStock() ? 'text-red-500' : 'text-stone-500'}`}>
          {getStockMessage() || `Max ${maxQuantity}`}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="flex-1 flex items-center justify-center px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
        >
          <ShoppingCartIcon className="w-4 h-4 mr-1" />
          {isAdding ? t('addToCart.adding') : (isOutOfStock() ? t('addToCart.outOfStock') : t('addToCart.addToCart'))}
        </button>
      </div>
    );
  }

  // Default/Modal variant (simplified)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Simplified Product Readiness Information */}

      {/* Stock Warning for Low Stock Items */}
      {product.productType === 'ready_to_ship' && maxQuantity > 0 && maxQuantity <= 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="text-sm font-medium text-amber-800">
                Low Stock Warning
              </span>
              <p className="text-xs text-amber-600">
                Only {maxQuantity} {maxQuantity === 1 ? 'item' : 'items'} left in stock. Order soon!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Distance Information with Visit Shop */}
      {product?.artisan && (product.distance !== undefined || product.formattedDistance) && (
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📍</span>
              <div>
                <span className="text-sm font-medium text-emerald-800">
                  {product.artisan.artisanName}
                </span>
                <p className="text-xs text-emerald-600">
                  {product.formattedDistance || 
                   (product.distance !== undefined && product.distance !== null 
                     ? `${product.distance.toFixed(1)} km away` 
                     : t('addToCart.distanceNotAvailable'))}
                </p>
              </div>
            </div>
            {product.artisan._id && (
              <Link
                to={`/artisan/${product.artisan._id}`}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline whitespace-nowrap"
              >
                Visit Shop →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Simplified Quantity Selector */}
      {showQuantity && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700">
            Quantity
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="w-8 h-8 flex items-center justify-center border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-medium text-stone-800">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= maxQuantity}
              className="w-8 h-8 flex items-center justify-center border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          <p className={`text-xs ${isOutOfStock() ? 'text-red-500' : 'text-stone-500'}`}>
            {getStockMessage() || `Max ${maxQuantity} per order`}
          </p>
        </div>
      )}

      {/* Total Price */}
      <div className="bg-stone-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-stone-600">Total:</span>
          <span className="text-lg font-bold text-amber-600">
            ${(product.price * quantity).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div>
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="w-full flex items-center justify-center px-6 py-4 bg-amber-600 text-white text-lg font-bold rounded-lg hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          <ShoppingCartIcon className="w-6 h-6 mr-2" />
          {isAdding ? t('addToCart.adding') : (isOutOfStock() ? t('addToCart.outOfStock') : t('addToCart.addToCart'))}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <span className="text-emerald-800 text-sm font-medium">
            ✓ Added to cart successfully!
          </span>
        </div>
      )}
    </div>
  );
};

export default AddToCart;
