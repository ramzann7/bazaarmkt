# Debug Scripts

This directory contains scripts for debugging database issues, particularly related to MongoDB Atlas migration and Mongoose population.

## Scripts Overview

### Population Testing Scripts

#### `test-population.js`
- **Purpose**: Test basic Mongoose population functionality
- **Usage**: `node test-population.js`
- **Tests**: 
  - Product population with seller information
  - User lookup by ID
  - Basic database connectivity

#### `test-population-simple.js`
- **Purpose**: Simplified population test
- **Usage**: `node test-population-simple.js`
- **Tests**: Basic product-seller relationship

#### `test-specific-population.js`
- **Purpose**: Test population with specific seller ID
- **Usage**: `node test-specific-population.js`
- **Tests**: Population with known seller ID

#### `test-working-population.js`
- **Purpose**: Test population after fixes
- **Usage**: `node test-working-population.js`
- **Tests**: Verify population works after data fixes

#### `debug-population.js`
- **Purpose**: Comprehensive population debugging
- **Usage**: `node debug-population.js`
- **Tests**: 
  - User existence verification
  - Product-seller relationship
  - ID type checking
  - Detailed error reporting

### Data Verification Scripts

#### `check-users.js`
- **Purpose**: List all users in database
- **Usage**: `node check-users.js`
- **Output**: Console list of all users with IDs

#### `find-specific-user.js`
- **Purpose**: Find specific user by ID
- **Usage**: `node find-specific-user.js`
- **Tests**: User lookup with specific ID

#### `check-user-validation.js`
- **Purpose**: Validate user data against Mongoose schema
- **Usage**: `node check-user-validation.js`
- **Tests**: 
  - Raw user data validation
  - findById functionality
  - Schema compliance

### Database Testing Scripts

#### `simple-test.js`
- **Purpose**: Basic database operations test
- **Usage**: `node simple-test.js`
- **Tests**: 
  - Connection test
  - Basic CRUD operations
  - Error handling

#### `test-native-mongo.js`
- **Purpose**: Test using native MongoDB driver
- **Usage**: `node test-native-mongo.js`
- **Tests**: 
  - Native MongoDB operations
  - Comparison with Mongoose
  - Raw data access

## Debugging Workflow

### 1. Basic Connectivity
```bash
node simple-test.js
```

### 2. User Data Verification
```bash
node check-users.js
node find-specific-user.js
```

### 3. Population Testing
```bash
node test-population.js
node test-specific-population.js
```

### 4. Comprehensive Debugging
```bash
node debug-population.js
```

### 5. Native MongoDB Testing
```bash
node test-native-mongo.js
```

## Common Issues and Solutions

### Issue: "Cannot read properties of null"
- **Cause**: User ID doesn't exist in database
- **Solution**: Run `check-users.js` to verify user existence

### Issue: "product.toObject is not a function"
- **Cause**: Mongoose document not properly hydrated
- **Solution**: Check if `.lean()` is being used incorrectly

### Issue: Population returns null
- **Cause**: ID type mismatch (string vs ObjectId)
- **Solution**: Run migration fix scripts

## Environment Requirements

- MongoDB Atlas connection string in environment
- Backend server running (for some tests)
- Proper database permissions

## Output Interpretation

### Successful Population
```
Found user: { _id: ObjectId(...), firstName: "...", lastName: "..." }
Product seller: { _id: ObjectId(...), firstName: "...", lastName: "..." }
```

### Failed Population
```
Found user: null
Product seller: null
```

### Error Messages
- Check console for detailed error information
- Look for specific error types (TypeError, MongoError, etc.)
- Verify connection strings and permissions
