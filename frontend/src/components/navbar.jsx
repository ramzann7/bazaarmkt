import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import OptimizedLink from "./OptimizedLink";
import Logo from "./Logo";
import CartDropdown from "./CartDropdown";
import { 
  ShoppingBagIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { cartService } from "../services/cartService";
import { guestService } from "../services/guestService";
import enhancedSearchService from "../services/enhancedSearchService";
import { getAllCategories, getAllSubcategories, PRODUCT_CATEGORIES } from "../data/productReference";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cacheService";
import { useOptimizedEffect, useDebounce } from "../hooks/useOptimizedEffect";
import searchTrackingService from "../services/searchTrackingService";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPopularSearches, setShowPopularSearches] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoize categories to prevent unnecessary re-renders
  const categories = useMemo(() => {
    return getAllCategories();
  }, []);

  const subcategories = useMemo(() => {
    return getAllSubcategories();
  }, []);

  // Deduplicate popular searches to prevent React key warnings
  const deduplicatedPopularSearches = useMemo(() => {
    const seen = new Set();
    return popularSearches.filter(search => {
      if (seen.has(search)) {
        return false;
      }
      seen.add(search);
      return true;
    });
  }, [popularSearches]);

  // Scroll detection for navbar effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update cart count when user changes - optimized to prevent excessive calls
  useOptimizedEffect(() => {
    if (user) {
      setIsGuest(cartService.isGuestUser());
      
      // Cache cart count for authenticated users
      const cartCountKey = `cart_count_${user._id}`;
      let cachedCartCount = cacheService.get(cartCountKey);
      if (cachedCartCount === null) {
        cachedCartCount = cartService.getCartCount(user._id);
        cacheService.set(cartCountKey, cachedCartCount, CACHE_TTL.CART_COUNT);
      }
      console.log('🛒 Navbar: Setting cart count for user:', { userId: user._id, count: cachedCartCount, userObject: user });
      setCartCount(cachedCartCount);
    } else {
      // For guest users, always get fresh cart count
      setIsGuest(true);
      const guestCartCount = cartService.getCartCount(null);
      console.log('🛒 Navbar: Setting cart count for guest:', { count: guestCartCount });
      setCartCount(guestCartCount);
    }
  }, [user], { debounceMs: 300 });

  // Optimized search with debouncing
  useOptimizedEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      // Cache search results
      const searchCacheKey = `search_${debouncedSearchQuery}_${selectedCategory}`;
      const cachedResults = cacheService.get(searchCacheKey);
      
      if (!cachedResults) {
        // Preload search results in background
        enhancedSearchService.searchProducts(debouncedSearchQuery, null, { category: selectedCategory })
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
      const { userId, count, cart } = event.detail;
      console.log('🛒 Navbar received cart update:', { userId, count, currentUser: user?._id, cartLength: cart?.length });
      
      // Update cart count if it's for the current user or guest
      if ((user && userId === user._id) || (!user && userId === null) || (isGuest && userId === null)) {
        console.log('🛒 Updating cart count to:', count);
        setCartCount(count);
        
        // Clear cache for authenticated users
        if (user?._id && !isGuest) {
          const cartCountKey = `cart_count_${user._id}`;
          cacheService.delete(cartCountKey);
        }
      }
    };

    // Add event listener with capture to ensure it's not missed
    window.addEventListener('cartUpdated', handleCartUpdate, true);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate, true);
    };
  }, [user, isGuest]);

  // Fallback: Periodically check cart count to ensure it's up to date (reduced frequency)
  useEffect(() => {
    const checkCartCount = () => {
      if (user?._id) {
        const currentCount = cartService.getCartCount(user._id);
        if (currentCount !== cartCount) {
          console.log('🛒 Cart count mismatch detected, updating:', { current: cartCount, actual: currentCount });
          setCartCount(currentCount);
        }
      } else if (isGuest) {
        const currentCount = cartService.getCartCount(null);
        if (currentCount !== cartCount) {
          console.log('🛒 Guest cart count mismatch detected, updating:', { current: cartCount, actual: currentCount });
          setCartCount(currentCount);
        }
      }
    };

    // Check every 10 seconds as a fallback (reduced from 2 seconds)
    const interval = setInterval(checkCartCount, 10000);
    
    return () => clearInterval(interval);
  }, [user, isGuest, cartCount]);

  // Memoized search handler
  const handleSearch = useMemo(() => {
    return (e) => {
      e.preventDefault();
      const query = searchQuery.trim();
      const category = selectedSubcategory ? selectedSubcategory.id : selectedCategory;
      
      if (query || category !== 'all') {
        // Track the search
        if (query) {
          searchTrackingService.trackSearch(query, category);
        }
        
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
        
        // If no subcategories, automatically search for the main category
        if (category !== 'all') {
          const categoryName = categories.find(c => c.key === category)?.name || category;
          
          // Track the category selection
          searchTrackingService.trackSearch(categoryName, category);
          
          // Automatically navigate to search with the category
          const searchParams = new URLSearchParams();
          searchParams.append('category', category);
          searchParams.append('autoSearch', 'true'); // Flag to indicate automatic search
          navigate(`/search?${searchParams.toString()}`);
        }
      }
    };
  }, [categories, navigate]);

  // Memoized subcategory change handler with automatic search
  const handleSubcategoryChange = useMemo(() => {
    return (subcategory) => {
      setSelectedSubcategory(subcategory);
      setShowCategoryDropdown(false);
      setShowSubcategoryDropdown(false);
      
      // Track the subcategory selection
      searchTrackingService.trackSearch(subcategory.name, subcategory.id);
      
      // Automatically navigate to search with the subcategory
      const searchParams = new URLSearchParams();
      searchParams.append('subcategory', subcategory.id);
      searchParams.append('category', subcategory.categoryKey);
      searchParams.append('autoSearch', 'true'); // Flag to indicate automatic search
      navigate(`/search?${searchParams.toString()}`);
    };
  }, [navigate]);

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
      
      // Track the popular search selection
      const category = selectedSubcategory ? selectedSubcategory.id : selectedCategory;
      searchTrackingService.trackSearch(searchTerm, category);
      
      // Navigate to search with the popular search term
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

  // Load popular searches from tracking service
  useOptimizedEffect(() => {
    const loadPopularSearches = async () => {
      try {
        const popular = searchTrackingService.getPopularSearches();
        setPopularSearches(popular);
      } catch (error) {
        console.error('Error loading popular searches:', error);
        // Fallback to default searches
        setPopularSearches(searchTrackingService.getDefaultPopularSearches());
      }
    };

    loadPopularSearches();
  }, []);

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
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white shadow-md' 
        : 'bg-white/90 backdrop-blur-sm shadow-soft'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + BazaarMkt Text */}
          <OptimizedLink to="/" className="flex items-center gap-3 flex-shrink-0">
            <Logo showText={false} className="w-10 h-10" />
            <span className="text-xl font-display font-bold text-primary">BazaarMkt</span>
          </OptimizedLink>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex items-center flex-1 ml-12">
            {/* Compact Search */}
            <div className="flex-1 max-w-md ml-8 search-container">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <div className="flex shadow-lg">
                  {/* Category Dropdown - More Subtle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={toggleCategoryDropdown}
                      className={`flex items-center space-x-1 px-2 py-1.5 border border-r-0 rounded-l-lg transition-all duration-200 min-w-[90px] ${
                        selectedCategory !== 'all' || selectedSubcategory 
                          ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' 
                          : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-sm">
                        {selectedSubcategory ? selectedSubcategory.icon : 
                         selectedCategory === 'all' ? '🔍' : 
                         categories.find(c => c.key === selectedCategory)?.icon || '🔍'}
                      </span>
                      <span className="text-xs truncate">
                        {selectedSubcategory ? selectedSubcategory.name : 
                         selectedCategory === 'all' ? 'All' : 
                         categories.find(c => c.key === selectedCategory)?.name || 'All'}
                      </span>
                      <ChevronDownIcon className="w-3 h-3 flex-shrink-0" />
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
                      <div className="absolute top-full left-0 mt-2 w-96 bg-white border-2 border-[#E6B655] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                        {productCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryChange(category.id)}
                            className="w-full flex items-center space-x-3 px-6 py-4 text-left hover:bg-[#F5F1EA] transition-all duration-200 border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-xl">{category.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold text-gray-800">{category.name}</div>
                              <div className="text-xs text-gray-600">{category.description}</div>
                            </div>
                            {category.id !== 'all' && getSubcategoriesForCategory(category.id).length > 0 && (
                              <ChevronDownIcon className="w-4 h-4 text-[#E6B655]" />
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
                  
                  {/* Search Input - Compact, no icon */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={togglePopularSearches}
                    placeholder="Search for bread, jam, jewelry, artisans..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-primary-100 focus:border-gray-400 transition-all duration-200 placeholder-gray-400 bg-white"
                  />
                </div>
                
                {/* Popular Searches Dropdown */}
                {showPopularSearches && searchQuery === '' && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                    <div className="p-3">
                      <p className="text-xs font-semibold text-secondary mb-2">
                        Popular searches:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {deduplicatedPopularSearches.map((search, index) => (
                          <button
                            key={`${search}-${index}`}
                            onClick={() => handlePopularSearch(search)}
                            className="px-2 py-1 bg-gray-100 hover:bg-primary text-gray-700 hover:text-white rounded text-xs font-medium transition-all duration-200"
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

          {/* Nav Links - Between search and cart */}
          <div className="hidden lg:flex items-center gap-10 ml-auto mr-20">
            <Link to="/find-artisans" className="text-secondary/90 hover:text-primary font-semibold text-sm transition-colors whitespace-nowrap">
              Shop
            </Link>
            <Link to="/community" className="text-secondary/90 hover:text-primary font-semibold text-sm transition-colors whitespace-nowrap">
              Community
            </Link>
          </div>

          {/* Right side CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Cart - Available for all users except artisans */}
            {(!user || (user?.role !== 'artisan' && user?.userType !== 'artisan')) && (
              <button 
                onClick={() => setShowCartDropdown(!showCartDropdown)}
                className="relative p-2 text-secondary hover:text-primary transition-colors duration-200"
              >
                <ShoppingBagIcon className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Sign In / User Menu */}
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="hidden sm:block text-secondary/80 hover:text-primary transition-colors text-sm font-semibold">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm px-5 py-2">
                  Join Now
                </Link>
              </>
            ) : (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-secondary/80 hover:text-primary transition-colors duration-200">
                  <UserIcon className="w-6 h-6" />
                  <span className="hidden xl:block text-sm font-medium">
                    {isGuest ? 'Guest Checkout' : 'My Account'}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {!isGuest && (
                    <>
                      {/* Admin Dashboard Link */}
                      {(user?.role === 'admin' || user?.userType === 'admin') && (
                        <>
                          <Link to="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                            Admin Dashboard
                          </Link>
                          <hr className="my-2 border-gray-200" />
                        </>
                      )}
                      {(user?.role !== 'admin' && user?.userType !== 'admin') && (
                        <>
                          {(user?.role === 'artisan' || user?.userType === 'artisan') && (
                            <>
                              <Link to="/dashboard" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                Dashboard
                              </Link>
                              <Link to="/profile" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                My Profile
                              </Link>
                              <Link to="/my-products" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                My Products
                              </Link>
                              <Link to="/orders" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                My Orders
                              </Link>
                            </>
                          )}
                          {(user?.role !== 'artisan' && user?.userType !== 'artisan') && (
                            <>
                              <Link to="/profile" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                My Profile
                              </Link>
                              <Link to="/orders" className="block px-4 py-2 text-sm text-secondary hover:bg-gray-50">
                                My Orders
                              </Link>
                            </>
                          )}
                        </>
                      )}
                      <hr className="my-2 border-gray-200" />
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-secondary hover:bg-gray-50"
                  >
                    {isGuest ? 'Clear Session' : 'Sign Out'}
                  </button>
                </div>
              </div>
            )}

          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 text-secondary hover:text-primary transition-colors duration-200"
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
        <div className="md:hidden py-3 px-1 search-container">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <div className="flex">
                {/* Mobile Category Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleCategoryDropdown}
                    className={`flex items-center space-x-1 px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg text-sm ${
                      selectedCategory !== 'all' || selectedSubcategory 
                        ? 'bg-primary-50 border-primary-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-base">
                      {selectedSubcategory ? selectedSubcategory.icon : 
                       selectedCategory === 'all' ? '🌟' : 
                       categories.find(c => c.key === selectedCategory)?.icon || '🌟'}
                    </span>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[50px]">
                      {selectedSubcategory ? selectedSubcategory.name : 
                       selectedCategory === 'all' ? 'All' : 
                       categories.find(c => c.key === selectedCategory)?.name || 'All'}
                    </span>
                    <ChevronDownIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              
              {/* Mobile Popular Searches */}
              {showPopularSearches && searchQuery === '' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Popular searches:</p>
                    <div className="flex flex-wrap gap-1">
                      {deduplicatedPopularSearches.map((search, index) => (
                        <button
                          key={`mobile-${search}-${index}`}
                          onClick={() => handlePopularSearch(search)}
                          className="px-2 py-1 bg-gray-100 hover:bg-primary-100 text-gray-700 hover:text-primary-dark rounded text-xs transition-colors"
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
        <div className="md:hidden bg-white border-t border-[#D77A61]/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <OptimizedLink
              to="/"
              className="block px-3 py-2 text-lg font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Home
            </OptimizedLink>
            <OptimizedLink
              to="/find-artisans"
              className="block px-3 py-2 text-lg font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Shop
            </OptimizedLink>
            <Link
              to="/community"
              className="block px-3 py-2 text-lg font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
              onClick={toggleMobileMenu}
            >
              Community
            </Link>
            {isAuthenticated && (
              <>
                {/* Admin Dashboard Link */}
                {(user?.role === 'admin' || user?.userType === 'admin') && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-300"
                    onClick={toggleMobileMenu}
                  >
                    Admin Dashboard
                  </Link>
                )}
                                  {(user?.role !== 'admin' && user?.userType !== 'admin') && (
                    <>
                      {(user?.role === 'artisan' || user?.userType === 'artisan') && (
                        <>
                          <Link
                            to="/dashboard"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            Dashboard
                          </Link>
                          <Link
                            to="/profile"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/my-products"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Products
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Orders
                          </Link>
                          <Link
                            to="/my-wallet"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Wallet
                          </Link>
                        </>
                      )}
                      {(user?.role !== 'artisan' && user?.userType !== 'artisan') && (
                        <>
                          <Link
                            to="/profile"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                            onClick={toggleMobileMenu}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
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
                  className="block w-full text-left px-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300"
                >
                  {isGuest ? 'Clear Session' : 'Sign Out'}
                </button>
              </>
            )}
            {!isAuthenticated && (
              <div className="pt-4 space-y-2">
                <Link
                  to="/login"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-[#2E2E2E] bg-[#F5F1EA] hover:bg-[#E6B655] hover:text-white rounded-lg transition-colors duration-300"
                  onClick={toggleMobileMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-[#D77A61] hover:bg-[#C06A51] rounded-lg transition-colors duration-300"
                  onClick={toggleMobileMenu}
                >
                  Join Now
                </Link>
                {cartCount > 0 && (
                  <button
                    onClick={() => {
                      toggleMobileMenu();
                      setShowCartDropdown(true);
                    }}
                    className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-[#3C6E47] hover:bg-[#2E5A3A] rounded-lg transition-colors duration-300"
                  >
                    View Cart ({cartCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Dropdown */}
      <CartDropdown 
        isOpen={showCartDropdown} 
        onClose={() => setShowCartDropdown(false)} 
      />
    </nav>
  );
}
