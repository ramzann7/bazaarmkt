// src/components/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  TruckIcon, 
  HeartIcon, 
  StarIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CreditCardIcon, 
  CogIcon,
  ArrowRightIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { getFeaturedProducts, getPopularProducts, clearCache, clearFeaturedProductsCache, clearPopularProductsCache } from '../services/productService';

import { 
  PRODUCT_CATEGORIES, 
  getPopularProducts as getPopularProductNames 
} from '../data/productReference';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import { useOptimizedEffect, useAsyncOperation } from '../hooks/useOptimizedEffect';
import { geocodingService } from '../services/geocodingService';
import { useAuth } from '../contexts/AuthContext';
import DistanceBadge from './DistanceBadge';
import LocationPrompt from './LocationPrompt';
import LocationIndicator from './LocationIndicator';
import { locationService } from '../services/locationService';
import ProductTypeBadge from './ProductTypeBadge';

import AddToCart from './AddToCart';
import toast from 'react-hot-toast';

// Skeleton loading component
const ProductSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-64 mb-3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  </div>
);

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [nearbyProducts, setNearbyProducts] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingNearby, setIsLoadingNearby] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);

  const [error, setError] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const navigate = useNavigate();

  // Memoize reference data to prevent unnecessary re-computations
  const productCategories = useMemo(() => PRODUCT_CATEGORIES, []);
  const popularProductNames = useMemo(() => getPopularProductNames(), []);

  // Optimized featured products loading with caching
  const { execute: loadFeaturedProducts, isLoading: isFeaturedLoading } = useAsyncOperation(
    async () => {
      try {
        console.log('🔄 Starting featured products loading...');
        setError(null);
        
        // Check cache first for instant loading
        const cachedFeatured = cacheService.getFast(CACHE_KEYS.FEATURED_PRODUCTS);
        if (cachedFeatured) {
          console.log('✅ Using cached featured products for instant loading');
          setFeaturedProducts(cachedFeatured);
          setIsLoadingFeatured(false);
          return;
        }
        
        console.log('🔄 Fetching featured products from API...');
        const response = await getFeaturedProducts();
        
        if (response.success) {
          console.log('✅ Setting featured products:', response.products?.length || 0, 'products');
          setFeaturedProducts(response.products || []);
          setIsLoadingFeatured(false);
          // Cache the results
          cacheService.set(CACHE_KEYS.FEATURED_PRODUCTS, response.products, CACHE_TTL.FEATURED_PRODUCTS);
        } else {
          console.error('Failed to load featured products:', response.message);
          // Don't clear existing products on error, just log the error
          setError('Failed to load featured products');
          setIsLoadingFeatured(false);
        }
      } catch (error) {
        console.error('Error loading featured products:', error);
        // Don't clear existing products on error, just log the error
        setError('Failed to load featured products');
        setIsLoadingFeatured(false);
      }
    },
    []
  );



  // Optimized popular products loading with caching
  const { execute: loadPopularProducts, isLoading: isPopularLoading } = useAsyncOperation(
    async () => {
      try {
        console.log('🔄 Starting popular products loading...');
        setError(null);
        
        // Check cache first for instant loading
        const cachedPopular = cacheService.getFast(CACHE_KEYS.POPULAR_PRODUCTS);
        if (cachedPopular) {
          console.log('✅ Using cached popular products for instant loading');
          setPopularProducts(cachedPopular);
          setIsLoadingPopular(false);
          return;
        }
        
        console.log('🔄 Fetching popular products from API...');
        const response = await getPopularProducts();
        
        if (response.success) {
          console.log('✅ Setting popular products:', response.products?.length || 0, 'products');
          setPopularProducts(response.products || []);
          setIsLoadingPopular(false);
          // Cache the results
          cacheService.set(CACHE_KEYS.POPULAR_PRODUCTS, response.products, CACHE_TTL.POPULAR_PRODUCTS);
        } else {
          console.error('Failed to load popular products:', response.message);
          // Don't clear existing products on error, just log the error
          setError('Failed to load popular products');
          setIsLoadingPopular(false);
        }
      } catch (error) {
        console.error('Error loading popular products:', error);
        // Don't clear existing products on error, just log the error
        setError('Failed to load popular products');
        setIsLoadingPopular(false);
        toast.error('Failed to load popular products');
      }
    },
    []
  );

  // Load basic product data on component mount (not dependent on user)
  useOptimizedEffect(() => {
    const startTime = performance.now();
    console.log('🔄 Loading basic product data on component mount');
    
    // Check cache first
    const cachedFeatured = cacheService.get(CACHE_KEYS.FEATURED_PRODUCTS);
    const cachedPopular = cacheService.get(CACHE_KEYS.POPULAR_PRODUCTS);
    
    console.log('📦 Cache check:', {
      hasCachedFeatured: !!cachedFeatured,
      hasCachedPopular: !!cachedPopular,
      featuredCount: cachedFeatured?.length || 0,
      popularCount: cachedPopular?.length || 0
    });
    
    if (cachedFeatured) {
      console.log('✅ Using cached featured products');
      setFeaturedProducts(cachedFeatured);
      setIsLoadingFeatured(false);
    } else {
      console.log('🔄 Loading featured products from API');
      loadFeaturedProducts();
    }
    
    if (cachedPopular) {
      console.log('✅ Using cached popular products');
      setPopularProducts(cachedPopular);
      setIsLoadingPopular(false);
    } else {
      console.log('🔄 Loading popular products from API');
      loadPopularProducts();
    }
    
    const endTime = performance.now();
    console.log(`Home component basic data loading took ${(endTime - startTime).toFixed(2)}ms`);
  }, [], { skipFirstRender: false });

  // Load user location on component mount
  useEffect(() => {
    const loadUserLocation = () => {
      try {
        // For patrons and artisans, use their profile/business address
        if (user && user.coordinates) {
          setUserLocation({
            latitude: user.coordinates.latitude,
            longitude: user.coordinates.longitude,
            address: user.addresses?.[0]?.city || user.artisanName || 'Your location'
          });
          console.log('📍 Using user profile location:', user.coordinates);
          return;
        }
        
        // For guests, check for saved location
        const savedLocation = locationService.getUserLocation();
        if (savedLocation) {
          setUserLocation(savedLocation);
          console.log('📍 Loaded saved location for guest:', savedLocation.address);
        } else {
          // Show location prompt for guests if not shown before
          if (!user && !locationService.hasLocationPromptBeenShown()) {
            setShowLocationPrompt(true);
          }
        }
      } catch (error) {
        console.error('Error loading user location:', error);
      }
    };

    loadUserLocation();
  }, [user]);

  // Load location-dependent data when user changes
  useOptimizedEffect(() => {
    // Load nearby products (depends on user location)
    loadNearbyProducts();
  }, [user], { skipFirstRender: false });

  // Handle user logout gracefully - preserve product data
  useEffect(() => {
    if (!user) {
      // User logged out - preserve existing product data but clear user-specific data
      console.log('🔄 User logged out - preserving product data, clearing user-specific data');
      
      // Clear nearby products since they depend on user location
      setNearbyProducts([]);
      setIsLoadingNearby(false);
      setUserLocation(null);
      
      // Clear product service cache to ensure fresh data
      clearFeaturedProductsCache();
      clearPopularProductsCache();
      
      // Keep featured and popular products as they don't depend on user authentication
      // Only reload if they're empty (in case they were cleared by an error)
      if (featuredProducts.length === 0 && !isLoadingFeatured) {
        console.log('🔄 Reloading featured products after logout');
        loadFeaturedProducts();
      }
      
      if (popularProducts.length === 0 && !isLoadingPopular) {
        console.log('🔄 Reloading popular products after logout');
        loadPopularProducts();
      }
    }
  }, [user]);

  // Fallback mechanism - ensure products are loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      // If products are still empty after 5 seconds, force reload
      if (featuredProducts.length === 0 && !isLoadingFeatured) {
        console.log('⚠️ Featured products still empty after 5s, forcing reload');
        loadFeaturedProducts();
      }
      
      if (popularProducts.length === 0 && !isLoadingPopular) {
        console.log('⚠️ Popular products still empty after 5s, forcing reload');
        loadPopularProducts();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [featuredProducts.length, popularProducts.length, isLoadingFeatured, isLoadingPopular]);

  // Get user location and load nearby products
  const loadNearbyProducts = async () => {
    try {
      console.log('🌍 Loading nearby products...');
      setIsLoadingNearby(true);
      
      // Get user location
      let location = null;
      
      // First, try to get user coordinates from profile
      if (user?.coordinates) {
        location = {
          latitude: user.coordinates.latitude,
          longitude: user.coordinates.longitude
        };
        console.log('✅ Using user coordinates from profile (patron/artisan):', location);
      } else {
        // Try to get user coordinates from geocoding service
        try {
          const userCoords = await geocodingService.getUserCoordinates();
          if (userCoords) {
            location = {
              latitude: userCoords.latitude,
              longitude: userCoords.longitude
            };
            console.log('✅ Using user coordinates from geocoding service:', location);
          }
        } catch (error) {
          console.log('No saved coordinates found:', error);
        }
      }
      
      // If no location found, try browser geolocation
      if (!location && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            });
          });
          
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('✅ Using browser geolocation:', location);
        } catch (error) {
          console.log('Browser geolocation failed:', error);
        }
      }
      
      // If still no location, use default (Toronto)
      if (!location) {
        location = { latitude: 43.6532, longitude: -79.3832 }; // Toronto
        console.log('📍 Using default location (Toronto):', location);
      }
      
      // Ensure location has valid coordinates
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        console.error('❌ Invalid location data:', location);
        setIsLoadingNearby(false);
        return;
      }
      
      setUserLocation(location);
      
      // Create cache key based on location
      const cacheKey = `${CACHE_KEYS.NEARBY_PRODUCTS}_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
      
      // Check cache first
      const cachedNearby = cacheService.getFast(cacheKey);
      if (cachedNearby) {
        console.log('✅ Using cached nearby products');
        setNearbyProducts(cachedNearby);
        setIsLoadingNearby(false);
        return;
      }
      
      // Get nearby products using enhanced search
      const searchParams = new URLSearchParams({
        userLat: location.latitude.toString(),
        userLng: location.longitude.toString(),
        proximityRadius: '25', // 25km radius
        enhancedRanking: 'true',
        includeDistance: 'true',
        limit: '8' // Limit to 8 nearby products
      });
      
      console.log('🔍 Fetching nearby products with params:', searchParams.toString());
      const response = await fetch(`/api/products/enhanced-search?${searchParams.toString()}`);
      const data = await response.json();
      
      console.log('📊 API Response:', {
        success: data.success,
        productsCount: data.products?.length || 0,
        hasProducts: !!data.products,
        error: data.error || data.message
      });
      
      if (data.products && data.products.length > 0) {
        // Add distance information to products
        console.log('📍 Processing products with distance calculation...');
        const productsWithDistance = data.products.map(product => {
          if (product.artisan && product.artisan.coordinates) {
            const distance = geocodingService.calculateDistanceBetween(
              location,
              product.artisan.coordinates
            );
            
            return {
              ...product,
              distance: distance,
              formattedDistance: geocodingService.formatDistance(distance)
            };
          }
          console.log('⚠️ Product without artisan coordinates:', product.name, product.artisan);
          return product;
        }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        
        console.log('📏 Products with distance data:', productsWithDistance.filter(p => p.distance !== undefined).length);
        
        console.log('✅ Nearby products loaded:', productsWithDistance.length);
        setNearbyProducts(productsWithDistance);
        
        // Cache the results
        cacheService.set(cacheKey, productsWithDistance, CACHE_TTL.NEARBY_PRODUCTS);
      } else {
        console.log('ℹ️ No nearby products found');
        setNearbyProducts([]);
      }
    } catch (error) {
      console.error('❌ Error loading nearby products:', error);
      setNearbyProducts([]);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // Location prompt handlers
  const handleLocationSet = (locationData) => {
    setUserLocation(locationData);
    setShowLocationPrompt(false);
    
    // Reload nearby products with new location
    if (locationData.lat && locationData.lng) {
      loadNearbyProducts(locationData.lat, locationData.lng);
    }
  };

  const handleLocationDismiss = () => {
    setShowLocationPrompt(false);
  };



  // Function to enhance product with complete artisan data
  const enhanceProductWithArtisanData = async (product) => {
    try {
      // If product already has complete artisan data, return as is
      if (product.artisan?._id && product.artisan?.deliveryOptions) {
        return product;
      }

      // Fetch complete artisan data
              const artisanId = product.artisan?._id || product.artisanId;
      if (!artisanId) {
        console.warn('Product missing artisan ID, cannot enhance:', product);
        return product;
      }

      const response = await fetch(`/api/artisans/${artisanId}`);
      if (!response.ok) {
        console.warn('Failed to fetch artisan data for product:', product);
        return product;
      }

      const artisanData = await response.json();
      
      // Enhance the product with complete artisan information
      return {
        ...product,
        artisan: {
          _id: artisanData._id,  // Artisan document ID
          artisanName: artisanData.artisanName || artisanData.businessName || `${artisanData.firstName || ''} ${artisanData.lastName || ''}`.trim(),
          type: artisanData.type || 'other',
          address: artisanData.address,
          deliveryOptions: artisanData.deliveryOptions || {
            pickup: true,
            delivery: false,
            deliveryRadius: 0,
            deliveryFee: 0,
            freeDeliveryThreshold: 0,
            professionalDelivery: {
              enabled: false,
              uberDirectEnabled: false,
              serviceRadius: 25
            }
          },
          pickupLocation: artisanData.pickupLocation,
          pickupInstructions: artisanData.pickupInstructions,
          pickupHours: artisanData.pickupHours,
          deliveryInstructions: artisanData.deliveryInstructions
        },
        artisanId: artisanData._id      // Set to Artisan ID
      };
    } catch (error) {
      console.error('Error enhancing product with artisan data:', error);
      return product; // Return original product if enhancement fails
    }
  };

  // Memoized product click handler
  const handleProductClick = useMemo(() => {
    return (product) => {
      setSelectedProduct(product);
      setShowCartPopup(true);
    };
  }, []);





  // Memoized search handler
  const handleSearch = useMemo(() => {
    return (e) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`);
      }
    };
  }, [searchQuery, selectedCategory, navigate]);

  // Memoized category change handler
  const handleCategoryChange = useMemo(() => {
    return (category) => {
      setSelectedCategory(category);
    };
  }, []);

  // Test reference data imports
  console.log('PRODUCT_CATEGORIES available:', !!PRODUCT_CATEGORIES);
  console.log('getPopularProductNames available:', !!getPopularProductNames);

  // Popular products are now loaded from API

  const localFavorites = useMemo(() => [
    {
      id: 5,
      name: "Homemade Jam",
      price: 7.99,
      image: null,
      artisan: { artisanName: "Berry Farm" },
      rating: 4.6,
      _id: "local-1",
      stock: 15,
      unit: "jar",
      leadTimeHours: 24,
      isOrganic: true,
      isGlutenFree: true,
      category: "food_beverages",
      subcategory: "preserves_jams"
    },
    {
      id: 6,
      name: "Hand-knitted Scarves",
      price: 25.99,
      image: null,
      artisan: { artisanName: "Warm Woolies" },
      rating: 4.8,
      _id: "local-2",
      stock: 8,
      unit: "piece",
      leadTimeHours: 96,
      isOrganic: false,
      isGlutenFree: false,
      category: "handmade_crafts",
      subcategory: "textiles_fiber"
    },
    {
      id: 7,
      name: "Artisan Cheese",
      price: 18.99,
      image: null,
      artisan: { artisanName: "Cheese Crafters" },
      rating: 4.9,
      _id: "local-3",
      stock: 12,
      unit: "wheel",
      leadTimeHours: 72,
      isOrganic: true,
      isGlutenFree: true,
      category: "food_beverages",
      subcategory: "dairy_products"
    },
    {
      id: 8,
      name: "Handmade Candles",
      price: 12.99,
      image: null,
      artisan: { artisanName: "Aromatherapy Co" },
      rating: 4.7,
      _id: "local-4",
      stock: 20,
      unit: "candle",
      leadTimeHours: 48,
      isOrganic: true,
      isGlutenFree: true,
      category: "beauty_wellness",
      subcategory: "aromatherapy"
    }
  ], []);

  const closeToYou = useMemo(() => [
    {
      id: 9,
      name: "Fresh Baked Goods",
      price: 4.99,
      image: null,
      artisan: { artisanName: "Local Bakery" },
      rating: 4.5,
      _id: "close-1",
      stock: 30,
      unit: "piece",
      leadTimeHours: 6,
      isOrganic: false,
      isGlutenFree: false,
      category: "food_beverages",
      subcategory: "baked_goods"
    },
    {
      id: 10,
      name: "Handmade Cards",
      price: 3.99,
      image: null,
      artisan: { artisanName: "Paper Crafts" },
      rating: 4.6,
      _id: "close-2",
      stock: 50,
      unit: "card",
      leadTimeHours: 24,
      isOrganic: false,
      isGlutenFree: false,
      category: "handmade_crafts",
      subcategory: "paper_crafts"
    },
    {
      id: 11,
      name: "Natural Skincare",
      price: 22.99,
      image: null,
      artisan: { artisanName: "Pure Beauty" },
      rating: 4.8,
      _id: "close-3",
      stock: 10,
      unit: "bottle",
      leadTimeHours: 48,
      isOrganic: true,
      isGlutenFree: true,
      category: "beauty_wellness",
      subcategory: "skincare"
    },
    {
      id: 12,
      name: "Handcrafted Wood Items",
      price: 35.99,
      image: null,
      artisan: { artisanName: "Timber Crafts" },
      rating: 4.7,
      _id: "close-4",
      stock: 5,
      unit: "piece",
      leadTimeHours: 120,
      isOrganic: false,
      isGlutenFree: false,
      category: "handmade_crafts",
      subcategory: "woodworking"
    }
  ], []);



  // Remove duplicate functions - they are now handled by the optimized hooks above

  // Remove duplicate function - it's now handled by the memoized version above

  const closeCartPopup = () => {
    setShowCartPopup(false);
    setSelectedProduct(null);
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Handle HTTP URLs
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle relative paths (already have /uploads prefix)
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths that need /uploads prefix
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths without leading slash
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIcon key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="w-4 h-4 fill-amber-400 text-amber-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    return stars;
  };

  // ProductCard component with lazy loading
  const ProductCard = ({ product, showImagePreview = false, showDistance = false }) => (
    <div 
      className="group cursor-pointer relative hover:shadow-lg transition-shadow duration-300" 
      onClick={() => handleProductClick(product)}
      title="Select this artisan product"
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-100">
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            console.log('❌ Product card image failed to load:', e.target.src);
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
          onLoad={(e) => {
            console.log('✅ Product card image loaded successfully:', e.target.src);
          }}
        />
        <div className={`w-full h-64 flex items-center justify-center bg-gray-200 ${product.image ? 'hidden' : 'flex'}`}>
          <BuildingStorefrontIcon className="w-16 h-16 text-gray-400" />
        </div>
        {product.isFeatured && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
            Featured
          </div>
        )}
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
      <div className="mt-3">
        <h3 className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500">
          {product.artisan?.artisanName || 'Unknown Artisan'}
        </p>
        {showDistance && (product.distance || product.formattedDistance) && (
          <div className="mt-2">
            <DistanceBadge 
              distance={product.distance} 
              formattedDistance={product.formattedDistance}
            />
          </div>
        )}
        {/* Product Type Information */}
        <div className="mt-2 mb-2">
          <ProductTypeBadge product={product} variant="compact" />
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
          <div className="flex items-center space-x-1">
            {renderStars(product.artisan?.rating?.average || 0)}
            <span className="text-sm text-gray-500">({(product.artisan?.rating?.average || 0).toFixed(1)})</span>
          </div>
        </div>
        

      </div>
    </div>
  );

  // Refresh data when page comes into focus (e.g., after returning from artisan page)
  useEffect(() => {
    const handleFocus = () => {
      // Clear caches and reload data to get fresh ratings
      clearFeaturedProductsCache();
      clearPopularProductsCache();
      loadFeaturedProducts();
      loadPopularProducts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadFeaturedProducts, loadPopularProducts]);

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Featured Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 font-serif">Featured Products</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  clearFeaturedProductsCache();
                  loadFeaturedProducts();
                }}
                className="text-sm text-[#3C6E47] hover:text-[#2E2E2E] font-medium"
              >
                Refresh
              </button>
              <Link 
                to="/search" 
                className="flex items-center space-x-2 text-[#D77A61] hover:text-[#3C6E47] font-medium"
              >
                <span>View all</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {isLoadingFeatured ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} showImagePreview={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Featured Products</h3>
              <p className="text-gray-500">Check back soon for featured products from our artisans.</p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 font-serif">Popular Products</h2>
            <Link 
              to="/search" 
              className="flex items-center space-x-2 text-[#D77A61] hover:text-[#3C6E47] font-medium"
            >
              <span>View all</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoadingPopular ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : popularProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {popularProducts.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Popular Products</h3>
              <p className="text-gray-500">Check back soon for popular products from our artisans.</p>
            </div>
          )}
        </div>
      </section>

      {/* Close to You Section */}
      <section className="py-16 bg-[#F5F1EA]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <MapPinIcon className="w-8 h-8 text-[#3C6E47]" />
              <h2 className="text-3xl font-bold text-gray-900 font-serif">Close to You</h2>
            </div>
            {/* Only show location indicator for guests */}
            {!user && <LocationIndicator onLocationUpdate={handleLocationSet} />}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Clear nearby products cache before refreshing
                  if (userLocation) {
                    const cacheKey = `${CACHE_KEYS.NEARBY_PRODUCTS}_${userLocation.latitude.toFixed(2)}_${userLocation.longitude.toFixed(2)}`;
                    cacheService.delete(cacheKey);
                  }
                  loadNearbyProducts();
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
              <Link 
                to="/search" 
                className="flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium"
              >
                <span>View all</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {isLoadingNearby ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : nearbyProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {nearbyProducts.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} showDistance={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Nearby Products</h3>
              <p className="text-gray-500">
                {user ? 
                  "No products found within 25km of your location. Try expanding your search or check back later." :
                  userLocation ? 
                    "No products found within 25km of your location. Try expanding your search or check back later." :
                    "Unable to determine your location. Please provide your location for personalized recommendations."
                }
              </p>
              {!user && !userLocation && (
                <button
                  onClick={() => loadNearbyProducts()}
                  className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </section>



      {/* Features Section */}
      <section className="py-16 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose The Bazaar?</h2>
            <p className="text-lg text-gray-600">Supporting local artisans and bringing you authentic, quality products</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Local & Authentic</h3>
              <p className="text-gray-600">Connect directly with local artisans and discover unique, handmade products.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TruckIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh Delivery</h3>
              <p className="text-gray-600">Get fresh, local products delivered to your doorstep with care and attention.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Assured</h3>
              <p className="text-gray-600">Every product is carefully curated and quality-checked for your satisfaction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-amber-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Selling?</h2>
          <p className="text-xl text-amber-100 mb-8">Join our community of artisans and share your passion with customers</p>
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-3 bg-white text-amber-600 font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            Become an Artisan
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Enhanced Cart Popup */}
      {showCartPopup && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
              <button
                onClick={closeCartPopup}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Product Image */}
            <div className="p-6 pb-0">
              <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden mb-6">
                {selectedProduct.image ? (
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('❌ Image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      console.log('✅ Image loaded successfully:', e.target.src);
                    }}
                  />
                ) : null}
                <div className={`w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ${selectedProduct.image ? 'hidden' : 'flex'}`}>
                  <BuildingStorefrontIcon className="w-16 h-16 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Enhanced Add to Cart Component */}
            <div className="px-6 pb-6">
              <AddToCart 
                product={selectedProduct}
                variant="modal"
                onSuccess={(product, quantity) => {
                  closeCartPopup();
                  setSelectedProduct(null);
                  toast.success(`Added ${quantity} ${quantity === 1 ? product.unit || 'piece' : product.unit + 's'} to cart!`);
                }}
                onError={(error) => {
                  console.error('Add to cart error:', error);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Location Prompt Modal */}
      {showLocationPrompt && (
        <LocationPrompt
          onLocationSet={handleLocationSet}
          onDismiss={handleLocationDismiss}
        />
      )}


    </div>
  );
}
