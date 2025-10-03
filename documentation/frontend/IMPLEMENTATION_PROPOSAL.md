# 🎨 UI/UX Redesign - Implementation Proposal

**Date:** October 3, 2025  
**Strategy:** Incremental, Non-Breaking Updates  
**Estimated Time:** 7-10 hours total

---

## 🔍 Current Analysis

✅ **You Already Have:**
- Tailwind CSS configured
- Playfair Display + Inter fonts imported
- Heroicons library (@heroicons/react)
- React Router, React Hot Toast
- Existing navbar, home, products, cart components
- Mobile responsive base

🔄 **Need to Add/Update:**
- New color scheme in Tailwind config
- Enhanced navigation bar with scroll effects
- Hero section redesign
- Product card enhancements
- New sections (How It Works, Trust & Value, Community Spotlight, CTA Banner)
- Cart drawer (slide-in from right)

---

## 📐 Phase-by-Phase Implementation

### ✅ PHASE 1: Design System Foundation (30 min)
**Goal:** Update colors, spacing, and base styles  
**Risk:** 🟢 Very Low - Only CSS/config changes  
**Breaking Changes:** None

#### 1.1 Update Tailwind Config
**File:** `tailwind.config.js`

**Implementation:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E27D60',
          dark: '#D76B4F',
          light: '#F4A261',
          50: '#FEF6F3',
          100: '#FDEEE8',
          200: '#FAD4C6',
          300: '#F7BBA4',
          400: '#F4A261',
          500: '#E27D60',
          600: '#D76B4F',
          700: '#B85840',
          800: '#984531',
          900: '#6F3222',
        },
        secondary: {
          DEFAULT: '#2E2E2E',
          light: '#4A4A4A',
          50: '#F7F7F7',
          100: '#E3E3E3',
          200: '#C8C8C8',
          300: '#A4A4A4',
          400: '#717171',
          500: '#4A4A4A',
          600: '#2E2E2E',
          700: '#1F1F1F',
          800: '#141414',
          900: '#0A0A0A',
        },
        accent: {
          DEFAULT: '#2A9D8F',
          light: '#3DB5A5',
          dark: '#238277',
          50: '#F0FAF9',
          100: '#C7F0EC',
          200: '#9FE6DD',
          300: '#77DCCF',
          400: '#4FC3B3',
          500: '#2A9D8F',
          600: '#238277',
          700: '#1C675E',
          800: '#154C46',
          900: '#0E322E',
        },
        background: {
          DEFAULT: '#FAFAFA',
          dark: '#F5F5F5',
        },
        surface: '#FFFFFF',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
```

**What this does:**
- ✅ Adds your exact color palette
- ✅ Sets up font families (already imported)
- ✅ Adds custom shadows for cards
- ✅ Adds spacing utilities
- ✅ Maintains backward compatibility

#### 1.2: Update CSS Variables
**File:** `/src/index.css`

**Update the `:root` section:**
```css
:root {
  /* New Primary Colors */
  --color-primary: #E27D60;
  --color-primary-dark: #D76B4F;
  --color-primary-light: #F4A261;
  
  /* Secondary Colors */
  --color-secondary: #2E2E2E;
  --color-secondary-light: #4A4A4A;
  
  /* Backgrounds */
  --color-background: #FAFAFA;
  --color-surface: #FFFFFF;
  
  /* Accent */
  --color-accent: #2A9D8F;
  --color-accent-light: #3DB5A5;
  
  /* Text */
  --color-text-primary: #2E2E2E;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  
  /* Legacy (keep for backward compatibility) */
  --color-cream: #F5F1EA;
  --color-forest: #3C6E47;
  --color-terracotta: #D77A61;
  --color-gold: #E6B655;
  --color-dark: #2E2E2E;
  --color-text: #1F2937;
}

/* Add utility classes */
.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-lg font-semibold 
         transition-all duration-200 hover:bg-primary-dark 
         hover:shadow-lg active:scale-95;
}

.btn-outline {
  @apply border-2 border-secondary text-secondary px-6 py-3 rounded-lg 
         font-semibold transition-all duration-200 
         hover:bg-secondary hover:text-white hover:shadow-lg 
         active:scale-95;
}

.btn-accent {
  @apply bg-accent text-white px-6 py-3 rounded-lg font-semibold 
         transition-all duration-200 hover:bg-accent-light 
         hover:shadow-lg active:scale-95;
}

.card-hover {
  @apply transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02];
}

.section-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.section-title {
  @apply font-display text-3xl md:text-4xl font-bold text-secondary mb-4;
}

.section-subtitle {
  @apply text-lg text-gray-600 mb-12;
}
```

**What this does:**
- ✅ Updates color palette
- ✅ Creates reusable button classes
- ✅ Adds utility classes for consistency
- ✅ Keeps old colors for backward compatibility

**Test:** After this phase, existing UI should still work but with new colors

---

### ✅ PHASE 2: Navigation Bar (45-60 min)
**Goal:** Sticky nav with scroll effects  
**Risk:** 🟡 Medium - Updates main navigation  
**Breaking Changes:** None (updates existing component)

#### 2.1: Update Navbar Component
**File:** `/src/components/navbar.jsx`

**Key Changes:**
1. Add scroll detection
2. Add semi-transparent background
3. Update to 64px height
4. Reorganize: Logo left, Nav center, CTAs right

**Implementation Strategy:**
```jsx
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  
  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 h-16
      transition-all duration-300
      ${scrolled 
        ? 'bg-white shadow-md' 
        : 'bg-white/80 backdrop-blur-sm'
      }
    `}>
      <div className="section-container h-full">
        <div className="flex items-center justify-between h-full">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>
          
          {/* Center: Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/products">Shop</NavLink>
            <NavLink to="/community">Community</NavLink>
            <NavLink to="/about">About</NavLink>
          </div>
          
          {/* Right: CTA Buttons + Cart */}
          <div className="flex items-center gap-4">
            <button className="relative">
              <ShoppingBagIcon className="w-6 h-6 text-secondary" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            
            {!isAuthenticated ? (
              <>
                <button className="btn-outline hidden sm:block">
                  Sign In
                </button>
                <button className="btn-primary">
                  Join as an Artisan
                </button>
              </>
            ) : (
              <UserMenu />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

const NavLink = ({ to, children }) => (
  <Link 
    to={to}
    className="text-secondary hover:text-primary font-medium transition-colors"
  >
    {children}
  </Link>
);
```

**What this does:**
- ✅ Sticky positioning
- ✅ Scroll-based transparency
- ✅ 64px height
- ✅ Proper layout (logo, nav, CTAs)
- ✅ Cart icon with badge
- ✅ Maintains all existing functionality

**Test:** Navigation should work exactly as before, just look better

---

### ✅ PHASE 3: Hero Section (60-90 min)
**Goal:** Compelling hero with value prop  
**Risk:** 🟡 Medium - Changes homepage  
**Breaking Changes:** None (updates existing content)

#### 3.1: Create Hero Component
**File:** `/src/components/home/HeroSection.jsx` (new)

**Implementation:**
```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function HeroSection() {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-[600px] flex items-center bg-gradient-to-br from-primary-50 to-accent-50 pt-24 pb-16">
      <div className="section-container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6 text-center md:text-left">
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-secondary leading-tight">
              Buy directly from your <span className="text-primary">local makers</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-xl">
              Discover handcrafted products from talented artisans in Quebec. 
              Support local, shop unique, enjoy authentic creations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button 
                onClick={() => navigate('/products')}
                className="btn-primary group flex items-center justify-center gap-2"
              >
                Shop Local Products
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="btn-outline"
              >
                Join as an Artisan
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center gap-8 pt-4 text-sm text-gray-600 justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <span>50+ Local Artisans</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span>4.9★ Average Rating</span>
              </div>
            </div>
          </div>
          
          {/* Hero Image/Visual */}
          <div className="relative hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="/images/hero-artisan.jpg" 
                alt="Local artisan crafting" 
                className="w-full h-[500px] object-cover"
                onError={(e) => {
                  // Fallback to gradient if image not found
                  e.target.style.display = 'none';
                  e.target.parentElement.classList.add('bg-gradient-to-br', 'from-primary-200', 'to-accent-200');
                }}
              />
              
              {/* Floating Badge */}
              <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg p-4 max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary">Trusted by thousands</p>
                    <p className="text-sm text-gray-600">Join our community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-20 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-100 rounded-full blur-3xl opacity-20 -z-10"></div>
    </section>
  );
}
```

**What this does:**
- ✅ Two-column layout (responsive)
- ✅ Large heading with color accent
- ✅ Two CTAs (primary + outline)
- ✅ Trust indicators
- ✅ Hero image with fallback
- ✅ Floating badge overlay
- ✅ Decorative background elements

**Risk Mitigation:**
- Use className utilities (no inline styles)
- Graceful image fallback
- Mobile-first responsive

---

### ✅ PHASE 4: Product Cards & Grid (60 min)
**Goal:** Beautiful product cards with hover effects  
**Risk:** 🟢 Low - Enhances existing  
**Breaking Changes:** None

#### 4.1: Enhanced Product Card
**File:** `/src/components/ProductCard.jsx`

**Key Updates:**
```jsx
export default function ProductCard({ product, onAddToCart }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <div className="group bg-white rounded-xl shadow-card overflow-hidden card-hover cursor-pointer">
      {/* Image - Square Aspect Ratio */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img 
          src={product.image || '/placeholder-product.jpg'} 
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Quick Add Button - Shows on Hover (Desktop) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.(product);
            }}
            className="btn-primary"
          >
            Add to Cart
          </button>
        </div>
        
        {/* Badges */}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 bg-accent text-white text-xs px-2 py-1 rounded-full font-semibold">
            Featured
          </div>
        )}
        {product.isNew && (
          <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
            New
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Product Name */}
        <h3 className="font-semibold text-lg text-secondary line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
          {product.description}
        </p>
        
        {/* Price & Artisan */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-2xl font-bold text-primary">
            ${product.price?.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500">
            by {product.artisan?.businessName || 'Artisan'}
          </span>
        </div>
        
        {/* Mobile Add to Cart */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          className="w-full btn-primary md:hidden mt-3"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

**What this does:**
- ✅ Square images (1:1 aspect ratio)
- ✅ Hover effects (scale + shadow)
- ✅ Quick add on hover (desktop)
- ✅ Always visible add button (mobile)
- ✅ Badges for featured/new products
- ✅ Artisan name displayed
- ✅ Loading states

#### 4.2: Update Product Grid
**File:** `/src/components/home.jsx` (Featured Products section)

**Update:**
```jsx
{/* Featured Products Section */}
<section className="py-16 bg-white">
  <div className="section-container">
    <div className="text-center mb-12">
      <h2 className="section-title">
        Discover Handcrafted Products
      </h2>
      <p className="section-subtitle">
        Curated daily from local artisans in Quebec
      </p>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {isLoadingFeatured ? (
        // Loading skeletons
        Array(6).fill(0).map((_, i) => <ProductSkeleton key={i} />)
      ) : (
        availableFeaturedProducts.map(product => (
          <ProductCard 
            key={product._id} 
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))
      )}
    </div>
  </div>
</section>
```

**What this does:**
- ✅ 3-column grid (responsive)
- ✅ Centered title + subtitle
- ✅ Loading states
- ✅ Proper spacing

**Test:** Products should display in nice grid with hover effects

---

### ✅ PHASE 5: New Homepage Sections (90-120 min)
**Goal:** Add How It Works, Trust & Value, Community Spotlight  
**Risk:** 🟢 Low - All new components  
**Breaking Changes:** None

#### 5.1: How It Works Section
**File:** `/src/components/home/HowItWorks.jsx` (new)

**Implementation:**
```jsx
const steps = [
  {
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Find Local Artisans',
    description: 'Browse unique products from talented makers in your area'
  },
  {
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    title: 'Order with Ease',
    description: 'Simple checkout with flexible pickup or delivery options'
  },
  {
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Enjoy Directly from Makers',
    description: 'Support local economy and enjoy fresh, handmade creations'
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20 bg-background">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three simple steps to support local artisans</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center space-y-4">
              {/* Icon Circle */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white shadow-lg">
                {step.icon}
              </div>
              
              {/* Step Number */}
              <div className="inline-block bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              
              {/* Title */}
              <h3 className="font-display text-2xl font-semibold text-secondary">
                {step.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### 5.2: Trust & Value Section
**File:** `/src/components/home/TrustSection.jsx` (new)

```jsx
const values = [
  {
    icon: '💚',
    title: 'Support Local Economy',
    description: '100% of your purchase goes directly to local artisans in Quebec'
  },
  {
    icon: '🌱',
    title: 'Fresh & Handmade',
    description: 'Every product is crafted with care, made fresh to order'
  },
  {
    icon: '✨',
    title: 'Unique Creations',
    description: 'Discover one-of-a-kind items you won\'t find anywhere else'
  }
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-white">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="section-title">Why Buy Local?</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div 
              key={index}
              className="bg-background rounded-2xl p-8 text-center hover:shadow-xl transition-shadow duration-300"
            >
              <div className="text-5xl mb-4">{value.icon}</div>
              <h3 className="font-display text-xl font-semibold text-secondary mb-3">
                {value.title}
              </h3>
              <p className="text-gray-600">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### 5.3: CTA Banner
**File:** `/src/components/home/CTABanner.jsx` (new)

```jsx
export default function CTABanner() {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 bg-secondary text-white">
      <div className="section-container text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Become part of the movement
          </h2>
          <p className="text-xl text-gray-300">
            Sell your creations on BazaarMkt today and reach thousands of local customers
          </p>
          <button 
            onClick={() => navigate('/register?type=artisan')}
            className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:shadow-xl"
          >
            Start Selling Today
          </button>
        </div>
      </div>
    </section>
  );
}
```

---

### ✅ PHASE 6: Cart Drawer (60-90 min)
**Goal:** Slide-in cart instead of dropdown  
**Risk:** 🟡 Medium - Changes cart interaction  
**Breaking Changes:** None (keeps same functionality)

#### 6.1: Create Cart Drawer Component
**File:** `/src/components/CartDrawer.jsx` (new)

**Implementation:**
```jsx
import React from 'react';
import { XMarkIcon, ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, onRemove }) {
  const navigate = useNavigate();
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };
  
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="w-6 h-6 text-secondary" />
            <h2 className="text-xl font-bold text-secondary">
              Your Cart ({items.length})
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Your cart is empty</p>
              <button 
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
                className="btn-primary mt-4"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-4 bg-background p-4 rounded-lg">
                  {/* Thumbnail */}
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  {/* Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-secondary">{item.name}</h3>
                    <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onRemove(item.id)}
                        className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer - Checkout */}
        {items.length > 0 && (
          <div className="border-t p-6 space-y-4">
            {/* Estimated Delivery */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-accent-50 p-3 rounded-lg">
              <ClockIcon className="w-5 h-5 text-accent" />
              <span>Estimated pickup/delivery: 2-3 days</span>
            </div>
            
            {/* Subtotal */}
            <div className="flex justify-between text-lg">
              <span className="font-semibold text-secondary">Subtotal:</span>
              <span className="font-bold text-primary">${subtotal.toFixed(2)}</span>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={handleCheckout}
              className="w-full btn-primary text-lg py-4"
            >
              Proceed to Checkout
            </button>
            
            <button 
              onClick={onClose}
              className="w-full text-gray-600 hover:text-secondary transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```

---

## 🎯 Implementation Steps (In Order)

### Step 1: Update Design System (START HERE)
```bash
# 1. Update tailwind.config.js
# 2. Update /src/index.css with new colors and utilities
# 3. Test that existing UI still renders
```

### Step 2: Update Navigation
```bash
# 1. Update /src/components/navbar.jsx with scroll effects
# 2. Test navigation on all pages
# 3. Test mobile menu
```

### Step 3: Update Hero
```bash
# 1. Create /src/components/home/HeroSection.jsx
# 2. Import in home.jsx
# 3. Replace existing hero
# 4. Test responsiveness
```

### Step 4: Enhance Products
```bash
# 1. Update ProductCard.jsx
# 2. Update product grid in home.jsx
# 3. Test on products page
# 4. Test add to cart functionality
```

### Step 5: Add New Sections
```bash
# 1. Create HowItWorks.jsx
# 2. Create TrustSection.jsx
# 3. Create CTABanner.jsx
# 4. Add all to home.jsx
# 5. Test page flow
```

### Step 6: Implement Cart Drawer
```bash
# 1. Create CartDrawer.jsx
# 2. Update navbar.jsx to use drawer
# 3. Replace CartDropdown with CartDrawer
# 4. Test cart functionality
```

### Step 7: Update Footer
```bash
# 1. Update Footer.jsx with dark theme
# 2. Add social icons
# 3. Organize links
# 4. Test all links
```

### Step 8: Polish & Test
```bash
# 1. Add animations
# 2. Test on all browsers
# 3. Test mobile
# 4. Fix any issues
```

---

## 🚀 Ready to Start?

I can begin with **Phase 1 (Design System Foundation)** right now. This will:
- Update your color palette
- Add button utilities
- Set up the design foundation
- **Not break anything** - just makes colors prettier

After that works, we'll move to Phase 2 (Navigation), and so on.

Should I proceed with Phase 1?

