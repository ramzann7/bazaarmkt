import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * PageHeader Component
 * 
 * A mobile-optimized page header component with responsive sizing
 * that won't conflict with other CSS in the application.
 * 
 * Features:
 * - Mobile-first responsive design
 * - Isolated styling to prevent CSS conflicts
 * - Optional back button with customizable action
 * - Support for subtitle/description
 * - Optional action buttons (top right)
 * 
 * Usage:
 * <PageHeader 
 *   title="Dashboard" 
 *   subtitle="Manage your artisan business"
 *   backTo="/home"
 *   backLabel="Back to Home"
 *   actions={<button>Custom Action</button>}
 * />
 */
const PageHeader = ({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  onBackClick,
  actions,
  className = '',
  background = 'white',
  border = true
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backTo) {
      navigate(backTo);
    }
  };

  // Background color classes
  const bgClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: 'bg-transparent'
  };

  return (
    <div 
      className={`
        ${bgClasses[background] || bgClasses.white}
        ${border ? 'shadow-sm border-b border-gray-200' : ''}
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
        {/* Mobile: Stack vertically */}
        {/* Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          
          {/* Left side: Title and optional subtitle */}
          <div className="flex-1 min-w-0">
            {/* Back button - Only show on mobile if provided */}
            {(backTo || onBackClick) && (
              <button
                onClick={handleBackClick}
                className="
                  flex items-center space-x-2 text-gray-600 hover:text-gray-900
                  mb-2 sm:mb-3 text-sm sm:text-base
                  transition-colors duration-200
                "
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{backLabel}</span>
              </button>
            )}
            
            {/* Title - Responsive sizing */}
            <h1 className="
              text-xl sm:text-2xl md:text-3xl 
              font-bold text-gray-900
              leading-tight
              truncate sm:whitespace-normal
            ">
              {title}
            </h1>
            
            {/* Subtitle - Responsive sizing */}
            {subtitle && (
              <p className="
                text-sm sm:text-base md:text-lg
                text-gray-600 
                mt-1 sm:mt-2
                line-clamp-2 sm:line-clamp-1
              ">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex-shrink-0 flex items-center space-x-2 sm:space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Preset variants for common use cases
 */
export const DashboardHeader = (props) => (
  <PageHeader {...props} />
);

export const ProfileHeader = (props) => (
  <PageHeader {...props} />
);

export const OrdersHeader = (props) => (
  <PageHeader {...props} />
);

export const ProductManagementHeader = (props) => (
  <PageHeader {...props} />
);

export default PageHeader;

