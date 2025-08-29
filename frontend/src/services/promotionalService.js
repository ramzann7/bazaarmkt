import { authToken } from './authservice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class PromotionalService {
  // Get featured products for homepage
  async getFeaturedProducts(limit = 6) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/featured?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch featured products');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  // Get sponsored products for search results
  async getSponsoredProducts(category = null, limit = 3) {
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
        throw new Error('Failed to fetch sponsored products');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching sponsored products:', error);
      return [];
    }
  }



  // Check if a product has active promotions
  async getProductPromotions(productId) {
    try {
      const token = authToken.getToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/revenue/promotional/product/${productId}`, {
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

  // Get promotion badges for display
  getPromotionBadges(promotions) {
    const badges = [];
    
    promotions.forEach(promotion => {
      if (promotion.status === 'active' && new Date(promotion.endDate) > new Date()) {
        switch (promotion.featureType) {
          case 'product_featured':
            badges.push({
              type: 'featured',
              label: 'Featured',
              color: 'bg-yellow-100 text-yellow-800',
              icon: '⭐'
            });
            break;
          case 'product_sponsored':
            badges.push({
              type: 'sponsored',
              label: 'Sponsored',
              color: 'bg-purple-100 text-purple-800',
              icon: '✨'
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
      
      // Featured products get highest priority
      const aFeatured = aPromotions.some(p => p.featureType === 'product_featured' && p.status === 'active');
      const bFeatured = bPromotions.some(p => p.featureType === 'product_featured' && p.status === 'active');
      
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      
      // Sponsored products get second priority
      const aSponsored = aPromotions.some(p => p.featureType === 'product_sponsored' && p.status === 'active');
      const bSponsored = bPromotions.some(p => p.featureType === 'product_sponsored' && p.status === 'active');
      
      if (aSponsored && !bSponsored) return -1;
      if (!aSponsored && bSponsored) return 1;
      
      // Default sorting by name
      return a.name.localeCompare(b.name);
    });
  }

  // Get promotion analytics for artisans
  async getPromotionAnalytics(period = 'month') {
    try {
      const token = authToken.getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/revenue/promotional/analytics?period=${period}`, {
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
}

export const promotionalService = new PromotionalService();
