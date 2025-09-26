# Microservices Development Testing Guide

## Overview
This guide explains how to test the microservices integration in your development environment.

## Prerequisites
- Node.js development environment
- MongoDB Atlas connection
- Redis Cloud connection (for production testing)
- All microservices initialized

## Testing Steps

### 1. Run Development Integration Test
```bash
cd backend
node scripts/test-dev-integration.js
```

This will test:
- Service initialization
- Health checks
- Individual services
- API Gateway routes
- Service Registry
- Development environment features
- Performance metrics

### 2. Start Development Server
```bash
cd backend
npm run dev
```

### 3. Test Individual Services

#### User Service
```bash
# Test user registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"patron"}'

# Test user login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test profile (with JWT token)
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Product Service
```bash
# Test product creation
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Test Product","description":"Test Description","price":29.99,"category":"electronics"}'

# Test product search
curl -X GET "http://localhost:4000/api/products/search?q=test&page=1&limit=10"

# Test product by ID
curl -X GET http://localhost:4000/api/products/PRODUCT_ID
```

#### Order Service
```bash
# Test order creation
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"items":[{"productId":"PRODUCT_ID","quantity":2}],"shippingAddress":{"street":"123 Main St","city":"Test City","state":"TS","zipCode":"12345"}}'

# Test order status
curl -X GET http://localhost:4000/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Notification Service
```bash
# Test notification creation
curl -X POST http://localhost:4000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"type":"order_status","title":"Order Update","message":"Your order has been confirmed","priority":"normal"}'

# Test get notifications
curl -X GET http://localhost:4000/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Service Health
```bash
# Check overall health
curl -X GET http://localhost:4000/api/health

# Check individual service health
curl -X GET http://localhost:4000/api/health/user-service
curl -X GET http://localhost:4000/api/health/product-service
curl -X GET http://localhost:4000/api/health/order-service
curl -X GET http://localhost:4000/api/health/notification-service
```

### 5. Test Service Registry
```bash
# Get all services
curl -X GET http://localhost:4000/api/services

# Get service by name
curl -X GET http://localhost:4000/api/services/user-service

# Get service health
curl -X GET http://localhost:4000/api/services/health
```

### 6. Test API Gateway
```bash
# Test route discovery
curl -X GET http://localhost:4000/api/gateway/routes

# Test service routing
curl -X GET http://localhost:4000/api/gateway/status
```

## Development Environment Features

### 1. In-Memory Caching
- Uses Node.js Map for caching
- No external Redis dependency
- Automatic cleanup and TTL

### 2. Local Database
- MongoDB Atlas connection
- Connection pooling
- Automatic retry logic

### 3. Service Discovery
- Service Registry for service management
- Health check monitoring
- Service status tracking

### 4. Error Handling
- Centralized error handling
- Service-specific error responses
- Graceful degradation

### 5. Performance Monitoring
- Response time tracking
- Service health metrics
- Performance optimization

## Testing Checklist

- [ ] All services initialize successfully
- [ ] Health checks pass for all services
- [ ] API endpoints respond correctly
- [ ] Service communication works
- [ ] Error handling works properly
- [ ] Performance is acceptable
- [ ] Caching works correctly
- [ ] Database connections are stable
- [ ] Service Registry tracks services
- [ ] API Gateway routes requests

## Troubleshooting

### Common Issues

1. **Service Initialization Fails**
   - Check MongoDB connection
   - Verify environment variables
   - Check service dependencies

2. **Health Checks Fail**
   - Verify database connectivity
   - Check cache service
   - Verify service configuration

3. **API Endpoints Not Working**
   - Check service registration
   - Verify route configuration
   - Check authentication

4. **Performance Issues**
   - Check database queries
   - Verify cache configuration
   - Monitor service response times

### Debug Commands

```bash
# Check service status
node scripts/test-dev-integration.js

# Test individual services
node scripts/test-user-service.js
node scripts/test-product-service.js
node scripts/test-order-service.js
node scripts/test-notification-service.js

# Test microservices foundation
node scripts/test-microservices-foundation.js

# Test API Gateway
node scripts/test-api-gateway.js
```

## Next Steps

1. **Test Frontend Integration**
   - Verify frontend can communicate with services
   - Test user authentication flow
   - Test product browsing and search
   - Test order creation and management

2. **Test Service Communication**
   - Test inter-service communication
   - Verify data consistency
   - Test error propagation

3. **Performance Testing**
   - Load testing
   - Stress testing
   - Memory usage monitoring

4. **Production Preparation**
   - Environment variable configuration
   - Redis Cloud setup
   - Vercel deployment configuration
   - Monitoring and logging setup

## Development Workflow

1. **Make Changes**
   - Modify service code
   - Update configurations
   - Add new features

2. **Test Changes**
   - Run integration tests
   - Test individual services
   - Verify functionality

3. **Commit Changes**
   - Commit to development branch
   - Push to GitHub
   - Create pull request

4. **Deploy to Production**
   - Merge to main branch
   - Deploy to Vercel
   - Monitor production health

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify environment configuration
3. Test individual services
4. Check service health status
5. Review the troubleshooting section

For additional help, refer to the microservices documentation and implementation plan.
