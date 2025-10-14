import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MobileSearchBar = ({ 
  onSearch,
  placeholder = "Search products and artisans...",
  initialQuery = '',
  suggestions = [],
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      if (onSearch) {
        onSearch(trimmedQuery);
      } else {
        navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      }
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow suggestion click to register
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="
              w-full h-11 pl-4 pr-20 text-sm
              bg-gray-100 rounded-full
              border-2 border-transparent
              focus:outline-none focus:ring-2 focus:ring-[#D77A61] focus:bg-white
              placeholder:text-gray-500
              transition-all duration-200
            "
            aria-label="Search"
          />
          
          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="
                absolute right-12 top-1/2 -translate-y-1/2
                w-8 h-8 flex items-center justify-center
                text-gray-400 hover:text-gray-600
                rounded-full hover:bg-gray-200
                transition-colors duration-150
              "
              aria-label="Clear search"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
          
          {/* Search button */}
          <button
            type="submit"
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              w-8 h-8 flex items-center justify-center
              text-[#D77A61]
              rounded-full hover:bg-gray-200
              transition-colors duration-150
            "
            aria-label="Search"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Search suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="
          absolute top-full left-0 right-0 mt-2
          bg-white rounded-lg shadow-lg border border-gray-200
          max-h-64 overflow-y-auto
          z-50
        ">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="
                w-full px-4 py-3 text-left
                hover:bg-gray-50 active:bg-gray-100
                border-b border-gray-100 last:border-b-0
                transition-colors duration-150
                min-h-[44px]
              "
            >
              <div className="flex items-center space-x-3">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileSearchBar;

