import React, { useState, useEffect, useMemo } from 'react';
import config from '../config/environment.js';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  StarIcon,
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  SparklesIcon,
  FireIcon,
  PlusIcon,
  HeartIcon,
  TruckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getAllProducts, clearProductCache } from '../services/productService';
import { cartService } from '../services/cartService';
import { authToken, getProfile } from '../services/authservice';
import { geocodingService } from '../services/geocodingService';
import searchTrackingService from '../services/searchTrackingService';
import { promotionalService } from '../services/promotionalService';
import enhancedSearchService from '../services/enhancedSearchService';

import ProductTypeBadge from './ProductTypeBadge';
import ProductCard from './ProductCard';
import AddToCart from './AddToCart';
import InventoryModel from '../models/InventoryModel';
import toast from 'react-hot-toast';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState({});

  // Cart popup state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Helper function to filter out out-of-stock products
  const filterInStockProducts = (products) => {
    return products.filter(product => {
      const inventoryModel = new InventoryModel(product);
      const outOfStockStatus = inventoryModel.getOutOfStockStatus();
      return !outOfStockStatus.isOutOfStock;
    });
  };

  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const subcategoryParam = searchParams.get('subcategory') || '';
  const autoSearch = searchParams.get('autoSearch') === 'true';

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
    if (query || categoryParam || subcategoryParam) {
      // Track the search when component loads
      if (query) {
        searchTrackingService.trackSearch(query, categoryParam || subcategoryParam);
      }
      performSearch();
    } else {
      // If no query or category, show empty state
      setProducts([]);
      setFilteredProducts([]);
      setIsLoading(false);
    }
  }, [query, categoryParam, subcategoryParam, userLocation]);

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
      // First, try to get user coordinates from profile
      try {
        const userCoords = await geocodingService.getUserCoordinates();
        if (userCoords) {
          setUserLocation({
            lat: userCoords.latitude,
            lng: userCoords.longitude
          });
          return;
        }
      } catch (error) {
        // User coordinates not available from profile
      }

      // Fallback to browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            // Set default location (can be updated later)
            setUserLocation({ lat: 40.7128, lng: -74.0060 }); // NYC default
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        setUserLocation({ lat: 40.7128, lng: -74.0060 }); // NYC default
      }
    } catch (error) {
      setUserLocation({ lat: 40.7128, lng: -74.0060 }); // NYC default
    }
  };

  const performSearch = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Performing search for:', query, 'category:', categoryParam, 'subcategory:', subcategoryParam, 'autoSearch:', autoSearch);
      
      let searchResults;
      
      if (subcategoryParam && categoryParam) {
        // Enhanced subcategory search with complex prioritization
        try {
          console.log('🎯 Using enhanced subcategory search');
          const subcategory = {
            id: subcategoryParam,
            name: subcategoryParam.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            categoryKey: categoryParam,
            icon: '🌟'
          };
          
          const enhancedResults = await enhancedSearchService.searchBySubcategory(subcategory, userLocation);
          searchResults = enhancedResults.products || [];
          
          console.log('✨ Enhanced subcategory search results:', searchResults.length, 'products');
        } catch (error) {
          console.log('⚠️ Enhanced subcategory search failed, falling back to regular search:', error);
          searchResults = await getAllProducts({ category: categoryParam, subcategory: subcategoryParam });
        }
      } else if (query) {
        // Search by query - try promotional service first, then fallback to regular service
        try {
          const promotionalResults = await promotionalService.getPremiumShowcaseProducts(20, userLocation);
          if (promotionalResults && promotionalResults.length > 0) {
            // Filter promotional results by search query
            const filteredPromotional = promotionalResults.filter(product => 
              product.name.toLowerCase().includes(query.toLowerCase()) ||
              product.description.toLowerCase().includes(query.toLowerCase()) ||
              product.category.toLowerCase().includes(query.toLowerCase())
            );
            if (filteredPromotional.length > 0) {
              searchResults = filteredPromotional;
            } else {
              searchResults = await getAllProducts({ search: query });
            }
          } else {
            searchResults = await getAllProducts({ search: query });
          }
        } catch (error) {
          console.log('⚠️ Promotional search failed, falling back to regular search');
          searchResults = await getAllProducts({ search: query });
        }
      } else if (categoryParam) {
        // Search by category - try promotional service first, then fallback to regular service
        try {
          const promotionalResults = await promotionalService.getPremiumShowcaseProducts(20, userLocation);
          if (promotionalResults && promotionalResults.length > 0) {
            // Filter promotional results by category
            const filteredPromotional = promotionalResults.filter(product => 
              product.category.toLowerCase().includes(categoryParam.toLowerCase()) ||
              product.subcategory.toLowerCase().includes(categoryParam.toLowerCase())
            );
            if (filteredPromotional.length > 0) {
              searchResults = filteredPromotional;
            } else {
              searchResults = await getAllProducts({ category: categoryParam });
            }
          } else {
            searchResults = await getAllProducts({ category: categoryParam });
          }
        } catch (error) {
          console.log('⚠️ Promotional category search failed, falling back to regular search');
          searchResults = await getAllProducts({ category: categoryParam });
        }
      } else {
        // Get all products - try promotional service first, then fallback to regular service
        try {
          const promotionalResults = await promotionalService.getPremiumShowcaseProducts(20, userLocation);
          if (promotionalResults && promotionalResults.length > 0) {
            searchResults = promotionalResults;
          } else {
            searchResults = await getAllProducts();
          }
        } catch (error) {
          console.log('⚠️ Promotional all products search failed, falling back to regular search');
          searchResults = await getAllProducts();
        }
      }

      console.log('📦 Search results:', searchResults?.length || 0, 'products');

      if (Array.isArray(searchResults)) {
        // Process and filter results
        const processedProducts = searchResults
          .filter(product => product && product._id) // Ensure valid products
          .map(product => ({
            ...product,
            distance: calculateDistance(product),
            formattedDistance: formatDistance(calculateDistance(product))
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

        setProducts(processedProducts);
        // Filter out out-of-stock products for search results
        const inStockProducts = filterInStockProducts(processedProducts);
        setFilteredProducts(inStockProducts);
      } else {
        console.log('⚠️ Search results not in expected format:', searchResults);
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      toast.error('Failed to search products');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (product) => {
    if (!userLocation || !product.location) return null;
    
    try {
      const productLat = product.location.coordinates?.[1] || product.location.lat;
      const productLng = product.location.coordinates?.[0] || product.location.lng;
      
      if (!productLat || !productLng) return null;
      
      const R = 6371; // Earth's radius in km
      const dLat = (productLat - userLocation.lat) * Math.PI / 180;
      const dLng = (productLng - userLocation.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(productLat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return '';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    if (distance < 10) return `${distance.toFixed(1)}km`;
    return `${Math.round(distance)}km`;
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        selectedCategories.includes(product.category)
      );
    }

    // Apply price filter
    filtered = filtered.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'distance':
        filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Keep existing order (usually relevance)
        break;
    }

    // Also filter out out-of-stock products
    const inStockFiltered = filterInStockProducts(filtered);
    setFilteredProducts(inStockFiltered);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowCartPopup(true);
    setQuantity(1);
  };

  const closeCartPopup = () => {
    setShowCartPopup(false);
    setSelectedProduct(null);
    setQuantity(1);
  };


  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              {subcategoryParam && categoryParam ? (
                <>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {subcategoryParam.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Products
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {filteredProducts.length} {autoSearch ? 'handpicked' : 'local'} product{filteredProducts.length !== 1 ? 's' : ''} found
                    {autoSearch && <span className="text-primary font-medium"> • Auto-selected for you</span>}
                  </p>
                </>
              ) : query ? (
                <>
                  <h1 className="text-2xl font-bold text-slate-800">
                    Search Results for "{query}"
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {filteredProducts.length} local product{filteredProducts.length !== 1 ? 's' : ''} found from your neighbors
                  </p>
                </>
              ) : categoryParam ? (
                <>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {categoryParam.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Products
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {filteredProducts.length} {autoSearch ? 'handpicked' : 'local'} product{filteredProducts.length !== 1 ? 's' : ''} found
                    {autoSearch && <span className="text-primary font-medium"> • Auto-selected for you</span>}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-800">
                    All Products
                  </h1>
                  <p className="text-slate-600 mt-1">
                    {filteredProducts.length} local product{filteredProducts.length !== 1 ? 's' : ''} available
                  </p>
                </>
              )}
            </div>
            
            {/* Sort and Filter Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-primary-200 rounded-lg hover:bg-primary-50"
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Filters</span>
              </button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="distance">Sort by Distance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-primary-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(c => c !== category.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{category.icon} {category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">$0</span>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">${priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setPriceRange([0, 1000]);
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                showDistance={!!product.formattedDistance}
                showRating={true}
                showImagePreview={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500">
              {query ? `No products found for "${query}"` : 'Try adjusting your search criteria'}
            </p>
          </div>
        )}
      </div>

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
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
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
                  setShowCartPopup(false);
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
    </div>
  );
}

