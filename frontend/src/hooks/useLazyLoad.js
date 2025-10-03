import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for lazy loading sections using Intersection Observer
 * Only loads content when section is visible in viewport
 */
export const useLazyLoad = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '100px' // Start loading 100px before entering viewport
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold, rootMargin, hasLoaded]);

  return { elementRef, isVisible, hasLoaded };
};

