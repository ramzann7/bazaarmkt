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
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { artisanService } from '../services/artisanService';
import { favoriteService } from '../services/favoriteService';
import reviewService from '../services/reviewService';
import { getProfile } from '../services/authservice';
import { cartService } from '../services/cartService';
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

  useEffect(() => {
    loadArtisanShop();
    loadUserProfile();
    updateCartCount();
  }, [id]);

  const loadArtisanShop = async () => {
    try {
      setIsLoading(true);
      const artisanData = await artisanService.getArtisanById(id);
      setArtisan(artisanData);
      
      // Handle products - check different possible structures
      let productsData = [];
      if (artisanData.products && Array.isArray(artisanData.products)) {
        productsData = artisanData.products;
      } else if (artisanData.products && typeof artisanData.products === 'object') {
        // If products is an object, convert to array
        productsData = Object.values(artisanData.products);
      }
      
      setProducts(productsData);
      
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
        
        setReviews(reviewsArray.slice(0, 5)); // Show latest 5 reviews
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
        } catch (favoriteError) {
          console.error('Error checking favorite status:', favoriteError);
          setIsFavorited(false);
        }
      }
    } catch (error) {
      console.error('Error loading artisan shop:', error);
      toast.error('Failed to load artisan shop');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await getProfile();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const updateCartCount = async () => {
    try {
      const count = await cartService.getCartCount();
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
      const result = await favoriteService.toggleFavorite(id);
      setIsFavorited(result.isFavorited);
      
      const action = result.action === 'added' ? 'followed' : 'unfollowed';
      toast.success(`Successfully ${action} ${artisan?.artisanName || 'this artisan'}`);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      toast.error('Please log in to add items to cart');
      return;
    }

    try {
      await cartService.addToCart(product, quantity, user._id);
      toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart`);
      setShowCartPopup(false);
      setSelectedProduct(null);
      setQuantity(1);
      updateCartCount();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowCartPopup(true);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price);
  };

  const formatLocation = (location) => {
    if (!location) return '';
    
    // If location is an object with address properties
    if (typeof location === 'object' && location !== null) {
      if (location.street && location.city) {
        return `${location.city}, ${location.state || ''}`.trim();
      } else if (location.city) {
        return location.city;
      } else if (location.address) {
        return location.address;
      } else {
        // Try to extract any string value from the object
        const values = Object.values(location).filter(val => typeof val === 'string' && val.trim());
        return values.length > 0 ? values[0] : '';
      }
    }
    
    // If location is already a string
    return String(location);
  };

  const getAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIconSolid 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  const filteredProducts = products.filter(product => {
    if (selectedCategory !== 'all' && product.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200"></div>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Artisan Not Found</h1>
          <p className="text-gray-600 mb-4">The artisan you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header / Hero Section */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-64 md:h-80 bg-gradient-to-r from-amber-400 to-orange-500 relative overflow-hidden">
          {artisan.bannerImage || artisan.banner || artisan.shopBanner ? (
            <img 
              src={artisan.bannerImage || artisan.banner || artisan.shopBanner} 
              alt={`${artisan.artisanName} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center ${artisan.bannerImage || artisan.banner || artisan.shopBanner ? 'hidden' : ''}`}>
            <CameraIcon className="w-16 h-16 text-white opacity-50" />
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          
          {/* Profile Image */}
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
              {artisan.profileImage || artisan.profile || artisan.avatar ? (
                <img 
                  src={artisan.profileImage || artisan.profile || artisan.avatar} 
                  alt={artisan.artisanName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center ${artisan.profileImage || artisan.profile || artisan.avatar ? 'hidden' : ''}`}>
                <UserIcon className="w-12 h-12 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Shop Info */}
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {artisan.artisanName || artisan.name || artisan.shopName || 'Artisan Shop'}
              </h1>
              
              {(artisan.tagline || artisan.bio || artisan.description) && (
                <p className="text-lg text-gray-600 mb-3 italic">
                  "{artisan.tagline || artisan.bio || artisan.description}"
                </p>
              )}
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {renderStars(parseFloat(getAverageRating()))}
                  <span className="text-sm text-gray-600 ml-1">
                    {getAverageRating()} ({reviews.length} reviews)
                  </span>
                </div>
                
                {(artisan.location || artisan.city || artisan.address) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {formatLocation(artisan.location || artisan.city || artisan.address)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <button
                onClick={toggleFavorite}
                disabled={isLoadingFavorite}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  isFavorited 
                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isFavorited ? (
                  <HeartIconSolid className="w-5 h-5" />
                ) : (
                  <HeartIcon className="w-5 h-5" />
                )}
                <span>{isFavorited ? 'Following' : 'Follow'}</span>
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span>Cart ({cartCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Story Section */}
      {artisan.bio && (
        <section className="bg-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-amber-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About the Maker</h2>
              <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-amber-200 to-orange-300">
                    {artisan.profileImage ? (
                      <img 
                        src={artisan.profileImage} 
                        alt={artisan.artisanName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-amber-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {artisan.bio}
                  </p>
                  {(artisan.location || artisan.city || artisan.address) && (
                    <div className="flex items-center mt-4 text-amber-600">
                      <MapPinIcon className="w-5 h-5 mr-2" />
                      <span className="font-medium">{formatLocation(artisan.location || artisan.city || artisan.address)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Product Catalog Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Products</h2>
            <div className="flex items-center space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All' : category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center ${(product.images && product.images.length > 0) || product.image ? 'hidden' : ''}`}>
                      <CameraIcon className="w-12 h-12 text-amber-400" />
                    </div>
                    
                    {product.isFeatured && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Featured
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-amber-600">
                        {formatPrice(product.price)}
                      </span>
                      <button className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 transition-colors">
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
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
      </section>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className="bg-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Customers Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div key={review._id} className="bg-amber-50 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center mr-3">
                      <UserIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
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
                  <p className="text-gray-700 text-sm leading-relaxed">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Support Local Artisans</h2>
          <p className="text-amber-100 mb-8 text-lg">
            Every purchase supports a local maker and helps keep traditional crafts alive.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={toggleFavorite}
              disabled={isLoadingFavorite}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-amber-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <HeartIcon className="w-5 h-5" />
              <span>{isFavorited ? 'Following' : 'Follow This Maker'}</span>
            </button>
            
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center space-x-2 px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span>View Cart ({cartCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Product Cart Popup */}
      {showCartPopup && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add to Cart</h3>
              <button
                onClick={() => setShowCartPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <CameraIcon className="w-8 h-8 text-amber-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{selectedProduct.name}</h4>
                <p className="text-lg font-bold text-amber-600">
                  {formatPrice(selectedProduct.price)}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 99}
                  className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className="text-lg font-bold text-amber-600">
                {formatPrice(selectedProduct.price * quantity)}
              </span>
            </div>
            
            <button
              onClick={() => handleAddToCart(selectedProduct)}
              className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
