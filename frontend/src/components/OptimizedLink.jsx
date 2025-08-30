import React from 'react';
import { Link } from 'react-router-dom';
import { preloadService } from '../services/preloadService';

// Optimized Link component that preloads data on hover
const OptimizedLink = ({ 
  to, 
  children, 
  className, 
  onClick, 
  onMouseEnter,
  preloadData = true,
  ...props 
}) => {
  const handleMouseEnter = (e) => {
    // Call original onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(e);
    }
    
    // Preload data for the target route
    if (preloadData && to) {
      preloadService.preloadForNavigation(to);
    }
  };

  const handleClick = (e) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      to={to}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  );
};

export default OptimizedLink;
