import React from 'react';
import { PRODUCT_CATEGORIES } from '../data/productReference';

const FilterBar = ({ 
  selectedCategory, 
  onCategoryChange, 
  sortBy, 
  onSortChange, 
  resultCount
}) => {
  // Generate categories from product reference data
  const categories = [
    { id: 'all', name: 'All' },
    ...Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => ({
      id: key,
      name: category.name
    }))
  ];

  return (
    <div className="sticky top-4 bg-transparent py-3 z-10">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/85 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-gray-100/30">
        {/* Category Filters - Horizontal Scroll - Mobile Optimized */}
        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0 pb-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 min-h-[36px] ${
                selectedCategory === category.id
                  ? 'bg-accent text-white border-transparent shadow-md'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 active:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Sort Controls - Mobile Optimized */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
          {/* Result Count - Mobile */}
          <span className="text-xs sm:text-sm text-gray-600 font-medium sm:hidden">
            {resultCount} {resultCount === 1 ? 'artisan' : 'artisans'}
          </span>
          
          {/* Sort Dropdown */}
          <div className="flex items-center bg-white px-3 py-2 rounded-full border border-gray-100 min-h-[36px]">
            <span className="text-xs sm:text-sm font-semibold text-gray-600 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border-none bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer sm:ml-1.5"
            >
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="distance">Closest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
