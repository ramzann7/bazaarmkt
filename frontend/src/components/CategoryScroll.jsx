import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getAllCategories, PRODUCT_CATEGORIES } from '../data/productReference';

export default function CategoryScroll() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const subcategoryScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showSubLeftArrow, setShowSubLeftArrow] = useState(false);
  const [showSubRightArrow, setShowSubRightArrow] = useState(true);

  // Get all categories
  const categories = getAllCategories();

  // Check scroll position and update arrow visibility
  const checkScrollPosition = (container, setLeft, setRight) => {
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setLeft(scrollLeft > 10);
    setRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Scroll functions for main categories
  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Scroll functions for subcategories
  const scrollSub = (direction) => {
    if (!subcategoryScrollRef.current) return;
    const scrollAmount = 300;
    const newScrollLeft = subcategoryScrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    subcategoryScrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Handle main category click
  const handleCategoryClick = (category) => {
    if (selectedCategory?.key === category.key) {
      // Toggle off if already selected
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      // Reset subcategory scroll
      setTimeout(() => {
        if (subcategoryScrollRef.current) {
          subcategoryScrollRef.current.scrollLeft = 0;
        }
      }, 0);
    }
  };

  // Handle subcategory click - trigger enhanced search
  const handleSubcategoryClick = (subcategory, categoryKey) => {
    const searchParams = new URLSearchParams();
    searchParams.append('subcategory', subcategory.id);
    searchParams.append('category', categoryKey);
    navigate(`/search?${searchParams.toString()}`);
  };

  // Get subcategories for selected category
  const getSubcategories = (categoryKey) => {
    const category = PRODUCT_CATEGORIES[categoryKey];
    if (!category || !category.subcategories) return [];
    
    return Object.keys(category.subcategories).map(subcategoryKey => ({
      id: subcategoryKey,
      name: category.subcategories[subcategoryKey].name,
      icon: category.subcategories[subcategoryKey].icon,
      categoryKey: categoryKey
    }));
  };

  // Set up scroll event listeners and click-away functionality
  useEffect(() => {
    const mainContainer = scrollContainerRef.current;
    const subContainer = subcategoryScrollRef.current;

    const handleMainScroll = () => checkScrollPosition(mainContainer, setShowLeftArrow, setShowRightArrow);
    const handleSubScroll = () => checkScrollPosition(subContainer, setShowSubLeftArrow, setShowSubRightArrow);

    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleMainScroll);
      checkScrollPosition(mainContainer, setShowLeftArrow, setShowRightArrow);
    }

    if (subContainer) {
      subContainer.addEventListener('scroll', handleSubScroll);
      checkScrollPosition(subContainer, setShowSubLeftArrow, setShowSubRightArrow);
    }

    // Check on resize
    const handleResize = () => {
      handleMainScroll();
      if (selectedCategory) handleSubScroll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (mainContainer) mainContainer.removeEventListener('scroll', handleMainScroll);
      if (subContainer) subContainer.removeEventListener('scroll', handleSubScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedCategory]);

  // Click away to close subcategories
  useEffect(() => {
    const handleClickAway = (event) => {
      const categoryScroll = event.target.closest('.category-scroll');
      
      // Only close if clicking completely outside the category scroll area
      if (!categoryScroll && selectedCategory) {
        setSelectedCategory(null);
      }
    };

    if (selectedCategory) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [selectedCategory]);

  const subcategories = selectedCategory ? getSubcategories(selectedCategory.key) : [];

  return (
    <div className="w-full bg-white border-b border-gray-200 sticky top-0 lg:top-16 z-30 category-scroll">
      {/* Main Categories */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3">
        <div className="relative">
          {/* Left Arrow - Hidden on mobile when at start */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-gray-50 transition-colors border border-gray-200"
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {/* Category Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-8 sm:px-10"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => handleCategoryClick(category)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap touch-manipulation ${
                  selectedCategory?.key === category.key
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Right Arrow - Hidden on mobile when at end */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-gray-50 transition-colors border border-gray-200"
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {/* Subcategories Section - Slides down when category selected */}
      {selectedCategory && subcategories.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 transition-all duration-300 ease-out">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4">
            <div className="relative">
              {/* Left Arrow for subcategories */}
              {showSubLeftArrow && (
                <button
                  onClick={() => scrollSub('left')}
                  className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-gray-50 transition-colors border border-amber-200"
                  aria-label="Scroll left"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-amber-700" />
                </button>
              )}

              {/* Subcategories - No category title, cleaner design */}
              <div className="px-8 sm:px-10">
                <div
                  ref={subcategoryScrollRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {subcategories.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      onClick={() => handleSubcategoryClick(subcategory, subcategory.categoryKey)}
                      className="flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium bg-white text-amber-900 hover:bg-amber-100 active:bg-amber-200 transition-all duration-200 whitespace-nowrap shadow-md border border-amber-200 hover:shadow-lg touch-manipulation"
                    >
                      <span>{subcategory.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Arrow for subcategories */}
              {showSubRightArrow && (
                <button
                  onClick={() => scrollSub('right')}
                  className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-1.5 hover:bg-gray-50 transition-colors border border-amber-200"
                  aria-label="Scroll right"
                >
                  <ChevronRightIcon className="w-5 h-5 text-amber-700" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

