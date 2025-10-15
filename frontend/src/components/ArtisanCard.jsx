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
      <div className="relative h-36 overflow-hidden bg-gray-100">
        <img
          src={getImageUrl(artisan.images?.business, { width: 400, height: 144, quality: 80 })}
          alt={artisan.artisanName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Avatar - Only show if profile picture exists */}
        {artisan.images?.profile && getImageUrl(artisan.images.profile) && (
          <div className="absolute left-4 -bottom-7 w-14 h-14 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
            <img
              src={getImageUrl(artisan.images.profile, { width: 56, height: 56, quality: 80 })}
              alt={artisan.artisanName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Card Body - Adjust padding based on whether avatar is shown */}
      <div className={`px-4 pb-4 ${artisan.images?.profile && getImageUrl(artisan.images.profile) ? 'pt-9' : 'pt-4'}`}>
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

        {/* Enhanced Product Preview - Top 2 Products with Name and Price */}
        {isHovered && getTopProducts().length > 0 && (
          <div className="absolute left-3 right-3 bottom-3 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-200 z-30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Top Products</span>
              <span className="text-xs text-orange-500 font-medium">View All</span>
            </div>
            <div className="space-y-2">
              {getTopProducts().slice(0, 2).map((product, index) => (
                <div key={index} className="flex items-center gap-2">
                  {product.image && (
                    <img
                      src={getImageUrl(product.image, { width: 40, height: 40, quality: 70 })}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-xs line-clamp-1">{product.name}</div>
                    <div className="text-orange-600 font-semibold text-xs">
                      ${product.price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
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
