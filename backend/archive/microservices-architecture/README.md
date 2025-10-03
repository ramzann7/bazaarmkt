# Microservices Architecture Archive

This directory contains the archived microservices implementation that was developed for the BazaarMKT application.

## What's Archived

### Core Microservices
- **User Service** (`services/userService.js`) - User authentication and profile management
- **Product Service** (`services/productService.js`) - Product catalog and search functionality
- **Order Service** (`services/orderService.js`) - Order processing and management
- **Notification Service** (`services/notificationService.js`) - User notifications
- **Search Service** (`services/searchService.js`) - Advanced search capabilities
- **Analytics Service** (`services/analyticsService.js`) - Business analytics
- **File Service** (`services/fileService.js`) - File upload and management
- **Reviews Service** (`services/reviewsService.js`) - Product and artisan reviews
- **Favorites Service** (`services/favoritesService.js`) - User favorites
- **Community Service** (`services/communityService.js`) - Community features
- **Artisan Service** (`services/artisanService.js`) - Artisan profile management
- **Promotional Service** (`services/promotionalService.js`) - Promotional features
- **Wallet Service** (`services/walletService.js`) - Digital wallet functionality
- **Revenue Service** (`services/revenueService.js`) - Revenue tracking
- **Spotlight Service** (`services/spotlightService.js`) - Featured content
- **Admin Service** (`services/adminService.js`) - Administrative functions
- **Geocoding Service** (`services/geocodingService.js`) - Location services

### Infrastructure
- **API Gateway** (`middleware/apiGateway.js`) - Request routing and load balancing
- **Service Registry** (`services/serviceRegistry.js`) - Service discovery and health monitoring
- **Health Checks** (`services/healthChecks.js`) - Service health monitoring
- **Microservices Integration** (`middleware/microservicesIntegration.js`) - Service orchestration
- **Database Manager** (`config/database.js`) - Database connection management
- **Environment Config** (`config/environment.js`) - Environment variable management
- **Cache Service** (`services/cacheService.js`) - Caching layer
- **Production Cache** (`services/productionCacheService.js`) - Redis-based caching

### Development Tools
- **Test Scripts** (`scripts/`) - Comprehensive testing suite for all services
- **Development Utils** (`dev-utils/`) - Development helpers and templates
- **Test Suite** (`tests/`) - Unit and integration tests

## Why Archived

The microservices architecture was archived in favor of a monolithic approach for the following reasons:

1. **Complexity**: The microservices implementation added significant complexity without proportional benefits for the current application scale
2. **Development Speed**: Monolithic approach allows for faster development and easier debugging
3. **Resource Efficiency**: Single server deployment is more cost-effective for the current user base
4. **Maintenance**: Easier to maintain and deploy a single application

## Current Implementation

The application now uses a monolithic architecture with:
- **server-vercel.js** - Main server file with all endpoints
- **Direct MongoDB integration** - No complex service layers
- **Simplified deployment** - Single serverless function on Vercel

## Future Considerations

This microservices architecture can be restored in the future if:
- The application scales significantly
- Team size increases
- Performance requirements demand service separation
- Different services need independent scaling

## Restoration

To restore the microservices architecture:
1. Move files back to their original locations
2. Update package.json dependencies
3. Configure environment variables
4. Test service integration
5. Update deployment configuration

---

**Archived on**: September 29, 2024  
**Reason**: Reverted to monolithic architecture for simplicity and efficiency
