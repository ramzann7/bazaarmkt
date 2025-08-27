import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  ShoppingBagIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingStorefrontIcon
} from "@heroicons/react/24/outline";
import { authToken, logoutUser, getProfile } from "../services/authService";
import { cartService } from "../services/cartService";
import { guestService } from "../services/guestService";
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">The Bazar</span>
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

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="search-bar pl-12 pr-4"
                />
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
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

            {/* User Menu */}
            {isAuthenticated ? (
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
            ) : (
              <div className="flex items-center space-x-3">
                {cartCount > 0 && (
                  <Link to="/guest-checkout" className="btn-primary bg-green-600 hover:bg-green-700">
                    Guest Checkout ({cartCount})
                  </Link>
                )}
                <Link to="/login" className="btn-secondary">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary">
                  Join Now
                </Link>
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
        <div className="md:hidden py-4">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="search-bar pl-12 pr-4"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
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
            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  className="block px-3 py-2 text-base font-medium text-stone-700 hover:text-amber-600 hover:bg-stone-50 rounded-lg transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
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
