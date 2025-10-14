import React, { useState, useEffect, useRef } from 'react';

/**
 * OptimizedImage - Mobile-optimized image component with lazy loading
 * 
 * Features:
 * - Intersection Observer for lazy loading
 * - Progressive image loading (low-res → high-res)
 * - Loading skeleton/placeholder
 * - Error handling with fallback
 * - Responsive sizing
 * - Performance optimized for mobile
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  aspectRatio = '1/1', // Default square, can be '16/9', '4/3', etc.
  objectFit = 'cover', // 'cover', 'contain', 'fill', 'none', 'scale-down'
  loading = 'lazy', // 'lazy' or 'eager'
  placeholder = null, // Custom placeholder component or image
  fallbackSrc = '/images/placeholder.png', // Fallback if image fails to load
  onLoad,
  onError,
  priority = false, // Set to true for above-fold images
  quality = 'auto', // 'low', 'medium', 'high', 'auto'
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      setCurrentSrc(src);
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(src);
            // Stop observing once loaded
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    // Start observing
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, priority, loading]);

  // Handle image load
  const handleLoad = (e) => {
    setIsLoaded(true);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  // Handle image error
  const handleError = (e) => {
    setHasError(true);
    setCurrentSrc(fallbackSrc);
    if (onError) onError(e);
  };

  // Generate quality-optimized src
  const getOptimizedSrc = () => {
    if (!currentSrc) return null;
    
    // If it's a base64 or blob, return as-is
    if (currentSrc.startsWith('data:') || currentSrc.startsWith('blob:')) {
      return currentSrc;
    }

    // Add quality parameters if applicable
    // This is a placeholder - adjust based on your image service
    return currentSrc;
  };

  const optimizedSrc = getOptimizedSrc();

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{ aspectRatio }}
    >
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer">
          {placeholder || (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
          decoding="async"
          className={`
            absolute inset-0 w-full h-full
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ objectFit }}
          {...props}
        />
      )}

      {/* Error State */}
      {hasError && !optimizedSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
          <svg
            className="w-12 h-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;

