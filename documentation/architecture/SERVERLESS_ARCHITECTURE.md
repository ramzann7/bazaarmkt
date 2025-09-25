# 🚀 Serverless Architecture Documentation

## Overview

The bazaarMKT backend has been successfully migrated to a serverless architecture, providing better scalability, consistency between development and production, and simplified deployment.

## Architecture Changes

### Before: Traditional MVC Structure
```
backend/
├── src/
│   ├── models/          # Mongoose schemas ❌ REMOVED
│   ├── controllers/     # Route handlers ❌ REMOVED  
│   ├── routes/          # Express routes ❌ REMOVED
│   ├── services/        # Business logic ❌ REMOVED
│   └── middleware/      # Custom middleware ❌ REMOVED
├── server.js            # ✅ UPDATED - Now imports serverless app
└── server-vercel.js     # ✅ MAIN - All logic implemented here
```

### After: Serverless Architecture
```
backend/
├── server.js                    # ✅ Development server (imports serverless app)
├── server-vercel.js             # ✅ Main serverless implementation
├── middleware/
│   └── authmiddleware.js        # ✅ Updated for serverless
├── missing-features/            # ✅ NEW - Modular feature implementations
│   ├── reviews.js
│   ├── favorites.js
│   └── notifications.js
├── dev-utils/                   # ✅ NEW - Development utilities
│   ├── endpoint-template.js
│   ├── validators/
│   ├── middleware/
│   └── test-helpers/
└── tests/                       # ✅ Updated for serverless testing
    ├── TESTING_STRATEGY.md
    ├── setup.js
    ├── auth.test.js
    ├── products.test.js
    └── inventory.test.js
```

## Key Changes

### 1. Database Layer
- **Before**: Mongoose ODM with model schemas
- **After**: Native MongoDB client for direct database operations
- **Benefits**: 
  - Better serverless performance
  - Reduced cold start times
  - More flexible data operations
  - Stateless connections

### 2. API Implementation
- **Before**: Separate route files with controllers
- **After**: All endpoints implemented directly in `server-vercel.js`
- **Benefits**:
  - Single source of truth
  - Easier debugging and maintenance
  - Consistent error handling
  - Better performance

### 3. Development Environment
- **Before**: Different structure for dev vs production
- **After**: Same serverless implementation for both
- **Benefits**:
  - Development parity with production
  - Consistent behavior across environments
  - Easier testing and debugging

## Core Features Implemented

### ✅ Authentication System
- User registration and login
- JWT token management
- Profile management
- Password hashing with bcryptjs

### ✅ Product Management
- CRUD operations for products
- Product search and filtering
- Category and subcategory management
- Image upload with Vercel Blob

### ✅ Order Processing
- Order creation and management
- Status updates
- Inventory management
- Order history

### ✅ Artisan Management
- Artisan profile management
- Product-artisan relationships
- Artisan search and filtering

### ✅ File Upload System
- Single and multiple image uploads
- Vercel Blob integration
- File deletion and management

### ✅ Reviews & Ratings (Restored)
- Product and artisan reviews
- Rating calculations
- Review CRUD operations

### ✅ Favorites System (Restored)
- Add/remove favorites
- Favorites listing with filters
- Favorite status checking

### ✅ Notifications (Restored)
- System notifications
- Read/unread status
- Notification management

### ✅ Dashboard Statistics (Restored)
- User statistics
- Artisan dashboard metrics
- Order and review analytics

## API Endpoints

### Authentication
```
POST   /api/auth/register      # User registration
POST   /api/auth/login         # User login
GET    /api/auth/profile       # Get user profile
PUT    /api/auth/profile       # Update user profile
```

### Products
```
GET    /api/products           # Get all products
GET    /api/products/:id       # Get single product
GET    /api/products/popular   # Get popular products
GET    /api/products/featured  # Get featured products
GET    /api/products/enhanced-search # Enhanced search
GET    /api/products/categories/list # Get categories
```

### Orders
```
POST   /api/orders            # Create order
GET    /api/orders            # Get user orders
GET    /api/orders/:id        # Get single order
PUT    /api/orders/:id/status # Update order status
```

### Artisans
```
GET    /api/artisans          # Get all artisans
GET    /api/artisans/:id      # Get single artisan
```

### File Upload
```
POST   /api/upload            # Upload single image
POST   /api/upload/multiple   # Upload multiple images
DELETE /api/upload/:filename  # Delete uploaded file
```

### Reviews (Restored)
```
POST   /api/reviews                    # Create review
GET    /api/reviews/product/:id        # Get product reviews
GET    /api/reviews/artisan/:id        # Get artisan reviews
PUT    /api/reviews/:id                # Update review
DELETE /api/reviews/:id                # Delete review
```

### Favorites (Restored)
```
POST   /api/favorites                  # Add to favorites
DELETE /api/favorites/:productId       # Remove from favorites
GET    /api/favorites                  # Get user favorites
GET    /api/favorites/status/:id       # Check favorite status
GET    /api/favorites/filtered         # Get filtered favorites
```

### Notifications (Restored)
```
GET    /api/notifications              # Get notifications
PUT    /api/notifications/:id/read     # Mark as read
PUT    /api/notifications/read-all     # Mark all as read
DELETE /api/notifications/:id          # Delete notification
POST   /api/notifications/send         # Send notification
```

### Dashboard & Stats (Restored)
```
GET    /api/user/stats                 # Get user statistics
GET    /api/artisan/dashboard          # Get artisan dashboard
```

### System
```
GET    /api/health            # Health check
GET    /api/debug             # Debug information
GET    /api/test-db           # Test database connection
GET    /api/test-mongo        # Test MongoDB connection
GET    /api/env-check         # Environment variables check
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## Database Collections

### Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // bcrypt hashed
  firstName: String,
  lastName: String,
  phone: String,
  userType: String, // 'customer', 'artisan', 'admin'
  isActive: Boolean,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Products
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  category: String,
  subcategory: String,
  availableQuantity: Number,
  status: String, // 'active', 'inactive'
  artisan: ObjectId, // Reference to artisans collection
  images: [String], // Image URLs
  isFeatured: Boolean,
  soldCount: Number,
  views: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Artisans
```javascript
{
  _id: ObjectId,
  user: ObjectId, // Reference to users collection
  artisanName: String,
  businessName: String,
  type: String, // 'individual', 'business'
  description: String,
  address: Object,
  rating: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Orders
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    productName: String,
    productPrice: Number,
    quantity: Number,
    itemTotal: Number,
    artisanId: ObjectId
  }],
  totalAmount: Number,
  status: String, // 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
  shippingAddress: Object,
  paymentMethod: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Reviews (Restored)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  productId: ObjectId,
  artisanId: ObjectId,
  rating: Number, // 1-5
  comment: String,
  isRead: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Favorites (Restored)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  productId: ObjectId,
  createdAt: Date
}
```

### Notifications (Restored)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String, // 'order_status', 'new_order', 'new_review', 'stock_alert'
  title: String,
  message: String,
  data: Object, // Additional data
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Development Workflow

### 1. Local Development
```bash
# Start development server
npm run dev

# Server runs on http://localhost:4000
# Uses same serverless implementation as production
```

### 2. Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run tests with coverage
npm run test:coverage
```

### 3. Adding New Features
```bash
# Use development utilities
backend/dev-utils/
├── endpoint-template.js    # Copy and modify for new endpoints
├── validators/            # Add data validation
└── test-helpers/          # Create test utilities
```

### 4. Integration Process
1. Develop feature in `dev-utils/` or `missing-features/`
2. Test thoroughly using test utilities
3. Add endpoint to `server-vercel.js`
4. Update tests
5. Commit changes

## Deployment

### Vercel (Production)
- Uses `server-vercel.js` directly
- Automatic serverless function deployment
- Environment variables configured in Vercel dashboard
- MongoDB Atlas integration

### Local/Development
- Uses `server.js` which imports `server-vercel.js`
- Same implementation as production
- Local environment variables via `.env`

## Performance Optimizations

### 1. Database Connections
- Native MongoDB client for faster connections
- Connection pooling for serverless
- Automatic connection cleanup

### 2. Response Caching
- Efficient query patterns
- Reduced data transfer
- Optimized aggregation pipelines

### 3. Error Handling
- Consistent error responses
- Proper HTTP status codes
- Development vs production error details

## Security Features

### 1. Authentication
- JWT token-based authentication
- Password hashing with bcryptjs
- Token expiration handling

### 2. Data Validation
- Input sanitization
- ObjectId validation
- Required field validation

### 3. CORS Configuration
- Proper origin handling
- Credentials support
- Method restrictions

## Migration Benefits

### ✅ Improved Performance
- Faster cold starts
- Reduced memory usage
- Better connection handling

### ✅ Better Scalability
- Automatic scaling with Vercel
- Stateless architecture
- Efficient resource usage

### ✅ Development Experience
- Consistent dev/prod environments
- Easier debugging
- Comprehensive testing

### ✅ Maintenance
- Single source of truth
- Modular feature organization
- Clear documentation

## Future Enhancements

### Planned Features
- [ ] Advanced search with Elasticsearch
- [ ] Real-time notifications with WebSocket
- [ ] Caching layer with Redis
- [ ] Rate limiting with Redis
- [ ] Email notifications with Brevo
- [ ] Payment processing with Stripe
- [ ] Admin panel endpoints
- [ ] Analytics and reporting

### Development Tools
- [ ] API documentation with Swagger
- [ ] Load testing scripts
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] Deployment automation

## Troubleshooting

### Common Issues

1. **Database Connection**
   ```javascript
   // Check MongoDB URI in environment
   console.log('MongoDB URI set:', !!process.env.MONGODB_URI);
   ```

2. **Authentication Errors**
   ```javascript
   // Verify JWT secret
   console.log('JWT Secret set:', !!process.env.JWT_SECRET);
   ```

3. **Test Failures**
   ```bash
   # Ensure test database is running
   npm test -- --verbose
   ```

### Environment Variables Required
```bash
MONGODB_URI=mongodb+srv://...     # MongoDB Atlas connection
JWT_SECRET=your-secret-key        # JWT signing secret
VERCEL_BLOB_READ_WRITE_TOKEN=...  # Vercel Blob access
NODE_ENV=development              # Environment setting
```

## Support and Maintenance

The serverless architecture provides a robust foundation for the bazaarMKT application with:
- ✅ All core features restored and functional
- ✅ Comprehensive testing strategy
- ✅ Development environment setup
- ✅ Clear documentation and workflows
- ✅ Future-ready extensibility

For questions or issues, refer to:
- `backend/tests/TESTING_STRATEGY.md` - Testing guidelines
- `backend/dev-utils/README.md` - Development utilities
- Individual feature documentation in `missing-features/`
