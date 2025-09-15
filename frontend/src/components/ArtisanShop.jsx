import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon, 
  StarIcon,
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
  CameraIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  FireIcon,
  ClockIcon,
  TruckIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  TagIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { artisanService } from '../services/artisanService';
import { favoriteService } from '../services/favoriteService';
import reviewService from '../services/reviewService';
import { getProfile } from '../services/authservice';
import { cartService } from '../services/cartService';
import ProductTypeBadge from './ProductTypeBadge';
import ProductCard from './ProductCard';
import AddToCart from './AddToCart';
import toast from 'react-hot-toast';

export default function ArtisanShop() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    loadArtisanShop();
    // Only load user profile if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      loadUserProfile();
    }
    updateCartCount();
  }, [id]);

  const loadArtisanShop = async () => {
    try {
      setIsLoading(true);
      const artisanData = await artisanService.getArtisanById(id);
      setArtisan(artisanData);
      
      // Handle products - check different possible structures
      let productsData = [];
      console.log('🔍 Artisan data received:', artisanData);
      console.log('🔍 Products field:', artisanData.products);
      
      if (artisanData.products && Array.isArray(artisanData.products)) {
        productsData = artisanData.products;
        console.log('✅ Products is an array, length:', productsData.length);
      } else if (artisanData.products && typeof artisanData.products === 'object') {
        // If products is an object, convert to array
        productsData = Object.values(artisanData.products);
        console.log('✅ Products is an object, converted to array, length:', productsData.length);
      } else {
        console.log('⚠️ No products found in artisan data');
        productsData = [];
      }
      
      console.log('📦 Final products data:', productsData);
      
      // Enhance products with full artisan and seller data
      const enhancedProducts = productsData.map(product => ({
        ...product,
        artisan: {
          _id: artisanData._id,
          artisanName: artisanData.artisanName || artisanData.businessName || artisanData.firstName + ' ' + artisanData.lastName,
          type: artisanData.type || 'other',
          address: artisanData.address,
          deliveryOptions: artisanData.deliveryOptions || {
            pickup: true,
            delivery: false,
            deliveryRadius: 0,
            deliveryFee: 0,
            freeDeliveryThreshold: 0,
            professionalDelivery: {
              enabled: false,
              uberDirectEnabled: false,
              serviceRadius: 25
            }
          },
          pickupLocation: artisanData.pickupLocation,
          pickupInstructions: artisanData.pickupInstructions,
          pickupHours: artisanData.pickupHours,
          deliveryInstructions: artisanData.deliveryInstructions
        },
        seller: {
          _id: artisanData._id,
          artisanName: artisanData.artisanName || artisanData.businessName || artisanData.firstName + ' ' + artisanData.lastName,
          type: artisanData.type || 'other',
          address: artisanData.address,
          deliveryOptions: artisanData.deliveryOptions || {
            pickup: true,
            delivery: false,
            deliveryRadius: 0,
            deliveryFee: 0,
            freeDeliveryThreshold: 0,
            professionalDelivery: {
              enabled: false,
              uberDirectEnabled: false,
              serviceRadius: 25
            }
          },
          pickupLocation: artisanData.pickupLocation,
          pickupInstructions: artisanData.pickupInstructions,
          pickupHours: artisanData.pickupHours,
          deliveryInstructions: artisanData.deliveryInstructions
        },
        sellerId: artisanData._id,
        artisanId: artisanData._id
      }));
      
      setProducts(enhancedProducts);
      
      // Load reviews
      try {
        const reviewsData = await reviewService.getArtisanReviews(id);
        
        // Handle different review data structures
        let reviewsArray = [];
        if (Array.isArray(reviewsData)) {
          reviewsArray = reviewsData;
        } else if (reviewsData && Array.isArray(reviewsData.reviews)) {
          reviewsArray = reviewsData.reviews;
        } else if (reviewsData && Array.isArray(reviewsData.data)) {
          reviewsArray = reviewsData.data;
        } else if (reviewsData && typeof reviewsData === 'object') {
          // If it's an object with review data, try to extract
          reviewsArray = Object.values(reviewsData).filter(item => 
            item && typeof item === 'object' && (item.rating || item.comment)
          );
        }
        
        setReviews(reviewsArray);
      } catch (reviewError) {
        console.error('Error loading reviews:', reviewError);
        setReviews([]);
      }
      
      // Check if user has favorited this artisan
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const isFav = await favoriteService.isArtisanFavorited(id);
          setIsFavorited(isFav);
        } catch (error) {
          console.error('Error checking favorite status:', error);
        }
      }
    } catch (error) {
      console.error('Error loading artisan shop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping user profile load');
        return;
      }
      
      const userData = await getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // If there's an auth error, clear the user state
      if (error.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('token');
      }
    }
  };

  const updateCartCount = async () => {
    try {
      const count = await cartService.getCartItemCount();
      setCartCount(count);
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to follow artisans');
      return;
    }

    try {
      setIsLoadingFavorite(true);
      if (isFavorited) {
        await favoriteService.removeFavoriteArtisan(id);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await favoriteService.addFavoriteArtisan(id);
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowCartPopup(true);
    setQuantity(1);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      // For guest users, pass null as userId to use guest cart
      const userId = user ? user._id : null;
      await cartService.addToCart(product, quantity, userId);
      setShowCartPopup(false);
      setSelectedProduct(null);
      updateCartCount();
      toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to leave a review');
      return;
    }

    if (!newReview.title.trim() || !newReview.comment.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmittingReview(true);
      await reviewService.addReview(id, {
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment
      });
      
      // Reload reviews
      const reviewsData = await reviewService.getArtisanReviews(id);
      let reviewsArray = [];
      if (Array.isArray(reviewsData)) {
        reviewsArray = reviewsData;
      } else if (reviewsData && Array.isArray(reviewsData.reviews)) {
        reviewsArray = reviewsData.reviews;
      } else if (reviewsData && Array.isArray(reviewsData.data)) {
        reviewsArray = reviewsData.data;
      }
      setReviews(reviewsArray);
      
      // Reset form
      setNewReview({
        rating: 5,
        title: '',
        comment: ''
      });
      setShowReviewForm(false);
      
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      // Handle base64 data URLs
      if (image.startsWith('data:')) return image;
      
      // Handle HTTP URLs
      if (image.startsWith('http')) return image;
      
      // Check if the image path already contains /uploads/products/
      if (image.startsWith('/uploads/products/')) {
        return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${image}`;
      }
      
      // Check if the image path starts with uploads/products/ (without leading slash)
      if (image.startsWith('uploads/products/')) {
        return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${image}`;
      }
      
      // Default case: add /uploads/products/ prefix
      return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/uploads/products/${image}`;
    }
    return null;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const formatLocation = (location) => {
    if (typeof location === 'string') return location;
    if (location && typeof location === 'object') {
      const parts = [];
      if (location.city) parts.push(location.city);
      if (location.state) parts.push(location.state);
      return parts.join(', ');
    }
    return 'Location not specified';
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<StarIconSolid key={i} className="w-4 h-4 text-amber-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarIcon key={fullStars} className="w-4 h-4 text-amber-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarIcon key={fullStars + (hasHalfStar ? 1 : 0) + i} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return '0.0';
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  // Get unique categories from products
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  
  // Filter products by category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D77A61] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artisan shop...</p>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 font-serif">Artisan Not Found</h1>
          <p className="text-gray-600 mb-4">The artisan you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#D77A61] text-white px-6 py-2 rounded-lg hover:bg-[#3C6E47] transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Sticky Header with Cart and Follow */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E6B655] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-[#D77A61] transition-colors"
              >
                <ArrowRightIcon className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 truncate font-serif">
                {artisan.artisanName}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleFavorite}
                disabled={isLoadingFavorite}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                  isFavorited 
                    ? 'bg-[#F5F1EA] border-[#D77A61] text-[#D77A61] hover:bg-[#D77A61] hover:text-white' 
                    : 'bg-white border-[#E6B655] text-gray-700 hover:bg-[#F5F1EA]'
                }`}
              >
                {isFavorited ? (
                  <HeartIconSolid className="w-4 h-4" />
                ) : (
                  <HeartIcon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isFavorited ? 'Following' : 'Follow'}</span>
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center space-x-2 px-3 py-2 bg-[#D77A61] text-white rounded-lg hover:bg-[#3C6E47] transition-colors"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Cart ({cartCount})</span>
                <span className="sm:hidden">{cartCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compressed Hero Section */}
      <div className="relative bg-gradient-to-r from-[#F5F1EA] to-[#E6B655]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Business Info - Left Side */}
            <div className="w-full lg:w-1/3">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900 font-serif">
                    {artisan.artisanName || artisan.name || artisan.shopName || 'Artisan Shop'}
                  </h1>
                  {artisan.isVerified && (
                    <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Verified
                    </div>
                  )}
                </div>
                
                {(artisan.tagline || artisan.bio || artisan.description) && (
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {artisan.tagline || artisan.bio || artisan.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(parseFloat(getAverageRating()))}
                    <span className="text-sm text-gray-600">
                      {getAverageRating()} ({reviews.length} reviews)
                    </span>
                  </div>
                  
                  {(artisan.location || artisan.city || artisan.address) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      <span>{formatLocation(artisan.location || artisan.city || artisan.address)}</span>
                    </div>
                  )}
                </div>

                {/* Shop Now Button */}
                <button
                  onClick={() => document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' })}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Shop Now
                </button>
              </div>
            </div>

            {/* Business Image Banner - Right Side */}
            <div className="w-full lg:w-2/3">
              <div className="h-64 md:h-80 bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl relative overflow-hidden">
                {artisan.businessImage || artisan.bannerImage || artisan.banner || artisan.shopBanner ? (
                  <img 
                    src={getImageUrl(artisan.businessImage || artisan.bannerImage || artisan.banner || artisan.shopBanner)} 
                    alt={`${artisan.artisanName} business`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center ${artisan.businessImage || artisan.bannerImage || artisan.banner || artisan.shopBanner ? 'hidden' : ''}`}>
                  <CameraIcon className="w-16 h-16 text-white opacity-50" />
                </div>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About the Maker - Collapsible */}
      {artisan.bio && (
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-bold text-gray-900">About the Maker</h2>
              {showAbout ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {showAbout && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  {artisan.bio}
                </p>
                {(artisan.location || artisan.city || artisan.address) && (
                  <div className="flex items-center mt-3 text-orange-600">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    <span className="font-medium">{formatLocation(artisan.location || artisan.city || artisan.address)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Product Catalog Section */}
      <section id="products-section" className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
            {/* Sidebar Filters */}
            <div className="lg:w-64 mb-6 lg:mb-0">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <FunnelIcon className="w-4 h-4 mr-2" />
                      Filters
                    </h3>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden"
                    >
                      {showFilters ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  
                  <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
                    <div className="space-y-2">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === category
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {category === 'all' ? 'All Products' : category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Products ({filteredProducts.length})
                </h2>
              </div>

              {/* Inventory Summary */}
              {filteredProducts.length > 0 && (
                <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Inventory Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(() => {
                      const readyToShipProducts = filteredProducts.filter(p => p.productType === 'ready_to_ship');
                      const inStockProducts = readyToShipProducts.filter(p => (p.stock || 0) > 0);
                      const outOfStockProducts = readyToShipProducts.filter(p => (p.stock || 0) <= 0);
                      const lowStockProducts = readyToShipProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
                      const madeToOrderProducts = filteredProducts.filter(p => p.productType === 'made_to_order');
                      const scheduledProducts = filteredProducts.filter(p => p.productType === 'scheduled_order');

                      return (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{inStockProducts.length}</div>
                            <div className="text-sm text-gray-600">In Stock</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
                            <div className="text-sm text-gray-600">Low Stock</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
                            <div className="text-sm text-gray-600">Out of Stock</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{madeToOrderProducts.length + scheduledProducts.length}</div>
                            <div className="text-sm text-gray-600">Custom Orders</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      showDistance={false}
                      showImagePreview={true}
                      onProductClick={handleProductClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TagIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-gray-500">
                    {selectedCategory === 'all' 
                      ? 'This artisan hasn\'t added any products yet.'
                      : `No products found in the ${selectedCategory} category.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(parseFloat(getAverageRating()))}
                <span className="text-sm text-gray-600">
                  {getAverageRating()} ({reviews.length} reviews)
                </span>
              </div>
            </div>
          </div>
          
          {/* All Reviews */}
          {reviews.length > 0 ? (
            <div className="space-y-4 mb-8">
              {reviews.map((review) => (
                <div key={review._id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-amber-300 flex items-center justify-center mr-3">
                      <UserIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {review.user?.firstName} {review.user?.lastName?.charAt(0)}.
                      </p>
                      <div className="flex items-center">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                  )}
                  <p className="text-gray-700 leading-relaxed">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-500">Be the first to leave a review for this artisan!</p>
            </div>
          )}
          
          {/* Leave a Review Section */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Leave a Review</h3>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                {showReviewForm ? 'Cancel' : 'Write Review'}
              </button>
            </div>
            
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-xl p-6">
                <div className="space-y-4">
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="focus:outline-none"
                        >
                          {star <= newReview.rating ? (
                            <StarIconSolid className="w-6 h-6 text-orange-400" />
                          ) : (
                            <StarIcon className="w-6 h-6 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newReview.title}
                      onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Summarize your experience"
                      maxLength={100}
                    />
                  </div>
                  
                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      placeholder="Share your experience with this artisan..."
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {newReview.comment.length}/500
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Product Cart Popup */}
      {showCartPopup && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
              <button
                onClick={() => setShowCartPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* Product Image */}
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <img
                    src={getImageUrl(selectedProduct.images[0])}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('❌ ArtisanShop image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      console.log('✅ ArtisanShop image loaded successfully:', e.target.src);
                    }}
                  />
                ) : selectedProduct.image ? (
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('❌ ArtisanShop image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    onLoad={(e) => {
                      console.log('✅ ArtisanShop image loaded successfully:', e.target.src);
                    }}
                  />
                ) : null}
                <div className={`w-full h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center ${(selectedProduct.images && selectedProduct.images.length > 0) || selectedProduct.image ? 'hidden' : 'flex'}`}>
                  <CameraIcon className="w-12 h-12 text-orange-400" />
                </div>
              </div>
            </div>
            
            {/* Product Info */}
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h4>
                {selectedProduct.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedProduct.description}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-orange-600">
                  {formatPrice(selectedProduct.price)}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedProduct.unit || 'piece'}
                </span>
              </div>
              
              {/* Stock and Lead Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">
                    {selectedProduct.productType === 'ready_to_ship' ? 'Stock' :
                     selectedProduct.productType === 'made_to_order' ? 'Total Capacity' :
                     'Available Quantity'}
                  </div>
                  <div className="font-semibold text-gray-900">
                    {selectedProduct.productType === 'ready_to_ship' ? 
                      (selectedProduct.stock > 0 ? `${selectedProduct.stock} available` : 'Out of stock') :
                     selectedProduct.productType === 'made_to_order' ? 
                      `${selectedProduct.totalCapacity || 0} capacity` :
                      `${selectedProduct.availableQuantity || 0} available`}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">Lead Time</div>
                  <div className="font-semibold text-gray-900">
                    {selectedProduct.leadTime ? `${selectedProduct.leadTime} ${selectedProduct.leadTimeUnit || 'days'}` : 'Contact artisan'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Add to Cart Component */}
            <AddToCart 
              product={selectedProduct}
              variant="modal"
              onSuccess={(product, quantity) => {
                setShowCartPopup(false);
                setSelectedProduct(null);
                toast.success(`Added ${quantity} ${quantity === 1 ? product.unit || 'piece' : product.unit + 's'} to cart!`);
              }}
              onError={(error) => {
                console.error('Add to cart error:', error);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

