import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  ShoppingBagIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { authToken, logoutUser, getProfile } from "../services/authService";
import { cartService } from "../services/cartService";
import { guestService } from "../services/guestService";
import enhancedSearchService from "../services/enhancedSearchService";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken.getToken());
  const [isGuest, setIsGuest] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPopularSearches, setShowPopularSearches] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authToken.getToken();
      setIsAuthenticated(!!token);
      
      if (token) {
        try {
          const profile = await getProfile();
          setUserRole(profile.role);
          setCurrentUserId(profile._id);
          setIsGuest(guestService.isGuestUser());
          setCartCount(cartService.getCartCount(profile._id));
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserRole(null);
          setCurrentUserId(null);
          setIsGuest(false);
          setCartCount(cartService.getCartCount(null)); // Get guest cart count
        }
      } else {
        setUserRole(null);
        setCurrentUserId(null);
        setIsGuest(false);
        setCartCount(cartService.getCartCount(null)); // Get guest cart count
      }
    };

    // Check on mount
    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth events
    const handleAuthChange = (event) => {
      setIsAuthenticated(event.detail.isAuthenticated);
      if (!event.detail.isAuthenticated) {
        setUserRole(null);
        setCurrentUserId(null);
        setIsGuest(false);
        setCartCount(cartService.getCartCount(null)); // Get guest cart count
      } else {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (currentUserId) {
      setCartCount(cartService.getCartCount(currentUserId));
    } else {
      // For guest users or when not authenticated, get guest cart count
      setCartCount(cartService.getCartCount(null));
    }
  }, [location, currentUserId]);

  useEffect(() => {
    const handleCartUpdate = (event) => {
      console.log('Cart update event:', {
        eventUserId: event.detail.userId,
        currentUserId: currentUserId,
        count: event.detail.count,
        shouldUpdate: (!currentUserId && event.detail.userId === null) || 
                     (currentUserId && event.detail.userId === currentUserId)
      });
      
      if ((!currentUserId && event.detail.userId === null) || 
          (currentUserId && event.detail.userId === currentUserId)) {
        setCartCount(event.detail.count);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [currentUserId]);

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUserId(null);
    setIsGuest(false);
    setCartCount(0);
    toast.success('Successfully logged out');
    navigate('/');
  };

  // Product Categories (matching actual database categories)
  const categories = [
    { id: 'all', name: 'All Products', icon: '🌟' },
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

  // Popular searches
  const popularSearches = [
    'fresh eggs', 'sourdough bread', 'maple syrup', 'organic honey', 
    'artisan cheese', 'fresh herbs', 'homemade pasta', 'farm vegetables'
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        // Get user location for enhanced search
        const userLocation = await enhancedSearchService.getUserLocation();
        
        // Navigate to search with enhanced parameters
        const searchParams = new URLSearchParams({
          q: searchQuery.trim(),
          enhanced: 'true'
        });
        
        if (userLocation) {
          searchParams.append('lat', userLocation.latitude);
          searchParams.append('lng', userLocation.longitude);
        }
        
        navigate(`/search?${searchParams.toString()}`);
        setSearchQuery('');
      } catch (error) {
        console.error('Enhanced search error:', error);
        // Fallback to basic search
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
      }
    }
  };

  const handleCategorySelect = async (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategoryDropdown(false);
    
    try {
      // Get user location for enhanced search
      const userLocation = await enhancedSearchService.getUserLocation();
      
      if (categoryId === 'all') {
        navigate('/search');
      } else {
        const categoryName = categories.find(c => c.id === categoryId)?.name;
        const searchParams = new URLSearchParams({
          category: categoryId,
          q: categoryName || '',
          enhanced: 'true'
        });
        
        if (userLocation) {
          searchParams.append('lat', userLocation.latitude);
          searchParams.append('lng', userLocation.longitude);
        }
        
        navigate(`/search?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Enhanced category search error:', error);
      // Fallback to basic search
      if (categoryId === 'all') {
        navigate('/search');
      } else {
        const categoryName = categories.find(c => c.id === categoryId)?.name;
        navigate(`/search?category=${categoryId}&q=${encodeURIComponent(categoryName || '')}`);
      }
    }
  };

  const handlePopularSearch = async (search) => {
    try {
      // Get user location for enhanced search
      const userLocation = await enhancedSearchService.getUserLocation();
      
      const searchParams = new URLSearchParams({
        q: search,
        enhanced: 'true'
      });
      
      if (userLocation) {
        searchParams.append('lat', userLocation.latitude);
        searchParams.append('lng', userLocation.longitude);
      }
      
      navigate(`/search?${searchParams.toString()}`);
      setShowPopularSearches(false);
    } catch (error) {
      console.error('Enhanced popular search error:', error);
      // Fallback to basic search
      navigate(`/search?q=${encodeURIComponent(search)}`);
      setShowPopularSearches(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowCategoryDropdown(false);
        setShowPopularSearches(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowCategoryDropdown(false);
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
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">The Bazaar</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 ml-12">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/find-artisans" className="nav-link">
              Find Artisan
            </Link>
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
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-full hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-lg">{categories.find(c => c.id === selectedCategory)?.icon}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </span>
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    </button>
                    
                                     {showCategoryDropdown && (
                   <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                     {categories.map((category) => (
                       <button
                         key={category.id}
                         onClick={() => handleCategorySelect(category.id)}
                         className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                       >
                         <span className="text-lg">{category.icon}</span>
                         <span className="text-sm font-medium text-gray-700">{category.name}</span>
                       </button>
                     ))}
                   </div>
                 )}
                  </div>
                  
                  {/* Search Input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowPopularSearches(true)}
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
            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-stone-700 hover:text-amber-600 transition-colors duration-300">
              <ShoppingBagIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

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
                      {userRole === 'admin' && (
                        <>
                          <Link to="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium">
                            Admin Dashboard
                          </Link>
                          <hr className="my-2 border-stone-200" />
                        </>
                      )}
                      {userRole !== 'admin' && (
                        <>
                          <Link to={userRole === 'artisan' ? "/profile" : "/account"} className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                            My Profile
                          </Link>
                          {userRole === 'artisan' && (
                            <Link to="/products" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                              My Products
                            </Link>
                          )}
                          <Link to="/orders" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                            My Orders
                          </Link>
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
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm"
                  >
                    <span className="text-lg">{categories.find(c => c.id === selectedCategory)?.icon}</span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
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
                  onFocus={() => setShowPopularSearches(true)}
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
            <Link
              to="/"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/find-artisans"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find Artisan
            </Link>
            <Link
              to="/community"
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Community
            </Link>
            {isAuthenticated && (
              <>
                {/* Admin Dashboard Link */}
                {userRole === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                {userRole !== 'admin' && (
                  <>
                    <Link
                      to={userRole === 'artisan' ? "/profile" : "/account"}
                      className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    {userRole === 'artisan' && (
                      <Link
                        to="/products"
                        className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        My Products
                      </Link>
                    )}
                  </>
                )}
              </>
            )}
            {isAuthenticated && (
              <>
                {userRole !== 'admin' && (
                  <Link
                    to="/orders"
                    className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
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
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Join Now
                </Link>
                {cartCount > 0 && (
                  <Link
                    to="/guest-checkout"
                    className="block w-full text-center px-3 py-2 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Guest Checkout ({cartCount})
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
