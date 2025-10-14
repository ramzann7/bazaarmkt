import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Accordion Component
 * 
 * A mobile-friendly collapsible sections component with progress indicators.
 * 
 * @param {Array} sections - Array of section objects
 * @param {Array} defaultExpanded - Array of section IDs to expand by default
 * @param {string} className - Additional CSS classes
 * 
 * Section object structure:
 * {
 *   id: string (required) - Unique identifier
 *   title: string (required) - Section title
 *   description: string (optional) - Section description
 *   icon: Component (optional) - Icon component from heroicons
 *   badge: string (optional) - Badge text (e.g., "✓", "3 items")
 *   required: boolean (optional) - Show "Required" badge if no badge provided
 *   content: ReactNode (required) - Section content to display when expanded
 * }
 */
export function Accordion({ sections, defaultExpanded = [], className = '' }) {
  const [expandedSections, setExpandedSections] = useState(
    new Set(defaultExpanded)
  );

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const Icon = section.icon;
        
        return (
          <div
            key={section.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors min-h-[60px]"
              type="button"
              aria-expanded={isExpanded}
              aria-controls={`accordion-content-${section.id}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {Icon && (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                )}
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                    {section.title}
                  </h3>
                  {section.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-2">
                {section.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                    {section.badge}
                  </span>
                )}
                {section.required && !section.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap">
                    Required
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div
                id={`accordion-content-${section.id}`}
                className="px-4 pb-4 pt-2 border-t border-gray-100 animate-fadeIn"
                role="region"
                aria-labelledby={`accordion-header-${section.id}`}
              >
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Accordion Section Props
 * 
 * This is a helper component for type documentation and IDE autocomplete.
 * It doesn't render anything - pass section objects directly to Accordion component.
 */
export function AccordionSection({ 
  id, 
  title, 
  description, 
  icon, 
  badge, 
  required, 
  content 
}) {
  return null;
}

