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
      <div className="flex items-center gap-3 bg-white/85 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-gray-100/30">
        {/* Category Filters - Horizontal Scroll */}
        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-2.5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                selectedCategory === category.id
                  ? 'bg-accent text-white border-transparent'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Sort Dropdown */}
          <div className="flex items-center bg-white px-2.5 py-2 rounded-full border border-gray-100">
            <span className="text-sm font-semibold text-gray-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border-none bg-transparent text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer ml-1.5"
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
