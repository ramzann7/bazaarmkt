import React, { useState, useEffect } from 'react';
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
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { artisanService } from '../services/artisanService';
import { guestService } from '../services/guestService';
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

// Helper function to format business hours
const formatBusinessHours = (businessHours) => {
  if (!businessHours) return 'Hours not specified';
  
  if (typeof businessHours === 'string') {
    return businessHours;
  }
  
  if (typeof businessHours === 'object' && businessHours !== null) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formattedDays = days.map(day => {
      const dayData = businessHours[day];
      if (!dayData) return null;
      
      if (dayData.closed) {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
      }
      
      if (dayData.open && dayData.close) {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayData.open}-${dayData.close}`;
      }
      
      return null;
    }).filter(Boolean);
    
    return formattedDays.join(', ');
  }
  
  return 'Hours not specified';
};

export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [favorites, setFavorites] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get user ID from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.userId);
      } catch (error) {
        console.error('Error parsing token:', error);
        setUserId(null); // Set to null for guest users
      }
    } else {
      setUserId(null); // Set to null for guest users
    }
    
    loadBusinessDetails();
    loadFavorites();
  }, [id]);

  const loadBusinessDetails = async () => {
    try {
      setIsLoading(true);
      const businessData = await artisanService.getArtisanById(id);
      console.log('Business data loaded:', businessData);
      setBusiness(businessData);
      
      // Load products for this business
      if (businessData.products && Array.isArray(businessData.products)) {
        console.log('Products found:', businessData.products.length);
        console.log('First product:', businessData.products[0]);
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

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('favorite_businesses');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  };

  const toggleFavorite = () => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter(businessId => businessId !== id)
      : [...favorites, id];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite_businesses', JSON.stringify(newFavorites));
    
    const action = favorites.includes(id) ? 'removed from' : 'added to';
    toast.success(`${business?.businessName || 'Business'} ${action} favorites`);
  };

  const addToCart = (product, quantity = 1) => {
    console.log('BusinessDetails addToCart called:', { product: product.name, quantity, userId });
    
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }
    
    // Add seller information to product if not present
    const productWithSeller = {
      ...product,
      seller: business?.user || {
        _id: business?.user?._id || 'unknown',
        firstName: business?.user?.firstName || 'Unknown',
        lastName: business?.user?.lastName || 'Seller',
        email: business?.user?.email || 'unknown@example.com'
      }
    };
    
    console.log('Product with seller:', productWithSeller);
    
    // Import cartService dynamically to avoid circular dependencies
    import('../services/cartService').then(({ cartService }) => {
      console.log('Calling cartService.addToCart with userId:', userId);
      cartService.addToCart(productWithSeller, quantity, userId);
      toast.success(`${quantity} ${product.name} added to cart`);
    });
  };

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it's a local path, prefix with backend URL
    if (imagePath.startsWith('/')) {
      return `http://localhost:4000${imagePath}`;
    }
    
    return imagePath;
  };





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
            onClick={() => navigate('/find-businesses')}
            className="btn-primary"
          >
            Browse Other Businesses
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/find-businesses')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back to Businesses
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleFavorite}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                {favorites.includes(id) ? (
                  <HeartIconSolid className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
              </button>
              
              {/* Debug button for testing cart */}
              <button
                onClick={() => {
                  console.log('Debug: Testing cart with userId:', userId);
                  import('../services/cartService').then(({ cartService }) => {
                    const testProduct = {
                      _id: 'test-product',
                      name: 'Test Product',
                      price: 10.99,
                      unit: 'piece'
                    };
                    cartService.addToCart(testProduct, 1, userId);
                  });
                }}
                className="p-2 text-gray-600 hover:text-blue-500 transition-colors text-xs"
              >
                Test Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 overflow-hidden">
          <div className="relative h-64 bg-gray-100">
            {business.photos && Array.isArray(business.photos) && business.photos.length > 0 ? (
              <img
                src={business.photos[0]} // First photo as primary
                alt={business.businessName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BuildingStorefrontIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
            
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                {formatBusinessType(business.type)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                🏠 Local Business
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {business.businessName}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  {business.description}
                </p>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`h-5 w-5 ${
                          star <= (business.rating?.average || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">
                    ({business.rating?.count || 0} reviews)
                  </span>
                </div>
              </div>
              
              {/* Favorite Button */}
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-lg border ${
                  favorites.includes(id)
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {favorites.includes(id) ? (
                  <HeartIconSolid className="h-5 w-5" />
                ) : (
                  <HeartIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Business Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {business.address && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">
                      {business.address.city}, {business.address.state}
                    </p>
                  </div>
                </div>
              )}
              
              {(business.contactInfo?.phone || business.phone) && (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{business.contactInfo?.phone || business.phone}</p>
                  </div>
                </div>
              )}
              
              {(business.contactInfo?.email || business.email) && (
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{business.contactInfo?.email || business.email}</p>
                  </div>
                </div>
              )}
              
              {business.contactInfo?.website && (
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Website</p>
                    <a 
                      href={business.contactInfo.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-orange-600 hover:text-orange-700"
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Hours</p>
                  <div className="text-xs space-y-0.5">
                    {business.businessHours && (() => {
                      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                      const formattedDays = days.map(day => {
                        const dayData = business.businessHours[day];
                        if (!dayData) return null;
                        
                        const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3);
                        
                        if (dayData.closed) {
                          return (
                            <div key={day} className="flex justify-between">
                              <span>{dayName}:</span>
                              <span className="font-medium ml-2 text-gray-400">Closed</span>
                            </div>
                          );
                        }
                        
                        if (dayData.open && dayData.close) {
                          return (
                            <div key={day} className="flex justify-between">
                              <span>{dayName}:</span>
                              <span className="font-medium ml-2">{dayData.open}-{dayData.close}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={day} className="flex justify-between">
                            <span>{dayName}:</span>
                            <span className="font-medium ml-2 text-gray-400">-</span>
                          </div>
                        );
                      }).filter(Boolean);
                      
                      if (formattedDays.length > 0) {
                        return formattedDays;
                      }
                      return <span className="text-gray-400">Hours not specified</span>;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            {business.contactInfo?.socialMedia && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Follow Us</h4>
                <div className="flex space-x-4">
                  {business.contactInfo.socialMedia.facebook && (
                    <a
                      href={business.contactInfo.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Facebook
                    </a>
                  )}
                  {business.contactInfo.socialMedia.instagram && (
                    <a
                      href={business.contactInfo.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700"
                    >
                      Instagram
                    </a>
                  )}
                  {business.contactInfo.socialMedia.twitter && (
                    <a
                      href={business.contactInfo.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-500"
                    >
                      Twitter/X
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Products ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'about'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab('operations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'operations'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Operations
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'products' && (
              <ProductsTab
                products={products}
                onAddToCart={addToCart}
                userId={userId}
                getImageUrl={getImageUrl}
              />
            )}
            {activeTab === 'about' && (
              <AboutTab business={business} />
            )}
            {activeTab === 'operations' && (
              <OperationsTab business={business} />
            )}
          </div>
        </div>
      </div>


    </div>
  );
}

function ProductsTab({ products, onAddToCart, userId, getImageUrl }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
        
        <p className="text-gray-600">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <TagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">
            Try adjusting your search or category filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product._id} 
              product={product} 
              onAddToCart={onAddToCart}
              getImageUrl={getImageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart, getImageUrl }) {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
  };

  // Debug logging
  console.log('ProductCard render:', product.name, 'Image:', product.image, 'Processed URL:', getImageUrl(product.image));

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-100">
        {product.image ? (
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-cover"
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
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-orange-600">${product.price}</span>
          <span className="text-sm text-gray-500">per {product.unit}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Available: {product.stock}</span>
          {product.leadTimeHours && (
            <span>Ready in: {product.leadTimeHours}h</span>
          )}
        </div>

        {/* Add to Cart */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 border-x border-gray-300">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={product.status !== 'active' || product.stock === 0}
            className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutTab({ business }) {
  return (
    <div className="space-y-6">
      {/* Business Photos Gallery */}
      {business.photos && Array.isArray(business.photos) && business.photos.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {business.photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`${business.businessName} - Photo ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Photo {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Business</h3>
        <p className="text-gray-700 leading-relaxed">
          {business.description || 'No description available.'}
        </p>
      </div>

      {business.specialties && business.specialties.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {business.specialties.map((specialty, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      {business.address && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">{business.businessName}</p>
                <p className="text-gray-600">
                  {business.address.street && `${business.address.street}, `}
                  {business.address.city}, {business.address.state} {business.address.zipCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}



      {business.operationDetails && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {business.operationDetails.yearsInBusiness && (
              <div>
                <p className="text-sm text-gray-600">Years in Business</p>
                <p className="font-medium">{business.operationDetails.yearsInBusiness} years</p>
              </div>
            )}
            
            {business.operationDetails.productionCapacity && (
              <div>
                <p className="text-sm text-gray-600">Production Capacity</p>
                <p className="font-medium">{business.operationDetails.productionCapacity}</p>
              </div>
            )}
            
            {business.operationDetails.farmingMethods && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Farming Methods</p>
                <p className="font-medium">{business.operationDetails.farmingMethods}</p>
              </div>
            )}
            
            {business.operationDetails.sustainabilityPractices && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Sustainability Practices</p>
                <p className="font-medium">{business.operationDetails.sustainabilityPractices}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OperationsTab({ business }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Operations</h3>
        
        {business.operationDetails && (
          <div className="space-y-4">
            {business.operationDetails.productionMethods && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Production Methods</h4>
                <p className="text-gray-700">{business.operationDetails.productionMethods}</p>
              </div>
            )}
            
            {business.operationDetails.equipment && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Equipment & Tools</h4>
                <p className="text-gray-700">{business.operationDetails.equipment}</p>
              </div>
            )}
            
            {business.operationDetails.processes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Production Processes</h4>
                <p className="text-gray-700">{business.operationDetails.processes}</p>
              </div>
            )}
            
            {business.operationDetails.ingredients && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Ingredients & Materials</h4>
                <p className="text-gray-700">{business.operationDetails.ingredients}</p>
              </div>
            )}
            
            {business.operationDetails.facilities && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Facilities & Location</h4>
                <p className="text-gray-700">{business.operationDetails.facilities}</p>
              </div>
            )}
            
            {business.operationDetails.qualityStandards && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quality Standards</h4>
                <p className="text-gray-700">{business.operationDetails.qualityStandards}</p>
              </div>
            )}
            
            {business.operationDetails.certifications && business.operationDetails.certifications.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {business.operationDetails.certifications.map((cert, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
            <TruckIcon className="h-6 w-6 text-gray-400" />
            <div>
              <p className="font-medium">Pickup</p>
              <p className="text-sm text-gray-600">
                {business.deliveryOptions?.pickup ? 'Available' : 'Not available'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
            <TruckIcon className="h-6 w-6 text-gray-400" />
            <div>
              <p className="font-medium">Delivery</p>
              <p className="text-sm text-gray-600">
                {business.deliveryOptions?.delivery ? (
                  <>
                    Available (${business.deliveryOptions.deliveryFee} fee)
                    {business.deliveryOptions.deliveryRadius && (
                      <span className="block">Within {business.deliveryOptions.deliveryRadius}km</span>
                    )}
                  </>
                ) : (
                  'Not available'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {business.businessHours && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Day</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(business.businessHours).map(([day, hours]) => {
                    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                    const hoursText = hours.closed ? 'Closed' : 
                      (hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Hours not specified');
                    return (
                      <tr key={day} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium text-gray-900">{dayName}</td>
                        <td className="py-2 px-3 text-gray-600">{hoursText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

