import React, { useState, useEffect } from 'react';
import config from '../config/environment.js';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  ClockIcon,
  StarIcon,
  HeartIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  TagIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CameraIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FireIcon,
  ClockIcon as ClockIconSolid,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { artisanService } from '../services/artisanService';
import { guestService } from '../services/guestService';
import reviewService from '../services/reviewService';
import { getProfile } from '../services/authservice';
import { favoriteService } from '../services/favoriteService';
import { clearProductCache } from '../services/productService';
import { getCategoryName, getSubcategoryName } from '../data/productReference';
import toast from 'react-hot-toast';

// Helper function to format business type for display
const formatBusinessType = (type) => {
  const typeMap = {
    'farm': 'Farm',
    'bakery': 'Bakery',
    'restaurant': 'Restaurant',
    'cafe': 'Café',
    'market': 'Market',
    'butcher': 'Butcher Shop',
    'dairy': 'Dairy',
    'winery': 'Winery',
    'brewery': 'Brewery',
    'distillery': 'Distillery',
    'food_truck': 'Food Truck',
    'catering': 'Catering',
    'grocery': 'Grocery Store',
    'specialty_shop': 'Specialty Food Shop',
    'fish_market': 'Fish Market',
    'organic_store': 'Organic Store',
    'coffee_roaster': 'Coffee Roaster',
    'tea_house': 'Tea House',
    'chocolate_maker': 'Chocolate Maker',
    'cheese_maker': 'Cheese Maker',
    'honey_producer': 'Honey Producer',
    'maple_syrup': 'Maple Syrup Producer',
    'mushroom_farm': 'Mushroom Farm',
    'herb_garden': 'Herb Garden',
    'greenhouse': 'Greenhouse',
    'orchard': 'Orchard',
    'vineyard': 'Vineyard',
    'microgreens': 'Microgreens Farm',
    'aquaponics': 'Aquaponics Farm',
    'hydroponics': 'Hydroponics Farm',
    'other': 'Other'
  };
  return typeMap[type] || type;
};

// Helper function to check if business is currently open
const isBusinessOpen = (businessHours) => {
  if (!businessHours) return null;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const todayHours = businessHours[currentDay];
  if (!todayHours || todayHours.closed) return false;
  
  if (todayHours.open && todayHours.close) {
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }
  
  return null;
};

// Category icons mapping (same as FindArtisans)
const getCategoryIcon = (category) => {
  const iconMap = {
    'fresh_produce': '🥬',
    'fruits': '🍎',
    'dairy': '🥛',
    'meat': '🥩',
    'seafood': '🐟',
    'bakery': '🥖',
    'beverages': '🥤',
    'preserves': '🍯',
    'herbs': '🌿',
    'grains': '🌾',
    'nuts': '🥜',
    'honey': '🍯',
    'mushrooms': '🍄',
    'microgreens': '🌱',
    'prepared_foods': '🍽️',
    'specialty_items': '⭐',
    'vegetables': '🥬',
    'berries': '🫐',
    'eggs': '🥚',
    'poultry': '🍗',
    'fish': '🐟',
    'bread': '🥖',
    'pastries': '🥐',
    'drinks': '🥤',
    'jams': '🍯',
    'spices': '🌶️',
    'cereals': '🌾',
    'seeds': '🌱',
    'sweeteners': '🍯',
    'sprouts': '🌱',
    'meals': '🍽️',
    'unique': '⭐'
  };
  return iconMap[category] || '📦';
};

// Helper function to get next open time
const getNextOpenTime = (businessHours) => {
  if (!businessHours) return null;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const now = new Date();
  const currentDayIndex = now.getDay();
  
  // Check today first
  const today = days[currentDayIndex === 0 ? 6 : currentDayIndex - 1];
  const todayHours = businessHours[today];
  
  if (todayHours && !todayHours.closed && todayHours.open) {
    return `Opens today at ${todayHours.open}`;
  }
  
  // Check next few days
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDay = days[nextDayIndex === 0 ? 6 : nextDayIndex - 1];
    const nextDayHours = businessHours[nextDay];
    
    if (nextDayHours && !nextDayHours.closed && nextDayHours.open) {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return `Opens ${dayNames[nextDayIndex]} at ${nextDayHours.open}`;
    }
  }
  
  return null;
};



export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [canLeaveReview, setCanLeaveReview] = useState(false);

  useEffect(() => {
    // Get user ID from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.userId);
        loadUserProfile();
      } catch (error) {
        console.error('Error parsing token:', error);
        setUserId(null);
        setUser(null);
        setCanLeaveReview(false);
      }
    } else {
      setUserId(null);
      setUser(null);
      setCanLeaveReview(false);
    }
    
    loadBusinessDetails();
    loadFavorites();
    updateCartCount().catch(console.error);
    loadReviews();
  }, [id]);

  // Populate review form when userReview changes
  useEffect(() => {
    if (userReview) {
      setReviewForm({
        rating: userReview.rating,
        title: userReview.title,
        comment: userReview.comment
      });
    } else {
      setReviewForm({ rating: 5, title: '', comment: '' });
    }
  }, [userReview]);

  const loadUserProfile = async () => {
    try {
      const userData = await getProfile();
      setUser(userData);
      setCanLeaveReview(reviewService.canUserLeaveReview(userData));
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
      setCanLeaveReview(false);
    }
  };

  const loadBusinessDetails = async () => {
    try {
      setIsLoading(true);
      const businessData = await artisanService.getArtisanById(id);
      console.log('Business data loaded:', businessData);
      setBusiness(businessData);
      
      // Load products for this business
      if (businessData.products && Array.isArray(businessData.products)) {
        console.log('Products found:', businessData.products.length);
        setProducts(businessData.products);
      } else {
        console.log('No products found in business data');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading business details:', error);
      toast.error('Failed to load business details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (userId) {
      try {
        setIsLoadingFavorite(true);
        const isFav = await favoriteService.isArtisanFavorited(id);
        setIsFavorited(isFav);
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsFavorited(false);
      } finally {
        setIsLoadingFavorite(false);
      }
    }
  };

  const toggleFavorite = async () => {
    if (!userId) {
      toast.error('Please log in to add favorites');
      return;
    }

    try {
      setIsLoadingFavorite(true);
      const result = await favoriteService.toggleFavorite(id);
      setIsFavorited(result.isFavorited);
      
      const action = result.action === 'added' ? 'added to' : 'removed from';
      toast.success(`${business?.artisanName || 'Artisan'} ${action} favorites`);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    console.log('BusinessDetails addToCart called:', { product: product.name, quantity, userId });
    
    const maxQuantity = getMaxQuantity(product);
    if (quantity > maxQuantity) {
      toast.error(`Only ${maxQuantity} items available`);
      return;
    }
    
    // Ensure we have a valid userId for authenticated users
    let currentUserId = userId;
    if (!currentUserId) {
      // Try to get userId from token if not set
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.userId;
          console.log('Retrieved userId from token:', currentUserId);
        } catch (error) {
          console.error('Error parsing token for userId:', error);
        }
      }
    }
    
    console.log('Final userId for cart operation:', currentUserId);
    
    // Add seller information to product if not present
    const productWithSeller = {
      ...product,
      seller: business?.user || {
        _id: business?.user?._id || 'unknown',
        firstName: business?.user?.firstName || 'Unknown',
        lastName: business?.user?.lastName || 'Artisan',
        email: business?.user?.email || 'unknown@example.com'
      }
    };
    
    console.log('Product with seller:', productWithSeller);
    
    try {
      // Import cartService dynamically to avoid circular dependencies
      const { cartService } = await import('../services/cartService');
      console.log('Calling cartService.addToCart with userId:', currentUserId);
      await cartService.addToCart(productWithSeller, quantity, currentUserId);
      toast.success(`${quantity} ${product.name} added to cart`);
      updateCartCount().catch(console.error);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Only show the specific error message, no generic fallback
      toast.error(error.message);
    }
  };

  const updateCartCount = async () => {
    try {
      const { cartService } = await import('../services/cartService');
      const count = cartService.getCartCount(userId);
      setCartCount(count);
    } catch (error) {
      console.error('Error updating cart count:', error);
      setCartCount(0);
    }
  };

  const loadReviews = async () => {
    try {
      const reviewsData = await reviewService.getArtisanReviews(id);
      setReviews(reviewsData.reviews || []);
      
      // Load user's review if authenticated
      if (userId) {
        try {
          const userReviewData = await reviewService.getUserReview(id);
          console.log('🔍 Loaded user review:', userReviewData);
          setUserReview(userReviewData);
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Error loading user review:', error);
          } else {
            console.log('🔍 No existing user review found (404)');
            setUserReview(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please sign in to leave a review');
      return;
    }

    if (!canLeaveReview) {
      toast.error('Only patrons can leave reviews. Guest users, admins, and artisans cannot leave reviews.');
      return;
    }

    if (!reviewForm.title.trim() || !reviewForm.comment.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmittingReview(true);
    
    try {
      console.log('🔍 Review submission - userReview:', userReview);
      console.log('🔍 Review submission - reviewForm:', reviewForm);
      
      if (userReview) {
        // Update existing review
        console.log('🔍 Updating existing review with ID:', userReview._id);
        await reviewService.updateReview(userReview._id, reviewForm);
        toast.success('Review updated successfully');
      } else {
        // Add new review
        console.log('🔍 Adding new review for artisan:', id);
        await reviewService.addReview(id, reviewForm);
        toast.success('Review added successfully');
      }
      
      // Clear caches to ensure fresh data is loaded
      artisanService.clearArtisanCache(id);
      clearProductCache(id);
      
      // Reload reviews and artisan data to get updated rating
      await loadReviews();
      await loadBusinessDetails(); // Reload artisan data to get updated rating
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    try {
      await reviewService.deleteReview(userReview._id);
      toast.success('Review deleted successfully');
      setUserReview(null);
      
      // Clear caches to ensure fresh data is loaded
      artisanService.clearArtisanCache(id);
      clearProductCache(id);
      
      await loadReviews();
      await loadBusinessDetails(); // Reload artisan data to get updated rating
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Error deleting review');
    }
  };

  // Use imported getImageUrl from imageUtils.js

  // Get available categories and subcategories for this artisan only
  const getAvailableCategories = () => {
    if (!products || products.length === 0) return [];
    const categories = [...new Set(products.map(product => product.category).filter(Boolean))];
    return categories.sort();
  };

  const getAvailableSubcategories = () => {
    if (!products || products.length === 0 || selectedCategory === 'all') return [];
    const categoryProducts = products.filter(product => product.category === selectedCategory);
    const subcategories = [...new Set(categoryProducts.map(product => product.subcategory).filter(Boolean))];
    return subcategories.sort();
  };

  // Get categories and subcategories from products
  const availableCategories = getAvailableCategories();
  const availableSubcategories = getAvailableSubcategories();
  const categories = ['all', ...availableCategories];
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 6);

  // Group products by subcategory
  const getProductsBySubcategory = () => {
    const filteredProducts = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSubcategory = selectedSubcategory === 'all' || product.subcategory === selectedSubcategory;
      
      return matchesSearch && matchesCategory && matchesSubcategory;
    });

    // Group by subcategory
    const grouped = {};
    filteredProducts.forEach(product => {
      const subcategory = product.subcategory || 'Other';
      if (!grouped[subcategory]) {
        grouped[subcategory] = [];
      }
      grouped[subcategory].push(product);
    });

    return grouped;
  };

  const productsBySubcategory = getProductsBySubcategory();
  const subcategories = Object.keys(productsBySubcategory);

  // Helper function to get filtered product count
  const getFilteredProductCount = () => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSubcategory = selectedSubcategory === 'all' || product.subcategory === selectedSubcategory;
      return matchesSearch && matchesCategory && matchesSubcategory;
    }).length;
  };

  // Check if business is open
  const isOpen = isBusinessOpen(business?.artisanHours);
  const nextOpenTime = getNextOpenTime(business?.artisanHours);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business details...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BuildingStorefrontIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Business Not Found</h2>
          <p className="text-gray-600 mb-4">The business you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/find-artisans')}
            className="btn-primary"
          >
            Browse Other Businesses
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Combined Header with Business Info, Status, and About */}
      <div className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Main Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/find-artisans')}
                className="flex items-center space-x-1 text-stone-600 hover:text-stone-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3">
                {business.photos && business.photos.length > 0 && (
                  <img
                    src={business.photos[0]}
                    alt={business.artisanName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold text-stone-800 font-display">{business.artisanName}</h1>
                  <div className="flex items-center space-x-3 text-sm text-stone-600">
                    <div className="flex items-center">
                      <StarIconSolid className="h-4 w-4 text-amber-400 mr-1" />
                      <span className="font-medium">{business.rating?.average || 0}</span>
                      <span className="ml-1">({business.rating?.count || 0} reviews)</span>
                    </div>
                    <span className="text-stone-300">•</span>
                    <span className="font-medium">{formatBusinessType(business.type)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleFavorite}
                disabled={isLoadingFavorite}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {isLoadingFavorite ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                ) : isFavorited ? (
                  <HeartIconSolid className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Business Status and Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Status */}
              {isOpen === true && (
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 text-sm font-medium">Open Now</span>
                </div>
              )}
              {isOpen === false && nextOpenTime && (
                <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-lg">
                  <ClockIconSolid className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-800 text-sm font-medium">{nextOpenTime}</span>
                </div>
              )}

              {/* Divider */}
              <div className="w-px h-6 bg-gray-300"></div>

              {/* Location */}
              <div className="flex items-center space-x-2">
                <MapPinIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {business.address?.city}, {business.address?.state}
                </span>
              </div>

              {/* Phone */}
              {business.contactInfo?.phone && (
                <>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{business.contactInfo.phone}</span>
                  </div>
                </>
              )}

              {/* Email */}
              {business.contactInfo?.email && (
                <>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{business.contactInfo.email}</span>
                  </div>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center space-x-2">
              {business.isVerified && (
                <div className="flex items-center text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  <span>Verified</span>
                </div>
              )}
              {business.isOrganic && (
                <div className="flex items-center text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  <span>Organic</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-700">{business.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>
          </div>
          
          {/* Categories with Enhanced Icons */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Categories:</span>
              <span className="text-xs text-gray-500">({getFilteredProductCount()} products)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedSubcategory('all');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  {category !== 'all' && (
                    <span className="text-lg">{getCategoryIcon(category)}</span>
                  )}
                  <span>{category === 'all' ? 'All Products' : getCategoryName(category)}</span>
                </button>
              ))}
              {categories.length > 6 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
                >
                  {showAllCategories ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      <span>Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      <span>More</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Subcategories */}
          {availableSubcategories.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-sm font-medium text-gray-700">Subcategories:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSubcategory('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedSubcategory === 'all'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  All
                </button>
                {availableSubcategories.map(subcategory => (
                  <button
                    key={subcategory}
                    onClick={() => setSelectedSubcategory(subcategory)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedSubcategory === subcategory
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {getSubcategoryName(selectedCategory, subcategory)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-200">
            <span className="font-medium">{getFilteredProductCount()} product{getFilteredProductCount() !== 1 ? 's' : ''} found</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Products Section */}
        {subcategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
            <TagIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No products found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or category filters
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedSubcategory('all');
              }}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {subcategories.map((subcategory) => (
              <div key={subcategory} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Enhanced Subcategory Header */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{getSubcategoryName(selectedCategory, subcategory)}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {productsBySubcategory[subcategory].length} product{productsBySubcategory[subcategory].length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getCategoryIcon(selectedCategory)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Products Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {productsBySubcategory[subcategory].map((product) => (
                      <ProductCard 
                        key={product._id} 
                        product={product} 
                        onAddToCart={addToCart}
                        getImageUrl={getImageUrl}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Reviews Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Reviews Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <StarIconSolid className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="flex items-center">
                      <StarIconSolid className="h-5 w-5 text-yellow-400 mr-1" />
                      <span className="font-semibold text-lg">{business.rating?.average || 0}</span>
                    </div>
                    <span className="text-gray-600">({business.rating?.count || 0} reviews)</span>
                    {business.rating?.count > 0 && (
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (business.rating?.average || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {userId && canLeaveReview && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
                >
                  {userReview ? 'Edit Review' : 'Write Review'}
                </button>
              )}
              {userId && !canLeaveReview && (
                <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                  {user?.role === 'admin' && 'Admins cannot leave reviews'}
                  {user?.role === 'artisan' && 'Artisans cannot leave reviews'}
                  {user?.isGuest && 'Guest users cannot leave reviews'}
                </div>
              )}
              {!userId && (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  Sign In to Review
                </button>
              )}
            </div>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <StarIcon
                          className={`h-6 w-6 ${
                            star <= reviewForm.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief summary of your experience"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    maxLength={100}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share your experience with this artisan..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    maxLength={1000}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmittingReview ? 'Submitting...' : (userReview ? 'Update Review' : 'Submit Review')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewForm({ rating: 5, title: '', comment: '' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  {userReview && (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete Review
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Helpful Message for Users Who Can't Review */}
          {userId && !canLeaveReview && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-400 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Review Policy
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    {user?.role === 'admin' && (
                      <p>Admin users cannot leave reviews to maintain impartiality. You can still view and manage reviews through the admin dashboard.</p>
                    )}
                    {user?.role === 'artisan' && (
                      <p>Artisan users cannot leave reviews to prevent conflicts of interest. You can still view customer feedback on your own profile.</p>
                    )}
                    {user?.isGuest && (
                      <p>Guest users cannot leave reviews. Please create an account or sign in as a patron to share your experience.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No reviews yet. Be the first to review this artisan!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-medium text-sm">
                          {review.user?.firstName?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.user?.firstName} {review.user?.lastName}
                        </p>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                  )}
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>


      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart, getImageUrl }) {
  const [quantity, setQuantity] = useState(1);
  const [showPopup, setShowPopup] = useState(false);

  // Calculate max quantity based on product type
  const getMaxQuantity = () => {
    switch (product.productType) {
      case 'ready_to_ship':
        return product.stock || 0;
      case 'made_to_order':
        // For made-to-order, use maxOrderQuantity (per order limit)
        return product.maxOrderQuantity || 10;
      case 'scheduled_order':
        return product.availableQuantity || 0;
      default:
        return product.stock || 10;
    }
  };

  const handleAddToCart = async () => {
    await onAddToCart(product, quantity);
    setQuantity(1);
    setShowPopup(false);
  };

  return (
    <>
      <div 
        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer hover:shadow-xl"
        onClick={() => setShowPopup(true)}
        title="Select this artisan product"
      >
        {/* Product Image */}
        <div className="relative h-32 bg-gray-100 group">
          {product.image ? (
            <img
              src={getImageUrl(product.image, { width: 400, height: 300, quality: 80 })}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                console.error('Image failed to load:', getImageUrl(product.image));
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="w-full h-full flex items-center justify-center" style={{ display: product.image ? 'none' : 'flex' }}>
            <CameraIcon className="h-12 w-12 text-gray-400" />
          </div>
          
          {/* Artisan product overlay */}
          {product.image && (
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300 ease-in-out">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-primary rounded-full p-2 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-in-out">
                  <HeartIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {product.status === 'active' ? 'Available' : 'Unavailable'}
            </span>
          </div>

          {/* Dietary Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
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

          {/* Popular Badge */}
          {((product.productType === 'ready_to_ship' && product.stock < 10 && product.stock > 0) ||
            (product.productType === 'made_to_order' && product.totalCapacity < 10 && product.totalCapacity > 0) ||
            (product.productType === 'scheduled_order' && product.availableQuantity < 10 && product.availableQuantity > 0)) && (
            <div className="absolute bottom-2 left-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 flex items-center">
                <FireIcon className="h-3 w-3 mr-1" />
                Popular
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">{product.description}</p>
        
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-orange-600">${product.price}</span>
            <span className="text-xs text-gray-500">/Piece</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {product.productType === 'scheduled_order' 
                ? `Available: ${product.availableQuantity || 0}` 
                : product.productType === 'made_to_order'
                ? `Max: ${product.maxOrderQuantity || 10}/order • Total: ${product.totalCapacity || 10}`
                : `Stock: ${product.stock}`
              }
            </span>
            {product.leadTimeHours && (
              <span className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {product.leadTimeHours}h
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add to Cart Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Product Image in Popup */}
            <div className="relative h-48 bg-gray-100 rounded-lg mb-4">
              {product.image ? (
                <img
                  src={getImageUrl(product.image, { width: 400, height: 300, quality: 80 })}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CameraIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-3">{product.description}</p>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-orange-600">${product.price}</span>
                <span className="text-sm text-gray-500">/Piece</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>
                  {product.productType === 'ready_to_ship' ? `Stock: ${product.stock}` :
                   product.productType === 'made_to_order' ? `Capacity: ${product.totalCapacity || 0}` :
                   `Available: ${product.availableQuantity || 0}`}
                </span>
                {product.leadTimeHours && (
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {product.leadTimeHours}h lead time
                  </span>
                )}
              </div>

              {/* Dietary Info */}
              <div className="flex gap-2 mb-4">
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
                {product.isVegan && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Vegan
                  </span>
                )}
                {product.isHalal && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Halal
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center space-x-3">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(getMaxQuantity(), quantity + 1))}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">Max: {getMaxQuantity()}</span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={product.status !== 'active' || getMaxQuantity() === 0}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {product.status === 'active' && getMaxQuantity() > 0 
                ? `Add ${quantity} to Cart - $${(product.price * quantity).toFixed(2)}`
                : 'Currently Unavailable'
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}

