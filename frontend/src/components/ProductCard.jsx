import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../config/environment.js';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { 
  BuildingStorefrontIcon, 
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import AddToCart from './AddToCart';
import ProductTypeBadge from './ProductTypeBadge';
import InventoryModel from '../models/InventoryModel';
import toast from 'react-hot-toast';

const ProductCard = ({ 
  product, 
  showDistance = false, 
  showImagePreview = true,
  showRating = true,
  showVisitShop = true, // Control visibility of Visit Shop link
  onProductClick,
  className = ''
}) => {
  const [showCartPopup, setShowCartPopup] = useState(false);
  


  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIconSolid key={i} className="w-3 h-3 text-primary" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key={fullStars} className="w-3 h-3 text-primary" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={fullStars + (hasHalfStar ? 1 : 0) + i} className="w-3 h-3 text-secondary/20" />
      );
    }

    return stars;
  };

  // Check if product is out of stock using InventoryModel
  const getOutOfStockStatus = () => {
    const inventoryModel = new InventoryModel(product);
    return inventoryModel.getOutOfStockStatus();
  };

  const outOfStockStatus = getOutOfStockStatus();

  // Handle product click
  const handleProductClick = () => {
    if (outOfStockStatus.isOutOfStock) {
      return; // Don't allow clicking on out of stock products
    }
    if (onProductClick) {
      onProductClick(product);
    } else {
      setShowCartPopup(true);
    }
  };

  // Close cart popup
  const closeCartPopup = () => {
    setShowCartPopup(false);
  };

  return (
    <>
      <div 
        className={`card product-card group relative bg-surface ${outOfStockStatus.isOutOfStock ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
        onClick={handleProductClick}
        title={outOfStockStatus.isOutOfStock ? outOfStockStatus.reason : "Select this artisan product"}
      >
        {/* Product Image */}
        <div className="relative w-full h-56 overflow-hidden">
          <img
            src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image, { width: 300, height: 224, quality: 80 })}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStockStatus.isOutOfStock ? 'grayscale brightness-75' : ''}`}
            loading="lazy"
            onError={(e) => handleImageError(e, 'product')}
          />
          {/* Out of stock overlay */}
          {outOfStockStatus.isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                {outOfStockStatus.message}
              </div>
            </div>
          )}
          <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${(product.images && product.images.length > 0) || product.image ? 'hidden' : 'flex'}`}>
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* Product details */}
        <div className="p-3 sm:p-4">
          {/* Product name */}
          <h3 className={`font-semibold text-secondary line-clamp-2 text-sm sm:text-base leading-snug mb-1 ${outOfStockStatus.isOutOfStock ? 'text-secondary/50' : 'group-hover:text-primary transition-colors'}`}>
            {product.name}
          </h3>
          
          {/* Artisan name with Visit Shop link */}
          {product.artisan && (product.artisan.artisanName || product.artisan.businessName) ? (
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-xs sm:text-sm text-secondary/60 line-clamp-1 flex-1">
                by {product.artisan.artisanName || product.artisan.businessName}
              </p>
              {showVisitShop && product.artisan._id && (
                <Link
                  to={`/artisan/${product.artisan._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-primary hover:text-primary-dark hover:underline whitespace-nowrap flex-shrink-0"
                >
                  Visit Shop →
                </Link>
              )}
            </div>
          ) : (
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
          )}
          
          {/* Rating */}
          {showRating && (
            <div className="flex items-center space-x-1 mb-3">
              {renderStars(product.artisan?.rating?.average || product.rating || 0)}
              <span className="text-xs text-gray-500">
                ({(product.artisan?.rating?.average || product.rating || 0).toFixed(1)})
              </span>
            </div>
          )}
          
          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between">
            <span className={`font-bold text-base sm:text-lg ${outOfStockStatus.isOutOfStock ? 'text-secondary/40 line-through' : 'text-primary'}`}>
              {outOfStockStatus.isOutOfStock ? 'Sold Out' : formatPrice(product.price)}
            </span>
            {!outOfStockStatus.isOutOfStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCartPopup(true);
                }}
                className="btn-primary px-4 py-2 text-sm"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add to Cart Popup */}
      {showCartPopup && !outOfStockStatus.isOutOfStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add to Cart</h3>
              <button
                onClick={closeCartPopup}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Image - Bigger */}
            <div className="p-4 pb-2">
              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-4">
                {(product.images && product.images.length > 0) || product.image ? (
                  <img
                    src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image, { width: 300, height: 224, quality: 80 })}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ${(product.images && product.images.length > 0) || product.image ? 'hidden' : 'flex'}`}>
                  <BuildingStorefrontIcon className="w-12 h-12 text-primary-400" />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="px-4 pb-2">
              <h4 className="font-semibold text-gray-900 text-xl leading-tight mb-1 line-clamp-2">{product.name}</h4>
              <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                by {product.artisan?.artisanName || product.artisan?.businessName || 'Unknown Artisan'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
              </div>
            </div>

            {/* Essential Inventory Information */}
            <div className="px-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  {/* Ready to Ship Products */}
                  {product.productType === 'ready_to_ship' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Stock available:</span>
                      <span className={`font-medium ${(product.stock || 0) <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                        {product.stock || 0}
                      </span>
                    </div>
                  )}

                  {/* Made to Order Products */}
                  {product.productType === 'made_to_order' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Capacity available:</span>
                        <span className={`font-medium ${(product.remainingCapacity || 0) <= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                          {product.remainingCapacity || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Ready in:</span>
                        <span className="font-medium text-gray-900">
                          {product.leadTime || 1} {product.leadTime === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Order Products */}
                  {product.productType === 'scheduled_order' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className={`font-medium ${(product.availableQuantity || 0) <= 3 ? 'text-orange-600' : 'text-green-600'}`}>
                          {product.availableQuantity || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Ready:</span>
                        <span className="font-medium text-gray-900">
                          {product.nextAvailableDate ? 
                            (Math.ceil((new Date(product.nextAvailableDate) - new Date()) / (1000 * 60 * 60 * 24)) === 0 ? 'Today' :
                             Math.ceil((new Date(product.nextAvailableDate) - new Date()) / (1000 * 60 * 60 * 24)) === 1 ? 'Tomorrow' :
                             `In ${Math.ceil((new Date(product.nextAvailableDate) - new Date()) / (1000 * 60 * 60 * 24))} days`) 
                            : 'TBD'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Limited quantity warning */}
                  {((product.productType === 'ready_to_ship' && (product.stock || 0) <= 5 && (product.stock || 0) > 0) ||
                    (product.productType === 'made_to_order' && (product.remainingCapacity || 0) <= 2 && (product.remainingCapacity || 0) > 0) ||
                    (product.productType === 'scheduled_order' && (product.availableQuantity || 0) <= 3 && (product.availableQuantity || 0) > 0)) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        ⚠️ Limited quantity available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add to Cart Component */}
            <div className="px-4 pb-4">
              {outOfStockStatus.isOutOfStock ? (
                <div className="text-center py-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium mb-2">{outOfStockStatus.message}</p>
                    <p className="text-red-600 text-sm">{outOfStockStatus.reason}</p>
                  </div>
                </div>
              ) : (
                <AddToCart 
                  product={product}
                  variant="modal"
                  onSuccess={(product, quantity) => {
                    setShowCartPopup(false);
                    toast.success(`Added ${quantity} ${quantity === 1 ? (product.unit || 'piece') : ((product.unit || 'piece') + 's')} to cart!`);
                  }}
                  onError={(error) => {
                    console.error('Add to cart error:', error);
                    toast.error('Failed to add item to cart');
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
