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
import { cartService } from '../services/cartService';
import { 
  PRODUCT_CATEGORIES, 
  getPopularProducts as getPopularProductNames 
} from '../data/productReference';
import { cacheService, CACHE_KEYS, CACHE_TTL } from '../services/cacheService';
import { useOptimizedEffect, useAsyncOperation } from '../hooks/useOptimizedEffect';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);
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
          console.log('✅ Using cached featured products for instant loading');
          setFeaturedProducts(cachedFeatured);
          return;
        }
        
        const response = await getFeaturedProducts();
        
        if (response.success) {
          setFeaturedProducts(response.products || []);
          // Cache the results
          cacheService.set(CACHE_KEYS.FEATURED_PRODUCTS, response.products, CACHE_TTL.FEATURED_PRODUCTS);
        } else {
          console.error('Failed to load featured products:', response.message);
          setFeaturedProducts([]);
        }
      } catch (error) {
        console.error('Error loading featured products:', error);
        setFeaturedProducts([]);
        setError('Failed to load featured products');
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
          console.log('✅ Using cached popular products for instant loading');
          setPopularProducts(cachedPopular);
          return;
        }
        
        const response = await getPopularProducts();
        
        if (response.success) {
          setPopularProducts(response.products || []);
          // Cache the results
          cacheService.set(CACHE_KEYS.POPULAR_PRODUCTS, response.products, CACHE_TTL.POPULAR_PRODUCTS);
        } else {
          console.error('Failed to load popular products:', response.message);
          setPopularProducts([]);
          setError('Failed to load popular products');
        }
      } catch (error) {
        console.error('Error loading popular products:', error);
        setPopularProducts([]);
        setError('Failed to load popular products');
        toast.error('Failed to load popular products');
      }
    },
    []
  );

  // Load data on component mount with caching
  useOptimizedEffect(() => {
    const startTime = performance.now();
    
    // Check cache first
    const cachedFeatured = cacheService.get(CACHE_KEYS.FEATURED_PRODUCTS);
    const cachedPopular = cacheService.get(CACHE_KEYS.POPULAR_PRODUCTS);
    
    if (cachedFeatured) {
      setFeaturedProducts(cachedFeatured);
      setIsLoadingFeatured(false);
    } else {
      loadFeaturedProducts();
    }
    
    if (cachedPopular) {
      setPopularProducts(cachedPopular);
      setIsLoadingPopular(false);
    } else {
      loadPopularProducts();
    }
    
    const endTime = performance.now();
    console.log(`Home component data loading took ${(endTime - startTime).toFixed(2)}ms`);
  }, [], { skipFirstRender: false });

  // Memoized cart handler
  const handleAddToCart = useMemo(() => {
    return async () => {
      if (!selectedProduct) return;

      try {
        // Get current user ID from token
        let currentUserId = null;
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
          } catch (error) {
            console.error('Error parsing token for userId:', error);
          }
        }

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
  }, [selectedProduct, quantity]);

  // Memoized product click handler
  const handleProductClick = useMemo(() => {
    return (product) => {
      setSelectedProduct(product);
      setQuantity(1);
      setShowCartPopup(true);
    };
  }, []);

  // Memoized quantity handlers
  const handleQuantityChange = useMemo(() => {
    return (newQuantity) => {
      if (newQuantity >= 1 && newQuantity <= 99) {
        setQuantity(newQuantity);
      }
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
    setQuantity(1);
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
  const ProductCard = ({ product, showImagePreview = false }) => (
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
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-64 flex items-center justify-center bg-gray-200" style={{ display: product.image ? 'none' : 'flex' }}>
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
          {product.artisan?.artisanName || product.artisan || `${product.seller?.firstName} ${product.seller?.lastName}`}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
          <div className="flex items-center space-x-1">
            {renderStars(product.rating || 4.5)}
            <span className="text-sm text-gray-500">({product.rating || 4.5})</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Featured Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  clearFeaturedProductsCache();
                  loadFeaturedProducts();
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
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Popular Products</h2>
            <Link 
              to="/search" 
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium"
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

      {/* Local Favorites Section */}
      <section className="py-12 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Local Favorites</h2>
            <Link 
              to="/search" 
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <span>View all</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {localFavorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Close to You Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Close to You</h2>
            <Link 
              to="/search" 
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <span>View all</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {closeToYou.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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
                    {selectedProduct.artisan?.artisanName || selectedProduct.artisan || `${selectedProduct.seller?.firstName} ${selectedProduct.seller?.lastName}`}
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
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
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
