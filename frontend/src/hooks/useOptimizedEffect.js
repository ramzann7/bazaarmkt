import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

// Debounce hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Optimized useEffect that prevents unnecessary re-renders
export const useOptimizedEffect = (effect, dependencies, options = {}) => {
  const {
    skipFirstRender = false,
    debounceMs = 0,
    maxCalls = Infinity
  } = options;

  const isFirstRender = useRef(true);
  const callCount = useRef(0);
  const timeoutRef = useRef(null);

  const debouncedEffect = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (callCount.current >= maxCalls) {
        return;
      }

      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      callCount.current++;
      effect();
    }, debounceMs);
  }, [effect, debounceMs, maxCalls, skipFirstRender]);

  useEffect(() => {
    if (debounceMs > 0) {
      debouncedEffect();
    } else {
      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (callCount.current >= maxCalls) {
        return;
      }

      callCount.current++;
      effect();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  // Reset call count when dependencies change
  useEffect(() => {
    callCount.current = 0;
  }, dependencies);
};

// Hook for async operations with loading state
export const useAsyncOperation = (asyncFunction, dependencies = []) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [asyncFunction]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { execute, isLoading, error, data };
};

// Hook for memoized expensive calculations
export const useMemoizedValue = (computeFunction, dependencies, options = {}) => {
  const { maxAge = 5000 } = options; // 5 seconds default
  const lastComputeTime = useRef(0);
  const lastResult = useRef(null);
  const lastDependencies = useRef(null);

  return useMemo(() => {
    const now = Date.now();
    const dependenciesChanged = !lastDependencies.current || 
      !dependencies.every((dep, index) => dep === lastDependencies.current[index]);

    if (dependenciesChanged || (now - lastComputeTime.current) > maxAge) {
      lastResult.current = computeFunction();
      lastComputeTime.current = now;
      lastDependencies.current = [...dependencies];
    }

    return lastResult.current;
  }, dependencies);
};
