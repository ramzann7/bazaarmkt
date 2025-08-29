import React, { Suspense, lazy, useState, useEffect } from 'react';

// Loading spinner component
const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">⚠️</div>
            <p className="text-gray-600 mb-4">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy loader with retry functionality
export const LazyLoader = ({ 
  importFunc, 
  fallback = <LoadingSpinner />,
  errorFallback = null,
  onLoad = null,
  onError = null
}) => {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadComponent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const module = await importFunc();
        const LazyComponent = module.default || module;
        
        if (isMounted) {
          setComponent(() => LazyComponent);
          setIsLoading(false);
          onLoad?.();
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
          onError?.(err);
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, [importFunc, onLoad, onError]);

  if (isLoading) {
    return fallback;
  }

  if (error) {
    return errorFallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">Failed to load component</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
            </button>
        </div>
      </div>
    );
  }

  return Component ? <Component /> : null;
};

// Preload component for better performance
export const preloadComponent = (importFunc) => {
  return () => {
    const promise = importFunc();
    return {
      promise,
      component: lazy(() => promise)
    };
  };
};

// Lazy route component
export const LazyRoute = ({ 
  importFunc, 
  fallback = <LoadingSpinner message="Loading page..." />,
  errorFallback = null 
}) => {
  const LazyComponent = lazy(importFunc);

  return (
    <LazyErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent />
      </Suspense>
    </LazyErrorBoundary>
  );
};

// Intersection observer for lazy loading
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
};

// Lazy image component
export const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad = null,
  onError = null 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = React.useRef();

  const isIntersecting = useIntersectionObserver(imgRef);

  useEffect(() => {
    if (isIntersecting && !isLoaded && !hasError) {
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        onLoad?.();
      };
      img.onerror = () => {
        setHasError(true);
        onError?.();
      };
      img.src = src;
    }
  }, [isIntersecting, src, isLoaded, hasError, onLoad, onError]);

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className}>
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse">
          {placeholder}
        </div>
      )}
      {isLoaded && (
        <img 
          src={src} 
          alt={alt} 
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

// Lazy list component for large datasets
export const LazyList = ({ 
  items, 
  renderItem, 
  pageSize = 20,
  threshold = 100,
  className = '' 
}) => {
  const [visibleItems, setVisibleItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = React.useRef();

  const isIntersecting = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: `${threshold}px`
  });

  useEffect(() => {
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    const newVisibleItems = items.slice(startIndex, endIndex);
    
    setVisibleItems(newVisibleItems);
    setHasMore(endIndex < items.length);
  }, [items, currentPage, pageSize]);

  useEffect(() => {
    if (isIntersecting && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [isIntersecting, hasMore]);

  return (
    <div className={className}>
      {visibleItems.map(renderItem)}
      {hasMore && (
        <div ref={containerRef} className="h-4">
          <LoadingSpinner message="Loading more..." />
        </div>
      )}
    </div>
  );
};

export { LoadingSpinner };
export default LazyLoader;
