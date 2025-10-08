# Development Setup Guide

## Overview
This guide covers the development environment setup for BazaarMKT's serverless microservices architecture. All development work should be done in the development environment first, then tested before pushing to production.

## Prerequisites

### Required Software
- **Node.js**: v18+ (recommended: v20+)
- **npm**: v8+ (comes with Node.js)
- **MongoDB Atlas**: Database access
- **Git**: Version control

### Required Accounts
- **MongoDB Atlas**: Database hosting
- **Vercel**: Deployment platform
- **Stripe**: Payment processing (test mode)
- **Brevo**: Email service (optional for development)

## Environment Configuration

### 1. Database Setup
The development environment uses MongoDB Atlas with a separate development database:

```bash
# Development database
MONGODB_URI=mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt-dev?retryWrites=true&w=majority

# Production database (for reference)
MONGODB_URI=mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority
```

### 2. Environment Variables
Create a `.env` file in the backend directory:

```bash
# Development Environment
NODE_ENV=development
MONGODB_URI=mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt-dev?retryWrites=true&w=majority
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
PORT=4000

# Cache Configuration
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Stripe Configuration (Development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Frontend URL
FRONTEND_URL=http://localhost:5180

# Brevo Email Service
BREVO_API_KEY=your_brevo_api_key_here

# Logging
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_LOGGING=true
```

## Development Workflow

### 1. Start Development Environment

#### Backend (Optimized)
```bash
cd backend
npm install
npm run dev:optimized
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Development Commands

#### Backend Commands
```bash
# Start optimized development server
npm run dev:optimized

# Run tests in development mode
npm run dev:test

# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

#### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

## Architecture Components

### 1. Database Optimization
- **Connection Pooling**: Optimized MongoDB connections
- **Caching**: In-memory caching for frequently accessed data
- **Query Optimization**: Indexed queries and efficient data access

### 2. Middleware System
- **Authentication**: JWT-based authentication
- **Validation**: Joi-based request validation
- **Logging**: Structured logging with request tracking
- **Rate Limiting**: IP and user-based rate limiting
- **Error Handling**: Centralized error handling

### 3. Microservices Structure
```
backend/
├── config/
│   ├── database.js          # Database connection management
│   └── environment.js       # Environment configuration
├── middleware/
│   ├── index.js            # Middleware composition
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Request validation
│   ├── logging.js          # Request/response logging
│   ├── rateLimit.js        # Rate limiting
│   └── error.js            # Error handling
├── services/
│   ├── cacheService.js     # Caching service
│   └── [service-name]/     # Microservice implementations
└── server-vercel.js        # Main serverless entry point
```

## Development Best Practices

### 1. Code Organization
- **Services**: Domain-specific business logic
- **Middleware**: Reusable request processing
- **Config**: Environment and database configuration
- **Tests**: Comprehensive test coverage

### 2. Database Practices
- **Connection Pooling**: Use DatabaseManager for all connections
- **Caching**: Cache frequently accessed data
- **Indexing**: Ensure proper database indexes
- **Transactions**: Use transactions for complex operations

### 3. Security Practices
- **Authentication**: Always validate JWT tokens
- **Validation**: Validate all input data
- **Rate Limiting**: Implement appropriate rate limits
- **Error Handling**: Don't expose sensitive information

### 4. Performance Practices
- **Caching**: Cache expensive operations
- **Database**: Optimize queries and connections
- **Middleware**: Use efficient middleware chains
- **Monitoring**: Track performance metrics

## Next Steps

### Phase 1: Database Optimization ✅
- [x] Implement DatabaseManager
- [x] Add CacheService
- [x] Create environment configuration
- [x] Add development scripts

### Phase 2: Middleware Implementation ✅
- [x] Create authentication middleware
- [x] Add validation middleware
- [x] Implement logging middleware
- [x] Add rate limiting middleware
- [x] Create error handling middleware

### Phase 3: Service Separation (Next)
- [ ] Extract auth-service
- [ ] Create artisan-service
- [ ] Implement product-service
- [ ] Add order-service

### Phase 4: Testing & Optimization (Next)
- [ ] Add comprehensive tests
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Production deployment

## Support

For development issues:
1. Check the logs for error messages
2. Verify environment configuration
3. Test database connectivity
4. Review middleware configuration
5. Check API endpoint responses
