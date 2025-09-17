import React from 'react';

/**
 * Mobile-optimized container component for consistent responsive design
 */
export const MobileContainer = ({ 
  children, 
  className = '', 
  maxWidth = '7xl',
  padding = 'default',
  background = 'gray-50'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2 sm:px-6 sm:py-4',
    default: 'px-4 py-4 sm:px-6 sm:py-6 lg:py-8',
    lg: 'px-4 py-6 sm:px-6 sm:py-8 lg:py-12'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  };

  return (
    <div className={`min-h-screen bg-${background}`}>
      <div className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClasses[padding]} ${className}`}>
        {children}
      </div>
    </div>
  );
};

/**
 * Mobile-optimized grid component
 */
export const MobileGrid = ({ 
  children, 
  cols = { mobile: 2, tablet: 3, desktop: 4 },
  gap = { mobile: 4, tablet: 6, desktop: 8 },
  className = ''
}) => {
  const gridClasses = `grid grid-cols-${cols.mobile} sm:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop} gap-${gap.mobile} sm:gap-${gap.tablet} lg:gap-${gap.desktop}`;
  
  return (
    <div className={`${gridClasses} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized text component
 */
export const MobileText = ({ 
  children, 
  size = 'base',
  weight = 'normal',
  color = 'gray-900',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-sm sm:text-base lg:text-lg',
    lg: 'text-base sm:text-lg lg:text-xl',
    xl: 'text-lg sm:text-xl lg:text-2xl',
    '2xl': 'text-xl sm:text-2xl lg:text-3xl',
    '3xl': 'text-2xl sm:text-3xl lg:text-4xl'
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  return (
    <span className={`${sizeClasses[size]} ${weightClasses[weight]} text-${color} ${className}`}>
      {children}
    </span>
  );
};

/**
 * Mobile-optimized button component
 */
export const MobileButton = ({ 
  children, 
  variant = 'primary',
  size = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-[#D77A61] text-white hover:bg-[#3C6E47] focus:ring-[#D77A61]',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    default: 'px-4 py-2.5 text-sm sm:text-base min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Mobile-optimized card component
 */
export const MobileCard = ({ 
  children, 
  padding = 'default',
  className = ''
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    default: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

export default {
  MobileContainer,
  MobileGrid,
  MobileText,
  MobileButton,
  MobileCard
};
