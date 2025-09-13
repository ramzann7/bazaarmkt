import React, { useState } from 'react';
import { 
  BuildingStorefrontIcon, 
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import AddToCart from './AddToCart';
import ProductTypeBadge from './ProductTypeBadge';
import DistanceBadge from './DistanceBadge';
import toast from 'react-hot-toast';

const ProductCard = ({ 
  product, 
  showDistance = false, 
  showImagePreview = true,
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
        <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key={fullStars} className="w-4 h-4 text-yellow-400" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={fullStars + (hasHalfStar ? 1 : 0) + i} className="w-4 h-4 text-gray-300" />
      );
    }

    return stars;
  };

  // Handle product click
  const handleProductClick = () => {
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
        className={`group cursor-pointer relative hover:shadow-lg transition-shadow duration-300 ${className}`}
        onClick={handleProductClick}
        title="Select this artisan product"
      >
        <div className="relative overflow-hidden rounded-lg bg-gray-100">
          <img
            src={getImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image)}
            alt={product.name}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className={`w-full h-64 flex items-center justify-center bg-gray-200 ${(product.images && product.images.length > 0) || product.image ? 'hidden' : 'flex'}`}>
            <BuildingStorefrontIcon className="w-16 h-16 text-gray-400" />
          </div>
          
          {/* Status badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isFeatured && (
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

          {/* Low inventory badge */}
          {((product.productType === 'ready_to_ship' && product.stock < 10 && product.stock > 0) ||
            (product.productType === 'made_to_order' && product.totalCapacity < 10 && product.totalCapacity > 0) ||
            (product.productType === 'scheduled_order' && product.availableQuantity < 10 && product.availableQuantity > 0)) && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
              {product.productType === 'ready_to_ship' ? 'Low Stock' :
               product.productType === 'made_to_order' ? 'Low Capacity' :
               'Low Available'}
            </div>
          )}

          {/* Hover overlay with heart icon */}
          {showImagePreview && (
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300 ease-in-out z-20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-amber-600 rounded-full p-4 shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
                  <HeartIcon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product details */}
        <div className="mt-3">
          <h3 className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {product.artisan?.artisanName || product.artisan?.businessName || 'Unknown Artisan'}
          </p>
          
          {/* Distance badge */}
          {showDistance && (product.distance || product.formattedDistance) && (
            <div className="mt-2">
              <DistanceBadge 
                distance={product.distance} 
                formattedDistance={product.formattedDistance}
              />
            </div>
          )}

          {/* Product type badge */}
          <div className="mt-2 mb-2">
            <ProductTypeBadge product={product} variant="compact" />
          </div>
          
          {/* Price and rating */}
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
            <div className="flex items-center space-x-1">
              {renderStars(product.artisan?.rating?.average || product.rating || 0)}
              <span className="text-sm text-gray-500">
                ({(product.artisan?.rating?.average || product.rating || 0).toFixed(1)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Popup */}
      {showCartPopup && (
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
              <AddToCart 
                product={product}
                variant="modal"
                onSuccess={(product, quantity) => {
                  setShowCartPopup(false);
                  toast.success(`Added ${quantity} ${quantity === 1 ? product.unit || 'piece' : product.unit + 's'} to cart!`);
                }}
                onError={(error) => {
                  console.error('Add to cart error:', error);
                  toast.error('Failed to add item to cart');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
