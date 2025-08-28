import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  StarIcon,
  ShoppingCartIcon,
  EyeIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  SparklesIcon,
  FireIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getAllProducts } from '../services/productService';
import { cartService } from '../services/cartService';
import { 
  PRODUCT_CATEGORIES, 
  getAllCategories, 
  getAllSubcategories, 
  searchProducts as searchReferenceProducts 
} from '../data/productReference';
import toast from 'react-hot-toast';

export default function Search() {
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
    products.forEach(product => {
      if (product.category) {
        categorySet.add(product.category);
      }
    });
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
        const data = await getAllProducts();
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Update search parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    setSearchParams(params);
  }, [searchTerm, selectedCategory, selectedSubcategory, setSearchParams]);

  // Initialize from URL parameters
  useEffect(() => {
    setSearchTerm(urlSearchTerm);
    setSelectedCategory(urlCategory);
    setSelectedSubcategory(urlSubcategory);
  }, [urlSearchTerm, urlCategory, urlSubcategory]);

  // Filter products based on search criteria
  useEffect(() => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.subcategory?.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (selectedCategory) {
      // Check if it's a reference category key
      const categoryName = categories.find(cat => cat.key === selectedCategory)?.name;
      if (categoryName) {
        // Map reference categories to database categories
        const categoryMapping = {
          'Food & Beverages': ['Bread & Pastries', 'Bakery', 'Dairy & Eggs', 'Food & Beverages'],
          'Handmade Crafts': ['Handmade Crafts', 'Crafts', 'Art & Collectibles'],
          'Clothing & Accessories': ['Clothing & Accessories', 'Clothing', 'Accessories'],
          'Home & Garden': ['Home & Garden', 'Home', 'Garden'],
          'Beauty & Wellness': ['Beauty & Wellness', 'Beauty', 'Wellness'],
          'Art & Collectibles': ['Art & Collectibles', 'Art', 'Collectibles'],
          'Pet Supplies': ['Pet Supplies', 'Pets'],
          'Seasonal & Holiday': ['Seasonal & Holiday', 'Seasonal', 'Holiday'],
          'Toys & Games': ['Toys & Games', 'Toys', 'Games'],
          'Electronics & Tech': ['Electronics & Tech', 'Electronics', 'Tech']
        };
        
        const mappedCategories = categoryMapping[categoryName] || [categoryName];
        filtered = filtered.filter(product => 
          mappedCategories.includes(product.category) || 
          product.category === selectedCategory
        );
      } else {
        // It's a direct database category
        filtered = filtered.filter(product => product.category === selectedCategory);
      }
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      const subcategoryName = subcategories.find(sub => sub.subcategoryKey === selectedSubcategory)?.subcategoryName;
      if (subcategoryName) {
        filtered = filtered.filter(product => 
          product.subcategory === subcategoryName || product.subcategory === selectedSubcategory
        );
      }
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Relevance - keep original order for now
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, selectedSubcategory, sortBy, categories, subcategories]);

  // Handle product click
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowCartPopup(true);
    setQuantity(1);
  };

  // Handle add to cart
  const handleAddToCart = (product, quantity) => {
    try {
      cartService.addToCart(product, quantity);
      toast.success(`${quantity} ${product.name} added to cart`);
      setShowCartPopup(false);
      setSelectedProduct(null);
    } catch (error) {
      toast.error('Failed to add to cart');
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
      return imagePath;
    }
    
    if (imagePath.startsWith('/')) {
      return imagePath;
    }
    
    return `/${imagePath}`;
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
    <div className="group cursor-pointer relative" onClick={() => handleProductClick(product)}>
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
        
        {/* Image preview overlay */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300 ease-in-out">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-full p-4 shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
              <EyeIcon className="w-8 h-8 text-gray-800" />
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Products</h1>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for products, categories, or artisans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden"
                >
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Category Filter */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Category</h3>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubcategory('');
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">All Categories</option>
                    
                    {/* Reference Categories */}
                    <optgroup label="Reference Categories">
                      {categories.map(category => (
                        <option key={category.key} value={category.key}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
                    
                    {/* Actual Database Categories */}
                    {actualCategories.length > 0 && (
                      <optgroup label="Available Categories">
                        {actualCategories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Subcategory Filter */}
                {availableSubcategories.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Subcategory</h3>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">All Subcategories</option>
                      {availableSubcategories.map(subcategory => (
                        <option key={subcategory.subcategoryKey} value={subcategory.subcategoryKey}>
                          {subcategory.subcategoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort Options */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Sort By</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchTerm || selectedCategory || selectedSubcategory) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                      setSelectedSubcategory('');
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                </h2>
                {(searchTerm || selectedCategory || selectedSubcategory) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {searchTerm && `Searching for "${searchTerm}"`}
                    {selectedCategory && ` in ${categories.find(cat => cat.key === selectedCategory)?.name}`}
                    {selectedSubcategory && ` - ${subcategories.find(sub => sub.subcategoryKey === selectedSubcategory)?.subcategoryName}`}
                  </p>
                )}
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
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={getImageUrl(selectedProduct.image)}
                  alt={selectedProduct.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedProduct.artisan?.artisanName || selectedProduct.artisan}
                  </p>
                  <p className="font-bold text-gray-900">{formatPrice(selectedProduct.price)}</p>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stock Info */}
              {selectedProduct.stock !== undefined && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Stock:</span> {selectedProduct.stock} available
                  </p>
                  {selectedProduct.leadTimeHours && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Lead Time:</span> {selectedProduct.leadTimeHours} hours
                    </p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatPrice(selectedProduct.price * quantity)}
                </span>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => handleAddToCart(selectedProduct, quantity)}
                className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
