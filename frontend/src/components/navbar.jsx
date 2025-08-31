import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import OptimizedLink from "./OptimizedLink";
import { 
  ShoppingBagIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { cartService } from "../services/cartService";
import { guestService } from "../services/guestService";
import enhancedSearchService from "../services/enhancedSearchService";
import { getAllCategories, getAllSubcategories, PRODUCT_CATEGORIES } from "../data/productReference";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cacheService";
import { useOptimizedEffect, useDebounce } from "../hooks/useOptimizedEffect";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPopularSearches, setShowPopularSearches] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoize categories to prevent unnecessary re-renders
  const categories = useMemo(() => {
    return getAllCategories();
  }, []);

  const subcategories = useMemo(() => {
    return getAllSubcategories();
  }, []);

  // Update cart count when user changes
  useOptimizedEffect(() => {
    if (user) {
      setIsGuest(guestService.isGuestUser());
      
      // Cache cart count for authenticated users
      const cartCountKey = `cart_count_${user._id}`;
      let cachedCartCount = cacheService.get(cartCountKey);
      if (cachedCartCount === null) {
        cachedCartCount = cartService.getCartCount(user._id);
        cacheService.set(cartCountKey, cachedCartCount, CACHE_TTL.CART_COUNT);
      }
      console.log('🛒 Navbar: Setting cart count for user:', { userId: user._id, count: cachedCartCount });
      setCartCount(cachedCartCount);
    } else {
      // For guest users, always get fresh cart count
      setIsGuest(true);
      const guestCartCount = cartService.getCartCount(null);
      console.log('🛒 Navbar: Setting cart count for guest:', { count: guestCartCount });
      setCartCount(guestCartCount);
    }
  }, [user]);

  // Optimized cart count update
  useOptimizedEffect(() => {
    if (user?._id) {
      const cartCountKey = `cart_count_${user._id}`;
      const cachedCartCount = cacheService.get(cartCountKey);
      if (cachedCartCount !== null) {
        setCartCount(cachedCartCount);
      } else {
        const newCartCount = cartService.getCartCount(user._id);
        cacheService.set(cartCountKey, newCartCount, CACHE_TTL.CART_COUNT);
        setCartCount(newCartCount);
      }
    } else {
      // For guest users, always get fresh cart count
      const guestCartCount = cartService.getCartCount(null);
      setCartCount(guestCartCount);
    }
  }, [user?._id], { debounceMs: 200 });

  // Optimized search with debouncing
  useOptimizedEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      // Cache search results
      const searchCacheKey = `search_${debouncedSearchQuery}_${selectedCategory}`;
      const cachedResults = cacheService.get(searchCacheKey);
      
      if (!cachedResults) {
        // Preload search results in background
        enhancedSearchService.search(debouncedSearchQuery, selectedCategory)
          .then(results => {
            cacheService.set(searchCacheKey, results, 5 * 60 * 1000); // 5 minutes
          })
          .catch(error => {
            console.error('Search preload error:', error);
          });
      }
    }
  }, [debouncedSearchQuery, selectedCategory], { debounceMs: 300 });

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = (event) => {
      const { userId, count } = event.detail;
      console.log('🛒 Navbar received cart update:', { userId, count, currentUser: user?._id });
      
      // Update cart count if it's for the current user or guest
      if ((user && userId === user._id) || (!user && userId === null)) {
        console.log('🛒 Updating cart count to:', count);
        setCartCount(count);
        
        // Clear cache for authenticated users
        if (user?._id) {
          const cartCountKey = `cart_count_${user._id}`;
          cacheService.delete(cartCountKey);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [user]);

  // Memoized search handler
  const handleSearch = useMemo(() => {
    return (e) => {
      e.preventDefault();
      const query = searchQuery.trim();
      const category = selectedSubcategory ? selectedSubcategory.id : selectedCategory;
      
      if (query || category !== 'all') {
        const searchParams = new URLSearchParams();
        if (query) searchParams.append('q', query);
        if (category !== 'all') searchParams.append('category', category);
        navigate(`/search?${searchParams.toString()}`);
      }
    };
  }, [searchQuery, selectedCategory, selectedSubcategory, navigate]);

  // Memoized category change handler
  const handleCategoryChange = useMemo(() => {
    return (category) => {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
      setShowCategoryDropdown(false);
      
      // Show subcategory dropdown if category has subcategories
      if (category !== 'all' && getSubcategoriesForCategory(category).length > 0) {
        setShowSubcategoryDropdown(true);
      } else {
        setShowSubcategoryDropdown(false);
      }
    };
  }, []);

  // Memoized subcategory change handler
  const handleSubcategoryChange = useMemo(() => {
    return (subcategory) => {
      setSelectedSubcategory(subcategory);
      setShowCategoryDropdown(false);
      setShowSubcategoryDropdown(false);
    };
  }, []);

  // Clear category selection
  const clearCategorySelection = useMemo(() => {
    return () => {
      setSelectedCategory('all');
      setSelectedSubcategory(null);
      setShowCategoryDropdown(false);
      setShowSubcategoryDropdown(false);
    };
  }, []);

  // Handle popular search selection
  const handlePopularSearch = useMemo(() => {
    return (searchTerm) => {
      setSearchQuery(searchTerm);
      setShowPopularSearches(false);
      // Navigate to search with the popular search term
      const category = selectedSubcategory ? selectedSubcategory.id : selectedCategory;
      const searchParams = new URLSearchParams();
      searchParams.append('q', searchTerm);
      if (category !== 'all') searchParams.append('category', category);
      navigate(`/search?${searchParams.toString()}`);
    };
  }, [selectedCategory, selectedSubcategory, navigate]);

  // Memoized logout handler
  const handleLogout = useMemo(() => {
    return () => {
      logout();
      navigate("/");
    };
  }, [logout, navigate]);

  // Memoized mobile menu toggle
  const toggleMobileMenu = useMemo(() => {
    return () => {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    };
  }, [isMobileMenuOpen]);

  // Memoized category dropdown toggle
  const toggleCategoryDropdown = useMemo(() => {
    return () => {
      setShowCategoryDropdown(!showCategoryDropdown);
      if (showCategoryDropdown) {
        setShowSubcategoryDropdown(false);
      }
    };
  }, [showCategoryDropdown]);

  // Memoized popular searches toggle
  const togglePopularSearches = useMemo(() => {
    return () => {
      setShowPopularSearches(!showPopularSearches);
    };
  }, [showPopularSearches]);

  // Helper function to get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryKey) => {
    if (categoryKey === 'all') return [];
    const category = PRODUCT_CATEGORIES[categoryKey];
    if (!category || !category.subcategories) return [];
    
    return Object.keys(category.subcategories).map(subcategoryKey => ({
      id: subcategoryKey,
      name: category.subcategories[subcategoryKey].name,
      icon: category.subcategories[subcategoryKey].icon,
      categoryKey: categoryKey
    }));
  };

  // Product Categories from reference data only
  const productCategories = [
    { id: 'all', name: 'All Products', icon: '🌟', description: 'Search across all categories' },
    ...categories.map(category => ({
      id: category.key,
      name: category.name,
      icon: category.icon,
      description: category.description || `Search ${category.name.toLowerCase()}`
    }))
  ];

  // Popular searches
  const popularSearches = [
    'fresh eggs', 'sourdough bread', 'maple syrup', 'organic honey', 
    'artisan cheese', 'fresh herbs', 'homemade pasta', 'farm vegetables'
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowCategoryDropdown(false);
        setShowSubcategoryDropdown(false);
        setShowPopularSearches(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowCategoryDropdown(false);
        setShowSubcategoryDropdown(false);
        setShowPopularSearches(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <nav className="bg-white shadow-lg border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <OptimizedLink to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">The Bazaar</span>
          </OptimizedLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 ml-12">
            <OptimizedLink to="/" className="nav-link">
              Home
            </OptimizedLink>
              <OptimizedLink to="/find-artisans" className="nav-link">
                Find Artisan
              </OptimizedLink>
            <Link to="/community" className="nav-link">
              Community
            </Link>
          </div>

          {/* Enhanced Search Bar with Category Dropdown */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8 search-container">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <div className="flex">
                  {/* Category Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleCategoryDropdown}
                      className={`flex items-center space-x-2 px-4 py-2 border border-r-0 border-gray-300 rounded-l-full transition-colors min-w-[140px] ${
                        selectedCategory !== 'all' || selectedSubcategory 
                          ? 'bg-amber-50 border-amber-300 hover:bg-amber-100' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">
                        {selectedSubcategory ? selectedSubcategory.icon : 
                         selectedCategory === 'all' ? '🌟' : 
                         categories.find(c => c.key === selectedCategory)?.icon || '🌟'}
                      </span>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {selectedSubcategory ? selectedSubcategory.name : 
                         selectedCategory === 'all' ? 'All Products' : 
                         categories.find(c => c.key === selectedCategory)?.name || 'All Products'}
                      </span>
                      <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    </button>
                    
                    {/* Clear selection button */}
                    {(selectedCategory !== 'all' || selectedSubcategory) && (
                      <button
                        type="button"
                        onClick={clearCategorySelection}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        title="Clear selection"
                      >
                        ×
                      </button>
                    )}
                    
                    {/* Main Categories Dropdown */}
                    {showCategoryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        {productCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryChange(category.id)}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-lg">{category.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-gray-700">{category.name}</div>
                              <div className="text-xs text-gray-500">{category.description}</div>
                            </div>
                            {category.id !== 'all' && getSubcategoriesForCategory(category.id).length > 0 && (
                              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Subcategory Dropdown - appears when main category is selected */}
                  {showSubcategoryDropdown && selectedCategory !== 'all' && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                      {/* Back to main categories */}
                      <button
                        onClick={() => {
                          setShowSubcategoryDropdown(false);
                          setShowCategoryDropdown(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
                      >
                        <span className="text-lg">←</span>
                        <span className="text-sm font-medium text-gray-700">Back to Categories</span>
                      </button>
                      
                      {/* Category header */}
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{categories.find(c => c.key === selectedCategory)?.icon}</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {categories.find(c => c.key === selectedCategory)?.name}
                          </span>
                        </div>
                      </div>
                      
                      {/* Subcategories */}
                      {getSubcategoriesForCategory(selectedCategory).map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => handleSubcategoryChange(subcategory)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors pl-8"
                        >
                          <span className="text-lg">{subcategory.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{subcategory.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Search Input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={togglePopularSearches}
                    placeholder="Search for anything from local artisans..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-r-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                </div>
                
                {/* Popular Searches Dropdown */}
                {showPopularSearches && searchQuery === '' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Popular searches:</p>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((search) => (
                          <button
                            key={search}
                            onClick={() => handlePopularSearch(search)}
                            className="px-3 py-1 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-700 rounded-full text-sm transition-colors"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Cart - Available for all users except artisans */}
            {(!user || user?.role !== 'artisan') && (
              <Link to="/cart" className="relative p-2 text-stone-700 hover:text-amber-600 transition-colors duration-300">
                <ShoppingBagIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Sign In / User Menu */}
            {!isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-700 hover:text-amber-600 transition-colors text-sm font-medium">
                  Sign In
                </Link>
                <Link to="/register" className="bg-amber-600 text-white px-4 py-2 rounded-full hover:bg-amber-700 transition-colors text-sm font-medium">
                  Join Now
                </Link>
              </div>
            ) : (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-stone-700 hover:text-amber-600 transition-colors duration-300">
                  <UserIcon className="w-6 h-6" />
                  <span className="hidden sm:block text-sm font-medium">
                    {isGuest ? 'Guest Checkout' : 'My Account'}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {!isGuest && (
                    <>
                      {/* Admin Dashboard Link */}
                      {user?.role === 'admin' && (
                        <>
                          <Link to="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                            Admin Dashboard
                          </Link>
                          <hr className="my-2 border-stone-200" />
                        </>
                      )}
                      {user?.role !== 'admin' && (
                        <>
                          {user?.role === 'artisan' && (
                            <>
                              <Link to="/dashboard" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                Dashboard
                              </Link>
                              <Link to="/profile" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                My Profile
                              </Link>
                              <Link to="/products" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                My Products
                              </Link>
                              <Link to="/orders" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                My Orders
                              </Link>
                            </>
                          )}
                          {user?.role !== 'artisan' && (
                            <>
                              <Link to="/profile" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                My Profile
                              </Link>
                              <Link to="/orders" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                My Orders
                              </Link>
                            </>
                          )}
                        </>
                      )}
                      <hr className="my-2 border-stone-200" />
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    {isGuest ? 'Clear Session' : 'Sign Out'}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-stone-700 hover:text-amber-600 transition-colors duration-300"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden py-4 search-container">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <div className="flex">
                {/* Mobile Category Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleCategoryDropdown}
                    className={`flex items-center space-x-2 px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg text-sm ${
                      selectedCategory !== 'all' || selectedSubcategory 
                        ? 'bg-amber-50 border-amber-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">
                      {selectedSubcategory ? selectedSubcategory.icon : 
                       selectedCategory === 'all' ? '🌟' : 
                       categories.find(c => c.key === selectedCategory)?.icon || '🌟'}
                    </span>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[60px]">
                      {selectedSubcategory ? selectedSubcategory.name : 
                       selectedCategory === 'all' ? 'All' : 
                       categories.find(c => c.key === selectedCategory)?.name || 'All'}
                    </span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </button>
                  
                  {/* Mobile Main Categories Dropdown */}
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {productCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryChange(category.id)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg">{category.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-700">{category.name}</div>
                            <div className="text-xs text-gray-500">{category.description}</div>
                          </div>
                          {category.id !== 'all' && getSubcategoriesForCategory(category.id).length > 0 && (
                            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Mobile Subcategory Dropdown */}
                  {showSubcategoryDropdown && selectedCategory !== 'all' && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {/* Back to main categories */}
                      <button
                        onClick={() => {
                          setShowSubcategoryDropdown(false);
                          setShowCategoryDropdown(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
                      >
                        <span className="text-lg">←</span>
                        <span className="text-sm font-medium text-gray-700">Back</span>
                      </button>
                      
                      {/* Category header */}
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{categories.find(c => c.key === selectedCategory)?.icon}</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {categories.find(c => c.key === selectedCategory)?.name}
                          </span>
                        </div>
                      </div>
                      
                      {/* Subcategories */}
                      {getSubcategoriesForCategory(selectedCategory).map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => handleSubcategoryChange(subcategory)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors pl-6"
                        >
                          <span className="text-lg">{subcategory.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{subcategory.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Mobile Search Input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={togglePopularSearches}
                  placeholder="Search products..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              {/* Mobile Popular Searches */}
              {showPopularSearches && searchQuery === '' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Popular searches:</p>
                    <div className="flex flex-wrap gap-1">
                      {popularSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => handlePopularSearch(search)}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-700 rounded text-xs transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-stone-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <OptimizedLink
              to="/"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Home
            </OptimizedLink>
            <OptimizedLink
              to="/find-artisans"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Find Artisan
            </OptimizedLink>
            <Link
              to="/community"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Community
            </Link>
            {isAuthenticated && (
              <>
                {/* Admin Dashboard Link */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-300"
                    onClick={toggleMobileMenu}
                  >
                    Admin Dashboard
                  </Link>
                )}
                                  {user?.role !== 'admin' && (
                    <>
                      {user?.role === 'artisan' && (
                        <>
                          <Link
                            to="/dashboard"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            Dashboard
                          </Link>
                          <Link
                            to="/profile"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/products"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Products
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Orders
                          </Link>
                        </>
                      )}
                      {user?.role !== 'artisan' && (
                        <>
                          <Link
                            to="/profile"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Orders
                          </Link>
                        </>
                      )}
                    </>
                  )}
              </>
            )}
            {isAuthenticated && (
              <>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                >
                  {isGuest ? 'Clear Session' : 'Sign Out'}
                </button>
              </>
            )}
            {!isAuthenticated && (
              <div className="pt-4 space-y-2">
                <Link
                  to="/login"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors duration-300"
                  onClick={toggleMobileMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors duration-300"
                  onClick={toggleMobileMenu}
                >
                  Join Now
                </Link>
                {cartCount > 0 && (
                  <>
                    <Link
                      to="/cart"
                      className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors duration-300"
                      onClick={toggleMobileMenu}
                    >
                      View Cart ({cartCount})
                    </Link>
                    <Link
                      to="/guest-checkout"
                      className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-300"
                      onClick={toggleMobileMenu}
                    >
                      Guest Checkout ({cartCount})
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
