import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import OptimizedLink from "./OptimizedLink";
import Logo from "./Logo";
import CartDropdown from "./CartDropdown";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileNavigation from "./mobile/MobileNavigation";
import MobileSearchBar from "./mobile/MobileSearchBar";
import NotificationBell from "./NotificationBell";
import { 
  ShoppingBagIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { cartService } from "../services/cartService";
import { guestService } from "../services/guestService";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cacheService";
import { useOptimizedEffect, useDebounce } from "../hooks/useOptimizedEffect";
import searchAnalyticsService from "../services/searchAnalyticsService";
import toast from "react-hot-toast";

export default function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPopularSearches, setShowPopularSearches] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
    // Get current user ID (same logic as cart service)
    let currentUserId = user?._id;
    if (!currentUserId) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.userId;
        }
      } catch (tokenError) {
        console.warn('Could not get userId from token:', tokenError);
      }
    }
    
    if (currentUserId) {
      setIsGuest(cartService.isGuestUser());
      
      // Cache cart count for authenticated users
      const cartCountKey = `cart_count_${currentUserId}`;
      let cachedCartCount = cacheService.get(cartCountKey);
      if (cachedCartCount === null) {
        cachedCartCount = cartService.getCartCount(currentUserId);
        cacheService.set(cartCountKey, cachedCartCount, CACHE_TTL.CART_COUNT);
      }
      setCartCount(cachedCartCount);
    } else {
      // For guest users, always get fresh cart count
      setIsGuest(true);
      const guestCartCount = cartService.getCartCount(null);
      setCartCount(guestCartCount);
    }
  }, [user], { debounceMs: 300 });

  // Disabled search preloading to prevent duplicate analytics tracking
  // TODO: Re-enable with proper analytics deduplication if needed
  // useOptimizedEffect(() => {
  //   if (debouncedSearchQuery.length > 2) {
  //     // Cache search results
  //     const searchCacheKey = `search_${debouncedSearchQuery}_${selectedCategory}`;
  //     const cachedResults = cacheService.get(searchCacheKey);
  //     
  //     if (!cachedResults) {
  //       // Preload search results in background
  //       enhancedSearchService.searchProducts(debouncedSearchQuery, null, { category: selectedCategory })
  //         .then(results => {
  //           cacheService.set(searchCacheKey, results, 5 * 60 * 1000); // 5 minutes
  //         })
  //         .catch(error => {
  //           console.error('Search preload error:', error);
  //         });
  //     }
  //   }
  // }, [debouncedSearchQuery, selectedCategory], { debounceMs: 300 });

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = (event) => {
      const { userId, count, cart } = event.detail;
      // Get current user ID (same logic as cart service)
      let currentUserId = user?._id;
      if (!currentUserId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
          }
        } catch (tokenError) {
          console.warn('Could not get userId from token:', tokenError);
        }
      }
      
      // Update cart count if it's for the current user or guest
      if (userId === currentUserId || (!currentUserId && userId === null) || (isGuest && userId === null)) {
        setCartCount(count);
        
        // Clear cache for authenticated users
        if (currentUserId && !isGuest) {
          const cartCountKey = `cart_count_${currentUserId}`;
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
      // Get current user ID (same logic as cart service)
      let currentUserId = user?._id;
      if (!currentUserId) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
          }
        } catch (tokenError) {
          console.warn('Could not get userId from token:', tokenError);
        }
      }
      
      if (currentUserId) {
        const currentCount = cartService.getCartCount(currentUserId);
        if (currentCount !== cartCount) {
          setCartCount(currentCount);
        }
      } else if (isGuest) {
        const currentCount = cartService.getCartCount(null);
        if (currentCount !== cartCount) {
          setCartCount(currentCount);
        }
      }
    };

    // Check every 10 seconds as a fallback (reduced from 2 seconds)
    const interval = setInterval(checkCartCount, 10000);
    
    return () => clearInterval(interval);
  }, [user, isGuest, cartCount]);

  // Optimized search handler - Keyword search only
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    // Only search if there's a query
    if (query) {
      const searchParams = new URLSearchParams();
      searchParams.append('q', query);
      navigate(`/search?${searchParams.toString()}`);
      
      // Clear search query after navigation
      setTimeout(() => {
        setSearchQuery('');
        setShowPopularSearches(false);
      }, 100);
    }
  }, [searchQuery, navigate]);


  // Handle popular search selection
  const handlePopularSearch = useCallback((searchTerm) => {
    setSearchQuery(searchTerm);
    setShowPopularSearches(false);
    
    // Note: Search tracking will be handled by SearchResults component
    
    // Navigate to search with the popular search term
    const searchParams = new URLSearchParams();
    searchParams.append('q', searchTerm);
    navigate(`/search?${searchParams.toString()}`);
    
    // Clear search query after navigation
    setTimeout(() => {
      setSearchQuery('');
    }, 100);
  }, [navigate]);

  // Clear search query when navigating away from search page
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/search' && searchQuery) {
      setSearchQuery('');
      setShowPopularSearches(false);
    }
  }, [location.pathname]); // Removed searchQuery dependency to prevent loop

  // Optimized logout handler
  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  // Optimized mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);


  // Load popular searches from tracking service
  useOptimizedEffect(() => {
    const loadPopularSearches = async () => {
      try {
        const popular = await searchAnalyticsService.getPopularSearches();
        if (popular && popular.length > 0) {
          // Extract just the query strings from the analytics objects
          const queryStrings = popular.map(item => 
            typeof item === 'object' ? item.query : item
          ).filter(query => query && typeof query === 'string');
          setPopularSearches(queryStrings);
        } else {
          // Fallback to default searches
          setPopularSearches([
            'fresh eggs',
            'sourdough bread', 
            'maple syrup',
            'organic honey',
            'artisan cheese',
            'fresh herbs',
            'homemade pasta'
          ]);
        }
      } catch (error) {
        console.error('Error loading popular searches:', error);
        // Fallback to default searches
        setPopularSearches([
          'fresh eggs',
          'sourdough bread', 
          'maple syrup',
          'organic honey',
          'artisan cheese',
          'fresh herbs',
          'homemade pasta'
        ]);
      }
    };

    loadPopularSearches();
  }, []);

  // Close popular searches when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const searchContainer = event.target.closest('.search-container');
      const isInput = event.target.tagName === 'INPUT';
      
      // Don't close if clicking on input or inside search container
      if (!searchContainer) {
        setShowPopularSearches(false);
      } else if (!isInput) {
        // Only close popular searches if not clicking input
        setShowPopularSearches(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
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
    <>
    <nav className={`sticky top-0 z-50 transition-all duration-300 hidden lg:block ${
      scrolled 
        ? 'bg-white shadow-md' 
        : 'bg-gradient-to-r from-accent/8 to-orange-200/30 backdrop-blur-sm border-b border-black/5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with text on desktop */}
          <OptimizedLink to="/" className="flex items-center gap-3 flex-shrink-0 h-full">
            <Logo showText={false} className="w-10 h-10" />
            <span className="text-xl font-display font-bold text-amber-600 leading-none">BazaarMkt</span>
          </OptimizedLink>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex items-center flex-1 ml-12">
            {/* Simplified Keyword Search */}
            <div className="flex-1 max-w-md ml-8 search-container">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                {/* Search Input - Simplified structure */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowPopularSearches(true)}
                    onBlur={() => {
                      // Delay to allow popular search clicks to register
                      setTimeout(() => setShowPopularSearches(false), 200);
                    }}
                    placeholder="Search for bread, jam, jewelry, artisans..."
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-400 bg-white shadow-lg"
                    autoComplete="off"
                    autoFocus={false}
                    style={{ zIndex: 10 }}
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
                            className="px-2 py-1 bg-gray-100 hover:bg-amber-600 text-gray-700 hover:text-white rounded text-xs font-medium transition-all duration-200"
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
          <div className="hidden lg:flex items-center gap-10 ml-auto mr-12">
            <Link to="/find-artisans" className="text-secondary/90 hover:text-amber-600 font-semibold text-sm transition-colors whitespace-nowrap">
              {t('nav.findArtisans')}
            </Link>
            <Link to="/community" className="text-secondary/90 hover:text-amber-600 font-semibold text-sm transition-colors whitespace-nowrap">
              {t('nav.community')}
            </Link>
          </div>

          {/* Right side CTAs - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex items-center gap-1.5 md:gap-3 flex-shrink-0 h-full">
            {/* Language Switcher - Desktop only, moved to mobile menu */}
            <div className="flex items-center">
              <LanguageSwitcher />
            </div>
            
            {/* Cart - Available for all users including artisans */}
            <button 
              onClick={() => setShowCartDropdown(!showCartDropdown)}
              className="relative p-1.5 md:p-2 text-secondary hover:text-amber-600 transition-colors duration-200 flex items-center"
            >
              <ShoppingBagIcon className="w-5 h-5 md:w-6 md:h-6" />
              {cartCount > 0 && (
                <span className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg ${
                  cartCount > 99 ? 'w-5 h-5 md:w-6 md:h-6 text-[9px] md:text-[10px]' : 'w-4 h-4 md:w-5 md:h-5 text-[10px]'
                }`}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Notification Bell - Only for authenticated users */}
            {isAuthenticated && !isGuest && (
              <NotificationBell user={user} />
            )}

            {/* Sign In / User Menu */}
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-secondary/80 hover:text-amber-600 transition-colors text-xs md:text-sm font-semibold whitespace-nowrap px-1.5 md:px-0 flex items-center leading-none">
                  {t('common.signIn')}
                </Link>
                <Link to="/register" className="btn-primary text-xs md:text-sm px-2.5 py-1.5 md:px-5 md:py-2 whitespace-nowrap flex items-center leading-none">
                  {t('auth.joinNow')}
                </Link>
              </>
            ) : (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-secondary/80 hover:text-amber-600 transition-colors duration-200">
                  <UserIcon className="w-6 h-6" />
                  <span className="hidden xl:block text-sm font-medium">
                    {isGuest ? t('nav.guestCheckout') : t('nav.myAccount')}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {!isGuest && (
                    <>
                      {/* Admin Dashboard Link */}
                      {(user?.role === 'admin' || user?.userType === 'admin') && (
                        <>
                          <Link to="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                            {t('nav.adminDashboard')}
                          </Link>
                          <hr className="my-2 border-gray-200" />
                        </>
                      )}
                      {(user?.role !== 'admin' && user?.userType !== 'admin') && (
                        <>
                          {(user?.role === 'artisan' || user?.userType === 'artisan') && (
                            <>
                              <Link to="/dashboard" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('nav.dashboard')}
                              </Link>
                              <Link to="/profile" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('common.profile')}
                              </Link>
                              <Link to="/my-products" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('nav.myProducts')}
                              </Link>
                              <Link to="/orders" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('nav.myOrders')}
                              </Link>
                            </>
                          )}
                          {(user?.role !== 'artisan' && user?.userType !== 'artisan') && (
                            <>
                              <Link to="/profile" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('common.profile')}
                              </Link>
                              <Link to="/orders" className="block pl-6 pr-4 py-2 text-sm text-secondary hover:bg-gray-50 border-l-2 border-transparent hover:border-amber-500">
                                {t('nav.myOrders')}
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
                    {isGuest ? t('nav.clearSession') : t('nav.signOut')}
                  </button>
                </div>
              </div>
            )}

          {/* Mobile Search Bar */}
          <div className="lg:hidden flex-1 mx-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowPopularSearches(true)}
                  onBlur={() => {
                    // Delay to allow popular search clicks to register
                    setTimeout(() => setShowPopularSearches(false), 200);
                  }}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 placeholder-gray-400 bg-white"
                  autoComplete="off"
                  autoFocus={false}
                />
              </div>
              
              {/* Popular Searches Dropdown - Mobile */}
              {showPopularSearches && searchQuery === '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 mx-4">
                  <div className="p-3">
                    <p className="text-xs font-semibold text-secondary mb-2">
                      Popular searches:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {deduplicatedPopularSearches.map((search, index) => (
                        <button
                          key={`${search}-${index}`}
                          onClick={() => handlePopularSearch(search)}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-600 text-gray-700 hover:text-white rounded text-xs font-medium transition-all duration-200"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-1.5 md:p-2 text-secondary hover:text-amber-600 transition-colors duration-200 flex items-center"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Bars3Icon className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </button>
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile Menu - Full screen overlay */}
    {isMobileMenuOpen && (
      <>
        {/* Backdrop */}
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50 animate-fadeIn"
          onClick={toggleMobileMenu}
        />
        
        {/* Menu Panel */}
        <div className="lg:hidden bg-white fixed top-0 left-0 right-0 bottom-16 shadow-2xl z-50 animate-slideDown overflow-y-auto">
          {/* Menu Header */}
          <div className="sticky top-0 bg-gradient-to-r from-accent/8 to-orange-200/30 px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo showText={false} className="w-8 h-8" />
              <span className="text-lg font-display font-bold text-amber-600">Menu</span>
            </div>
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-600 hover:text-amber-600 transition-colors"
              aria-label="Close menu"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Language Switcher in mobile menu */}
            <div className="px-3 py-2 border-b border-gray-200 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Language</span>
                <LanguageSwitcher />
              </div>
            </div>
            
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
              {t('nav.findArtisans')}
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
                    {t('nav.adminDashboard')}
                  </Link>
                )}
                                  {(user?.role !== 'admin' && user?.userType !== 'admin') && (
                      <>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">My Account</div>
                        {(user?.role === 'artisan' || user?.userType === 'artisan') && (
                          <>
                          <Link
                            to="/dashboard"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('nav.dashboard')}
                          </Link>
                          <Link
                            to="/profile"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('common.profile')}
                          </Link>
                          <Link
                            to="/my-products"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('nav.myProducts')}
                          </Link>
                          <Link
                            to="/orders"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('nav.myOrders')}
                          </Link>
                          <Link
                            to="/my-wallet"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('nav.myWallet')}
                          </Link>
                        </>
                        )}
                        {(user?.role !== 'artisan' && user?.userType !== 'artisan') && (
                        <>
                          <Link
                            to="/profile"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('common.profile')}
                          </Link>
                          <Link
                            to="/orders"
                            className="block pl-8 pr-3 py-2 text-base font-medium text-[#2E2E2E] hover:text-[#D77A61] hover:bg-[#F5F1EA] rounded-lg transition-colors duration-300 border-l-2 border-transparent hover:border-[#D77A61]"
                            onClick={toggleMobileMenu}
                          >
                            {t('nav.myOrders')}
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
                  {isGuest ? t('nav.clearSession') : t('nav.signOut')}
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
                  {t('common.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-[#D77A61] hover:bg-[#C06A51] rounded-lg transition-colors duration-300"
                  onClick={toggleMobileMenu}
                >
                  {t('auth.joinNow')}
                </Link>
                {cartCount > 0 && (
                  <button
                    onClick={() => {
                      toggleMobileMenu();
                      setShowCartDropdown(true);
                    }}
                    className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-[#3C6E47] hover:bg-[#2E5A3A] rounded-lg transition-colors duration-300"
                  >
                    {t('nav.viewCart')} ({cartCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )}

    {/* Cart Dropdown */}
    <CartDropdown 
      isOpen={showCartDropdown} 
      onClose={() => setShowCartDropdown(false)} 
    />
    
    {/* Mobile Bottom Navigation */}
    <MobileNavigation 
      cartCount={cartCount}
      onMenuClick={toggleMobileMenu}
    />
    </>
  );
}
