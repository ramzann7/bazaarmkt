import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { performanceService } from '../services/performanceService';

// Performance monitoring component
const PerformanceMonitor = () => {
  const location = useLocation();
  const [navigationTimes, setNavigationTimes] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [previousRoute, setPreviousRoute] = useState('');

  useEffect(() => {
    // Start navigation timer
    const startTime = performance.now();
    const currentRoute = location.pathname;
    
    console.log(`🚀 Navigation started to: ${currentRoute}`);
    
    // Track when the component is fully loaded
    const handleLoadComplete = () => {
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      console.log(`✅ Navigation completed to ${currentRoute} in ${navigationTime.toFixed(2)}ms`);
      
      setNavigationTimes(prev => ({
        ...prev,
        [currentRoute]: navigationTime
      }));
      
      // Log to performance service with proper from/to routes
      if (previousRoute && currentRoute) {
        performanceService.logNavigation(previousRoute, currentRoute, navigationTime);
      } else {
        console.log(`✅ Navigation completed to ${currentRoute} in ${navigationTime.toFixed(2)}ms (initial load)`);
      }
      
      // Update previous route for next navigation
      setPreviousRoute(currentRoute);
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(handleLoadComplete);
    });

    // Show performance monitor in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }

  }, [location.pathname]);

  // Hide performance monitor after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const currentRoute = location.pathname;
  const currentTime = navigationTimes[currentRoute];

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm z-50">
      <div className="font-mono">
        <div>Route: {currentRoute}</div>
        {currentTime && (
          <div className="text-green-400">
            Load time: {currentTime.toFixed(0)}ms
          </div>
        )}
        <div className="text-gray-400 text-xs">
          {Object.keys(navigationTimes).length} routes tracked
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
