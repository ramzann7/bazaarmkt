import { authToken } from './authservice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class PromotionalService {
  // Get premium showcase products for homepage
  async getPremiumShowcaseProducts(limit = 6) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/featured?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch premium showcase products');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching premium showcase products:', error);
      return [];
    }
  }

  // Get artisan spotlight products for search results
  async getArtisanSpotlightProducts(category = null, limit = 3) {
    try {
      const params = new URLSearchParams({ limit });
      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`${API_BASE_URL}/products/sponsored?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artisan spotlight products');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching artisan spotlight products:', error);
      return [];
    }
  }

  // Check if a product has active promotions
  async getProductPromotions(productId) {
    try {
      const token = authToken.getToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/promotional/revenue/promotional/product/${productId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product promotions');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching product promotions:', error);
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
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/promotional/revenue/promotional/analytics?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch promotion analytics');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching promotion analytics:', error);
      return null;
    }
  }

  // Get artisanal promotional features (for My Revenue page)
  async getArtisanalPromotionalFeatures() {
    try {
      const token = authToken.getToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/promotional/revenue/promotional/artisan-features`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artisanal promotional features');
      }

      const data = await response.json();
      // Filter to only include artisan-specific features (not product-specific)
      return (data.data || []).filter(feature => 
        !feature.productId && feature.featureType !== 'product_featured' && feature.featureType !== 'product_sponsored'
      );
    } catch (error) {
      console.error('Error fetching artisanal promotional features:', error);
      return [];
    }
  }
}

export const promotionalService = new PromotionalService();
