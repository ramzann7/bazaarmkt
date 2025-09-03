import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  StarIcon, 
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  SparklesIcon,
  FunnelIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { artisanService } from '../services/artisanService';
import { promotionalService } from '../services/promotionalService';
import { favoriteService } from '../services/favoriteService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import { 
  PRODUCT_CATEGORIES, 
  getAllCategories, 
  getAllSubcategories 
} from '../data/productReference';

// Skeleton loading component
const ArtisanSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

export default function FindArtisans() {
  const [artisans, setArtisans] = useState([]);
  const [filteredArtisans, setFilteredArtisans] = useState([]);
  const [favoriteArtisans, setFavoriteArtisans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [artisanPromotions, setArtisanPromotions] = useState({});
  const [favoriteStatuses, setFavoriteStatuses] = useState({});
  const [favoriteLoadingStates, setFavoriteLoadingStates] = useState({});
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Memoize static data to prevent re-renders
  const artisanTypes = useMemo(() => {
    const categories = getAllCategories();
    return [
      { value: 'all', label: 'All Artisan Types' },
      ...categories.map(cat => ({
        value: cat.key,
        label: cat.name
      }))
    ];
  }, []);

  // Extended artisan type cards for selection (Uber Eats style)
  const artisanTypeCards = useMemo(() => {
    const categories = getAllCategories();
    return [
      { id: 'all', name: 'All Artisans', icon: '🏪', description: 'Discover all local artisans' },
      ...categories.map(cat => ({
        id: cat.key,
        name: cat.name,
        icon: cat.icon,
        description: cat.description
      }))
    ];
  }, []);

  // Categories for filtering
  const categories = useMemo(() => {
    const allSubcategories = getAllSubcategories();
    return [
      { value: '', label: 'All Categories' },
      ...allSubcategories.map(sub => ({
        value: sub.subcategoryKey,
        label: sub.subcategoryName
      }))
    ];
  }, []);

  // Load all artisans when component mounts with optimized caching
  useEffect(() => {
    const startTime = performance.now();
    
    // Check cache first for instant loading
    const cacheKey = `${CACHE_KEYS.ARTISAN_DETAILS}_all`;
    const cachedArtisans = cacheService.getFast(cacheKey);
    
    if (cachedArtisans) {
      console.log('✅ Using cached artisans for instant loading');
      setArtisans(cachedArtisans);
      setFilteredArtisans(cachedArtisans);
      setIsLoading(false);
      
      // Load fresh data in background
      loadAllArtisans().finally(() => {
        const endTime = performance.now();
        console.log(`Background refresh completed in ${(endTime - startTime).toFixed(2)}ms`);
      });
    } else {
      // No cache, load normally
      loadAllArtisans().finally(() => {
        const endTime = performance.now();
        console.log(`Artisans loaded in ${(endTime - startTime).toFixed(2)}ms`);
      });
    }
  }, []);

  // Load favorite artisans for authenticated patrons
  useEffect(() => {
    if (isAuthenticated && user && user.role === 'patron') {
      loadFavoriteArtisans();
    }
  }, [isAuthenticated, user]);

  const loadAllArtisans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use cache service for better performance
      const cacheKey = `${CACHE_KEYS.ARTISAN_DETAILS}_all`;
      const data = await cacheService.getOrSet(
        cacheKey,
        async () => {
          return await artisanService.getAllArtisans({ includeProducts: false });
        },
        CACHE_TTL.ARTISAN_DETAILS
      );
      setArtisans(data);
      setFilteredArtisans(data);
      
      // Load promotional data for artisans
      const promotionalData = {};
      for (const artisan of data) {
        try {
          // Get artisan's promotional features (non-product specific)
          const promotions = await promotionalService.getArtisanalPromotionalFeatures();
          const artisanPromotions = promotions.filter(p => p.artisanId === artisan._id);
          promotionalData[artisan._id] = artisanPromotions;
        } catch (error) {
          console.error(`Error loading promotions for artisan ${artisan._id}:`, error);
          promotionalData[artisan._id] = [];
        }
      }
      setArtisanPromotions(promotionalData);
    } catch (error) {
      console.error('Error loading artisans:', error);
      setError('Failed to load artisans');
      toast.error('Failed to load artisans');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavoriteArtisans = async () => {
    try {
      setIsLoadingFavorites(true);
      const favorites = await favoriteService.getFavoriteArtisans();
      setFavoriteArtisans(favorites);
      
      // Create a map of favorite statuses for quick lookup
      const statusMap = {};
      favorites.forEach(fav => {
        statusMap[fav._id] = true;
      });
      setFavoriteStatuses(statusMap);
    } catch (error) {
      console.error('Error loading favorite artisans:', error);
      toast.error('Failed to load favorite artisans');
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredArtisans(artisans);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Searching for:', searchTerm);
      const response = await artisanService.searchArtisans(searchTerm);
      console.log('Search response:', response);
      setFilteredArtisans(response || []);
    } catch (error) {
      console.error('Error searching artisans:', error);
      setError('Failed to search artisans');
      toast.error('Failed to search artisans');
      setFilteredArtisans([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized filtering with useMemo
  const filteredAndSortedArtisans = useMemo(() => {
    let filtered = filteredArtisans;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(artisan => 
        artisan.products?.some(product => 
          product.category === selectedCategory || product.subcategory === selectedCategory
        )
      );
    }

    // Apply sorting
    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => 
        (a.artisanName || '').localeCompare(b.artisanName || '')
      );
    } else if (sortBy === 'rating') {
      filtered = [...filtered].sort((a, b) => 
        (b.rating?.average || 0) - (a.rating?.average || 0)
      );
    } else if (sortBy === 'distance') {
      // Sort by distance if coordinates are available
      if (user?.coordinates) {
        filtered = [...filtered].sort((a, b) => {
          const aDistance = a.distance || Infinity;
          const bDistance = b.distance || Infinity;
          return aDistance - bDistance;
        });
      }
    }

    return filtered;
  }, [filteredArtisans, selectedCategory, sortBy, user?.coordinates]);

  const handleArtisanTypeSelect = async (artisanType) => {
    setSelectedType(artisanType);
    
    if (artisanType === 'all') {
      loadAllArtisans();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading artisans for type:', artisanType);
      const response = await artisanService.getAllArtisans({ 
        includeProducts: false,
        type: artisanType 
      });
      console.log('Response received:', response);
      setArtisans(response || []);
      setFilteredArtisans(response || []);
    } catch (error) {
      console.error('Error loading artisans by type:', error);
      setError('Failed to load artisans by type');
      toast.error('Failed to load artisans');
      setArtisans([]);
      setFilteredArtisans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType(null);
    setSelectedCategory('');
    setSortBy('name');
    setArtisans([]);
    setFilteredArtisans([]);
    setIsLoading(false);
  };

  const handleToggleFavorite = useCallback(async (artisanId, event) => {
    event.stopPropagation(); // Prevent card click when clicking favorite button
    
    if (!isAuthenticated) {
      toast.error('Please log in to save favorite artisans');
      return;
    }

    // Set loading state for this specific artisan
    setFavoriteLoadingStates(prev => ({ ...prev, [artisanId]: true }));

    try {
      const result = await favoriteService.toggleFavorite(artisanId);
      
      if (result.action === 'added') {
        toast.success('Artisan added to favorites');
        // Update local state
        setFavoriteStatuses(prev => ({ ...prev, [artisanId]: true }));
        // Reload favorites to get updated list
        loadFavoriteArtisans();
      } else {
        toast.success('Artisan removed from favorites');
        // Update local state
        setFavoriteStatuses(prev => ({ ...prev, [artisanId]: false }));
        // Reload favorites to get updated list
        loadFavoriteArtisans();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    } finally {
      // Clear loading state
      setFavoriteLoadingStates(prev => ({ ...prev, [artisanId]: false }));
    }
  }, [isAuthenticated]);

  // Enhanced image URL handling
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle different photo data structures
    if (typeof imagePath === 'object' && imagePath.url) {
      return imagePath.url;
    }
    
    // Handle string format
    if (typeof imagePath === 'string') {
      // Handle base64 data URLs
      if (imagePath.startsWith('data:image/')) {
        return imagePath;
      }
      // Handle HTTP URLs
      if (imagePath.startsWith('http')) {
        return imagePath;
      }
      // Handle relative paths
      if (imagePath.startsWith('/')) {
        return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
      }
              return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
    }
    
    return null;
  };

  // Enhanced artisan images handling
  const getArtisanImages = (artisan) => {
    if (!artisan) return [];
    
    // Handle business image first (highest priority)
    if (artisan.businessImage) {
      const url = getImageUrl(artisan.businessImage);
      if (url) {
        return [url];
      }
    }
    
    // Handle photos array
    if (artisan.photos && Array.isArray(artisan.photos)) {
      return artisan.photos
        .map(photo => getImageUrl(photo))
        .filter(url => url !== null);
    }
    
    // Handle single photo field
    if (artisan.photo) {
      const url = getImageUrl(artisan.photo);
      return url ? [url] : [];
    }
    
    // Handle image field
    if (artisan.image) {
      const url = getImageUrl(artisan.image);
      return url ? [url] : [];
    }
    
    return [];
  };

  const getDefaultArtisanImage = (artisanType) => {
    const defaultImages = {
      bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      farm: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop",
      dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
      cheese_maker: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
      winery: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      vineyard: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      honey_producer: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      chocolate_maker: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=300&fit=crop",
      coffee_roaster: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop",
      fish_market: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      herb_garden: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      mushroom_farm: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop",
      orchard: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=400&h=300&fit=crop"
    };
    
    return defaultImages[artisanType] || "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop";
  };

  // Check if artisan is currently open
  const isArtisanOpen = (artisan) => {
    if (!artisan.artisanHours) return null;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to 24hr format (e.g., 1430 for 2:30 PM)
    
    // Map day index to artisan hours keys
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayKey = dayMap[currentDay];
    
    const todayHours = artisan.artisanHours[currentDayKey];
    
    if (!todayHours || todayHours.closed) {
      return false;
    }
    
    // Convert time strings to numbers for comparison
    const openTime = convertTimeToNumber(todayHours.open);
    const closeTime = convertTimeToNumber(todayHours.close);
    
    if (openTime === null || closeTime === null) {
      return null; // Unable to determine
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  // Helper function to convert time string to number
  const convertTimeToNumber = (timeStr) => {
    if (!timeStr) return null;
    
    // Handle formats like "9:00 AM", "14:30", "2:30 PM"
    const time = timeStr.toLowerCase().replace(/\s/g, '');
    
    if (time.includes('am') || time.includes('pm')) {
      // 12-hour format
      const [timePart, period] = time.split(/(am|pm)/);
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      return hours * 100 + (minutes || 0);
    } else {
      // 24-hour format
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 100 + (minutes || 0);
    }
  };

  // Enhanced rating display
  const getRatingDisplay = (artisan) => {
    const { average, count } = artisan.rating || {};
    const createdAt = new Date(artisan.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    // If artisan has a rating, show it regardless of age
    if (average && average > 0) {
      return { 
        text: average.toFixed(1), 
        isNew: false,
        count: count || 0
      };
    }
    
    // If no rating and within first 30 days, show "New"
    if (daysSinceCreation <= 30) {
      return { text: 'New', isNew: true };
    }
    
    // If no rating and older than 30 days, show "No ratings yet"
    return { text: 'No ratings yet', isNew: false };
  };

  const renderArtisanCard = useCallback((artisan) => {
    if (!artisan) return null;
    
    const isOpen = isArtisanOpen(artisan);
    const artisanImages = getArtisanImages(artisan);
    const primaryImage = artisanImages.length > 0 ? artisanImages[0] : getDefaultArtisanImage(artisan.type);
    const ratingDisplay = getRatingDisplay(artisan);
    
    // Debug logging
    console.log('Artisan:', artisan.artisanName, 'Photos:', artisan.photos, 'Images:', artisanImages, 'Primary Image:', primaryImage);

    return (
      <div 
        key={artisan._id} 
        className={`rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 group cursor-pointer ${
          isOpen === false 
            ? 'bg-gray-50 opacity-75 hover:opacity-90 hover:shadow-md' 
            : 'bg-white hover:shadow-lg hover:border-[#E6B655]'
        }`}
        onClick={() => navigate(`/artisan/${artisan._id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/artisan/${artisan._id}`);
          }
        }}
      >
        <div className="relative">
          {/* Artisan Image */}
          <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-xl overflow-hidden relative group">
            <img
              src={primaryImage}
              alt={artisan.artisanName}
              className={`w-full h-48 object-cover transition-all duration-500 ${
                isOpen === false ? 'grayscale opacity-60' : 'group-hover:scale-105'
              }`}
              onError={(e) => {
                console.log('Image failed to load:', primaryImage);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully:', primaryImage);
                e.target.style.opacity = '1';
              }}
              style={{ opacity: 1, transition: 'opacity 0.3s ease-in-out' }}
            />
            
            {/* Image Preview Overlay */}
            {isOpen !== false && (
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300 ease-in-out">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
                    <EyeIcon className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Fallback placeholder */}
            <div 
              className="w-full h-48 bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center hidden"
            >
              <BuildingStorefrontIcon className="w-16 h-16 text-stone-400" />
            </div>
            
            {/* Photo count indicator if multiple photos */}
            {artisanImages.length > 1 && (
              <div className="photo-count">
                +{artisanImages.length - 1} more
              </div>
            )}
          </div>
          
          {/* Trust Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {artisan.categories?.includes('organic') && (
              <span className="badge-organic">Organic</span>
            )}
            <span className="badge-local">Local</span>
            {(artisan.type === 'bakery' || artisan.type === 'chocolate_maker') && (
              <span className="badge-handmade">Handmade</span>
            )}
            
            {/* Promotional Badges */}
            {artisanPromotions[artisan._id] && artisanPromotions[artisan._id].length > 0 && (
              <>
                {artisanPromotions[artisan._id].map((promotion, index) => {
                  if (promotion.status === 'active' && new Date(promotion.endDate) > new Date()) {
                    switch (promotion.featureType) {
                      case 'artisan_verified':
                        return (
                          <span key={index} className="badge-verified" title="Verified Artisan">
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        );
                      case 'artisan_premium':
                        return (
                          <span key={index} className="badge-premium" title="Premium Artisan">
                            <StarIcon className="w-3 h-3 mr-1" />
                            Premium
                          </span>
                        );
                      default:
                        return null;
                    }
                  }
                  return null;
                })}
              </>
            )}
          </div>

          {/* Favorite Button */}
          {isAuthenticated && (
            <div className="absolute top-4 right-4">
              <button
                onClick={(e) => handleToggleFavorite(artisan._id, e)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  favoriteStatuses[artisan._id]
                    ? 'bg-red-500 text-white shadow-lg hover:bg-red-600'
                    : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500 shadow-md'
                }`}
                title={favoriteStatuses[artisan._id] ? 'Remove from favorites' : 'Add to favorites'}
                disabled={favoriteLoadingStates[artisan._id]}
              >
                {favoriteLoadingStates[artisan._id] ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : favoriteStatuses[artisan._id] ? (
                  <HeartIconSolid className="w-5 h-5" />
                ) : (
                  <HeartIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          )}


        </div>

        <div className="p-4">
          {/* Artisan Name and Rating */}
          <div className="flex items-start justify-between mb-3">
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${
              isOpen === false 
                ? 'text-gray-600 group-hover:text-gray-800' 
                : 'text-gray-900 group-hover:text-amber-600'
            }`}>
              {artisan.artisanName || 'Unnamed Artisan'}
            </h3>
            <div className="flex items-center space-x-1">
              <StarIconSolid className="w-4 h-4 text-amber-500" />
              <span className={`text-sm font-medium ${
                ratingDisplay.isNew ? 'text-amber-600' : 'text-gray-900'
              }`}>
                {ratingDisplay.text}
              </span>
              {!ratingDisplay.isNew && ratingDisplay.count > 0 && (
                <span className="text-xs text-gray-500">({ratingDisplay.count})</span>
              )}
            </div>
          </div>

          {/* Artisan Type */}
          <p className={`text-sm font-medium mb-2 capitalize ${
            isOpen === false ? 'text-gray-500' : 'text-amber-600'
          }`}>
            {artisan.type?.replace('_', ' ') || 'Local Artisan'}
          </p>

          {/* Description */}
          <p className={`text-sm mb-4 line-clamp-2 ${
            isOpen === false ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {artisan.description || 'Discover amazing local products from this artisan.'}
          </p>

          {/* Location */}
          <div className={`flex items-center text-sm mb-4 ${
            isOpen === false ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>{artisan.address?.city || 'Location not specified'}</span>
          </div>

          {/* Contact Info */}
          {artisan.contactInfo?.phone && (
            <div className={`flex items-center text-sm mb-4 ${
              isOpen === false ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <PhoneIcon className="w-4 h-4 mr-1" />
              <span>{artisan.contactInfo.phone}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-medium ${
                isOpen === false ? 'text-gray-500' : 'text-amber-600'
              }`}>
                {isOpen ? 'Open Now' : 'Currently Closed'}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">Click to visit shop</span>
            </div>
            <div className="flex items-center space-x-2">
              {artisan.contactInfo?.phone && (
                <a
                  href={`tel:${artisan.contactInfo.phone}`}
                  className={`p-2 transition-colors duration-300 ${
                    isOpen === false 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-amber-600'
                  }`}
                  title="Call artisan"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOpen === false) e.preventDefault();
                  }}
                >
                  <PhoneIcon className="w-4 h-4" />
                </a>
              )}
              {artisan.contactInfo?.email && (
                <a
                  href={`mailto:${artisan.contactInfo.email}`}
                  className={`p-2 transition-colors duration-300 ${
                    isOpen === false 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-amber-600'
                  }`}
                  title="Email artisan"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOpen === false) e.preventDefault();
                  }}
                >
                  <EnvelopeIcon className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state for results section only
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Search Section */}
      <div className="bg-white shadow-sm border-b border-[#E6B655]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 font-serif mb-2">Find Local Artisans</h1>
              <p className="text-lg text-gray-600">
                Discover exceptional local artisans and their premium products
              </p>
            </div>
          
            {/* Enhanced Search Bar */}
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search artisans..."
                  className="w-80 pl-12 pr-6 py-3 border-2 border-[#E6B655] rounded-xl focus:ring-4 focus:ring-[#E6B655]/20 focus:border-[#3C6E47] transition-all duration-200 text-lg placeholder-gray-500 shadow-lg"
                />
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-[#E6B655]" />
              </form>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-[#E6B655] rounded-xl hover:bg-[#E6B655] hover:text-white transition-all duration-200 font-medium shadow-lg"
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Horizontal Scrollable Category Section (Uber Eats Style) */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-serif">Explore by Category</h2>
          <div className="relative">
            {/* Horizontal Scrollable Container */}
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {artisanTypeCards.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleArtisanTypeSelect(type.id)}
                  className={`group flex-shrink-0 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 min-w-[140px] ${
                    selectedType === type.id
                      ? 'ring-2 ring-[#D77A61] bg-[#F5F1EA]'
                      : 'hover:border-[#E6B655]'
                  }`}
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform text-center">{type.icon}</div>
                  <h3 className="font-medium text-gray-900 group-hover:text-[#D77A61] transition-colors text-sm text-center">
                    {type.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 text-center line-clamp-2">{type.description}</p>
                </button>
              ))}
            </div>
            
            {/* Gradient Overlay for Scroll Indication */}
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[#F5F1EA] to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Favorite Artisans Section - Only for Patrons */}
        {isAuthenticated && user?.role === 'patron' && favoriteArtisans.length > 0 && (
          <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 font-serif mb-2">❤️ Your Favorite Artisans</h2>
                <p className="text-gray-600">
                  Quick access to artisans you love - no need to search every time!
                </p>
              </div>
              
              {isLoadingFavorites ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteArtisans.map(artisan => (
                    <div
                      key={artisan._id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] group"
                      onClick={() => navigate(`/artisan/${artisan._id}`)}
                    >
                      {/* Favorite Button */}
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={(e) => handleToggleFavorite(artisan._id, e)}
                          className={`p-2 text-red-500 hover:text-red-600 transition-colors ${
                            favoriteLoadingStates[artisan._id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Remove from favorites"
                          disabled={favoriteLoadingStates[artisan._id]}
                        >
                          {favoriteLoadingStates[artisan._id] ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <HeartIconSolid className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* Artisan Image */}
                      <div className="relative mb-4">
                        <img
                          src={getArtisanImages(artisan)[0] || getDefaultArtisanImage(artisan.type)}
                          alt={artisan.artisanName || artisan.businessName}
                          className="w-full h-32 object-cover rounded-lg"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          ❤️ Favorite
                        </div>
                      </div>

                      {/* Artisan Info */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                          {artisan.artisanName || artisan.businessName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {artisan.type ? artisanTypes.find(t => t.value === artisan.type)?.label : 'Local Artisan'}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPinIcon className="w-4 h-4 mr-1" />
                          <span>{artisan.address?.city || 'Location not specified'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters and Results */}
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#D77A61] hover:text-[#3C6E47] font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {/* Artisan Type Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Artisan Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => handleArtisanTypeSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6B655] focus:border-transparent"
                  >
                    {artisanTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E6B655] focus:border-transparent"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="rating">Highest Rated</option>
                    <option value="distance">Distance</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedType && selectedType !== 'all' ? `${filteredAndSortedArtisans.length} Local Artisans` : 'All Local Artisans'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {selectedType && selectedType !== 'all' && `Showing ${artisanTypes.find(t => t.value === selectedType)?.label}`}
                  {selectedCategory && ` • ${categories.find(c => c.value === selectedCategory)?.label}`}
                  {sortBy !== 'name' && ` • Sorted by ${sortBy}`}
                </p>
              </div>
            </div>

            {/* Artisan Grid */}
            {isLoading ? (
              renderLoadingSkeleton()
            ) : error ? (
              <div className="text-center py-12">
                <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error: {error}</h3>
                <p className="text-gray-600 mb-6">
                  Please try again later or refresh the page.
                </p>
                <button
                  onClick={loadAllArtisans}
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredAndSortedArtisans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedArtisans.map(renderArtisanCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No artisans found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or select a different category
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  View All Categories
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
