import { authToken } from './authservice';

// Handle both cases: with and without /api suffix
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Debug logging
console.log('🔧 PromotionalService - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔧 PromotionalService - BASE_URL:', BASE_URL);
console.log('🔧 PromotionalService - API_BASE_URL:', API_BASE_URL);

class PromotionalService {
  constructor() {
    this.isAvailable = true;
    this.lastError = null;
  }

  // Check if the promotional service is available
  async checkAvailability() {
    try {
      const response = await fetch(`${API_BASE_URL}/promotional/products/featured?limit=1`);
      this.isAvailable = response.ok;
      this.lastError = null;
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.lastError = error;
      console.warn('⚠️ Promotional service not available:', error.message);
      return false;
    }
  }

  // Get premium showcase products for homepage
  async getPremiumShowcaseProducts(limit = 6) {
    try {
      // Check if service is available
      if (!this.isAvailable) {
        console.log('⚠️ Promotional service not available, returning empty array');
        return [];
      }

      const url = `${API_BASE_URL}/promotional/products/featured?limit=${limit}`;
      console.log('🔍 Fetching premium showcase products from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Premium showcase products API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log('✅ Premium showcase products fetched successfully:', data.data?.length || 0, 'products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching premium showcase products:', error);
      return [];
    }
  }

  // Get artisan spotlight products for search results
  async getArtisanSpotlightProducts(category = null, limit = 3) {
    try {
      // Check if service is available
      if (!this.isAvailable) {
        console.log('⚠️ Promotional service not available, returning empty array');
        return [];
      }

      const params = new URLSearchParams({ limit });
      if (category) {
        params.append('category', category);
      }

      const url = `${API_BASE_URL}/promotional/products/sponsored?${params}`;
      console.log('🔍 Fetching artisan spotlight products from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Artisan spotlight products API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log('✅ Artisan spotlight products fetched successfully:', data.data?.length || 0, 'products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching artisan spotlight products:', error);
      return [];
    }
  }

  // Check if a product has active promotions
  async getProductPromotions(productId) {
    try {
      // Check if service is available
      if (!this.isAvailable) {
        console.log('⚠️ Promotional service not available, returning empty array');
        return [];
      }

      const token = authToken.getToken();
      if (!token) {
        console.log('🔒 No auth token available for product promotions');
        return [];
      }

      const url = `${API_BASE_URL}/promotional/revenue/promotional/product/${productId}`;
      console.log('🔍 Fetching product promotions from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Product promotions API error: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.log('ℹ️ No promotions found for this product (404)');
        }
        return [];
      }

      const data = await response.json();
      console.log('✅ Product promotions fetched successfully:', data.data?.length || 0, 'promotions');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching product promotions:', error);
      return [];
    }
  }

  // Get promotion badges for display with artisanal terminology
  getPromotionBadges(promotions) {
    const badges = [];
    
    promotions.forEach(promotion => {
      if (promotion.status === 'active' && new Date(promotion.endDate) > new Date()) {
        switch (promotion.featureType) {
          case 'product_featured':
            badges.push({
              type: 'premium_showcase',
              label: 'Premium Showcase',
              color: 'bg-amber-100 text-amber-800 border-amber-200',
              icon: '⭐',
              description: 'Featured on homepage and search results'
            });
            break;
          case 'product_sponsored':
            badges.push({
              type: 'artisan_spotlight',
              label: 'Artisan Spotlight',
              color: 'bg-purple-100 text-purple-800 border-purple-200',
              icon: '✨',
              description: 'Highlighted in search results'
            });
            break;
        }
      }
    });

    return badges;
  }

  // Sort products with promotional priority
  sortProductsWithPromotions(products, promotions) {
    return products.sort((a, b) => {
      const aPromotions = promotions.filter(p => p.productId === a._id);
      const bPromotions = promotions.filter(p => p.productId === b._id);
      
      // Premium showcase products get highest priority
      const aPremiumShowcase = aPromotions.some(p => p.featureType === 'product_featured' && p.status === 'active');
      const bPremiumShowcase = bPromotions.some(p => p.featureType === 'product_featured' && p.status === 'active');
      
      if (aPremiumShowcase && !bPremiumShowcase) return -1;
      if (!aPremiumShowcase && bPremiumShowcase) return 1;
      
      // Artisan spotlight products get second priority
      const aArtisanSpotlight = aPromotions.some(p => p.featureType === 'product_sponsored' && p.status === 'active');
      const bArtisanSpotlight = bPromotions.some(p => p.featureType === 'product_sponsored' && p.status === 'active');
      
      if (aArtisanSpotlight && !bArtisanSpotlight) return -1;
      if (!aArtisanSpotlight && bArtisanSpotlight) return 1;
      
      // Default sorting by name
      return a.name.localeCompare(b.name);
    });
  }

  // Get promotion analytics for artisans
  async getPromotionAnalytics(period = 'month') {
    try {
      const token = authToken.getToken();
      if (!token) {
        console.log('🔒 No auth token available for promotion analytics');
        return null;
      }

      const url = `${API_BASE_URL}/promotional/revenue/promotional/analytics?period=${period}`;
      console.log('🔍 Fetching promotion analytics from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Promotion analytics API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('✅ Promotion analytics fetched successfully');
      return data.data;
    } catch (error) {
      console.error('❌ Error fetching promotion analytics:', error);
      return null;
    }
  }

  // Get artisanal promotional features (for My Revenue page)
  async getArtisanalPromotionalFeatures() {
    try {
      const token = authToken.getToken();
      if (!token) {
        console.log('🔒 No auth token available for artisanal promotional features');
        return [];
      }

      const url = `${API_BASE_URL}/revenue/promotional/artisan-features`;
      console.log('🔍 Fetching artisanal promotional features from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Artisanal promotional features API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log('✅ Artisanal promotional features fetched successfully:', data.data?.length || 0, 'features');
      // Filter to only include artisan-specific features (not product-specific)
      return (data.data || []).filter(feature => 
        !feature.productId && feature.featureType !== 'product_featured' && feature.featureType !== 'product_sponsored'
      );
    } catch (error) {
      console.error('❌ Error fetching artisanal promotional features:', error);
      return [];
    }
  }
}

export const promotionalService = new PromotionalService();
