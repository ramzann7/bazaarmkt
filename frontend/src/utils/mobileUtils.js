/**
 * Mobile optimization utilities for bazaarMKT
 */

// Common responsive class patterns
export const responsiveClasses = {
  // Container classes
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  containerPadding: 'py-4 sm:py-6 lg:py-8',
  containerSmall: 'py-2 sm:py-4 lg:py-6',
  
  // Grid classes for products
  productGrid: 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  productGridGap: 'gap-4 sm:gap-6 lg:gap-8',
  
  // Grid classes for general content
  contentGrid: 'grid grid-cols-1 lg:grid-cols-3',
  contentGridGap: 'gap-4 sm:gap-6 lg:gap-8',
  
  // Text sizing
  heading1: 'text-2xl sm:text-3xl lg:text-4xl',
  heading2: 'text-xl sm:text-2xl lg:text-3xl',
  heading3: 'text-lg sm:text-xl lg:text-2xl',
  bodyText: 'text-sm sm:text-base',
  smallText: 'text-xs sm:text-sm',
  
  // Button classes
  button: 'min-h-[44px] px-4 py-2.5 text-sm sm:text-base',
  buttonSmall: 'min-h-[40px] px-3 py-2 text-sm',
  buttonLarge: 'min-h-[48px] px-6 py-3 text-base',
  
  // Card classes
  card: 'bg-white rounded-xl shadow-sm border border-gray-200',
  cardPadding: 'p-4 sm:p-6',
  cardPaddingSmall: 'p-3 sm:p-4',
  
  // Form classes
  input: 'text-base px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D77A61] focus:border-[#D77A61] min-h-[44px]',
  label: 'block text-sm font-medium text-gray-700 mb-2',
  
  // Spacing classes
  spacingSmall: 'space-y-3 sm:space-y-4',
  spacingDefault: 'space-y-4 sm:space-y-6',
  spacingLarge: 'space-y-6 sm:space-y-8',
  
  // Margin classes
  marginBottom: 'mb-4 sm:mb-6',
  marginBottomSmall: 'mb-3 sm:mb-4',
  marginBottomLarge: 'mb-6 sm:mb-8',
};

// Mobile detection utilities
export const isMobile = () => {
  return window.innerWidth < 768;
};

export const isTablet = () => {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

export const isDesktop = () => {
  return window.innerWidth >= 1024;
};

// Touch device detection
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Responsive breakpoint utilities
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Get responsive grid columns based on screen size
export const getResponsiveColumns = (screenWidth, config = { mobile: 2, tablet: 3, desktop: 4 }) => {
  if (screenWidth < breakpoints.md) return config.mobile;
  if (screenWidth < breakpoints.lg) return config.tablet;
  return config.desktop;
};

// Get responsive gap based on screen size
export const getResponsiveGap = (screenWidth, config = { mobile: 4, tablet: 6, desktop: 8 }) => {
  if (screenWidth < breakpoints.md) return config.mobile;
  if (screenWidth < breakpoints.lg) return config.tablet;
  return config.desktop;
};

// Format text for mobile (truncate if too long)
export const formatTextForMobile = (text, maxLength = 50) => {
  if (!text) return '';
  if (isMobile() && text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
};

// Get optimal image size for current screen
export const getOptimalImageSize = () => {
  const width = window.innerWidth;
  if (width < breakpoints.sm) return { width: 300, height: 300 };
  if (width < breakpoints.md) return { width: 400, height: 400 };
  if (width < breakpoints.lg) return { width: 500, height: 500 };
  return { width: 600, height: 600 };
};

// Mobile-friendly scroll utilities
export const scrollToTop = (smooth = true) => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'instant'
  });
};

export const scrollToElement = (elementId, offset = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const top = element.offsetTop - offset;
    window.scrollTo({
      top,
      behavior: 'smooth'
    });
  }
};

// Mobile performance utilities
export const debounceForMobile = (func, delay = isMobile() ? 300 : 150) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Mobile-specific event handlers
export const handleMobileClick = (callback) => {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add small delay for better touch feedback
    if (isTouchDevice()) {
      setTimeout(() => callback(e), 50);
    } else {
      callback(e);
    }
  };
};

export default {
  responsiveClasses,
  isMobile,
  isTablet,
  isDesktop,
  isTouchDevice,
  breakpoints,
  getResponsiveColumns,
  getResponsiveGap,
  formatTextForMobile,
  getOptimalImageSize,
  scrollToTop,
  scrollToElement,
  debounceForMobile,
  handleMobileClick
};
