import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  StarIcon, 
  CurrencyDollarIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  TruckIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { searchProducts } from '../services/productService';
// Enhanced search service removed - using basic search functionality
import { cartService } from '../services/cartService';
import { authToken, getProfile } from '../services/authservice';
import { geocodingService } from '../services/geocodingService';
import searchTrackingService from '../services/searchTrackingService';
import DistanceBadge from './DistanceBadge';
import ProductTypeBadge from './ProductTypeBadge';
import toast from 'react-hot-toast';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState('distance'); // distance, price-low, price-high
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [productQuantities, setProductQuantities] = useState({});
  
  // Cart popup state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const categories = [
    { id: 'Bakery', name: 'Bakery', icon: '🥖' },
    { id: 'Dairy & Eggs', name: 'Dairy & Eggs', icon: '🥛' },
    { id: 'Fresh Produce', name: 'Fresh Produce', icon: '🍎' },
    { id: 'Meat & Poultry', name: 'Meat & Poultry', icon: '🍗' },
    { id: 'Honey & Jams', name: 'Honey & Jams', icon: '🍯' },
    { id: 'Herbs & Spices', name: 'Herbs & Spices', icon: '🌿' },
    { id: 'Artisan Cakes', name: 'Artisan Cakes', icon: '🎂' },
    { id: 'Small-Batch Coffee', name: 'Small-Batch Coffee', icon: '☕' },
    { id: 'Artisan Tea', name: 'Artisan Tea', icon: '🫖' },
    { id: 'Homemade Jams', name: 'Homemade Jams', icon: '🍓' },
    { id: 'Pickles & Preserves', name: 'Pickles & Preserves', icon: '🥒' },
    { id: 'Artisan Sauces', name: 'Artisan Sauces', icon: '🍅' },
    { id: 'Fresh Spices', name: 'Fresh Spices', icon: '🧂' },
    { id: 'Nuts & Seeds', name: 'Nuts & Seeds', icon: '🥜' },
    { id: 'Grains & Flour', name: 'Grains & Flour', icon: '🌾' },
    { id: 'Fresh Pasta', name: 'Fresh Pasta', icon: '🍝' },
    { id: 'Artisan Oils', name: 'Artisan Oils', icon: '🫒' },
    { id: 'Specialty Vinegars', name: 'Specialty Vinegars', icon: '🍷' },
    { id: 'Artisan Cheese', name: 'Artisan Cheese', icon: '🧀' },
    { id: 'Fresh Yogurt', name: 'Fresh Yogurt', icon: '🥛' },
    { id: 'Handmade Butter', name: 'Handmade Butter', icon: '🧈' },
    { id: 'Artisan Ice Cream', name: 'Artisan Ice Cream', icon: '🍦' },
    { id: 'Handcrafted Chocolate', name: 'Handcrafted Chocolate', icon: '🍫' },
    { id: 'Homemade Candies', name: 'Homemade Candies', icon: '🍬' },
    { id: 'Artisan Snacks', name: 'Artisan Snacks', icon: '🥨' },
    { id: 'Craft Beverages', name: 'Craft Beverages', icon: '🥤' },
    { id: 'Small-Batch Alcohol', name: 'Small-Batch Alcohol', icon: '🍺' },
    { id: 'Fresh Flowers', name: 'Fresh Flowers', icon: '🌸' },
    { id: 'Plants & Herbs', name: 'Plants & Herbs', icon: '🌱' },
    { id: 'Garden Seeds', name: 'Garden Seeds', icon: '🌱' },
    { id: 'Organic Fertilizers', name: 'Organic Fertilizers', icon: '🌿' },
    { id: 'Other', name: 'Other', icon: '📦' }
  ];

  useEffect(() => {
    getCurrentLocation();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (query || categoryParam) {
      // Track the search when component loads
      if (query) {
        searchTrackingService.trackSearch(query, categoryParam);
      }
      performSearch();
    } else {
      // If no query or category, show empty state
      setProducts([]);
      setFilteredProducts([]);
      setIsLoading(false);
    }
  }, [query, categoryParam, userLocation]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, sortBy, priceRange, selectedCategories]);

  const loadCurrentUser = async () => {
    try {
      const token = authToken.getToken();
      if (token) {
        const profile = await getProfile();
        setCurrentUserId(profile._id);
      } else {
        // For guest users, set currentUserId to null
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      setCurrentUserId(null);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🌍 Getting user location...');
      
      // First, try to get user coordinates from profile
      try {
        const userCoords = await geocodingService.getUserCoordinates();
        if (userCoords) {
          console.log('✅ Found user coordinates from profile:', userCoords);
          setUserLocation({
            lat: userCoords.latitude,
            lng: userCoords.longitude
          });
          return;
        }
      } catch (error) {
        console.log('No saved coordinates found:', error);
      }
      
      // Second, try browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ Browser geolocation successful:', position.coords);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error('❌ Browser geolocation failed:', error);
            // Try to get a default location based on common Canadian cities
            setDefaultLocation();
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        console.log('❌ Browser geolocation not supported');
        setDefaultLocation();
      }
    } catch (error) {
      console.error('❌ Error in getCurrentLocation:', error);
      setDefaultLocation();
    }
  };

  const setDefaultLocation = () => {
    // Set a default location (Toronto) and show a friendly message
    const defaultLocation = { lat: 43.6532, lng: -79.3832 }; // Toronto
    setUserLocation(defaultLocation);
    toast.success('📍 Using Toronto as default location. Add your address in profile for personalized results.');
  };

  const performSearch = async () => {
    try {
      setIsLoading(true);
      console.log('Starting enhanced search for query:', query, 'category:', categoryParam);
      
      // Check if enhanced search is requested
      const enhancedSearch = searchParams.get('enhanced') === 'true';
      const userLat = searchParams.get('lat');
      const userLng = searchParams.get('lng');
      
      let searchResponse;
      
      if (enhancedSearch) {
        // Enhanced search functionality removed - fallback to basic search
        console.log('Enhanced search requested but not available - using basic search');
        
        // Build basic search filters
        const filters = {
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          sortBy: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? 'price' : 'createdAt',
          sortOrder: sortBy === 'price-low' ? 'asc' : sortBy === 'price-high' ? 'desc' : 'desc'
        };
        
        // Add category filter from URL parameter or selected categories
        if (categoryParam && categoryParam !== 'all') {
          filters.category = categoryParam;
          setSelectedCategories([categoryParam]);
        } else if (selectedCategories.length > 0) {
          filters.category = selectedCategories[0];
        }
        
        console.log('Basic search filters (enhanced fallback):', filters);
        searchResponse = await searchProducts(query, filters);
      } else {
        // Fallback to basic search
        const filters = {
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          sortBy: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? 'price' : 'createdAt',
          sortOrder: sortBy === 'price-low' ? 'asc' : sortBy === 'price-high' ? 'desc' : 'desc'
        };
        
        if (categoryParam && categoryParam !== 'all') {
          filters.category = categoryParam;
          setSelectedCategories([categoryParam]);
        } else if (selectedCategories.length > 0) {
          filters.category = selectedCategories[0];
        }
        
        console.log('Basic search filters:', filters);
        searchResponse = await searchProducts(query, filters);
      }
      
      // Handle response format
      const searchResults = searchResponse.products || searchResponse;
      
      console.log('Search results:', searchResults);
      
      // Add distance calculation if user location is available
      const productsWithDistance = searchResults.map(product => {
        let distance = null;
        let formattedDistance = null;
        
        if (userLocation && product.artisan?.coordinates) {
          // Use geocoding service for distance calculation
          distance = geocodingService.calculateDistanceBetween(
            { latitude: userLocation.lat, longitude: userLocation.lng },
            product.artisan.coordinates
          );
          
          if (distance !== null) {
            formattedDistance = geocodingService.formatDistance(distance);
          }
        }
        
        return { 
          ...product, 
          distance,
          formattedDistance
        };
      });

      setProducts(productsWithDistance);
      
      // Log search metadata for debugging
      if (searchResponse.searchMetadata) {
        console.log('Search Metadata:', searchResponse.searchMetadata);
        console.log('Enhanced Ranking:', searchResponse.searchMetadata.enhancedRanking);
        console.log('User Location:', searchResponse.searchMetadata.userLocation);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      toast.error(`Failed to search products: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply price filter
    filtered = filtered.filter(product => 
      product.price >= priceRange.min && product.price <= priceRange.max
    );

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product =>
        selectedCategories.includes(product.category)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Distance formatting is now handled by geocodingService.formatDistance()

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
      return imagePath;
    }
    
    // Handle paths that need /uploads prefix
    if (imagePath.startsWith('/')) {
      return imagePath;
    }
    
    // Handle paths without leading slash
    return `/${imagePath}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowCartPopup(true);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setProductQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  const getProductQuantity = (productId) => {
    return productQuantities[productId] || 1;
  };

  // Cart popup functionality
  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    try {
      // Use cartService to add to cart
      await cartService.addToCart(selectedProduct, quantity, currentUserId);
      
      toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart`);
      setShowCartPopup(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.message.includes('Artisans cannot add products to cart')) {
        toast.error('Artisans cannot add products to cart. You are a seller, not a buyer.');
      } else {
        toast.error('Failed to add item to cart');
      }
    }
  };

  const handlePopupQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= selectedProduct.stock) {
      setQuantity(newQuantity);
    }
  };

  const closeCartPopup = () => {
    setShowCartPopup(false);
    setSelectedProduct(null);
    setQuantity(1);
  };

  const handleAddToCartInline = async (product, event) => {
    event.stopPropagation(); // Prevent product click
    
    if (!product.seller?._id) {
      toast.error('Cannot add product: Missing seller information');
      return;
    }

    const quantity = getProductQuantity(product._id);
    
    // Check if quantity exceeds available stock
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} items available in stock`);
      return;
    }

    setAddingToCart(prev => ({ ...prev, [product._id]: true }));

    try {
      // For guest users, pass null as userId to use guest cart
      await cartService.addToCart(product, quantity, currentUserId);
      toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart!`);
      
      // Reset quantity after successful add
      setProductQuantities(prev => ({
        ...prev,
        [product._id]: 1
      }));
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.message.includes('Artisans cannot add products to cart')) {
        toast.error('Artisans cannot add products to cart. You are a seller, not a buyer.');
      } else {
        toast.error('Failed to add item to cart');
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [product._id]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Local Community Results for "{query}"
              </h1>
              <p className="text-slate-600 mt-1">
                {filteredProducts.length} local product{filteredProducts.length !== 1 ? 's' : ''} found from your neighbors
              </p>
            </div>
            
            {/* Sort and Filter Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-amber-200 rounded-lg hover:bg-amber-50"
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Filters</span>
              </button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="distance">Sort by Distance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                
                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-600">Min Price</label>
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Max Price</label>
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 1000 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">
                          {category.icon} {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or filters
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                >
                  Back to Discover
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="product-card hover:shadow-lg transition-shadow duration-300"
                    onClick={() => handleProductClick(product)}
                    title="Select this artisan product"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-100 group">
                      {product.image ? (
                        <img
                          src={product.image.startsWith('http') ? product.image : product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-t-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full flex items-center justify-center" style={{ display: product.image ? 'none' : 'flex' }}>
                        <span className="text-4xl">📦</span>
                      </div>
                      
                      {/* Artisan product overlay */}
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300 ease-in-out">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-amber-600 rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
                            <HeartIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Community Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.distance && (
                          <DistanceBadge 
                            distance={product.distance} 
                            formattedDistance={product.formattedDistance}
                            showIcon={false}
                          />
                        )}
                        <div className="badge-local">
                          Local Business
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">
                        {product.name}
                      </h3>
                      
                      <p className="text-sm text-emerald-600 mb-2">
                        by {product.artisan?.artisanName ? product.artisan.artisanName : (product.seller?.firstName ? `${product.seller.firstName} ${product.seller.lastName}` : 'Unknown Artisan')}
                        {product.artisan?.type && (
                          <span className="text-gray-500 ml-1">
                            • {product.artisan.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                      </p>
                      
                      {/* Distance Information */}
                      {product.distance && (
                        <div className="mb-2">
                          <DistanceBadge 
                            distance={product.distance} 
                            formattedDistance={product.formattedDistance}
                          />
                        </div>
                      )}
                      
                      <p className="text-slate-700 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      
                      {/* Product Type Information */}
                      <div className="mb-3">
                        <ProductTypeBadge product={product} variant="compact" />
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-emerald-600">
                          ${product.price}
                        </span>
                        <span className="text-sm text-slate-500">
                          per {product.unit}
                        </span>
                      </div>

                      {/* Community Badges */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="badge-local">Local</span>
                        {product.isOrganic && <span className="badge-organic">Organic</span>}
                        {product.isHandmade && <span className="badge-handmade">Handmade</span>}
                        {product.tags && product.tags.length > 0 && (
                          <>
                            {product.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {product.tags.length > 2 && (
                              <span className="text-xs text-slate-500">
                                +{product.tags.length - 2} more
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Availability */}
                      <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                        <span>
                          {product.stock} available
                        </span>
                        <span className="flex items-center">
                          <TruckIcon className="w-4 h-4 mr-1" />
                          {product.leadTimeHours <= 24 ? 'Same day pickup' : `${product.leadTimeHours}h lead time`}
                        </span>
                      </div>

                      {/* Quantity Selector and Add to Cart */}
                      <div className="space-y-3">
                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Quantity:</label>
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentQty = getProductQuantity(product._id);
                                if (currentQty > 1) {
                                  handleQuantityChange(product._id, currentQty - 1);
                                }
                              }}
                              className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                              disabled={getProductQuantity(product._id) <= 1}
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-gray-900 font-medium min-w-[2rem] text-center">
                              {getProductQuantity(product._id)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentQty = getProductQuantity(product._id);
                                if (currentQty < product.stock) {
                                  handleQuantityChange(product._id, currentQty + 1);
                                }
                              }}
                              className="px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                              disabled={getProductQuantity(product._id) >= product.stock}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          onClick={(e) => handleAddToCartInline(product, e)}
                          disabled={addingToCart[product._id] || !product.seller?._id}
                          className="w-full btn-primary py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {addingToCart[product._id] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <ShoppingCartIcon className="w-4 h-4 mr-2" />
                              Quick Add to Cart
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Popup */}
      {showCartPopup && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add to Cart</h3>
              <button
                onClick={closeCartPopup}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-6">
              <div className="flex space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center hidden">
                    <BuildingStorefrontIcon className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">
                    {selectedProduct.artisan?.artisanName || `${selectedProduct.seller?.firstName} ${selectedProduct.seller?.lastName}`}
                  </p>
                  <div className="text-xl font-bold text-amber-600">{formatPrice(selectedProduct.price)}</div>
                </div>
              </div>

              {/* Stock and Lead Time Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock Available:</span>
                  <span className={`text-sm font-medium ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedProduct.stock} {selectedProduct.unit || 'piece'}
                    {selectedProduct.stock > 0 ? '' : ' (Out of Stock)'}
                  </span>
                </div>
                
                {selectedProduct.leadTimeHours && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Lead Time:</span>
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {selectedProduct.leadTimeHours} hours
                    </div>
                  </div>
                )}

                {selectedProduct.isOrganic && (
                  <div className="flex items-center text-sm text-green-600">
                    <SparklesIcon className="w-4 h-4 mr-1" />
                    Organic Product
                  </div>
                )}

                {selectedProduct.isGlutenFree && (
                  <div className="flex items-center text-sm text-blue-600">
                    Gluten-Free
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                                                onClick={() => handlePopupQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                  <button
                                                onClick={() => handlePopupQuantityChange(quantity + 1)}
                    disabled={quantity >= selectedProduct.stock}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                {quantity >= selectedProduct.stock && selectedProduct.stock > 0 && (
                  <p className="text-sm text-amber-600 mt-1">Maximum available quantity reached</p>
                )}
              </div>

              {/* Total Price */}
              <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total:</span>
                <span className="text-lg font-bold text-amber-600">
                  {formatPrice(selectedProduct.price * quantity)}
                </span>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={selectedProduct.stock <= 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5 mr-2" />
                {selectedProduct.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

