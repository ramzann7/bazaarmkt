import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StarIcon, HeartIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getImageUrl } from '../utils/imageUtils';
import { PRODUCT_CATEGORIES } from '../data/productReference';

const ArtisanCard = ({ artisan, onFavorite, onMessage, showDistance = true }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleVisitShop = (e) => {
    e.stopPropagation();
    navigate(`/artisan/${artisan._id}`);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(artisan._id);
    }
  };

  const handleMessage = (e) => {
    e.stopPropagation();
    if (onMessage) {
      onMessage(artisan._id);
    }
  };

  const getCategoryName = (type) => {
    return PRODUCT_CATEGORIES[type]?.name || type || 'Artisan';
  };

  const getTopProducts = () => {
    if (artisan.products && artisan.products.length > 0) {
      // Sort products by popularity (rating, sales, or views) and take top 3
      return artisan.products
        .sort((a, b) => {
          // Sort by rating first, then by sales count, then by views
          const ratingA = a.rating?.average || 0;
          const ratingB = b.rating?.average || 0;
          const salesA = a.salesCount || 0;
          const salesB = b.salesCount || 0;
          const viewsA = a.views || 0;
          const viewsB = b.views || 0;
          
          // Primary sort by rating
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          
          // Secondary sort by sales count
          if (salesA !== salesB) {
            return salesB - salesA;
          }
          
          // Tertiary sort by views
          return viewsB - viewsA;
        })
        .slice(0, 3);
    }
    return [];
  };

  const formatDistance = (distance) => {
    if (!distance || distance === Infinity) return null;
    return `${distance.toFixed(1)} km`;
  };

  return (
    <div 
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleVisitShop}
    >
      {/* Banner Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={getImageUrl(artisan.images?.business, { width: 400, height: 144, quality: 80 })}
          alt={artisan.artisanName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Avatar */}
        <div className="absolute left-4 -bottom-7 w-14 h-14 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
          <img
            src={getImageUrl(artisan.images?.profile, { width: 56, height: 56, quality: 80 })}
            alt={artisan.artisanName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Card Body */}
      <div className="pt-9 px-4 pb-4">
        {/* Title and Category */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{artisan.artisanName}</h3>
          <p className="text-sm text-gray-600">{getCategoryName(artisan.type)}</p>
        </div>

        {/* Rating and Distance */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-2 py-1 rounded-full text-xs font-bold">
              <StarIconSolid className="w-3 h-3 mr-1" />
              {(artisan.metrics?.rating || 0).toFixed(1)}
            </div>
            {showDistance && artisan.distance && (
              <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                {formatDistance(artisan.distance)}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {artisan.metrics?.reviewCount || 0} reviews
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleVisitShop}
            className="btn-primary btn-small"
          >
            Visit shop
          </button>
          <button
            onClick={handleFavorite}
            className="btn-secondary btn-small"
          >
            Follow
          </button>
        </div>

        {/* Subtle Quick Preview Popup */}
        {isHovered && getTopProducts().length > 0 && (
          <div className="absolute right-2 top-2 w-48 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-30 border border-white/20">
            <div className="mb-2">
              <h4 className="font-semibold text-gray-800 text-sm">{artisan.artisanName}</h4>
            </div>
            
            {/* Product Preview Images */}
            <div className="flex gap-1.5">
              {getTopProducts().slice(0, 3).map((product, index) => (
                <div
                  key={index}
                  className="w-12 h-12 bg-gray-100/80 rounded-md overflow-hidden flex-shrink-0"
                  title={product.name}
                >
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image, { width: 48, height: 48, quality: 80 })}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                      {product.name.length > 6 ? product.name.substring(0, 6) + '...' : product.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtisanCard;
