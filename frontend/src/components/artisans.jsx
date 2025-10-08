import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon, ClockIcon, HeartIcon } from '@heroicons/react/24/outline';
import { artisanService } from '../services/artisanService';
import { PRODUCT_CATEGORIES } from '../data/productReference';
import ArtisanCard from './ArtisanCard';
import SpotlightArtisans from './SpotlightArtisans';
import FilterBar from './FilterBar';

export default function Artisans() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
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

  // Refresh data when page comes into focus (e.g., after returning from artisan details page)
  useEffect(() => {
    const handleFocus = () => {
      // Clear artisan cache and reload data to get fresh ratings
      artisanService.clearArtisanCache();
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
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

  // Filter and sort artisans
  const filteredAndSortedArtisans = React.useMemo(() => {
    let filtered = artisans.filter(artisan => {
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

    // Apply sorting
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.artisanName || '').localeCompare(b.artisanName || ''));
    }
    // 'featured' is default order (no sorting)

    return filtered;
  }, [artisans, searchQuery, selectedCategory, sortBy]);

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSortChange = (sortValue) => {
    setSortBy(sortValue);
  };


  const handleFavorite = (artisanId) => {
    // TODO: Implement favorite functionality
    console.log('Favorite artisan:', artisanId);
  };

  const handleMessage = (artisanId) => {
    // TODO: Implement message functionality
    console.log('Message artisan:', artisanId);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar */}
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          resultCount={filteredAndSortedArtisans.length}
        />

        {/* Spotlight Artisans */}
        <SpotlightArtisans />

        {/* Main Content Area */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-900">Marketplace</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedArtisans.map((artisan) => (
              <ArtisanCard
                key={artisan._id}
                artisan={artisan}
                onFavorite={handleFavorite}
                onMessage={handleMessage}
                showDistance={true}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAndSortedArtisans.length === 0 && (
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
