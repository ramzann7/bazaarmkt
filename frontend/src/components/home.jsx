// src/components/Home.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import config from '../config/environment.js';
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
import { useNavigate, Link } from 'react-router-dom';
import { getFeaturedProducts, getPopularProducts, clearCache, clearFeaturedProductsCache, clearPopularProductsCache } from '../services/productService';
import { promotionalService } from '../services/promotionalService';
import communityService from '../services/communityService';
import HorizontalProductScroll from './HorizontalProductScroll';

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
import ProductCard from './ProductCard';
import InventoryModel from '../models/InventoryModel';
import toast from 'react-hot-toast';

// Skeleton loading component
const ProductSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
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

  // Helper function to filter out out-of-stock products
  const filterInStockProducts = (products) => {
    return products.filter(product => {
      const inventoryModel = new InventoryModel(product);
      const outOfStockStatus = inventoryModel.getOutOfStockStatus();
      return !outOfStockStatus.isOutOfStock;
    });
  };

  // Create filtered versions of product arrays for home page display
  const availableFeaturedProducts = useMemo(() => {
    return filterInStockProducts(featuredProducts);
  }, [featuredProducts]);

  const availablePopularProducts = useMemo(() => {
    return filterInStockProducts(popularProducts);
  }, [popularProducts]);

  const availableNearbyProducts = useMemo(() => {
    return filterInStockProducts(nearbyProducts);
  }, [nearbyProducts]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);

  const [error, setError] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const navigate = useNavigate();

  // Memoize reference data to prevent unnecessary re-computations
  const productCategories = useMemo(() => PRODUCT_CATEGORIES, []);
  const popularProductNames = useMemo(() => getPopularProductNames(), []);

  // Optimized featured products loading with caching
  const { execute: loadFeaturedProducts, isLoading: isFeaturedLoading } = useAsyncOperation(
    async () => {
      try {
        setError(null);
        
        // Check cache first for instant loading
        const cachedFeatured = cacheService.getFast(CACHE_KEYS.FEATURED_PRODUCTS);
        if (cachedFeatured) {
          setFeaturedProducts(cachedFeatured);
          setIsLoadingFeatured(false);
          return;
        }
        const promotionalProducts = await promotionalService.getPremiumShowcaseProducts(6, userLocation);
        
        if (promotionalProducts && promotionalProducts.length > 0) {
          setFeaturedProducts(promotionalProducts);
          setIsLoadingFeatured(false);
          // Cache the results
          cacheService.set(CACHE_KEYS.FEATURED_PRODUCTS, promotionalProducts, CACHE_TTL.FEATURED_PRODUCTS);
        } else {
          const response = await getFeaturedProducts();
          
          if (response.success) {
            setFeaturedProducts(response.products || []);
            setIsLoadingFeatured(false);
            // Cache the results
            cacheService.set(CACHE_KEYS.FEATURED_PRODUCTS, response.products, CACHE_TTL.FEATURED_PRODUCTS);
          } else {
            console.error('Failed to load featured products:', response.message);
            setError('Failed to load featured products');
            setIsLoadingFeatured(false);
          }
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
        setError(null);
        
        // Check cache first for instant loading
        const cachedPopular = cacheService.getFast(CACHE_KEYS.POPULAR_PRODUCTS);
        if (cachedPopular) {
          setPopularProducts(cachedPopular);
          setIsLoadingPopular(false);
          return;
        }
        const response = await getPopularProducts(12); // Limit to 12 products
        
        if (response.success) {
          const limitedProducts = (response.products || []).slice(0, 12);
          setPopularProducts(limitedProducts);
          setIsLoadingPopular(false);
          // Cache the limited results
          cacheService.set(CACHE_KEYS.POPULAR_PRODUCTS, limitedProducts, CACHE_TTL.POPULAR_PRODUCTS);
        } else {
          console.error('Failed to load popular products:', response.message);
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
    // Loading basic product data on component mount
    
    // Clear featured products cache to ensure we get the latest promotional data
    cacheService.delete(CACHE_KEYS.FEATURED_PRODUCTS);
    // Clear popular products cache to ensure we get the latest data
    cacheService.delete(CACHE_KEYS.POPULAR_PRODUCTS);
    
    // Always load fresh data since we're clearing cache
    loadFeaturedProducts();
    loadPopularProducts();
    
    const endTime = performance.now();
    console.log(`Home component basic data loading took ${(endTime - startTime).toFixed(2)}ms`);
  }, [], { skipFirstRender: false });

    // Load user location on component mount
  useEffect(() => {
    const loadUserLocation = () => {
      try {
        // For patrons and artisans, use their profile/business address
        if (user && user.coordinates) {
          // Check if coordinates are valid numbers
          const lat = parseFloat(user.coordinates.latitude);
          const lng = parseFloat(user.coordinates.longitude);
          
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            console.log('📍 User coordinates found:', {
              user: user._id,
              coordinates: user.coordinates,
              latType: typeof lat,
              lngType: typeof lng,
              hasLat: !isNaN(lat),
              hasLng: !isNaN(lng),
              lat: lat,
              lng: lng
            });
            
            const userLocationData = {
              latitude: lat,
              longitude: lng,
              address: user.addresses?.[0]?.city || user.artisanName || 'Your location',
              source: 'user_profile',
              confidence: user.coordinates.confidence || 100
            };
            
            setUserLocation(userLocationData);
            console.log('📍 Using user profile location:', userLocationData);
            
            // Cache this location for future use
            locationService.saveUserLocation({
              address: userLocationData.address,
              lat: lat,
              lng: lng,
              confidence: userLocationData.confidence,
              formattedAddress: userLocationData.address,
              source: 'user_profile'
            });
            
            return;
          } else {
            console.warn('⚠️ User coordinates are invalid:', user.coordinates);
          }
        }
        
        // For guests or users without valid coordinates, check for saved location
        const savedLocation = locationService.getUserLocation();
        if (savedLocation && savedLocation.lat && savedLocation.lng) {
          const lat = parseFloat(savedLocation.lat);
          const lng = parseFloat(savedLocation.lng);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            setUserLocation({
              latitude: lat,
              longitude: lng,
              address: savedLocation.address || 'Saved location',
              source: 'saved_location',
              confidence: savedLocation.confidence || 80
            });
            console.log('📍 Loaded saved location:', {
              latitude: lat,
              longitude: lng,
              address: savedLocation.address
            });
            return;
          }
        }
        
        // If no valid location found, show location prompt for guests
        if (!user && !locationService.hasLocationPromptBeenShown()) {
          setShowLocationPrompt(true);
        } else if (user && !user.coordinates) {
          // For authenticated users without coordinates, try to get from their address
          const userAddress = user.addresses?.[0];
          if (userAddress && userAddress.city) {
            console.log('📍 Attempting to geocode user address:', userAddress);
            // This will be handled in the nearby products loading
          }
        }
      } catch (error) {
        console.error('Error loading user location:', error);
      }
    };

    loadUserLocation();
  }, [user]);

  // Note: Nearby products are no longer loaded automatically on home page
  // They are only loaded when user clicks "Find Near Me" button

  // Handle user logout gracefully - preserve product data
  useEffect(() => {
    if (!user) {
      // User logged out - preserve existing product data but clear user-specific data
      console.log('🔄 User logged out - preserving product data, clearing user-specific data');
      
      // Clear user location (nearby products are not loaded on home page)
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
      
      // Get user location with simplified fallback system
      let location = null;
      let locationSource = 'unknown';
      
      // 1. Try user location state first (most reliable)
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        location = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        };
        locationSource = userLocation.source || 'user_profile';
        console.log('✅ Using user location state:', location);
      }
      
      // 2. Try user coordinates from profile
      if (!location && user?.coordinates) {
        const lat = parseFloat(user.coordinates.latitude);
        const lng = parseFloat(user.coordinates.longitude);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          location = { latitude: lat, longitude: lng };
          locationSource = 'user_coordinates';
          console.log('✅ Using user coordinates:', location);
        }
      }
      
      // 3. Try saved location from localStorage
      if (!location) {
        const savedLocation = locationService.getUserLocation();
        if (savedLocation && savedLocation.lat && savedLocation.lng) {
          const lat = parseFloat(savedLocation.lat);
          const lng = parseFloat(savedLocation.lng);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            location = { latitude: lat, longitude: lng };
            locationSource = 'saved_location';
            console.log('✅ Using saved location:', location);
          }
        }
      }
      
      // 4. Try browser geolocation (with timeout)
      if (!location && navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000, // Reduced timeout
              maximumAge: 300000 // 5 minutes
            });
          });
          
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          locationSource = 'browser_geolocation';
          console.log('✅ Using browser geolocation:', location);
          
          // Save this location for future use
          locationService.updateLocationFromGPS(location.latitude, location.longitude);
        } catch (error) {
          console.log('Browser geolocation failed:', error);
        }
      }
      
      // 5. Final fallback: use default location (Toronto)
      if (!location) {
        location = { latitude: 43.6532, longitude: -79.3832 }; // Toronto
        locationSource = 'default_location';
        console.log('📍 Using default location (Toronto):', location);
      }
      
      // Validate location
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        console.error('❌ Invalid location data:', location);
        setIsLoadingNearby(false);
        return;
      }
      
      // Update user location state if needed
      if (!userLocation || userLocation.latitude !== location.latitude || userLocation.longitude !== location.longitude) {
        setUserLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          address: locationSource === 'default_location' ? 'Toronto, ON' : 'Your location',
          source: locationSource,
          confidence: locationSource === 'user_profile' ? 100 : 
                     locationSource === 'saved_location' ? 80 :
                     locationSource === 'user_coordinates' ? 70 :
                     locationSource === 'browser_geolocation' ? 90 : 50
        });
      }
      
      // Create cache key with user type for better cache management
      const userType = user ? 'patron' : 'guest';
      const cacheKey = `${CACHE_KEYS.NEARBY_PRODUCTS}_${userType}_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
      
      // Check cache first with validation
      const cachedNearby = cacheService.get(cacheKey);
      if (cachedNearby && Array.isArray(cachedNearby) && cachedNearby.length > 0) {
        console.log('✅ Using cached nearby products:', cachedNearby.length, 'products');
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
        limit: '12' // Limit to 12 nearby products
      });
      
      console.log('🔍 Fetching nearby products with params:', searchParams.toString());
      const response = await fetch(`http://localhost:4000/api/products/enhanced-search?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📊 API Response:', {
        success: data.success,
        productsCount: data.products?.length || 0,
        hasProducts: !!data.products,
        error: data.error || data.message
      });
      
      if (data.products && data.products.length > 0) {
        // Process products and add distance information
        const productsWithDistance = data.products.map(product => {
          // Calculate distance if not provided by API
          if (product.distance === null || product.distance === undefined) {
            if (product.artisan && product.artisan.address) {
              // Use a default distance calculation or set to 0 for now
              product.distance = 0; // All products are from the same artisan
              product.formattedDistance = null; // Don't show distance text
            } else {
              product.distance = 999; // Unknown distance
              product.formattedDistance = null; // Don't show distance text
            }
          } else {
            product.distance = parseFloat(product.distance);
          }
          
          // Ensure product has all required fields
          if (!product.artisan) {
            product.artisan = {
              _id: null,
              artisanName: 'Unknown Artisan',
              type: 'other',
              address: null,
              deliveryOptions: null,
              rating: null
            };
          }
          
          return product;
        }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        
        console.log('✅ Nearby products loaded:', productsWithDistance.length);
        const limitedNearbyProducts = productsWithDistance.slice(0, 12);
        setNearbyProducts(limitedNearbyProducts);
        
        // Cache the limited results with longer TTL for nearby products (30 minutes)
        cacheService.set(cacheKey, limitedNearbyProducts, 30 * 60 * 1000);
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
    
    // Note: Nearby products are not loaded on home page
    // They will be loaded when user navigates to search page
  };

  const handleLocationDismiss = () => {
    setShowLocationPrompt(false);
  };

  // Handle Find Near Me button click
  const handleFindNearMe = async () => {
    try {
      // Check if we already have a saved location
      const savedLocation = locationService.getSavedLocation();
      
      if (savedLocation && savedLocation.latitude && savedLocation.longitude) {
        // Navigate with saved location
        navigate(`/search?nearby=true&lat=${savedLocation.latitude}&lng=${savedLocation.longitude}`);
        return;
      }

      // Request location permission
      if ("geolocation" in navigator) {
        toast.loading('Getting your location...', { id: 'location' });
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            // Save location
            locationService.saveLocation({
              latitude,
              longitude,
              timestamp: Date.now()
            });
            
            toast.success('Location found!', { id: 'location' });
            
            // Navigate to search with location parameters
            navigate(`/search?nearby=true&lat=${latitude}&lng=${longitude}`);
          },
          (error) => {
            console.error('Error getting location:', error);
            toast.error('Unable to get your location. Please allow location access.', { id: 'location' });
            // Navigate without location - search page will handle it
            navigate('/search?nearby=true');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        toast.error('Geolocation is not supported by your browser');
        navigate('/search?nearby=true');
      }
    } catch (error) {
      console.error('Error in handleFindNearMe:', error);
      toast.error('Something went wrong. Please try again.');
      navigate('/search?nearby=true');
    }
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

  // Test reference data imports (removed excessive logging)

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

  // Helper function to get optimized image URL
  const getImageUrl = (imagePath, options = {}) => {
    if (!imagePath) return null;
    
    // Handle base64 data URLs
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Handle HTTP URLs (including Vercel Blob URLs)
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle Vercel Blob URLs that might be stored as filenames
    if (imagePath.includes('.public.blob.vercel-storage.com')) {
      return imagePath;
    }
    
    // Use optimized image endpoint for local uploads
    if (imagePath.startsWith('/uploads/')) {
      const { width = 400, height = 400, quality = 80 } = options;
      const imagePathWithoutPrefix = imagePath.replace('/uploads/', '');
      return `${config.BASE_URL}/api/images/optimize/${imagePathWithoutPrefix}?width=${width}&height=${height}&quality=${quality}`;
    }
    
    // Handle paths that need /uploads prefix (legacy support)
    if (imagePath.startsWith('/')) {
      const { width = 400, height = 400, quality = 80 } = options;
      return `${config.BASE_URL}/api/images/optimize/${imagePath.substring(1)}?width=${width}&height=${height}&quality=${quality}`;
    }
    
    // Handle paths without leading slash (legacy support)
    const { width = 400, height = 400, quality = 80 } = options;
    return `${config.BASE_URL}/api/images/optimize/${imagePath}?width=${width}&height=${height}&quality=${quality}`;
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
      stars.push(<StarIcon key={i} className="w-4 h-4 fill-primary-400 text-primary-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="w-4 h-4 fill-primary-400 text-primary-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    return stars;
  };


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

  // Load community posts - trending this week or latest
  useEffect(() => {
    const loadCommunityPosts = async () => {
      try {
        setIsLoadingPosts(true);
        
        // Calculate date for one week ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Try to get trending posts from this week
        let posts = [];
        try {
          const trendingResponse = await communityService.getPosts({
            sort: 'trending',
            startDate: oneWeekAgo.toISOString(),
            limit: 3
          });
          posts = trendingResponse.posts || trendingResponse.data || [];
        } catch (error) {
          console.log('No trending posts available, fetching latest:', error);
        }
        
        // If no trending posts, get latest posts
        if (!posts || posts.length === 0) {
          const latestResponse = await communityService.getPosts({
            sort: 'createdAt',
            order: 'desc',
            limit: 3
          });
          posts = latestResponse.posts || latestResponse.data || [];
        }
        
        setCommunityPosts(posts || []);
      } catch (error) {
        console.error('Error loading community posts:', error);
        // Set empty array on error
        setCommunityPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadCommunityPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid lg:grid-cols-[1fr_420px] gap-6 sm:gap-8 items-stretch">
          {/* Hero Left - Text Content */}
          <div className="bg-white rounded-xl p-8 sm:p-10 shadow-soft flex flex-col justify-center">
            {/* Tag */}
            <div className="inline-block self-start">
              <span className="inline-block bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold text-xs sm:text-sm mb-4">
                Handmade • Local • Seasonal
              </span>
            </div>
            
            {/* Heading */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary mb-4 leading-tight">
              Discover treasures made by your neighbours
            </h1>
            
            {/* Lead Text */}
            <p className="text-base sm:text-lg text-secondary/70 mb-6 leading-relaxed">
              Shop fresh, homemade food and handcrafted goods from local artisans near you. Each purchase supports a person — not a faceless corporation.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/find-artisans"
                className="btn-primary px-6 py-3 text-center"
              >
                Explore Artisans
              </Link>
              <button
                onClick={handleFindNearMe}
                className="btn-outline px-6 py-3 text-center"
              >
                Find Near Me
              </button>
            </div>
          </div>
          
          {/* Hero Right - Image */}
          <div className="rounded-xl overflow-hidden shadow-soft bg-white h-64 lg:h-auto">
            <img 
              src="/artisan-market-hero.jpeg" 
              alt="Vibrant artisan market with pottery and handcrafted goods"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured Products - Horizontal Scroll */}
      <section className="py-8 sm:py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {isLoadingFeatured ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif mb-6">Featured Products</h2>
              <div className="flex gap-6 overflow-hidden">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="w-[280px] flex-shrink-0">
                    <ProductSkeleton />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <HorizontalProductScroll
              title="Featured Products"
              products={availableFeaturedProducts}
              backgroundColor="#FCFBF8"
            />
          )}
        </div>
      </section>

      {/* Popular Products - Horizontal Scroll */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {isLoadingPopular ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif mb-6">Popular Products</h2>
              <div className="flex gap-6 overflow-hidden">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="w-[280px] flex-shrink-0">
                    <ProductSkeleton />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <HorizontalProductScroll
              title="Popular Products"
              products={availablePopularProducts}
              backgroundColor="#ffffff"
            />
          )}
        </div>
      </section>

      {/* Community Spotlight */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-secondary mb-8">Community Spotlight</h2>
          
          {isLoadingPosts ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : communityPosts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {communityPosts.map((post) => (
                <div key={post._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col">
                  <h4 className="font-semibold text-lg text-secondary mb-3 line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-sm text-secondary/70 mb-4 flex-1 line-clamp-3">
                    {post.content || post.description || 'Check out this post from the community.'}
                  </p>
                  <div className="flex gap-3 items-center mt-auto">
                    <Link 
                      to={`/community/post/${post._id}`} 
                      className="text-primary font-semibold text-sm hover:text-primary-dark transition-colors"
                    >
                      Read More
                    </Link>
                    {post.createdAt && (
                      <span className="text-xs text-secondary/50">
                        • {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Fallback static content when no posts are available */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col">
                <h4 className="font-semibold text-lg text-secondary mb-3">
                  From the oven: Marie's sourdough tips
                </h4>
                <p className="text-sm text-secondary/70 mb-4 flex-1">
                  A short recipe and tips on keeping your sourdough starter healthy — shared by Marie, local baker.
                </p>
                <div className="flex gap-3 items-center mt-auto">
                  <Link to="/community" className="text-primary font-semibold text-sm hover:text-primary-dark transition-colors">
                    See Story
                  </Link>
                  <span className="text-xs text-secondary/50">• 3 min read</span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col">
                <h4 className="font-semibold text-lg text-secondary mb-3">
                  Upcoming: Local craft fair
                </h4>
                <p className="text-sm text-secondary/70 mb-4 flex-1">
                  Meet artisans, sample goods, and order ahead to pick up at the event.
                </p>
                <div className="flex gap-3 items-center mt-auto">
                  <Link to="/community" className="text-primary font-semibold text-sm hover:text-primary-dark transition-colors">
                    Event Details
                  </Link>
                  <span className="text-xs text-secondary/50">• Free entry</span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col">
                <h4 className="font-semibold text-lg text-secondary mb-3">
                  How to price handmade goods
                </h4>
                <p className="text-sm text-secondary/70 mb-4 flex-1">
                  Practical tips and cost calculators to help artisans price their products fairly.
                </p>
                <div className="flex gap-3 items-center mt-auto">
                  <Link to="/community" className="text-primary font-semibold text-sm hover:text-primary-dark transition-colors">
                    Read Guide
                  </Link>
                  <span className="text-xs text-secondary/50">• 5 min read</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link 
              to="/community" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              View All Community Posts
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
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
                    src={getImageUrl(selectedProduct.image, { width: 600, height: 400, quality: 85 })}
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
                  <BuildingStorefrontIcon className="w-16 h-16 text-primary-400" />
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
                  toast.success(`Added ${quantity} ${quantity === 1 ? (product.unit || 'piece') : ((product.unit || 'piece') + 's')} to cart!`);
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
