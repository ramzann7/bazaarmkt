import { useRef, useState, useEffect } from 'react';

/**
 * Custom hook for horizontal scrolling functionality
 * Provides smooth scrolling with visual indicators
 */
export const useHorizontalScroll = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // Initial check
    checkScrollability();

    // Check on scroll
    scrollElement.addEventListener('scroll', checkScrollability);
    
    // Check on resize
    window.addEventListener('resize', checkScrollability);

    return () => {
      scrollElement.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  const scrollToStart = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToEnd = () => {
    if (!scrollRef.current) return;
    const { scrollWidth } = scrollRef.current;
    scrollRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
  };

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScrollability,
    scrollToStart,
    scrollToEnd
  };
};

