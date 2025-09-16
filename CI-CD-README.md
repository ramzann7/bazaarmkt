# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the bazaarMKT App.

## 🚀 Overview

The CI/CD pipeline is designed to:
- Automatically test code changes
- Build and deploy the application
- Ensure code quality and security
- Provide monitoring and rollback capabilities

## 📋 Prerequisites

- GitHub repository with Actions enabled
- Node.js 18+ installed
- MongoDB 6.0+ (for testing)
- Docker (for containerized deployment)
- Environment variables configured

## 🔧 Setup Instructions

### 1. Environment Configuration

Copy the environment configuration template:
```bash
cp config/environment.example.js config/environment.js
```

Update the values in `config/environment.js` with your production settings.

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Test Dependencies
```bash
# Backend test dependencies
cd backend
npm install --save-dev jest supertest mongodb-memory-server eslint

# Frontend test dependencies
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui @vitest/coverage-v8 eslint eslint-plugin-react eslint-plugin-react-hooks
```

## 🧪 Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml` and includes:

#### 1. Backend Tests
- Unit tests with Jest
- Integration tests with Supertest
- Code coverage reporting
- Linting with ESLint

#### 2. Frontend Tests
- Component tests with React Testing Library
- Service tests with Vitest
- Code coverage reporting
- Linting with ESLint

#### 3. Integration Tests
- API endpoint testing
- Database connectivity tests
- End-to-end workflow tests

#### 4. Security Scanning
- Vulnerability scanning with Trivy
- Dependency audit
- Code security analysis

#### 5. Deployment
- Automatic deployment to production (main branch)
- Manual deployment triggers
- Rollback capabilities

### Pipeline Triggers

The pipeline runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

### Pipeline Stages

1. **Code Checkout** - Get the latest code
2. **Dependency Installation** - Install npm packages
3. **Linting** - Check code quality
4. **Testing** - Run unit and integration tests
5. **Security Scanning** - Check for vulnerabilities
6. **Building** - Build the application
7. **Deployment** - Deploy to production
8. **Health Checks** - Verify deployment success

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t bazaarmkt-app .
```

### Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# Start with specific profiles
docker-compose --profile cache --profile proxy up -d

# Start with monitoring
docker-compose --profile monitoring up -d
```

### Environment Variables for Docker
Create a `.env` file in the root directory:
```env
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/bazaarmkt-app?authSource=admin
JWT_SECRET=your-super-secret-jwt-key
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=bazaarmkt-app
```

## 🚀 Manual Deployment

### Using Deployment Script
```bash
# Full deployment
./scripts/deploy.sh

# Skip tests
./scripts/deploy.sh --skip-tests

# Skip build
./scripts/deploy.sh --skip-build

# Clean deployment
./scripts/deploy.sh --clean
```

### Manual Steps
1. **Install Dependencies**
   ```bash
   cd backend && npm ci --only=production
   cd ../frontend && npm ci
   ```

2. **Run Tests**
   ```bash
   cd backend && npm run test:ci
   cd ../frontend && npm run test:ci
   ```

3. **Build Frontend**
   ```bash
   cd frontend && npm run build
   ```

4. **Deploy Backend**
   ```bash
   # Add your deployment commands here
   # Examples: Heroku, Railway, AWS, etc.
   ```

5. **Deploy Frontend**
   ```bash
   # Add your deployment commands here
   # Examples: Vercel, Netlify, AWS S3, etc.
   ```

## 📊 Monitoring and Logging

### Health Checks
- Backend health endpoint: `GET /api/health`
- Frontend health check: Built into the application
- Database connectivity check
- External service availability

### Logging
- Application logs: `backend/logs/app.log`
- Error logs: `backend/logs/error.log`
- Access logs: `backend/logs/access.log`

### Metrics
- Response times
- Error rates
- Database performance
- Memory usage
- CPU usage

## 🔒 Security

### Security Measures
- JWT token validation
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Security Scanning
- Dependency vulnerability scanning
- Code security analysis
- Container security scanning
- Secrets detection

## 🚨 Troubleshooting

### Common Issues

#### 1. Tests Failing
```bash
# Check test logs
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="specific test name"

# Debug mode
npm test -- --detectOpenHandles
```

#### 2. Build Failures
```bash
# Clear cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. Deployment Issues
```bash
# Check deployment logs
tail -f deployment.log

# Verify environment variables
env | grep -E "(NODE_ENV|MONGODB_URI|JWT_SECRET)"

# Test database connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected to bazaarMKT database')).catch(console.error)"
```

### Rollback Procedures

#### 1. Automatic Rollback
The pipeline includes automatic rollback triggers for:
- Health check failures
- High error rates
- Performance degradation

#### 2. Manual Rollback
```bash
# Rollback to previous version
./scripts/deploy.sh --rollback

# Or use GitHub Actions
# Go to Actions tab → Select workflow → Re-run jobs
```

## 📈 Performance Optimization

### Build Optimization
- Tree shaking for unused code
- Code splitting for better loading
- Image optimization
- CSS minification
- JavaScript minification

### Runtime Optimization
- Database indexing
- Query optimization
- Caching strategies
- CDN usage
- Compression

## 🔄 Maintenance

### Regular Tasks
- Update dependencies monthly
- Review security vulnerabilities
- Monitor performance metrics
- Clean up old logs
- Backup database

### Monitoring Alerts
- High error rates
- Slow response times
- Database connection issues
- Disk space warnings
- Memory usage alerts

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For issues or questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review the logs for error details
- Contact the development team
