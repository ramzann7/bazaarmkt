import axios from 'axios';
import { authToken } from './authservice';
import { geocodingService } from './geocodingService';
import { normalizeSearchFilters, logCategoryUsage } from '../utils/categoryUtils';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/products` : '/api/products';

// Enhanced search service with sophisticated ranking
class EnhancedSearchService {
  constructor() {
    this.baseURL = API_URL;
  }

  // Main enhanced search function with distance calculations and sponsored products
  async searchProducts(searchQuery, userLocation = null, filters = {}) {
    try {
      // Normalize and validate search filters
      const normalizedFilters = normalizeSearchFilters(filters);
      logCategoryUsage('EnhancedSearchService', 'searchProducts', normalizedFilters);
      
      const params = new URLSearchParams();
      
      // Add search query
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      // Get user coordinates if not provided
      if (!userLocation) {
        try {
          const userCoords = await geocodingService.getUserCoordinates();
          if (userCoords) {
            userLocation = userCoords;
          }
        } catch (error) {
          console.log('Could not get user coordinates:', error);
        }
      }
      
      // Add user location for proximity weighting
      if (userLocation) {
        params.append('userLat', userLocation.latitude);
        params.append('userLng', userLocation.longitude);
        params.append('proximityRadius', normalizedFilters.maxDistance || '50'); // Default 50km radius
      }
      
      // Add normalized filters
      Object.keys(normalizedFilters).forEach(key => {
        if (normalizedFilters[key] !== undefined && normalizedFilters[key] !== null && normalizedFilters[key] !== '') {
          params.append(key, normalizedFilters[key]);
        }
      });
      
      // Add ranking parameters
      params.append('enhancedRanking', 'true');
      params.append('includeQualityScore', 'true');
      params.append('includeProximity', 'true');
      params.append('includeEngagement', 'true');
      params.append('includeDistance', 'true');
      params.append('includeSponsored', 'true'); // New parameter for sponsored products
      
      const response = await axios.get(`${this.baseURL}/enhanced-search?${params.toString()}`);
      
      // Get sponsored products for this search
      let sponsoredProducts = [];
      try {
        sponsoredProducts = await this.getSponsoredProductsForSearch(searchQuery, normalizedFilters.category, userLocation);
        console.log('✨ Found sponsored products for search:', sponsoredProducts.length);
      } catch (error) {
        console.log('Could not fetch sponsored products:', error);
      }
      
      // Add distance information to results if user location is available
      if (userLocation && response.data.products) {
        response.data.products = await this.addDistanceInfo(response.data.products, userLocation);
      }
      
      // Integrate sponsored products with enhanced ranking
      const enhancedResults = this.integrateSponsoredProducts(
        response.data.products || [],
        sponsoredProducts,
        searchQuery,
        userLocation
      );
      
      return {
        ...response.data,
        products: enhancedResults,
        sponsoredCount: sponsoredProducts.length
      };
    } catch (error) {
      console.error('Enhanced search error:', error);
      throw error;
    }
  }

  // Get sponsored products for search integration
  async getSponsoredProductsForSearch(searchQuery, category, userLocation) {
    try {
      const { promotionalService } = await import('./promotionalService');
      return await promotionalService.getArtisanSpotlightProducts(
        category,
        5, // Limit sponsored products in search
        searchQuery,
        userLocation
      );
    } catch (error) {
      console.error('Error fetching sponsored products for search:', error);
      return [];
    }
  }

  // Integrate sponsored products with search results
  integrateSponsoredProducts(regularProducts, sponsoredProducts, searchQuery, userLocation) {
    if (!sponsoredProducts || sponsoredProducts.length === 0) {
      return regularProducts;
    }

    // Mark sponsored products
    const markedSponsored = sponsoredProducts.map(product => ({
      ...product,
      isSponsored: true,
      sponsoredBadge: {
        type: 'sponsored_product',
        label: 'Sponsored',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '✨',
        description: 'Enhanced search visibility'
      },
      // Boost relevance score for sponsored products
      enhancedRelevanceScore: (product.relevanceScore || 0) + 200
    }));

    // Combine and sort by relevance
    const allProducts = [...markedSponsored, ...regularProducts];
    
    return allProducts.sort((a, b) => {
      // Sponsored products get priority
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      
      // Then sort by relevance score
      const aScore = a.enhancedRelevanceScore || a.relevanceScore || 0;
      const bScore = b.enhancedRelevanceScore || b.relevanceScore || 0;
      
      if (aScore !== bScore) return bScore - aScore;
      
      // If same score, sponsored products come first
      if (a.isSponsored && b.isSponsored) return 0;
      
      // Finally, sort by distance if available
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      
      return 0;
    });
  }

  // Get search suggestions with ranking
  async getSearchSuggestions(query, userLocation = null) {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (userLocation) {
        params.append('userLat', userLocation.latitude);
        params.append('userLng', userLocation.longitude);
      }
      
      const response = await axios.get(`${this.baseURL}/enhanced-suggestions?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Enhanced suggestions error:', error);
      return { suggestions: [] };
    }
  }

  // Get user's location (if available)
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Add distance information to search results
  async addDistanceInfo(products, userLocation) {
    return products.map(product => {
      if (product.artisan && product.artisan.coordinates) {
        const distance = geocodingService.calculateDistanceBetween(
          userLocation,
          product.artisan.coordinates
        );
        
        return {
          ...product,
          distance: distance,
          formattedDistance: geocodingService.formatDistance(distance),
          proximityScore: this.calculateProximityScore(distance)
        };
      }
      
      return product;
    }).sort((a, b) => {
      // Sort by distance if available, then by other factors
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });
  }

  // Calculate proximity score for ranking (0-1, higher is better)
  calculateProximityScore(distance) {
    if (distance === null || distance === undefined) {
      return 0.5; // Neutral score for unknown distance
    }
    
    // Exponential decay: closer = higher score
    const maxDistance = 50; // 50km
    const score = Math.exp(-distance / maxDistance);
    return Math.max(0, Math.min(1, score));
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Client-side ranking enhancement (fallback/optimization)
  enhanceSearchResults(products, searchQuery, userLocation = null) {
    if (!products || products.length === 0) return products;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    
    return products.map(product => {
      let enhancedScore = product.relevanceScore || 0;
      
      // 1. Exact Match + Keyword Tags Boost
      enhancedScore += this.calculateExactMatchScore(product, searchTerms);
      
      // 2. Proximity Weighting (if location available)
      if (userLocation && product.artisan?.location) {
        enhancedScore += this.calculateProximityScore(product, userLocation);
      }
      
      // 3. Product Popularity & Engagement
      enhancedScore += this.calculateEngagementScore(product);
      
      // 4. Seller Quality Score
      enhancedScore += this.calculateQualityScore(product);
      
      // 5. Recency of Listing
      enhancedScore += this.calculateRecencyScore(product);
      
      // 6. Featured/Curated Products Boost
      enhancedScore += this.calculateFeaturedScore(product);
      
      return {
        ...product,
        enhancedScore: Math.round(enhancedScore)
      };
    }).sort((a, b) => b.enhancedScore - a.enhancedScore);
  }

  // Calculate exact match score
  calculateExactMatchScore(product, searchTerms) {
    let score = 0;
    const productName = (product.name || '').toLowerCase();
    const productTags = Array.isArray(product.tags) ? product.tags.map(tag => tag.toLowerCase()) : [];
    const productCategory = (product.category || '').toLowerCase();
    
    // Exact name match (highest priority)
    const fullSearchQuery = searchTerms.join(' ');
    if (productName === fullSearchQuery) {
      score += 1000;
    }
    
    // Individual term exact matches
    searchTerms.forEach(term => {
      if (productName === term) {
        score += 800;
      }
      if (productName.startsWith(term)) {
        score += 400;
      }
      if (productName.includes(term)) {
        score += 200;
      }
    });
    
    // Tag exact matches
    searchTerms.forEach(term => {
      if (productTags.includes(term)) {
        score += 300;
      }
      if (productTags.some(tag => tag.includes(term))) {
        score += 150;
      }
    });
    
    // Category exact match
    if (productCategory === fullSearchQuery) {
      score += 500;
    }
    
    return score;
  }

  // Calculate proximity score
  calculateProximityScore(product, userLocation) {
    if (!product.artisan?.location?.coordinates) return 0;
    
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      product.artisan.location.coordinates[1], // latitude
      product.artisan.location.coordinates[0]  // longitude
    );
    
    // Score based on distance (closer = higher score)
    if (distance <= 5) return 200;      // Within 5km
    if (distance <= 10) return 150;     // Within 10km
    if (distance <= 25) return 100;     // Within 25km
    if (distance <= 50) return 50;      // Within 50km
    return 0;                           // Beyond 50km
  }

  // Calculate engagement score
  calculateEngagementScore(product) {
    let score = 0;
    
    // Purchase history (if available)
    if (product.totalSales) {
      score += Math.min(product.totalSales * 10, 200); // Max 200 points
    }
    
    // Reviews and ratings
    if (product.rating?.average) {
      score += product.rating.average * 20; // 5-star = 100 points
    }
    
    if (product.rating?.count) {
      score += Math.min(product.rating.count * 2, 100); // Max 100 points
    }
    
    // Favorites/saves (if available)
    if (product.favoriteCount) {
      score += Math.min(product.favoriteCount * 5, 100); // Max 100 points
    }
    
    // Starter boost for new products (first 30 days)
    const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 30) {
      score += Math.max(50 - daysSinceCreated, 0); // Decreasing boost over time
    }
    
    return score;
  }

  // Calculate quality score
  calculateQualityScore(product) {
    let score = 0;
    
    // Seller rating
    if (product.artisan?.rating?.average) {
      score += product.artisan.rating.average * 30; // 5-star = 150 points
    }
    
    // On-time delivery rate (if available)
    if (product.artisan?.deliveryStats?.onTimeRate) {
      score += product.artisan.deliveryStats.onTimeRate * 100; // 100% = 100 points
    }
    
    // Complaint history (inverse)
    if (product.artisan?.complaintRate) {
      score -= product.artisan.complaintRate * 200; // Penalty for complaints
    }
    
    // Verification status
    if (product.artisan?.isVerified) {
      score += 50;
    }
    
    // Organic/fresh indicators
    if (product.isOrganic) score += 30;
    if (product.name?.toLowerCase().includes('fresh')) score += 20;
    if (product.name?.toLowerCase().includes('artisan')) score += 20;
    if (product.name?.toLowerCase().includes('homemade')) score += 20;
    
    return Math.max(score, 0); // Don't go negative
  }

  // Calculate recency score
  calculateRecencyScore(product) {
    const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
    
    // Fresh listings get a boost
    if (daysSinceCreated <= 7) return 50;      // First week
    if (daysSinceCreated <= 30) return 30;     // First month
    if (daysSinceCreated <= 90) return 15;     // First quarter
    return 0;                                  // Older listings
  }

  // Calculate featured score
  calculateFeaturedScore(product) {
    let score = 0;
    
    // Featured products
    if (product.isFeatured) {
      score += 200;
    }
    
    // Seasonal/trending indicators
    if (product.isSeasonal) {
      score += 100;
    }
    
    // Admin curated
    if (product.isCurated) {
      score += 150;
    }
    
    // Special badges
    if (product.badges?.includes('trending')) score += 100;
    if (product.badges?.includes('bestseller')) score += 150;
    if (product.badges?.includes('new')) score += 80;
    
    return score;
  }

  // Get personalized recommendations (Phase 2)
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const token = authToken.getToken();
      if (!token) return [];

      const response = await axios.get(`${this.baseURL}/personalized/${userId}?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Personalized recommendations error:', error);
      return [];
    }
  }

  // Search with filters and enhanced ranking
  async searchWithFilters(searchQuery, filters = {}, userLocation = null) {
    try {
      // Get user location if not provided
      if (!userLocation) {
        userLocation = await this.getUserLocation();
      }

      // Perform enhanced search
      const searchResults = await this.searchProducts(searchQuery, userLocation, filters);
      
      // Apply client-side enhancements
      const enhancedResults = this.enhanceSearchResults(
        searchResults.products, 
        searchQuery, 
        userLocation
      );

      return {
        ...searchResults,
        products: enhancedResults,
        searchMetadata: {
          ...searchResults.searchMetadata,
          userLocation: userLocation ? 'available' : 'unavailable',
          enhancedRanking: true
        }
      };
    } catch (error) {
      console.error('Enhanced search with filters error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const enhancedSearchService = new EnhancedSearchService();

export default enhancedSearchService;
