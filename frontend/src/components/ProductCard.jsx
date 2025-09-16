import React, { useState } from 'react';
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
  onProductClick,
  className = ''
}) => {
  const [showCartPopup, setShowCartPopup] = useState(false);

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 images
    if (imagePath.startsWith('data:image/')) {
      return imagePath;
    }
    
    // Handle relative paths
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}${imagePath}`;
    }
    
    // Handle full URLs
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    return imagePath;
  };

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
        <StarIconSolid key={i} className="w-3 h-3 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key={fullStars} className="w-3 h-3 text-yellow-400" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={fullStars + (hasHalfStar ? 1 : 0) + i} className="w-3 h-3 text-gray-300" />
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
        className={`group relative transition-all duration-300 bg-white rounded-2xl shadow-sm hover:shadow-lg ${outOfStockStatus.isOutOfStock ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:-translate-y-1'} ${className}`}
        onClick={handleProductClick}
        title={outOfStockStatus.isOutOfStock ? outOfStockStatus.reason : "Select this artisan product"}
      >
        {/* Image container with rounded corners */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-50 to-gray-100">
          <img
            src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image)}
            alt={product.name}
            className={`w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStockStatus.isOutOfStock ? 'grayscale brightness-75' : ''}`}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          {/* Out of stock overlay */}
          {outOfStockStatus.isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {outOfStockStatus.message}
              </div>
            </div>
          )}
          <div className={`w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${(product.images && product.images.length > 0) || product.image ? 'hidden' : 'flex'}`}>
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-400" />
          </div>
          
          {/* Status and dietary badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {outOfStockStatus.isOutOfStock && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white z-20">
                {outOfStockStatus.message}
              </span>
            )}
            {product.isFeatured && !outOfStockStatus.isOutOfStock && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white z-10">
                Featured
              </span>
            )}
            {product.isOrganic && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Organic
              </span>
            )}
            {product.isGlutenFree && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Gluten-Free
              </span>
            )}
          </div>
        </div>

        {/* Product details - simplified */}
        <div className="p-4 space-y-2">
          {/* Product name - larger font */}
          <h3 className={`font-bold line-clamp-2 text-lg leading-tight ${isOutOfStock() ? 'text-gray-500' : 'text-gray-900 group-hover:text-amber-600 transition-colors'}`}>
            {product.name}
          </h3>
          
          {/* Artisan name */}
          <p className="text-sm text-gray-600 line-clamp-1">
            by {product.artisan?.artisanName || product.artisan?.businessName || 'Unknown Artisan'}
          </p>
          
          {/* Product type badge */}
          <div className="flex justify-start">
            <ProductTypeBadge product={product} variant="compact" />
          </div>
          
          {/* Price and rating */}
          <div className="flex items-center justify-between pt-2">
            <span className={`font-bold text-xl ${isOutOfStock() ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {isOutOfStock() ? 'Unavailable' : formatPrice(product.price)}
            </span>
            {showRating && (
              <div className="flex items-center space-x-1">
                {renderStars(product.artisan?.rating?.average || product.rating || 0)}
                <span className="text-xs text-gray-500">
                  ({(product.artisan?.rating?.average || product.rating || 0).toFixed(1)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add to Cart Popup */}
      {showCartPopup && !isOutOfStock() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add to Cart</h3>
              <button
                onClick={closeCartPopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Image */}
            <div className="p-6 pb-0">
              <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden mb-6">
                {(product.images && product.images.length > 0) || product.image ? (
                  <img
                    src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ${(product.images && product.images.length > 0) || product.image ? 'hidden' : 'flex'}`}>
                  <BuildingStorefrontIcon className="w-16 h-16 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="px-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h4>
              <p className="text-gray-600 mb-2">
                by {product.artisan?.artisanName || product.artisan?.businessName || 'Unknown Artisan'}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                <div className="flex items-center space-x-1">
                  {renderStars(product.artisan?.rating?.average || product.rating || 0)}
                  <span className="text-sm text-gray-500">
                    ({(product.artisan?.rating?.average || product.rating || 0).toFixed(1)})
                  </span>
                </div>
              </div>
            </div>

            {/* Add to Cart Component */}
            <div className="px-6 pb-6">
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
