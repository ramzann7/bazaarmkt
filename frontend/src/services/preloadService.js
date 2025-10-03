// Preload service for optimizing navigation performance
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';
import { artisanService } from './artisanService';
import { getFeaturedProducts, getPopularProducts } from './productService';
import { promotionalService } from './promotionalService';

class PreloadService {
  constructor() {
    this.preloadQueue = new Set();
    this.isPreloading = false;
  }

  // Preload critical data for home page
  async preloadHomeData() {
    if (this.preloadQueue.has('home')) return;
    this.preloadQueue.add('home');

    try {
      console.log('🚀 Preloading home page data...');
      
      // Preload featured products
      this.preloadFeaturedProducts();
      
      // Preload popular products
      this.preloadPopularProducts();
      
      // Preload categories
      this.preloadCategories();
      
    } catch (error) {
      console.error('Error preloading home data:', error);
    } finally {
      this.preloadQueue.delete('home');
    }
  }

  // Preload critical data for find artisans page
  async preloadFindArtisansData() {
    if (this.preloadQueue.has('find-artisans')) return;
    this.preloadQueue.add('find-artisans');

    try {
      console.log('🚀 Preloading find artisans data...');
      
      // Preload all artisans (with basic info only)
      this.preloadArtisans();
      
      // Preload artisan promotions
      this.preloadArtisanPromotions();
      
      // Preload categories for filtering
      this.preloadCategories();
      
    } catch (error) {
      console.error('Error preloading find artisans data:', error);
    } finally {
      this.preloadQueue.delete('find-artisans');
    }
  }

  // Preload critical data for account/profile pages
  async preloadAccountData() {
    if (this.preloadQueue.has('account')) return;
    this.preloadQueue.add('account');

    try {
      console.log('🚀 Preloading account data...');
      
      // Profile data is already handled by AuthContext
      // Preload user-specific data like orders, favorites, etc.
      this.preloadUserData();
      
    } catch (error) {
      console.error('Error preloading account data:', error);
    } finally {
      this.preloadQueue.delete('account');
    }
  }

  // Preload featured products in background
  preloadFeaturedProducts() {
    if (cacheService.has(CACHE_KEYS.FEATURED_PRODUCTS)) return;
    
    cacheService.preload(
      CACHE_KEYS.FEATURED_PRODUCTS,
      async () => {
        const response = await getFeaturedProducts();
        return response.products || [];
      },
      CACHE_TTL.FEATURED_PRODUCTS
    );
  }

  // Preload popular products in background
  preloadPopularProducts() {
    if (cacheService.has(CACHE_KEYS.POPULAR_PRODUCTS)) return;
    
    cacheService.preload(
      CACHE_KEYS.POPULAR_PRODUCTS,
      async () => {
        const response = await getPopularProducts();
        return response.products || [];
      },
      CACHE_TTL.POPULAR_PRODUCTS
    );
  }

  // Preload artisans in background
  preloadArtisans() {
    const cacheKey = `${CACHE_KEYS.ARTISAN_DETAILS}_all`;
    if (cacheService.has(cacheKey)) return;
    
    cacheService.preload(
      cacheKey,
      async () => {
        return await artisanService.getAllArtisans({ includeProducts: false });
      },
      CACHE_TTL.ARTISAN_DETAILS
    );
  }

  // Preload artisan promotions in background
  preloadArtisanPromotions() {
    const cacheKey = `${CACHE_KEYS.ARTISAN_DETAILS}_promotions`;
    if (cacheService.has(cacheKey)) return;
    
    cacheService.preload(
      cacheKey,
      async () => {
        // Use available promotional service functions
        try {
          const [premiumShowcase, artisanSpotlight] = await Promise.all([
            promotionalService.getPremiumShowcaseProducts(6),
            promotionalService.getArtisanSpotlightProducts(null, 3)
          ]);
          return {
            premiumShowcase,
            artisanSpotlight
          };
        } catch (error) {
          console.warn('Failed to preload promotional data:', error);
          return { premiumShowcase: [], artisanSpotlight: [] };
        }
      },
      CACHE_TTL.ARTISAN_DETAILS
    );
  }

  // Preload categories in background
  preloadCategories() {
    if (cacheService.has(CACHE_KEYS.CATEGORIES)) return;
    
    cacheService.preload(
      CACHE_KEYS.CATEGORIES,
      async () => {
        // Import categories data
        const { PRODUCT_CATEGORIES } = await import('../data/productReference');
        return PRODUCT_CATEGORIES;
      },
      CACHE_TTL.CATEGORIES
    );
  }

  // Preload user-specific data
  preloadUserData() {
    // This will be implemented when user-specific services are available
    console.log('User data preloading placeholder');
  }

  // Preload data based on current route (non-blocking)
  preloadForRoute(route) {
    // Use setTimeout to make preloading non-blocking
    setTimeout(() => {
      try {
        switch (route) {
          case '/':
            this.preloadHomeData();
            break;
          case '/find-artisans':
            this.preloadFindArtisansData();
            break;
          case '/profile':
          case '/account':
            this.preloadAccountData();
            break;
          default:
            // Preload common data for any route
            this.preloadCategories();
            break;
        }
      } catch (error) {
        console.error('Error in preloadForRoute:', error);
      }
    }, 100); // Small delay to ensure UI is responsive
  }

  // Preload data for navigation (called when user hovers over links)
  preloadForNavigation(targetRoute) {
    console.log('🚀 Preloading data for navigation to:', targetRoute);
    this.preloadForRoute(targetRoute);
  }

  // Clear preload queue
  clearQueue() {
    this.preloadQueue.clear();
  }
}

// Create singleton instance
export const preloadService = new PreloadService();

// Export for use in components
export default preloadService;
