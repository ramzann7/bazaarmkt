import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import config from '../config/environment.js';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { useParams, useNavigate } from 'react-router-dom';
import { generateUniqueSlug, extractIdFromSlug, isObjectId } from '../utils/slugUtils';
import { 
  MapPinIcon, 
  StarIcon,
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
  CameraIcon,
  PlusIcon,
  MinusIcon,
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
import SocialShare from './SocialShare';
import SocialMetaTags from './SocialMetaTags';
import AuthPopup from './AuthPopup';
import toast from 'react-hot-toast';

export default function ArtisanShop() {
  const { t } = useTranslation();
  const { id: slugOrId } = useParams();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState(null);
  const [artisanSlug, setArtisanSlug] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authAction, setAuthAction] = useState('');

  useEffect(() => {
    loadArtisanShop();
    // Only load user profile if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      loadUserProfile();
    }
    updateCartCount();
  }, [slugOrId]);

  const loadArtisanShop = async () => {
    try {
      setIsLoading(true);
      
      // Extract ID from slug or use as-is if it's already an ID
      let artisanId = slugOrId;
      if (!isObjectId(slugOrId)) {
        // Try to extract ID from slug (format: artisan-name-3e2e8948)
        const extractedId = extractIdFromSlug(slugOrId);
        if (extractedId) {
          artisanId = extractedId;
        } else {
          // If no ID in slug, the backend will try to find by slug field
          artisanId = slugOrId;
        }
      }
      
      const artisanData = await artisanService.getArtisanById(artisanId);
      setArtisan(artisanData);
      
      // Generate slug for this artisan for friendly URLs
      const slug = generateUniqueSlug(artisanData.artisanName || artisanData.businessName, artisanData._id);
      setArtisanSlug(slug);
      
      // If user visited with ObjectId, replace URL with friendly slug
      if (isObjectId(slugOrId)) {
        console.log('🔄 Replacing ObjectId URL with friendly slug:', slug);
        navigate(`/artisan/${slug}`, { replace: true });
      }
      
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
        const reviewsData = await reviewService.getArtisanReviews(artisanData._id);
        console.log('🔍 Reviews data received:', reviewsData);
        
        // Handle different review data structures
        let reviewsArray = [];
        if (Array.isArray(reviewsData)) {
          reviewsArray = reviewsData;
        } else if (reviewsData && Array.isArray(reviewsData.reviews)) {
          reviewsArray = reviewsData.reviews;
        } else if (reviewsData && reviewsData.data && Array.isArray(reviewsData.data.reviews)) {
          reviewsArray = reviewsData.data.reviews;
        } else if (reviewsData && Array.isArray(reviewsData.data)) {
          reviewsArray = reviewsData.data;
        } else if (reviewsData && typeof reviewsData === 'object') {
          // If it's an object with review data, try to extract
          reviewsArray = Object.values(reviewsData).filter(item => 
            item && typeof item === 'object' && (item.rating || item.comment)
          );
        }
        
        console.log('🔍 Processed reviews array:', reviewsArray);
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
      updateCartCount();
      toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Only show the specific error message, no generic fallback
      toast.error(error.message);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setAuthAction('leave a review');
      setShowAuthPopup(true);
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
      } else if (reviewsData && reviewsData.data && Array.isArray(reviewsData.data.reviews)) {
        reviewsArray = reviewsData.data.reviews;
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
      stars.push(<StarIconSolid key={i} className="w-4 h-4 text-primary-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarIcon key={fullStars} className="w-4 h-4 text-primary-400" />);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted">Loading artisan shop...</p>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-4 font-display">Artisan Not Found</h1>
          <p className="text-muted mb-4">The artisan you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Social Media Meta Tags */}
      {artisan && (
        <SocialMetaTags
          title={`${artisan.artisanName || artisan.businessName || 'Artisan Shop'} - Handmade Products`}
          description={`Discover unique handmade products from ${artisan.artisanName || artisan.businessName || 'this talented artisan'}. ${artisan.tagline || artisan.bio || 'Support local artisans and find one-of-a-kind items!'}`}
          image={artisan.images?.business || artisan.bannerImage || artisan.banner || artisan.shopBanner || '/default-artisan-banner.jpg'}
          url={window.location.href}
          type="website"
          siteName="Artisan Marketplace"
        />
      )}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-accent/5 to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Business Info - Left Side */}
            <div className="w-full lg:w-1/3">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="text-muted hover:text-accent transition-colors"
                  >
                    <ArrowRightIcon className="w-5 h-5 rotate-180" />
                  </button>
                  <h1 className="text-3xl font-bold text-text font-display">
                    {artisan.artisanName || artisan.name || artisan.shopName || 'Artisan Shop'}
                  </h1>
                  {artisan.status?.isVerified && (
                    <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Verified
                    </div>
                  )}
                </div>
                
                {(artisan.tagline || artisan.bio || artisan.description) && (
                  <p className="text-lg text-muted leading-relaxed">
                    {artisan.tagline || artisan.bio || artisan.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(parseFloat(getAverageRating()))}
                    <span className="text-sm text-muted">
                      {getAverageRating()} ({reviews.length} reviews)
                    </span>
                  </div>
                  
                  {(artisan.location || artisan.city || artisan.address) && (
                    <div className="flex items-center text-sm text-muted">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      <span>{formatLocation(artisan.location || artisan.city || artisan.address)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-start gap-3">
                  <button
                    onClick={toggleFavorite}
                    disabled={isLoadingFavorite}
                    className={`btn-small flex items-center gap-2 ${
                      isFavorited 
                        ? 'btn-primary' 
                        : 'btn-secondary'
                    }`}
                  >
                    {isFavorited ? (
                      <HeartIconSolid className="w-4 h-4" />
                    ) : (
                      <HeartIcon className="w-4 h-4" />
                    )}
                    {isFavorited ? 'Following' : 'Follow'}
                  </button>
                  
                  <SocialShare
                    artisan={artisan}
                    shareUrl={artisanSlug ? `${window.location.origin}/artisan/${artisanSlug}` : window.location.href}
                    shareTitle={`Check out ${artisan?.artisanName || artisan?.businessName || 'this amazing artisan shop'}!`}
                    shareDescription={`Discover unique handmade products from ${artisan?.artisanName || artisan?.businessName || 'this talented artisan'}. ${artisan?.tagline || artisan?.bio || 'Support local artisans and find one-of-a-kind items!'}`}
                    className="btn-small btn-secondary flex items-center gap-2"
                  />
                </div>
              </div>
            </div>

            {/* Business Image Banner - Right Side */}
            <div className="w-full lg:w-2/3">
              <div className="h-64 md:h-80 bg-gradient-to-r from-accent/20 to-accent/10 rounded-2xl relative overflow-hidden">
                {artisan.images?.business || artisan.bannerImage || artisan.banner || artisan.shopBanner ? (
                  <img 
                    src={getImageUrl(artisan.images?.business || artisan.bannerImage || artisan.banner || artisan.shopBanner, { width: 800, height: 300, quality: 85 })} 
                    alt={`${artisan.artisanName} business`}
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, 'artisan-banner')}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-accent/30 to-accent/20 flex items-center justify-center ${artisan.images?.business || artisan.bannerImage || artisan.banner || artisan.shopBanner ? 'hidden' : ''}`}>
                  <CameraIcon className="w-16 h-16 text-accent opacity-50" />
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
        <section className="bg-card border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-bold text-text">About the Maker</h2>
              {showAbout ? (
                <ChevronUpIcon className="w-5 h-5 text-muted" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-muted" />
              )}
            </button>
            
            {showAbout && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-muted leading-relaxed">
                  {artisan.bio}
                </p>
                {(artisan.location || artisan.city || artisan.address) && (
                  <div className="flex items-center mt-3 text-accent">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="sticky top-4 bg-transparent py-3 z-10 mb-6">
            <div className="flex items-center gap-3 bg-white/85 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-gray-100/30">
              {/* Category Filters - Horizontal Scroll */}
              <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2.5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      selectedCategory === category
                        ? 'bg-accent text-white border-transparent'
                        : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {category === 'all' ? 'All Products' : category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-600">
                  {filteredProducts.length} products
                </span>
              </div>
            </div>
          </div>

          {/* Product Grid Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">
              Products ({filteredProducts.length})
            </h2>
          </div>

          {/* Product Grid */}
          <div>


              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      showDistance={false}
                      showImagePreview={true}
                      showRating={false}
                      showVisitShop={false}
                      showAddToCart={true}
                      compact={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TagIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-text mb-2">No Products Found</h3>
                  <p className="text-muted">
                    {selectedCategory === 'all' 
                      ? 'This artisan hasn\'t added any products yet.'
                      : `No products found in the ${selectedCategory} category.`
                    }
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="bg-card py-8 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Customer Reviews</h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(parseFloat(getAverageRating()))}
                <span className="text-sm text-muted">
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


      {/* Authentication Popup */}
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        action={authAction}
      />

    </div>
  );
}

