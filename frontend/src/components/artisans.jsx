import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon, ClockIcon, HeartIcon } from '@heroicons/react/24/outline';

export default function Artisans() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [artisans] = useState([
    {
      id: 1,
      name: "Rosewood Bakery",
      artisan: "Marie & Pierre Dubois",
      type: "bakery",
      category: "Artisan Breads",
      rating: 4.9,
      distance: "2.3 km away",
      deliveryTime: "20-30 min",
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      specialties: ["Sourdough", "Baguettes", "Croissants"],
      story: "Traditional French baking methods passed down through generations",
      isOpen: true
    },
    {
      id: 2,
      name: "Jean's Orchard",
      artisan: "Jean Dubois",
      type: "farm",
      category: "Maple & Cider",
      rating: 4.8,
      distance: "12 km away",
      deliveryTime: "45-60 min",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      specialties: ["Maple Syrup", "Apple Cider", "Preserves"],
      story: "Century-old maple trees producing the finest small-batch syrup",
      isOpen: true
    },
    {
      id: 3,
      name: "La Fromagerie du Village",
      artisan: "Claire & Marc Tremblay",
      type: "dairy",
      category: "Artisan Cheeses",
      rating: 4.9,
      distance: "5.1 km away",
      deliveryTime: "25-35 min",
      image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
      specialties: ["Aged Cheddar", "Fresh Mozzarella", "Blue Cheese"],
      story: "Handcrafted cheeses using traditional European methods",
      isOpen: true
    },
    {
      id: 4,
      name: "Miel de la Montagne",
      artisan: "Sophie Tremblay",
      type: "farm",
      category: "Wildflower Honey",
      rating: 4.7,
      distance: "8.7 km away",
      deliveryTime: "30-45 min",
      image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      specialties: ["Wildflower Honey", "Lavender Honey", "Honey Comb"],
      story: "Pure mountain honey from local wildflowers and herbs",
      isOpen: true
    },
    {
      id: 5,
      name: "Pâtisserie Belle",
      artisan: "Isabelle Moreau",
      type: "bakery",
      category: "Artisan Pastries",
      rating: 4.8,
      distance: "3.2 km away",
      deliveryTime: "15-25 min",
      image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop",
      specialties: ["Macarons", "Éclairs", "Tarts"],
      story: "French pastries made with love and traditional techniques",
      isOpen: true
    },
    {
      id: 6,
      name: "Verger des Trois Sœurs",
      artisan: "Marie, Anne & Claire",
      type: "farm",
      category: "Organic Fruits",
      rating: 4.6,
      distance: "15 km away",
      deliveryTime: "50-70 min",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop",
      specialties: ["Organic Apples", "Berries", "Stone Fruits"],
      story: "Three sisters continuing their family's organic farming tradition",
      isOpen: true
    }
  ]);

  const categories = [
    { id: 'all', name: 'All Artisans', icon: '🛍️' },
    { id: 'bakery', name: 'Artisan Bakeries', icon: '🥖' },
    { id: 'farm', name: 'Local Farms', icon: '🌾' },
    { id: 'dairy', name: 'Cheese Makers', icon: '🧀' },
    { id: 'honey', name: 'Honey Artisans', icon: '🍯' },
    { id: 'preserves', name: 'Preserves & Jams', icon: '🍓' }
  ];

  const filteredArtisans = artisans.filter(artisan => {
    const matchesSearch = artisan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.artisan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artisan.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
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

        {/* Artisan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArtisans.map((artisan) => (
            <div
              key={artisan.id}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/artisan/${artisan.id}`)}
            >
              <div className="relative h-48">
                <img
                  src={artisan.image}
                  alt={artisan.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {artisan.distance}
                </div>
                <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-sm">
                  <StarIcon className="w-3 h-3 text-yellow-400 mr-1" />
                  <span>{artisan.rating}</span>
                </div>
                {!artisan.isOpen && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-semibold">Currently Closed</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{artisan.name}</h3>
                  <p className="text-orange-600 text-sm font-medium">by {artisan.artisan}</p>
                </div>

                <p className="text-gray-700 font-medium mb-2">{artisan.category}</p>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{artisan.story}</p>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {artisan.specialties.slice(0, 3).map((specialty, index) => (
                      <span
                        key={index}
                        className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                    {artisan.specialties.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{artisan.specialties.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {artisan.deliveryTime}
                  </div>
                  <div className="flex items-center">
                    <HeartIcon className="w-4 h-4 mr-1 text-red-400" />
                    <span>Local Favorite</span>
                  </div>
                </div>

                <button className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                  Visit Artisan
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredArtisans.length === 0 && (
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
