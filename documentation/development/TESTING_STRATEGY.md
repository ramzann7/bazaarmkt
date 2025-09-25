# Testing Strategy for Serverless Architecture

## Overview

Our testing strategy has been updated to work with the serverless architecture using native MongoDB client instead of Mongoose models.

## Testing Approach

### 1. Integration Testing (Primary)
- **Focus**: API endpoint testing using supertest
- **Benefits**: Tests actual functionality as users would experience it
- **Implementation**: Tests make HTTP requests to endpoints

### 2. Unit Testing (Secondary)
- **Focus**: Individual utility functions and validators
- **Benefits**: Fast feedback on specific logic
- **Implementation**: Test pure functions in isolation

## Test Structure

### Current Test Files
- `auth.test.js` - Authentication endpoints ✅ Updated
- `products.test.js` - Product management endpoints ✅ Updated  
- `inventory.test.js` - Inventory and order management ✅ Updated
- `setup.js` - Test database setup and utilities ✅ Updated

### Test Database
- **Engine**: MongoDB Memory Server
- **Benefits**: Isolated, fast, no external dependencies
- **Cleanup**: Automatic cleanup after each test

## Testing Utilities

### Global Test Utils (`setup.js`)
```javascript
global.testUtils = {
  createTestUser(userData),      // Create test user in database
  createTestArtisan(artisanData), // Create test artisan profile
  createTestProduct(productData), // Create test product
  generateToken(userId),          // Generate JWT token
  setTestEnvironment(),          // Set test environment variables
  getTestDbUri()                 // Get test database connection string
}
```

### Development Helpers (`dev-utils/test-helpers/`)
- `DatabaseHelper` - Direct database operations
- `AuthHelper` - Authentication utilities
- `APIHelper` - API testing utilities
- `MockDataGenerator` - Generate test data

## Best Practices

### 1. Test Isolation
```javascript
// Each test should be independent
beforeEach(async () => {
  // Clean setup for each test
  user = await global.testUtils.createTestUser();
  token = global.testUtils.generateToken(user._id);
});
```

### 2. Response Structure Testing
```javascript
// Always test the expected serverless response format
expect(response.body.success).toBe(true);
expect(response.body.data).toHaveProperty('expectedField');
expect(response.body.message).toBeDefined();
```

### 3. Error Handling Testing
```javascript
// Test various error scenarios
it('should handle authentication errors', async () => {
  const response = await request(app)
    .get('/api/protected-endpoint')
    .expect(401);
    
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain('token');
});
```

### 4. Database State Testing
```javascript
// Verify database changes through API calls, not direct queries
const updatedUser = await request(app)
  .get('/api/auth/profile')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

expect(updatedUser.body.data.user.firstName).toBe('Updated Name');
```

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Environment
Tests automatically:
1. Start MongoDB Memory Server
2. Set test environment variables
3. Import serverless app implementation
4. Clean up after each test

## Test Data Management

### Creating Test Data
```javascript
// Use utilities for consistent test data
const user = await global.testUtils.createTestUser({
  email: 'specific@example.com',
  userType: 'artisan'
});

const artisan = await global.testUtils.createTestArtisan({
  user: user._id,
  artisanName: 'Test Artisan Business'
});
```

### Test Data Cleanup
- Automatic cleanup after each test
- No manual database management required
- Memory database ensures isolation

## Migration from Model-Based Tests

### Before (Mongoose Models)
```javascript
const User = require('../src/models/user');
const user = await User.create(userData);
await User.findByIdAndUpdate(user._id, updateData);
```

### After (API Integration)
```javascript
// Create through API
const response = await request(app)
  .post('/api/auth/register')
  .send(userData);

// Update through API  
const updateResponse = await request(app)
  .put('/api/auth/profile')
  .set('Authorization', `Bearer ${token}`)
  .send(updateData);
```

## Performance Considerations

### Fast Tests
- MongoDB Memory Server is fast
- No network calls to external database
- Parallel test execution when possible

### Debugging
- Detailed error messages in development
- Request/response logging available
- Easy to reproduce issues locally

## Future Enhancements

### 1. End-to-End Testing
- Browser automation with Cypress/Playwright
- Full user journey testing
- Integration with frontend

### 2. Load Testing
- API performance testing
- Serverless cold start testing
- Concurrent user simulation

### 3. Contract Testing
- API schema validation
- Breaking change detection
- Frontend/backend contract verification

## Troubleshooting

### Common Issues

1. **Test Database Connection**
   ```javascript
   // Check if MongoDB Memory Server is running
   console.log('Test DB URI:', global.testUtils.getTestDbUri());
   ```

2. **Authentication Errors**
   ```javascript
   // Verify token generation
   const token = global.testUtils.generateToken(user._id);
   console.log('Generated token:', token);
   ```

3. **Environment Variables**
   ```javascript
   // Ensure test environment is set
   global.testUtils.setTestEnvironment();
   console.log('MongoDB URI:', process.env.MONGODB_URI);
   ```

## Conclusion

The new testing strategy provides:
- ✅ Better integration testing
- ✅ Serverless architecture compatibility  
- ✅ Fast, isolated test execution
- ✅ Comprehensive error testing
- ✅ Easy debugging and maintenance
