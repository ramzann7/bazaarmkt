import React, { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll';
import ProductCard from './ProductCard';

/**
 * Horizontal scrollable product section with expand/collapse
 * Modern, subtle design with fade indicators
 */
const HorizontalProductScroll = ({ 
  title, 
  products, 
  emptyMessage = "No products available",
  backgroundColor = '#ffffff', // Background color for fade indicators
  showDistance = false // Pass through to ProductCard
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { scrollRef, canScrollLeft, canScrollRight, checkScrollability } = useHorizontalScroll();

  // Recheck scrollability when products change
  useEffect(() => {
    checkScrollability();
  }, [products, checkScrollability]);

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-secondary">{title}</h2>
        {products.length > 4 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-2 transition-all"
          >
            {isExpanded ? (
              <>
                Show Less
                <ChevronUpIcon className="w-4 h-4" />
              </>
            ) : (
              <>
                View All ({products.length})
                <ChevronDownIcon className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Content - Horizontal Scroll or Expanded Grid */}
      {isExpanded ? (
        /* Expanded Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} showDistance={showDistance} />
          ))}
        </div>
      ) : (
        /* Horizontal Scroll View */
        <div className="relative">
          {/* Left Fade Indicator */}
          {canScrollLeft && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to right, ${backgroundColor}, transparent)`
              }}
            />
          )}
          
          {/* Products Scroll */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#f97316 #f3f4f6',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {products.map((product) => (
              <div
                key={product._id}
                className="flex-shrink-0 w-[280px]"
              >
                <ProductCard product={product} showDistance={showDistance} />
              </div>
            ))}
          </div>

          {/* Right Fade Indicator */}
          {canScrollRight && (
            <div 
              className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{
                background: `linear-gradient(to left, ${backgroundColor}, transparent)`
              }}
            />
          )}
          
          {/* Subtle scroll hint for first-time users */}
          {products.length > 4 && canScrollRight && (
            <div className="text-center text-xs text-gray-400 mt-2 animate-pulse">
              ← Scroll to see more →
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HorizontalProductScroll;

