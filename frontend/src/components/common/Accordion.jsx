import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

/**
 * Accordion Component
 * A reusable collapsible sections component optimized for mobile and desktop
 * 
 * Features:
 * - Single or multi-section expansion
 * - Progress indicators with badges
 * - Smooth animations
 * - Touch-friendly on mobile
 * - Accessible keyboard navigation
 */

/**
 * AccordionSection Component
 * Individual section within an accordion
 */
export const AccordionSection = ({ 
  id,
  title, 
  icon: Icon,
  badge,
  children, 
  isExpanded, 
  onToggle,
  required = false,
  className = ''
}) => {
  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm ${className}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Icon */}
          {Icon && (
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isExpanded ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isExpanded ? 'text-orange-600' : 'text-gray-600'
              }`} />
            </div>
          )}
          
          {/* Title */}
          <div className="text-left flex-1">
            <h3 className={`text-sm sm:text-base font-semibold ${
              isExpanded ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
          </div>
          
          {/* Badge */}
          {badge && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              badge === '✓' 
                ? 'bg-green-100 text-green-700' 
                : badge === '!' 
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
            }`}>
              {badge}
            </div>
          )}
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="ml-3">
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Section Content */}
      <div
        id={`accordion-content-${id}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-200 bg-gray-50">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Accordion Component
 * Container for multiple collapsible sections
 */
const Accordion = ({ 
  sections = [], 
  defaultExpanded = null,
  allowMultiple = false,
  className = ''
}) => {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState(
    defaultExpanded ? [defaultExpanded] : []
  );

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      if (allowMultiple) {
        // Allow multiple sections open
        return prev.includes(sectionId)
          ? prev.filter(id => id !== sectionId)
          : [...prev, sectionId];
      } else {
        // Only one section open at a time
        return prev.includes(sectionId) ? [] : [sectionId];
      }
    });
  };

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {sections.map((section) => (
        <AccordionSection
          key={section.id}
          id={section.id}
          title={section.title}
          icon={section.icon}
          badge={section.badge}
          required={section.required}
          isExpanded={expandedSections.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
          className={section.className}
        >
          {section.content}
        </AccordionSection>
      ))}
    </div>
  );
};

export default Accordion;
