import React, { useState, useEffect, useMemo } from 'react';
import config from '../config/environment.js';
import { useSearchParams, Link } from 'react-router-dom';
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
  HeartIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getAllProducts, clearProductCache } from '../services/productService';
import { cartService } from '../services/cartService';
import enhancedSearchService from '../services/enhancedSearchService';
import ProductTypeBadge from './ProductTypeBadge';
import ProductCard from './ProductCard';
import AddToCart from './AddToCart';
import { 
  PRODUCT_CATEGORIES, 
  getAllCategories, 
  getAllSubcategories, 
  searchProducts as searchReferenceProducts 
} from '../data/productReference';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Get search parameters from URL
  const urlSearchTerm = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || '';
  const urlSubcategory = searchParams.get('subcategory') || '';
  const isNearbySearch = searchParams.get('nearby') === 'true';
  const userLat = searchParams.get('lat');
  const userLng = searchParams.get('lng');

  // Get categories and subcategories from reference data
  const categories = useMemo(() => getAllCategories(), []);
  const subcategories = useMemo(() => getAllSubcategories(), []);
  
  // Get actual categories from database products
  const actualCategories = useMemo(() => {
    const categorySet = new Set();
    if (Array.isArray(products)) {
      products.forEach(product => {
        if (product.category) {
          categorySet.add(product.category);
        }
      });
    }
    return Array.from(categorySet).sort();
  }, [products]);

  // Get available subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return subcategories.filter(sub => sub.categoryKey === selectedCategory);
  }, [selectedCategory, subcategories]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have search parameters for enhanced search
        const hasSearchParams = urlSearchTerm || urlCategory || urlSubcategory;
        const isEnhancedSearch = searchParams.get('enhanced') === 'true';
        
        let data;
        if (isNearbySearch) {
          // Handle nearby search with location parameters
          console.log('🔍 Loading nearby products with location:', { userLat, userLng });
          
          if (userLat && userLng) {
            // Use enhanced search with specific location
            const searchParams = new URLSearchParams({
              userLat: userLat,
              userLng: userLng,
              proximityRadius: '25', // 25km radius
              enhancedRanking: 'true',
              includeDistance: 'true',
              limit: '50' // Show more products for nearby search
            });
            
            const response = await fetch(`${config.BASE_URL}/api/products/enhanced-search?${searchParams.toString()}`);
            
            if (response.ok) {
              const searchData = await response.json();
              data = searchData.products || [];
              
              // Process products and add distance information
              data = data.map(product => {
                if (product.distance === null || product.distance === undefined) {
                  product.distance = 0;
                  product.formattedDistance = null;
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
              
              console.log('✅ Nearby products loaded:', data.length);
            } else {
              console.error('Failed to load nearby products');
              data = [];
            }
          } else {
            // No location provided, load all products
            console.log('⚠️ No location provided for nearby search, loading all products');
            data = await getAllProducts();
          }
        } else if (hasSearchParams && isEnhancedSearch) {
          // Use enhanced search with complex parameters
          const filters = {};
          if (urlCategory) filters.category = urlCategory;
          if (urlSubcategory) filters.subcategory = urlSubcategory;
          
          // Get user location for proximity search
          const userLocation = await enhancedSearchService.getUserLocation();
          
          const searchResults = await enhancedSearchService.searchWithFilters(
            urlSearchTerm, 
            filters, 
            userLocation
          );
          
          data = searchResults.products || searchResults;
        } else if (hasSearchParams) {
          // Use basic search
          const searchResults = await getAllProducts({
            search: urlSearchTerm,
            category: urlCategory,
            subcategory: urlSubcategory
          });
          data = searchResults;
        } else {
          // Load all products
          data = await getAllProducts();
        }
        
        // Ensure data is an array
        const productsArray = Array.isArray(data) ? data : [];
        setProducts(productsArray);
        setFilteredProducts(productsArray);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [urlSearchTerm, urlCategory, urlSubcategory, searchParams, isNearbySearch, userLat, userLng]);

  // No longer updating search parameters locally since search is handled by navbar

  // Initialize from URL parameters
  useEffect(() => {
    setSearchTerm(urlSearchTerm);
    setSelectedCategory(urlCategory);
    setSelectedSubcategory(urlSubcategory);
  }, [urlSearchTerm, urlCategory, urlSubcategory]);

  // Apply sorting to filtered products
  useEffect(() => {
    if (Array.isArray(products)) {
      let sorted = [...products];
      
      // Sort products
      switch (sortBy) {
        case 'price-low':
          sorted.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          sorted.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          sorted.sort((a, b) => (b.artisan?.rating?.average || 0) - (a.artisan?.rating?.average || 0));
          break;
        case 'newest':
          sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        default:
          // Relevance - keep original order for now
          break;
      }
      
      setFilteredProducts(sorted);
    }
  }, [products, sortBy]);

  // Handle product click
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowCartPopup(true);
    setQuantity(1);
  };

  // Handle add to cart
  const handleAddToCart = async (product, quantity) => {
    try {
      // For guest users, pass null as userId to use guest cart
      const userId = user ? user._id : null;
      await cartService.addToCart(product, quantity, userId);
      toast.success(`${quantity} ${product.name} added to cart`);
      setShowCartPopup(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Only show the specific error message, no generic fallback
      toast.error(error.message);
    }
  };

  // Close cart popup
  const closeCartPopup = () => {
    setShowCartPopup(false);
    setSelectedProduct(null);
    setQuantity(1);
  };

  // Get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
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
    
    // Handle relative paths (legacy support)
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths with leading slash (legacy support)
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    // Handle paths without leading slash (legacy support)
    return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  // Render stars
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIconSolid key={i} className="w-4 h-4 text-primary-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="w-4 h-4 text-primary-400" />);
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
      // Clear product cache and reload data to get fresh ratings
      clearProductCache();
      const loadProducts = async () => {
        try {
          setIsLoading(true);
          
          // Check if we have search parameters for enhanced search
          const hasSearchParams = urlSearchTerm || urlCategory || urlSubcategory;
          const isEnhancedSearch = searchParams.get('enhanced') === 'true';
          
          let data;
          if (isNearbySearch) {
            // Handle nearby search with location parameters
            console.log('🔍 Reloading nearby products with location:', { userLat, userLng });
            
            if (userLat && userLng) {
              // Use enhanced search with specific location
              const searchParams = new URLSearchParams({
                userLat: userLat,
                userLng: userLng,
                proximityRadius: '25', // 25km radius
                enhancedRanking: 'true',
                includeDistance: 'true',
                limit: '50' // Show more products for nearby search
              });
              
              const response = await fetch(`${config.BASE_URL}/api/products/enhanced-search?${searchParams.toString()}`);
              
              if (response.ok) {
                const searchData = await response.json();
                data = searchData.products || [];
                
                // Process products and add distance information
                data = data.map(product => {
                  if (product.distance === null || product.distance === undefined) {
                    product.distance = 0;
                    product.formattedDistance = null;
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
                
                console.log('✅ Nearby products reloaded:', data.length);
              } else {
                console.error('Failed to reload nearby products');
                data = [];
              }
            } else {
              // No location provided, load all products
              console.log('⚠️ No location provided for nearby search, loading all products');
              data = await getAllProducts();
            }
          } else if (hasSearchParams && isEnhancedSearch) {
            // Use enhanced search with complex parameters
            const filters = {};
            if (urlCategory) filters.category = urlCategory;
            if (urlSubcategory) filters.subcategory = urlSubcategory;
            
            // Get user location for proximity search
            const userLocation = await enhancedSearchService.getUserLocation();
            
            const searchResults = await enhancedSearchService.searchWithFilters(
              urlSearchTerm, 
              filters, 
              userLocation
            );
            
            data = searchResults.products || searchResults;
          } else if (hasSearchParams) {
            // Use basic search
            const searchResults = await getAllProducts({
              search: urlSearchTerm,
              category: urlCategory,
              subcategory: urlSubcategory
            });
            data = searchResults;
          } else {
            // Load all products
            data = await getAllProducts();
          }
          
          setProducts(data);
          setFilteredProducts(data);
        } catch (error) {
          console.error('Error loading products:', error);
          setProducts([]);
          setFilteredProducts([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadProducts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [urlSearchTerm, urlCategory, urlSubcategory, searchParams, isNearbySearch, userLat, userLng]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isNearbySearch ? 'Products Near You' : 
             urlSearchTerm ? `Search Results for "${urlSearchTerm}"` : 'All Products'}
          </h1>
          {isNearbySearch && (
            <p className="text-gray-600 mb-4">
              Showing products within 25km of your location
              {userLat && userLng && (
                <span className="text-sm text-gray-500 ml-2">
                  (Lat: {parseFloat(userLat).toFixed(4)}, Lng: {parseFloat(userLng).toFixed(4)})
                </span>
              )}
            </p>
          )}
          {urlSearchTerm && (
            <p className="text-lg text-gray-600">Showing results for "{urlSearchTerm}"</p>
          )}
        </div>

        <div className="w-full">
          {/* Sort Options */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </h2>
              {(urlSearchTerm || urlCategory || urlSubcategory) && (
                <p className="text-sm text-gray-600 mt-1">
                  {urlSearchTerm && `Searching for "${urlSearchTerm}"`}
                  {urlCategory && ` in ${urlCategory}`}
                  {urlSubcategory && ` - ${urlSubcategory}`}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-64 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product._id} 
                    product={product} 
                    showDistance={false}
                    showImagePreview={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedSubcategory('');
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
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
                <XMarkIcon className="h-6 w-6" />
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
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <BuildingStorefrontIcon className="w-16 h-16 text-primary-400" />
                  </div>
                )}
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
