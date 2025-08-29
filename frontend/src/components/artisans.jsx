import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon, ClockIcon, HeartIcon } from '@heroicons/react/24/outline';
import { artisanService } from '../services/artisanService';
import { PRODUCT_CATEGORIES } from '../data/productReference';

export default function Artisans() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch artisans data
  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        setLoading(true);
        const filters = {
          includeProducts: true
        };
        
        if (searchQuery) filters.search = searchQuery;
        if (selectedCategory !== 'all') filters.category = selectedCategory;
        
        const data = await artisanService.getAllArtisans(filters);
        setArtisans(data);
      } catch (err) {
        console.error('Error fetching artisans:', err);
        setError('Failed to load artisans');
      } finally {
        setLoading(false);
      }
    };

    fetchArtisans();
    }, [searchQuery, selectedCategory]);

  // Generate categories from product reference data
  const categories = [
    { id: 'all', name: 'All Artisans', icon: '🛍️' },
    ...Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => ({
      id: key,
      name: category.name,
      icon: category.icon
    }))
  ];

  // Filter artisans based on search and category
  const filteredArtisans = artisans.filter(artisan => {
    const matchesSearch = searchQuery === '' || 
                         artisan.artisanName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.category?.some(cat => {
                           let subcategoryName = cat;
                           Object.entries(PRODUCT_CATEGORIES).forEach(([categoryKey, category]) => {
                             if (category.subcategories && category.subcategories[cat]) {
                               subcategoryName = category.subcategories[cat].name;
                             }
                           });
                           return subcategoryName.toLowerCase().includes(searchQuery.toLowerCase());
                         });
    const matchesCategory = selectedCategory === 'all' || artisan.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Your Local Artisans</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover passionate creators in your neighborhood. Every product tells a story of tradition, 
              craftsmanship, and love for quality.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artisans, specialties, or products... 'sourdough', 'maple syrup', 'Marie'"
                className="w-full px-6 py-4 pl-14 text-lg border-2 border-orange-200 rounded-full focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-gray-600 text-center">
            {filteredArtisans.length} artisan{filteredArtisans.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading artisans...</h3>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error loading artisans</h3>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>
        )}

        {/* Artisan Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArtisans.map((artisan) => (
              <div
                key={artisan._id}
                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/artisan/${artisan._id}`)}
              >
                <div className="relative h-48">
                  <img
                    src={artisan.photos?.main || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"}
                    alt={artisan.artisanName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {artisan.address?.city || 'Local'}
                  </div>
                  <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-sm">
                    <StarIcon className="w-3 h-3 text-yellow-400 mr-1" />
                    <span>{artisan.rating || 4.5}</span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{artisan.artisanName}</h3>
                    <p className="text-orange-600 text-sm font-medium">
                      by {artisan.user?.firstName} {artisan.user?.lastName}
                    </p>
                  </div>

                  <p className="text-gray-700 font-medium mb-2">
                    {PRODUCT_CATEGORIES[artisan.type]?.name || artisan.type}
                  </p>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{artisan.description}</p>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {artisan.category?.slice(0, 3).map((cat, index) => {
                        // Find the subcategory name from product reference
                        let subcategoryName = cat;
                        Object.entries(PRODUCT_CATEGORIES).forEach(([categoryKey, category]) => {
                          if (category.subcategories && category.subcategories[cat]) {
                            subcategoryName = category.subcategories[cat].name;
                          }
                        });
                        
                        return (
                          <span
                            key={index}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium"
                          >
                            {subcategoryName}
                          </span>
                        );
                      })}
                      {artisan.category?.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{artisan.category.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {artisan.deliveryOptions?.localDelivery?.enabled ? 'Local Delivery' : 'Pickup Only'}
                    </div>
                    <div className="flex items-center">
                      <HeartIcon className="w-4 h-4 mr-1 text-red-400" />
                      <span>{artisan.productCount || 0} products</span>
                    </div>
                  </div>

                  <button className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    Visit Artisan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredArtisans.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No artisans found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or category filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
