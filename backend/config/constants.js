/**
 * Application Constants
 * Centralized constants for the application
 */

const COLLECTIONS = {
  USERS: 'users',
  ARTISANS: 'artisans',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  COMMUNITY_POSTS: 'communityposts',
  COMMUNITY_COMMENTS: 'communitycomments',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  NOTIFICATIONS: 'notifications',
  REVENUE: 'revenue'
};

const USER_ROLES = {
  CUSTOMER: 'customer',
  ARTISAN: 'artisan',
  ADMIN: 'admin'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  READY_FOR_DELIVERY: 'ready_for_delivery',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DECLINED: 'declined'
};

const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

const COMMUNITY_POST_TYPES = {
  STORY: 'story',
  RECIPE: 'recipe',
  EVENT: 'event',
  PRODUCT_SHOWCASE: 'product_showcase',
  POLL: 'poll'
};

const COMMUNITY_POST_CATEGORIES = {
  COMMUNITY: 'community',
  RECIPES: 'recipes',
  EVENTS: 'events',
  PRODUCTS: 'products',
  GENERAL: 'general'
};

const RATE_LIMIT_SKIP_PATHS = [
  '/api/health',
  '/api/debug',
  '/api/test-db',
  '/api/test-mongo',
  '/api/env-check',
  '/api/auth/',
  '/api/products/',
  '/api/promotional/',
  '/api/artisans/',
  '/api/spotlight/',
  '/api/orders/',
  '/api/profile/',
  '/api/community/'
];

const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  OFFSET: 0,
  MAX_LIMIT: 100
};

const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 4.5 * 1024 * 1024, // 4.5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain']
};

const ENGAGEMENT_SCORES = {
  POST: 10,
  LIKE: 2,
  COMMENT: 5
};

module.exports = {
  COLLECTIONS,
  USER_ROLES,
  ORDER_STATUS,
  PRODUCT_STATUS,
  COMMUNITY_POST_TYPES,
  COMMUNITY_POST_CATEGORIES,
  RATE_LIMIT_SKIP_PATHS,
  PAGINATION_DEFAULTS,
  FILE_UPLOAD_LIMITS,
  ENGAGEMENT_SCORES
};
