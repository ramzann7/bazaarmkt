# Testing Scripts

This directory contains scripts for testing API endpoints and frontend functionality.

## Scripts Overview

### Frontend Testing

#### `test-search.html`
- **Purpose**: Simple HTML test page for search functionality
- **Usage**: Open in browser
- **Features**: 
  - Direct API testing
  - Search query input
  - Results display
- **URL**: `http://localhost:4000/api/products/search?q=eggs`

#### `test-search-frontend.html`
- **Purpose**: Comprehensive frontend search testing
- **Usage**: Open in browser
- **Features**:
  - Direct API testing
  - Proxy API testing
  - Error handling display
  - Detailed results view

#### `test-search-api.js`
- **Purpose**: Node.js script to test search API endpoints
- **Usage**: `node test-search-api.js`
- **Features**:
  - Tests both direct and proxy API calls
  - Console output for debugging
  - Error handling

## Testing Scenarios

### Search Functionality Testing

1. **Basic Search**: Test search for "eggs", "bread", "milk"
2. **Empty Results**: Test search for "nonexistent"
3. **Special Characters**: Test search with special characters
4. **Case Sensitivity**: Test case-insensitive search

### API Endpoint Testing

- **Direct API**: `http://localhost:4000/api/products/search?q=query`
- **Proxy API**: `/api/products/search?q=query` (via Vite proxy)

### Expected Results

- **Search "eggs"**: Should return 2 products (Eggs and Milk)
- **Search "bread"**: Should return 3 products
- **Search "organic"**: Should return 0 products

## Usage Instructions

### Browser Testing
1. Start the backend server: `cd backend && npm start`
2. Start the frontend server: `cd frontend && npm run dev`
3. Open test HTML files in browser
4. Check browser console for errors

### Node.js Testing
1. Ensure backend is running
2. Run: `node test-search-api.js`
3. Check console output for results

## Debugging

### Common Issues
- **CORS Errors**: Check if both servers are running
- **Network Errors**: Verify backend is accessible
- **Empty Results**: Check database connection and data

### Console Logging
All test scripts include detailed console logging for debugging:
- API response status
- Response data structure
- Error messages
- Search query details

## Integration Testing

These scripts can be used to:
- Verify search functionality before deployment
- Debug search issues in production
- Test API changes
- Validate frontend-backend integration
