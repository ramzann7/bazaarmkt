import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUtils';
import { spotlightService } from '../services/spotlightService';
import { PRODUCT_CATEGORIES } from '../data/productReference';

const SpotlightArtisans = () => {
  const navigate = useNavigate();
  const [spotlightArtisans, setSpotlightArtisans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpotlightArtisans();
  }, []);

  const loadSpotlightArtisans = async () => {
    try {
      setLoading(true);
      const response = await spotlightService.getActiveSpotlights();
      console.log('🔍 Spotlight response:', response);
      setSpotlightArtisans(response.spotlights || []);
    } catch (error) {
      console.error('Error loading spotlight artisans:', error);
      setSpotlightArtisans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleArtisanClick = (artisanId) => {
    navigate(`/artisan/${artisanId}`);
  };

  const getCategoryName = (type) => {
    return PRODUCT_CATEGORIES[type]?.name || type || 'Artisan';
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="text-sm font-semibold text-gray-500 mb-3 tracking-wide uppercase">
          Featured shops this week
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[260px] bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
              <div className="h-28 bg-gray-200"></div>
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (spotlightArtisans.length === 0) {
    return null; // Don't show section if no spotlight artisans
  }

  return (
    <section className="mb-7">
      <div className="text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">
        Featured shops this week
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {spotlightArtisans.map((spotlight) => {
          const artisan = spotlight.artisan;
          if (!artisan) return null;

          return (
            <div
              key={artisan._id}
              className="min-w-[260px] bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
              onClick={() => handleArtisanClick(artisan._id)}
            >
              {/* Banner Image */}
              <div 
                className="h-28 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${getImageUrl(artisan.photos?.main || artisan.businessImage, { width: 260, height: 112, quality: 80 })})`
                }}
              >
                <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              
              {/* Card Body */}
              <div className="p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src={getImageUrl(artisan.photos?.avatar || artisan.profileImage, { width: 48, height: 48, quality: 80 })}
                      alt={artisan.artisanName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-orange-600 transition-colors">
                      {artisan.artisanName}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {getCategoryName(artisan.type)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SpotlightArtisans;
