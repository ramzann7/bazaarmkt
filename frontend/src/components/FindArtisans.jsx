import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  StarIcon, 
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { artisanService } from '../services/artisanService';

export default function FindArtisans() {
  const [artisans, setArtisans] = useState([]);
  const [filteredArtisans, setFilteredArtisans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const navigate = useNavigate();

  // Artisan types for filtering
  const artisanTypes = [
    { value: 'all', label: 'All Artisan Types' },
    { value: 'farm', label: 'Farm' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'cheese_maker', label: 'Cheese Maker' },
    { value: 'winery', label: 'Winery' },
    { value: 'vineyard', label: 'Vineyard' },
    { value: 'honey_producer', label: 'Honey Producer' },
    { value: 'chocolate_maker', label: 'Chocolate Maker' },
    { value: 'coffee_roaster', label: 'Coffee Roaster' },
    { value: 'fish_market', label: 'Fish Market' },
    { value: 'herb_garden', label: 'Herb Garden' },
    { value: 'mushroom_farm', label: 'Mushroom Farm' },
    { value: 'orchard', label: 'Orchard' }
  ];

  // Artisan type cards for selection
  const artisanTypeCards = [
    { id: 'all', name: 'All Artisans', icon: '🏪', description: 'Discover all local artisans' },
    { id: 'bakery', name: 'Bakeries', icon: '🥖', description: 'Fresh breads and pastries' },
    { id: 'farm', name: 'Local Farms', icon: '🌾', description: 'Fresh produce and farm goods' },
    { id: 'dairy', name: 'Dairy & Cheese', icon: '🧀', description: 'Fresh dairy products' },
    { id: 'cheese_maker', name: 'Cheese Makers', icon: '🧀', description: 'Artisan cheese products' },
    { id: 'winery', name: 'Wineries', icon: '🍷', description: 'Local wines and vineyards' },
    { id: 'vineyard', name: 'Vineyards', icon: '🍇', description: 'Premium wine grapes' },
    { id: 'honey_producer', name: 'Honey Producers', icon: '🍯', description: 'Pure local honey' },
    { id: 'chocolate_maker', name: 'Chocolate Makers', icon: '🍫', description: 'Artisan chocolates' },
    { id: 'coffee_roaster', name: 'Coffee Roasters', icon: '☕', description: 'Fresh roasted coffee' },
    { id: 'fish_market', name: 'Fish Markets', icon: '🐟', description: 'Fresh seafood' },
    { id: 'herb_garden', name: 'Herb Gardens', icon: '🌿', description: 'Fresh herbs and spices' },
    { id: 'mushroom_farm', name: 'Mushroom Farms', icon: '🍄', description: 'Fresh mushrooms' },
    { id: 'orchard', name: 'Orchards', icon: '🍎', description: 'Fresh fruits and nuts' }
  ];

  // Categories for filtering
  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'fresh_produce', label: 'Fresh Produce & Vegetables' },
    { value: 'fruits', label: 'Fruits & Berries' },
    { value: 'dairy', label: 'Dairy & Eggs' },
    { value: 'meat', label: 'Meat & Poultry' },
    { value: 'seafood', label: 'Seafood & Fish' },
    { value: 'bakery', label: 'Bread & Pastries' },
    { value: 'beverages', label: 'Beverages & Drinks' },
    { value: 'preserves', label: 'Preserves & Jams' },
    { value: 'herbs', label: 'Herbs & Spices' },
    { value: 'grains', label: 'Grains & Cereals' },
    { value: 'nuts', label: 'Nuts & Seeds' },
    { value: 'honey', label: 'Honey & Sweeteners' },
    { value: 'mushrooms', label: 'Mushrooms' },
    { value: 'microgreens', label: 'Microgreens & Sprouts' },
    { value: 'prepared_foods', label: 'Prepared Foods' },
    { value: 'specialty_items', label: 'Specialty Items' },
  ];

  // Load all artisans when component mounts
  useEffect(() => {
    loadAllArtisans();
  }, []);



  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Search through API
      await searchArtisans();
    } else {
      // If search is empty, reload all artisans
      await loadAllArtisans();
    }
  };

  const searchArtisans = async () => {
    try {
      setIsLoading(true);
      const response = await artisanService.getAllArtisans({ 
        includeProducts: false,
        search: searchTerm
      });
      setArtisans(response || []);
      setFilteredArtisans(response || []);
    } catch (error) {
      console.error('Error searching artisans:', error);
      toast.error('Failed to search artisans');
      setArtisans([]);
      setFilteredArtisans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    
    let filtered = artisans || [];

    // Apply search term filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(artisan =>
        artisan.artisanName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artisan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artisan.type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply artisan type filter
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter(artisan => artisan.type === selectedType);
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(artisan =>
        artisan.categories?.includes(selectedCategory)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.artisanName || '').localeCompare(b.artisanName || '');
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        default:
          return 0;
      }
    });

    setFilteredArtisans(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [artisans, selectedType, selectedCategory, sortBy]);

  const handleArtisanTypeSelect = async (typeId) => {
    setSelectedType(typeId);
    setSelectedCategory('');
    
    // Load artisans when a category is selected
    if (typeId && typeId !== 'all') {
      await loadArtisansByType(typeId);
    } else {
      // Load all artisans when "All Artisans" is selected
      await loadAllArtisans();
    }
  };

  const loadAllArtisans = async () => {
    try {
      setIsLoading(true);
      const response = await artisanService.getAllArtisans({ 
        includeProducts: false
      });
      setArtisans(response || []);
      setFilteredArtisans(response || []);
      setSelectedType('all'); // Set selectedType to 'all' when loading all artisans
    } catch (error) {
      console.error('Error loading all artisans:', error);
      toast.error('Failed to load artisans');
      setArtisans([]);
      setFilteredArtisans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadArtisansByType = async (artisanType) => {
    try {
      setIsLoading(true);
      console.log('Loading artisans for type:', artisanType);
      const response = await artisanService.getAllArtisans({ 
        includeProducts: false,
        type: artisanType 
      });
      console.log('Response received:', response);
      setArtisans(response || []);
      setFilteredArtisans(response || []);
    } catch (error) {
      console.error('Error loading artisans by type:', error);
      toast.error('Failed to load artisans');
      setArtisans([]);
      setFilteredArtisans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType(null);
    setSelectedCategory('');
    setSortBy('name');
    setArtisans([]);
    setFilteredArtisans([]);
    setIsLoading(false);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle different photo data structures
    if (typeof imagePath === 'object' && imagePath.url) {
      // Handle object format with url property
      return imagePath.url;
    }
    
    // Handle string format
    if (typeof imagePath === 'string') {
      if (imagePath.startsWith('http')) return imagePath;
      if (imagePath.startsWith('/')) return `http://localhost:4000${imagePath}`;
      return `http://localhost:4000/${imagePath}`;
    }
    
    return null;
  };

  const getArtisanImages = (artisan) => {
    if (!artisan) return [];
    
    // Handle different photo data structures
    if (artisan.photos && Array.isArray(artisan.photos)) {
      return artisan.photos
        .map(photo => getImageUrl(photo))
        .filter(url => url !== null);
    }
    
    // Handle single photo field
    if (artisan.photo) {
      const url = getImageUrl(artisan.photo);
      return url ? [url] : [];
    }
    
    // Handle image field
    if (artisan.image) {
      const url = getImageUrl(artisan.image);
      return url ? [url] : [];
    }
    
    return [];
  };

  const getDefaultArtisanImage = (artisanType) => {
    // Return appropriate default images based on artisan type
    const defaultImages = {
      bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      farm: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop",
      dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
      cheese_maker: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
      winery: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      vineyard: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      honey_producer: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      chocolate_maker: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=300&fit=crop",
      coffee_roaster: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop",
      fish_market: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      herb_garden: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      mushroom_farm: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop",
      orchard: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=400&h=300&fit=crop"
    };
    
    return defaultImages[artisanType] || "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop";
  };

  const formatBusinessHours = (businessHours) => {
    if (!businessHours) return null;
    
    // Handle different data structures
    if (Array.isArray(businessHours)) {
      if (businessHours.length === 0) return null;
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const openDays = businessHours.filter(day => day && day.isOpen);
      
      if (openDays.length === 0) return null;
      
      return openDays.map(day => {
        const dayName = days[day.dayOfWeek - 1];
        return `${dayName}: ${day.openTime} - ${day.closeTime}`;
      });
    }
    
    // Handle object format (old format)
    if (typeof businessHours === 'object') {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const openDays = [];
      
      days.forEach((day) => {
        const dayData = businessHours[day];
        if (dayData && !dayData.closed && dayData.open && dayData.close) {
          const dayName = day.charAt(0).toUpperCase() + day.slice(1);
          openDays.push(`${dayName}: ${dayData.open} - ${dayData.close}`);
        }
      });
      
      return openDays.length > 0 ? openDays : null;
    }
    
    return null;
  };

  const renderArtisanCard = (artisan) => {
    if (!artisan) return null;
    
    const artisanHours = formatBusinessHours(artisan.artisanHours);
    const artisanImages = getArtisanImages(artisan);
    const primaryImage = artisanImages.length > 0 ? artisanImages[0] : getDefaultArtisanImage(artisan.type);
    
    // Debug logging
    console.log('Artisan:', artisan.artisanName, 'Photos:', artisan.photos, 'Images:', artisanImages, 'Primary Image:', primaryImage);

    return (
      <div key={artisan._id} className="artisan-card group">
        <div className="relative">
          {/* Artisan Image */}
          <div className="aspect-w-16 aspect-h-9 bg-stone-100 rounded-t-2xl overflow-hidden relative">
            <img
              src={primaryImage}
              alt={artisan.artisanName}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                console.log('Image failed to load:', primaryImage);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully:', primaryImage);
                e.target.style.opacity = '1';
              }}
              style={{ opacity: 1, transition: 'opacity 0.3s ease-in-out' }}
            />
            
            {/* Fallback placeholder */}
            <div 
              className="w-full h-48 bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center hidden"
            >
              <BuildingStorefrontIcon className="w-16 h-16 text-stone-400" />
            </div>
            
            {/* Photo count indicator if multiple photos */}
            {artisanImages.length > 1 && (
              <div className="photo-count">
                +{artisanImages.length - 1} more
              </div>
            )}
          </div>
          
          {/* Trust Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {artisan.categories?.includes('organic') && (
              <span className="badge-organic">Organic</span>
            )}
            <span className="badge-local">Local</span>
            {(artisan.type === 'bakery' || artisan.type === 'chocolate_maker') && (
              <span className="badge-handmade">Handmade</span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Artisan Name and Rating */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-semibold text-stone-900 group-hover:text-amber-600 transition-colors duration-300">
              {artisan.artisanName || 'Unnamed Artisan'}
            </h3>
            <div className="flex items-center space-x-1">
              <StarIconSolid className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-stone-700">
                {artisan.rating?.average ? artisan.rating.average.toFixed(1) : 'New'}
              </span>
              {artisan.rating?.count && (
                <span className="text-xs text-stone-500">({artisan.rating.count})</span>
              )}
            </div>
          </div>

          {/* Artisan Type */}
          <p className="text-sm text-amber-600 font-medium mb-2 capitalize">
            {artisan.type?.replace('_', ' ') || 'Local Artisan'}
          </p>

          {/* Description */}
          <p className="text-stone-600 text-sm mb-4 line-clamp-2">
            {artisan.description || 'Discover amazing local products from this artisan.'}
          </p>

          {/* Artisan Hours */}
          {artisanHours && artisanHours.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-stone-800 mb-2">Open Today</h4>
              <div className="space-y-1">
                {artisanHours.slice(0, 3).map((hours, index) => (
                  <p key={index} className="text-xs text-stone-600">{hours}</p>
                ))}
                {artisanHours.length > 3 && (
                  <p className="text-xs text-amber-600 font-medium">+{artisanHours.length - 3} more days</p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center text-stone-500 text-sm mb-4">
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>{artisan.address?.city || 'Location not specified'}</span>
          </div>

          {/* Contact Info */}
          {artisan.contactInfo?.phone && (
            <div className="flex items-center text-stone-500 text-sm mb-4">
              <PhoneIcon className="w-4 h-4 mr-1" />
              <span>{artisan.contactInfo.phone}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/artisan/${artisan._id}`)}
              className="btn-primary btn-small"
            >
              Visit Artisan
            </button>
            <div className="flex items-center space-x-2">
              {artisan.contactInfo?.phone && (
                <a
                  href={`tel:${artisan.contactInfo.phone}`}
                  className="p-2 text-stone-400 hover:text-amber-600 transition-colors duration-300"
                  title="Call artisan"
                >
                  <PhoneIcon className="w-5 h-5" />
                </a>
              )}
              {artisan.contactInfo?.email && (
                <a
                  href={`mailto:${artisan.contactInfo.email}`}
                  className="p-2 text-stone-400 hover:text-amber-600 transition-colors duration-300"
                  title="Email artisan"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                </a>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state for results section only
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="loading-skeleton h-96 rounded-2xl"></div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-stone-900 via-amber-900 to-stone-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Find Artisan</h1>
          <p className="text-xl text-stone-200 mb-8 max-w-3xl mx-auto">
            Connect with exceptional local artisans offering premium products and authentic experiences
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for artisans, products, or categories..."
                className="search-bar pl-12 pr-4 w-full"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-stone-400" />
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Artisan Type Cards */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-stone-900 mb-8 text-center">Explore by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artisanTypeCards.map((type) => (
              <button
                key={type.id}
                onClick={() => handleArtisanTypeSelect(type.id)}
                className={`category-card p-4 text-center transition-all duration-300 ${
                  selectedType === type.id
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'hover:border-stone-300'
                }`}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{type.name}</h3>
                <p className="text-xs text-stone-600">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filters and Results */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-stone-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              {/* Artisan Type Filter */}
              <div className="mb-6">
                <label className="form-label">Artisan Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => handleArtisanTypeSelect(e.target.value)}
                  className="form-select"
                >
                  {artisanTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="form-label">Product Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-select"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="mb-6">
                <label className="form-label">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-select"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="rating">Highest Rated</option>
                  <option value="distance">Distance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:w-3/4">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">
                  {selectedType ? `${filteredArtisans.length} Local Artisans` : 'Select a Category'}
                </h2>
                <p className="text-stone-600">
                  {selectedType && `Showing ${artisanTypes.find(t => t.value === selectedType)?.label}`}
                  {selectedCategory && ` • ${categories.find(c => c.value === selectedCategory)?.label}`}
                </p>
              </div>
            </div>

            {/* Artisan Grid */}
            {isLoading ? (
              renderLoadingSkeleton()
            ) : !selectedType ? (
              <div className="text-center py-12">
                <BuildingStorefrontIcon className="w-16 h-16 text-stone-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-stone-900 mb-2">Select a Category</h3>
                <p className="text-stone-600 mb-6">
                  Choose an artisan category above to discover local artisans
                </p>
              </div>
            ) : filteredArtisans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredArtisans.map(renderArtisanCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <BuildingStorefrontIcon className="w-16 h-16 text-stone-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-stone-900 mb-2">No artisans found</h3>
                <p className="text-stone-600 mb-6">
                  Try adjusting your search criteria or select a different category
                </p>
                <button
                  onClick={clearFilters}
                  className="btn-primary"
                >
                  View All Categories
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
