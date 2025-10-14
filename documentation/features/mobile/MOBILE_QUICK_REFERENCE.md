# Mobile Development Quick Reference Guide

## Table of Contents
1. [Mobile-First CSS Classes](#mobile-first-css-classes)
2. [Touch Target Guidelines](#touch-target-guidelines)
3. [Responsive Component Patterns](#responsive-component-patterns)
4. [Performance Checklist](#performance-checklist)
5. [Testing Guidelines](#testing-guidelines)

## Mobile-First CSS Classes

### Layout & Spacing
```css
/* Use existing Tailwind responsive classes */
.mobile-container     { @apply px-4 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6; }
.mobile-card         { @apply p-4 sm:p-6; }
.mobile-grid         { @apply grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4; }
.mobile-stack        { @apply flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4; }
```

### Typography
```css
.mobile-heading-1    { @apply text-2xl sm:text-3xl lg:text-4xl font-bold; }
.mobile-heading-2    { @apply text-xl sm:text-2xl lg:text-3xl font-semibold; }
.mobile-heading-3    { @apply text-lg sm:text-xl lg:text-2xl font-medium; }
.mobile-body        { @apply text-sm sm:text-base; }
.mobile-caption     { @apply text-xs sm:text-sm text-gray-600; }
```

### Interactive Elements
```css
.mobile-button      { @apply min-h-[44px] px-4 py-3 text-base font-medium; }
.mobile-button-sm   { @apply min-h-[40px] px-3 py-2 text-sm font-medium; }
.mobile-input       { @apply min-h-[44px] px-4 py-3 text-base; }
.mobile-touch-area  { @apply min-h-[44px] min-w-[44px]; }
```

## Touch Target Guidelines

### Minimum Sizes (iOS Human Interface Guidelines)
- **Buttons**: 44px × 44px minimum
- **Touch targets**: 44px × 44px minimum
- **Text links**: 44px height minimum
- **Form controls**: 44px height minimum

### Spacing Requirements
- **Between targets**: 8px minimum spacing
- **Edge margins**: 16px from screen edge
- **Safe areas**: Respect device safe areas

### Implementation
```jsx
const TouchFriendlyButton = ({ children, size = 'default', ...props }) => {
  const sizeClasses = {
    small: 'min-h-[40px] px-3 py-2 text-sm',
    default: 'min-h-[44px] px-4 py-3 text-base',
    large: 'min-h-[48px] px-6 py-3 text-lg'
  };
  
  return (
    <button 
      className={`${sizeClasses[size]} font-medium rounded-lg transition-colors`}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Responsive Component Patterns

### 1. Mobile-First Navigation
```jsx
const MobileNavigation = () => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
    <div className="grid grid-cols-5 h-16">
      {navItems.map(item => (
        <NavItem key={item.path} {...item} />
      ))}
    </div>
  </nav>
);
```

### 2. Responsive Image Grid
```jsx
const ResponsiveImageGrid = ({ images }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
    {images.map(image => (
      <div key={image.id} className="aspect-square">
        <img 
          src={image.url} 
          alt={image.alt}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
      </div>
    ))}
  </div>
);
```

### 3. Mobile Card Layout
```jsx
const MobileCard = ({ children, className = '' }) => (
  <div className={`
    bg-white rounded-xl border shadow-sm
    p-4 sm:p-6
    ${className}
  `}>
    {children}
  </div>
);
```

### 4. Stack to Row Layout
```jsx
const ResponsiveStack = ({ children, className = '' }) => (
  <div className={`
    flex flex-col space-y-4 
    sm:flex-row sm:space-y-0 sm:space-x-4 
    ${className}
  `}>
    {children}
  </div>
);
```

## Performance Checklist

### Image Optimization
- [ ] Use WebP format when possible
- [ ] Implement lazy loading (`loading="lazy"`)
- [ ] Provide multiple sizes with `srcset`
- [ ] Compress images (80% quality for photos)
- [ ] Use appropriate image dimensions

```jsx
const OptimizedImage = ({ src, alt, sizes = "100vw" }) => (
  <img
    src={src}
    srcSet={`
      ${src}?w=320 320w,
      ${src}?w=640 640w,
      ${src}?w=1024 1024w
    `}
    sizes={sizes}
    alt={alt}
    loading="lazy"
    className="w-full h-full object-cover"
  />
);
```

### Code Splitting
```jsx
// Route-based splitting
const LazyComponent = lazy(() => import('./HeavyComponent'));

// Component-based splitting
const LazyModal = lazy(() => 
  import('./Modal').then(module => ({ default: module.Modal }))
);
```

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Check mobile performance
npx lighthouse https://yourdomain.com --form-factor=mobile
```

## Testing Guidelines

### Device Testing Matrix
| Device Category | Viewport Size | Test Priority |
|----------------|---------------|---------------|
| Small Phone    | 320px - 374px | High |
| Large Phone    | 375px - 414px | Critical |
| Small Tablet   | 768px - 1023px| Medium |
| Large Tablet   | 1024px+       | Low |

### Testing Checklist
- [ ] Touch targets are minimum 44px
- [ ] Content is readable without zooming
- [ ] Forms are easy to fill on mobile
- [ ] Navigation is thumb-friendly
- [ ] Images load quickly and look good
- [ ] Animations are smooth (60fps)
- [ ] Works in both portrait and landscape
- [ ] Handles poor network conditions

### Browser Testing
```jsx
// Feature detection example
const TouchSupport = () => {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return (
    <div className={hasTouch ? 'touch-optimized' : 'mouse-optimized'}>
      {/* Component content */}
    </div>
  );
};
```

### Viewport Meta Tag
```html
<!-- Ensure this is in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

## Common Mobile Patterns

### 1. Bottom Sheet/Modal
```jsx
const MobileModal = ({ isOpen, onClose, children }) => (
  <div className={`
    fixed inset-0 z-50 
    ${isOpen ? 'block' : 'hidden'}
  `}>
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-6">
      {children}
    </div>
  </div>
);
```

### 2. Pull to Refresh
```jsx
const usePullToRefresh = (onRefresh) => {
  // Implementation in main guide
};
```

### 3. Infinite Scroll
```jsx
const useInfiniteScroll = (loadMore, hasMore) => {
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        if (hasMore) loadMore();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore]);
};
```

### 4. Swipe Gestures
```jsx
const useSwipe = (onSwipeLeft, onSwipeRight) => {
  // Implementation in main guide
};
```

## Debugging Mobile Issues

### Console on Mobile
```jsx
// Mobile debug overlay
const MobileDebug = () => {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args) => {
      setLogs(prev => [...prev, args.join(' ')].slice(-10));
      originalLog(...args);
    };
    
    return () => {
      console.log = originalLog;
    };
  }, []);
  
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-black text-white text-xs p-2 z-[9999] max-h-32 overflow-y-auto">
      {logs.map((log, i) => (
        <div key={i}>{log}</div>
      ))}
    </div>
  );
};
```

### Network Simulation
```jsx
// Simulate slow network
const useNetworkSpeed = () => {
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  
  useEffect(() => {
    if (navigator.connection) {
      const connection = navigator.connection;
      setIsSlowNetwork(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
    }
  }, []);
  
  return isSlowNetwork;
};
```

## Quick Commands

```bash
# Start development with mobile viewport
npm run dev -- --host 0.0.0.0 --port 5180

# Test on mobile device (replace with your IP)
# Navigate to: http://192.168.1.xxx:5180

# Build for production
npm run build

# Preview production build
npm run preview

# Analyze bundle
npx vite-bundle-analyzer dist

# Mobile lighthouse audit
npx lighthouse https://your-site.com --form-factor=mobile --output html
```

## Resources

- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://material.io/design)
- [Web.dev Mobile Performance](https://web.dev/mobile/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
