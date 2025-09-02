import React, { useState, useEffect, useMemo } from 'react';
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
        if (hasSearchParams && isEnhancedSearch) {
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
  }, [urlSearchTerm, urlCategory, urlSubcategory, searchParams]);

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
      if (error.message.includes('Artisans cannot add products to cart')) {
        toast.error('Artisans cannot add products to cart. You are a seller, not a buyer.');
      } else {
        toast.error('Failed to add to cart');
      }
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
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
    if (imagePath.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${imagePath}`;
    }
    
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
      stars.push(<StarIconSolid key={i} className="w-4 h-4 text-amber-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarIcon key="half" className="w-4 h-4 text-amber-400" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarIcon key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    return stars;
  };

  // Product card component
  const ProductCard = ({ product }) => (
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
        
        {/* Artisan product overlay */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300 ease-in-out">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-amber-600 rounded-full p-4 shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
              <HeartIcon className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isOrganic && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <SparklesIcon className="h-3 w-3 inline mr-1" />
              Organic
            </span>
          )}
          {product.isGlutenFree && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Gluten-Free
            </span>
          )}
        </div>

        {/* Popular badge */}
        {product.stock < 10 && product.stock > 0 && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 flex items-center">
              <FireIcon className="h-3 w-3 mr-1" />
              Popular
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <h3 className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500">
          {product.artisan?.artisanName || `${product.seller?.firstName} ${product.seller?.lastName}`}
        </p>
        
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
      // Clear product cache and reload data to get fresh ratings
      clearProductCache();
      const loadProducts = async () => {
        try {
          setIsLoading(true);
          
          // Check if we have search parameters for enhanced search
          const hasSearchParams = urlSearchTerm || urlCategory || urlSubcategory;
          const isEnhancedSearch = searchParams.get('enhanced') === 'true';
          
          let data;
          if (hasSearchParams && isEnhancedSearch) {
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
  }, [urlSearchTerm, urlCategory, urlSubcategory, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Results</h1>
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
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
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
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
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
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <BuildingStorefrontIcon className="w-16 h-16 text-amber-400" />
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
