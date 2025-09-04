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

  // Get premium showcase products for homepage (Featured Products)
  async getPremiumShowcaseProducts(limit = 6, userLocation = null) {
    try {
      // Check if service is available
      if (!this.isAvailable) {
        console.log('⚠️ Promotional service not available, returning empty array');
        return [];
      }

      const params = new URLSearchParams({ limit });
      if (userLocation) {
        params.append('userLat', userLocation.latitude);
        params.append('userLng', userLocation.longitude);
      }

      const url = `${API_BASE_URL}/promotional/products/featured?${params.toString()}`;
      console.log('🔍 Fetching featured products from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Featured products API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log('✅ Featured products fetched successfully:', data.data?.length || 0, 'products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching featured products:', error);
      return [];
    }
  }

  // Get artisan spotlight products for search results (Sponsored Products)
  async getArtisanSpotlightProducts(category = null, limit = 3, searchQuery = null, userLocation = null) {
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
      if (searchQuery) {
        params.append('searchQuery', searchQuery);
      }
      if (userLocation) {
        params.append('userLat', userLocation.latitude);
        params.append('userLng', userLocation.longitude);
      }

      const url = `${API_BASE_URL}/promotional/products/sponsored?${params.toString()}`;
      console.log('🔍 Fetching sponsored products from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Sponsored products API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log('✅ Sponsored products fetched successfully:', data.data?.length || 0, 'products');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching sponsored products:', error);
      return [];
    }
  }

  // Create new promotional feature (artisan request)
  async createPromotionalFeature(featureData) {
    try {
      const token = authToken.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/promotional/create`;
      console.log('🔍 Creating promotional feature:', featureData);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(featureData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create promotional feature');
      }

      const data = await response.json();
      console.log('✅ Promotional feature created successfully');
      return data.data;
    } catch (error) {
      console.error('❌ Error creating promotional feature:', error);
      throw error;
    }
  }

  // Get current user's promotional features (for artisan dashboard)
  async getCurrentUserPromotionalFeatures() {
    try {
      const token = authToken.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/revenue/promotional/artisan-features`;
      console.log('🔍 Fetching current user promotional features');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch promotional features');
      }

      const data = await response.json();
      console.log('✅ Current user promotional features fetched successfully');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching current user promotional features:', error);
      return [];
    }
  }

  // Get promotional features for multiple artisans (public endpoint)
  async getBulkArtisanPromotionalFeatures(artisanIds) {
    try {
      if (!artisanIds || artisanIds.length === 0) {
        return {};
      }

      const url = `${API_BASE_URL}/promotional/artisans/bulk?artisanIds=${artisanIds.join(',')}`;
      console.log('🔍 Fetching bulk promotional features for:', artisanIds.length, 'artisans');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Bulk promotional features API error: ${response.status} ${response.statusText}`);
        return {};
      }

      const data = await response.json();
      console.log('✅ Bulk promotional features fetched successfully:', Object.keys(data.data || {}).length, 'artisans with features');
      return data.data || {};
    } catch (error) {
      console.error('❌ Error fetching bulk promotional features:', error);
      return {};
    }
  }

  // Get artisan's promotional features (for admin or specific artisan lookup)
  async getArtisanPromotionalFeatures(artisanId) {
    try {
      const token = authToken.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/promotional/artisan/${artisanId}`;
      console.log('🔍 Fetching artisan promotional features for:', artisanId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch promotional features');
      }

      const data = await response.json();
      console.log('✅ Artisan promotional features fetched successfully');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching artisan promotional features:', error);
      return [];
    }
  }

  // Admin: Get pending promotional features for approval
  async getPendingPromotionalFeatures() {
    try {
      const token = authToken.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/promotional/admin/pending`;
      console.log('🔍 Fetching pending promotional features');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending features');
      }

      const data = await response.json();
      console.log('✅ Pending promotional features fetched successfully');
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching pending promotional features:', error);
      return [];
    }
  }

  // Admin: Approve or reject promotional feature
  async approvePromotionalFeature(featureId, action, rejectionReason = null) {
    try {
      const token = authToken.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${API_BASE_URL}/promotional/admin/${featureId}/approve`;
      console.log('🔍 Updating promotional feature:', { featureId, action, rejectionReason });

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, rejectionReason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update promotional feature');
      }

      const data = await response.json();
      console.log('✅ Promotional feature updated successfully');
      return data.data;
    } catch (error) {
      console.error('❌ Error updating promotional feature:', error);
      throw error;
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
          case 'featured_product':
            badges.push({
              type: 'featured_product',
              label: 'Featured Product',
              color: 'bg-amber-100 text-amber-800 border-amber-200',
              icon: '⭐',
              description: 'Featured on homepage',
              price: '$25'
            });
            break;
          case 'sponsored_product':
            badges.push({
              type: 'sponsored_product',
              label: 'Sponsored',
              color: 'bg-purple-100 text-purple-800 border-purple-200',
              icon: '✨',
              description: 'Enhanced search visibility',
              price: '$40/7 days'
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
      const aFeatured = aPromotions.some(p => p.featureType === 'featured_product' && p.status === 'active');
      const bFeatured = bPromotions.some(p => p.featureType === 'featured_product' && p.status === 'active');
      
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      
      // Sponsored products get second priority
      const aSponsored = aPromotions.some(p => p.featureType === 'sponsored_product' && p.status === 'active');
      const bSponsored = bPromotions.some(p => p.featureType === 'sponsored_product' && p.status === 'active');
      
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

  // Get pricing information for promotional features
  getPromotionalPricing() {
    return {
      featured_product: {
        price: 25,
        currency: 'USD',
        duration: 'Flexible (1-365 days)',
        description: 'Featured on homepage with distance-based ranking',
        benefits: [
          'Homepage visibility',
          'Distance-based ranking',
          'Priority placement',
          'Admin approval required'
        ]
      },
      sponsored_product: {
        price: 40,
        currency: 'USD',
        duration: '7 days',
        description: 'Enhanced search visibility and ranking',
        benefits: [
          'Search result boost',
          'Keyword targeting',
          'Category boost',
          'Proximity boost',
          'Admin approval required'
        ]
      }
    };
  }

  // Calculate promotion cost
  calculatePromotionCost(featureType, durationDays) {
    const pricing = this.getPromotionalPricing();
    
    if (featureType === 'featured_product') {
      return pricing.featured_product.price;
    } else if (featureType === 'sponsored_product') {
      // Sponsored products are $40 for 7 days, additional days at $5/day
      const baseCost = pricing.sponsored_product.price;
      const additionalDays = Math.max(0, durationDays - 7);
      const additionalCost = additionalDays * 5;
      return baseCost + additionalCost;
    }
    
    return 0;
  }
}

export const promotionalService = new PromotionalService();
