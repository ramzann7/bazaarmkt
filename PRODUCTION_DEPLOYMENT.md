# 🚀 Production Deployment Guide

## 📋 Overview

This guide covers the production-ready improvements implemented for bazaarMKT, including security enhancements, performance optimizations, monitoring, and deployment best practices.

## 🔒 Security Improvements

### 1. Environment Variables & Secrets Management

#### Backend Environment Configuration
Create a `.env` file in the `backend` folder with the following structure:

```bash
# =============================================================================
# bazaarMKT Backend Environment Configuration
# =============================================================================

# Server Configuration
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt?retryWrites=true&w=majority

# JWT & Authentication
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_REFRESH_EXPIRES_IN=30d

# Email Services
BREVO_API_KEY=xkeys-your_brevo_api_key_here

# Security & Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_here
NEW_RELIC_LICENSE_KEY=your_new_relic_key

# External Services
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GEOCODING_API_KEY=your_geocoding_api_key
REDIS_URL=redis://your-redis-url:6379
```

#### Frontend Environment Configuration
Create a `.env` file in the `frontend` folder:

```bash
# Brevo Email Service
VITE_BREVO_API_KEY=xkeys-your_brevo_api_key_here

# Backend API URL
VITE_API_URL=https://api.yourdomain.com

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PUSH_NOTIFICATIONS=false
```

### 2. Security Headers & Middleware

The application now includes:
- **Rate Limiting**: Configurable limits per endpoint and user type
- **Input Validation**: Comprehensive validation using Joi schemas
- **Input Sanitization**: XSS and injection protection
- **CORS Configuration**: Proper cross-origin resource sharing
- **Security Headers**: Helmet.js security headers

### 3. Authentication & Authorization

- **JWT Token Management**: Secure token handling with refresh tokens
- **Role-Based Access Control**: User role validation
- **Session Management**: Secure session handling
- **Password Security**: Bcrypt with configurable rounds

## 📊 Performance & Scalability

### 1. Database Optimization

#### MongoDB Indexing Strategy
The application automatically creates optimal indexes for:
- **User Collections**: Email, role, location, authentication queries
- **Product Collections**: Category, price, status, search optimization
- **Order Collections**: User, status, date, delivery queries
- **Review Collections**: Product, user, rating queries
- **Artisan Collections**: Type, location, rating, search optimization

#### Database Performance Monitoring
- **Index Usage Analysis**: Track index performance
- **Query Performance**: Monitor slow queries
- **Storage Optimization**: Analyze collection sizes and growth

### 2. API Performance

- **Rate Limiting**: Prevent API abuse
- **Request Timeout**: Configurable request timeouts
- **Response Caching**: Redis-based caching (optional)
- **Connection Pooling**: Optimized database connections

### 3. Frontend Performance

- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Analysis**: Webpack bundle optimization
- **Performance Monitoring**: Real-time performance metrics

## 📈 Monitoring & Logging

### 1. Centralized Logging

#### Winston Logger Configuration
- **Console Logging**: Development environment
- **File Logging**: Production environment with log rotation
- **Structured Logging**: JSON format with metadata
- **Log Levels**: Configurable logging levels

#### Log Categories
- **Request Logging**: HTTP request/response details
- **Database Logging**: Query performance and errors
- **Authentication Logging**: Login attempts and failures
- **Business Logic Logging**: Order, payment, notification events
- **Performance Logging**: Memory usage, slow queries

### 2. Error Monitoring

#### Sentry Integration
- **Error Tracking**: Real-time error monitoring
- **Performance Monitoring**: Transaction tracing
- **Release Tracking**: Version deployment monitoring
- **User Context**: User information in error reports

#### New Relic Integration
- **Application Performance**: Real-time performance metrics
- **Infrastructure Monitoring**: Server and database metrics
- **Custom Metrics**: Business-specific performance data
- **Alerting**: Automated performance alerts

### 3. Health Checks

- **Database Connectivity**: MongoDB connection status
- **External Services**: Email, payment, geocoding services
- **System Resources**: Memory, CPU, disk usage
- **Response Time**: API endpoint performance

## 🚀 Deployment

### 1. Production Build

#### Backend Build
```bash
cd backend
npm ci --only=production
npm run build
```

#### Frontend Build
```bash
cd frontend
npm ci --only=production
npm run build
```

### 2. Environment Setup

#### Production Environment Variables
- **Never commit** `.env` files to version control
- **Use environment management** services (AWS Parameter Store, Azure Key Vault)
- **Rotate secrets** regularly
- **Monitor secret usage** and access

#### Database Configuration
- **Use MongoDB Atlas** for production
- **Enable IP whitelisting** for security
- **Configure backup** and point-in-time recovery
- **Set up monitoring** and alerting

### 3. Deployment Options

#### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

#### Cloud Deployment
- **AWS**: EC2, ECS, or Lambda deployment
- **Azure**: App Service or Container Instances
- **Google Cloud**: Compute Engine or Cloud Run
- **Heroku**: Container deployment

### 4. CI/CD Pipeline

#### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../frontend && npm test
      - name: Build application
        run: |
          cd backend && npm run build
          cd ../frontend && npm run build
      - name: Deploy to production
        run: |
          # Your deployment commands here
```

## 🔧 Configuration Management

### 1. Feature Flags

The application supports feature flags for:
- **Email Notifications**: Enable/disable email services
- **SMS Notifications**: Enable/disable SMS services
- **Push Notifications**: Enable/disable push notifications
- **Analytics**: Enable/disable analytics tracking

### 2. Service Configuration

- **Email Services**: Brevo, SMTP fallback
- **Payment Processors**: Stripe, PayPal
- **External APIs**: Google Maps, Geocoding
- **Caching**: Redis configuration

### 3. Security Configuration

- **Rate Limiting**: Configurable limits per endpoint
- **CORS**: Cross-origin resource sharing
- **Authentication**: JWT configuration
- **File Uploads**: Size and type restrictions

## 📊 Monitoring & Alerting

### 1. Performance Metrics

- **Response Times**: API endpoint performance
- **Throughput**: Requests per second
- **Error Rates**: Error percentages by endpoint
- **Resource Usage**: CPU, memory, disk usage

### 2. Business Metrics

- **Order Volume**: Orders per day/hour
- **User Activity**: Active users, sessions
- **Revenue**: Transaction amounts and success rates
- **Search Performance**: Query response times

### 3. Alerting Rules

- **High Error Rate**: >5% error rate
- **Slow Response**: >2 second response time
- **High Resource Usage**: >80% CPU/memory
- **Service Down**: Health check failures

## 🔄 Maintenance & Updates

### 1. Regular Maintenance

- **Database Optimization**: Weekly index analysis
- **Log Rotation**: Daily log cleanup
- **Security Updates**: Monthly dependency updates
- **Performance Review**: Monthly performance analysis

### 2. Backup Strategy

- **Database Backups**: Daily automated backups
- **File Backups**: Weekly file system backups
- **Configuration Backups**: Version-controlled configs
- **Disaster Recovery**: Tested recovery procedures

### 3. Update Procedures

- **Zero-Downtime Deployments**: Blue-green or rolling updates
- **Database Migrations**: Tested migration scripts
- **Feature Rollouts**: Gradual feature releases
- **Rollback Procedures**: Quick rollback capabilities

## 🚨 Troubleshooting

### 1. Common Issues

- **Database Connection**: Check MongoDB URI and network
- **Rate Limiting**: Verify rate limit configuration
- **Email Delivery**: Check Brevo API key and configuration
- **Performance Issues**: Monitor database indexes and queries

### 2. Debug Tools

- **Enhanced Logging**: Detailed request and error logs
- **Performance Monitoring**: Real-time metrics and alerts
- **Health Checks**: Automated system health monitoring
- **Error Tracking**: Detailed error context and stack traces

### 3. Support Resources

- **Documentation**: Comprehensive API and deployment docs
- **Monitoring Dashboards**: Real-time system status
- **Alert Notifications**: Automated issue notifications
- **Escalation Procedures**: Support team escalation paths

## 📚 Additional Resources

- **Security Best Practices**: OWASP guidelines
- **Performance Optimization**: MongoDB performance tuning
- **Monitoring Tools**: Sentry, New Relic documentation
- **Deployment Guides**: Cloud provider specific guides

---

## 🎯 Next Steps

1. **Review and customize** environment variables
2. **Set up monitoring** and alerting
3. **Configure backup** and recovery procedures
4. **Test deployment** in staging environment
5. **Deploy to production** with monitoring enabled
6. **Validate functionality** and performance
7. **Set up maintenance** schedules and procedures

For additional support or questions, refer to the application logs and monitoring dashboards.
