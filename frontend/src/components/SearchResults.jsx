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
  TruckIcon
} from '@heroicons/react/24/outline';
import { searchProducts } from '../services/productService';
import enhancedSearchService from '../services/enhancedSearchService';
import { cartService } from '../services/cartService';
import { authToken, getProfile } from '../services/authService';
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
      const location = await enhancedSearchService.getUserLocation();
      if (location) {
        setUserLocation({
          lat: location.latitude,
          lng: location.longitude
        });
      } else {
        // Default to a fallback location (e.g., city center)
        setUserLocation({ lat: 45.5017, lng: -73.5673 }); // Montreal coordinates
        toast.error('Unable to get your location. Showing results from default area.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      // Default to a fallback location
      setUserLocation({ lat: 45.5017, lng: -73.5673 });
      toast.error('Location services not available. Showing results from default area.');
    }
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
        // Use enhanced search service
        const userLocation = userLat && userLng ? {
          latitude: parseFloat(userLat),
          longitude: parseFloat(userLng)
        } : await enhancedSearchService.getUserLocation();
        
        // Build enhanced search filters
        const filters = {
          minPrice: priceRange.min,
          maxPrice: priceRange.max
        };
        
        // Add category filter from URL parameter or selected categories
        if (categoryParam && categoryParam !== 'all') {
          filters.category = categoryParam;
          setSelectedCategories([categoryParam]);
        } else if (selectedCategories.length > 0) {
          filters.category = selectedCategories[0];
        }
        
        console.log('Enhanced search filters:', filters);
        console.log('User location for enhanced search:', userLocation);
        
        // Use enhanced search service
        searchResponse = await enhancedSearchService.searchWithFilters(query, filters, userLocation);
        
        console.log('Enhanced search response:', searchResponse);
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
        if (userLocation && product.artisan?.location?.coordinates) {
          distance = enhancedSearchService.calculateDistance(
            userLocation.lat || userLocation.latitude,
            userLocation.lng || userLocation.longitude,
            product.artisan.location.coordinates[1], // latitude
            product.artisan.location.coordinates[0]  // longitude
          );
        }
        return { ...product, distance };
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

  const formatDistance = (distance) => {
    if (distance === null) return 'Distance unknown';
    if (distance < 1) return `${Math.round(distance * 1000)}m away`;
    return `${distance.toFixed(1)}km away`;
  };

  const handleProductClick = (product) => {
    if (product.seller?._id) {
                      navigate(`/artisan/${product.seller._id}?product=${product._id}`);
    } else {
      // Fallback to product details page if no seller info
      navigate(`/product/${product._id}`);
    }
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

  const handleAddToCart = async (product, event) => {
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
      toast.error('Failed to add item to cart');
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
                    className="product-card"
                    onClick={() => handleProductClick(product)}
                  >
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-100">
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
                      
                      {/* Community Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <div className="badge-local">
                          <MapPinIcon className="w-3 h-3 inline mr-1" />
                          {formatDistance(product.distance)}
                        </div>
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
                      
                      <p className="text-slate-700 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      
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
                          onClick={(e) => handleAddToCart(product, e)}
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
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                              </svg>
                              Add {getProductQuantity(product._id)} to Cart
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
    </div>
  );
}

