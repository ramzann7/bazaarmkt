import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * MobileTabs - Mobile-optimized tab navigation
 * 
 * Features:
 * - Dropdown selector for mobile
 * - Horizontal scrollable tabs for tablet
 * - Touch-optimized (48px minimum)
 * - Smooth animations
 * - Keyboard accessible
 */
const MobileTabs = ({ 
  tabs, 
  activeTab, 
  onChange, 
  className = '' 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const scrollContainerRef = useRef(null);

  // Find active tab details
  const activeTabInfo = tabs.find(tab => tab.id === activeTab) || tabs[0];

  // Auto-scroll active tab into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeButton = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    onChange(tabId);
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest('.mobile-tabs-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <>
      {/* Mobile Dropdown (< 640px) */}
      <div className="sm:hidden mobile-tabs-dropdown">
        {/* Dropdown Button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 
                     rounded-lg shadow-sm hover:bg-gray-50 transition-colors min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            {activeTabInfo.icon && (
              <activeTabInfo.icon className="w-5 h-5 text-[#D77A61]" />
            )}
            <span className="font-semibold text-gray-900">{activeTabInfo.name}</span>
          </div>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-40 animate-fadeIn"
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Menu */}
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg 
                          shadow-lg z-50 max-h-[70vh] overflow-y-auto animate-slideDown">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[48px]
                              border-b border-gray-100 last:border-b-0 ${
                      isActive 
                        ? 'bg-[#F5F1EA] text-[#D77A61] font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span>{tab.name}</span>
                    {isActive && (
                      <span className="ml-auto text-[#D77A61]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tablet Horizontal Scroll (640px - 1024px) */}
      <div 
        ref={scrollContainerRef}
        className="hidden sm:flex lg:hidden overflow-x-auto scrollbar-hide gap-2 pb-2 -mx-4 px-4"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium 
                        whitespace-nowrap transition-all flex-shrink-0 min-h-[44px] ${
                isActive 
                  ? 'bg-[#D77A61] text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-[#D77A61] hover:text-[#D77A61]'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Tabs (≥ 1024px) */}
      <div className="hidden lg:flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium 
                        transition-all min-h-[44px] ${
                isActive 
                  ? 'bg-[#D77A61] text-white shadow-md' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-[#D77A61] hover:text-[#D77A61]'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default MobileTabs;

