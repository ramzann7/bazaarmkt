# BazaarMKT API Postman Collections

This directory contains comprehensive Postman collections for testing the BazaarMKT API endpoints.

## Collections Overview

### 1. BazaarMKT-API-Collection.json
**Complete API Collection** - Contains all endpoints organized by functionality:
- Authentication (register, login, profile management)
- Products (CRUD operations, search, featured products)
- Artisan Profile (create, update, get artisan profiles)
- Orders (buyer orders, artisan orders, order management)
- Artisans (get all artisans, get by ID, create artisan)
- Revenue & Analytics (artisan revenue, business analytics)
- Wallet (balance, transactions)
- Promotional (featured, sponsored products, pricing)
- Spotlight (status)
- Debug Endpoints (troubleshooting and testing)

### 2. BazaarMKT-Artisan-Testing.json
**Focused Artisan Testing** - Specialized collection for testing artisan-specific functionality:
- Authentication flow with automatic token handling
- Artisan profile tests with validation
- Artisan products tests
- Artisan orders tests
- Revenue & analytics tests
- Wallet tests
- Debug and troubleshooting endpoints

## Setup Instructions

### 1. Import Collections
1. Open Postman
2. Click "Import" button
3. Select the JSON files from this directory
4. Collections will be imported with all endpoints and variables

### 2. Configure Environment Variables
The collections use these variables:
- `baseUrl`: https://www.bazaarmkt.ca (default)
- `token`: Your JWT authentication token (auto-populated on login)
- `artisanId`: 68bfa0ec38427321e62b55e8 (example)
- `userId`: 68bfa0ec38427321e62b55e6 (example)

### 3. Authentication Flow
1. **Login First**: Use the "Login as Artisan" request in the Artisan Testing collection
2. **Token Auto-Save**: The token will be automatically saved to the `{{token}}` variable
3. **Use Authenticated Endpoints**: All subsequent requests will use the saved token

## Testing Workflows

### Basic API Testing
1. Start with authentication endpoints
2. Test product endpoints
3. Test order management
4. Test artisan-specific endpoints

### Artisan Dashboard Testing
1. **Login as Artisan** → Get token
2. **Get Artisan Profile** → Verify profile data
3. **Get My Products** → Verify products load
4. **Get Artisan Orders** → Verify orders load
5. **Get Revenue Data** → Verify revenue calculations
6. **Get Wallet Balance** → Verify wallet data

### Debugging Issues
1. Use **Debug Token** to verify JWT token validity
2. Use **Debug Orders Artisan** to test order queries
3. Use **Debug Artisan Structure** to verify data structure
4. Use **Debug Artisan Flow** to test complete data flow

## Key Endpoints for Artisan Dashboard

### Critical Endpoints
- `GET /api/profile/artisan` - Artisan profile data
- `GET /api/products/my-products` - Artisan's products
- `GET /api/orders/artisan` - Artisan's orders
- `GET /api/revenue/artisan` - Revenue calculations
- `GET /api/analytics/business` - Business analytics
- `GET /api/wallet/balance` - Wallet balance

### Debug Endpoints
- `GET /api/debug/token-debug` - Token validation
- `GET /api/debug/orders-artisan-debug` - Order query testing
- `GET /api/debug/artisan-structure` - Data structure verification
- `GET /api/debug/artisan-flow` - Complete flow testing

## Common Issues & Solutions

### 400 Bad Request Errors
- Check if token is valid using debug endpoints
- Verify ObjectId format in requests
- Check if user has artisan profile

### 401 Unauthorized Errors
- Ensure token is included in Authorization header
- Verify token hasn't expired
- Re-login to get fresh token

### 404 Not Found Errors
- Check if artisan profile exists
- Verify product/order IDs are correct
- Check database relationships

## Data Structure Reference

### Artisan Profile Structure
```json
{
  "_id": "68bfa0ec38427321e62b55e8",
  "user": "68bfa0ec38427321e62b55e6",
  "artisanName": "Artisan Name",
  "businessImage": "base64_image_data",
  "description": "Business description",
  "category": ["category1", "category2"],
  "specialties": ["specialty1", "specialty2"],
  "address": { "street": "...", "city": "...", "state": "...", "zipCode": "..." },
  "contactInfo": { "phone": "...", "email": "...", "website": "..." },
  "type": "food_beverages"
}
```

### Order Structure
```json
{
  "_id": "68c0b2cb76471cf369d30194",
  "items": [
    {
      "productId": "68bfa53b38427321e62b57d0",
      "artisanId": "68bfa0ec38427321e62b55e8",
      "quantity": 2,
      "itemTotal": 25.98
    }
  ],
  "totalAmount": 25.98,
  "status": "pending"
}
```

## Tips for Testing

1. **Start with Debug Endpoints**: Use debug endpoints to verify data structure and relationships
2. **Test Authentication First**: Always login and verify token before testing protected endpoints
3. **Check Response Format**: Verify that responses match expected frontend format
4. **Test Error Cases**: Try invalid tokens, missing data, etc.
5. **Use Test Scripts**: The Artisan Testing collection includes automated test scripts

## Support

If you encounter issues:
1. Check the debug endpoints for detailed error information
2. Verify your authentication token is valid
3. Check the console logs for detailed error messages
4. Ensure all required data relationships exist in the database
