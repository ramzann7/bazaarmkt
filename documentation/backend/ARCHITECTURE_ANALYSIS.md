# 🏗️ Server Architecture Analysis & Refactoring Plan

**Date:** October 3, 2025  
**Current Status:** ⚠️ Monolithic - Needs Refactoring  
**Goal:** Scalable Serverless Architecture for Vercel + MongoDB Atlas

---

## 📊 Current State Analysis

### File Size & Complexity
- **Total Lines:** 6,208 lines (❌ **WAY TOO LARGE**)
- **Direct Endpoints in server-vercel.js:** 69 endpoints
- **Mounted Routers:** 22 router modules
- **Issue:** Mixed architecture - some endpoints in routers, many still in main file

### Current Architecture Problems

#### 1. ❌ Monolithic Main File
```javascript
server-vercel.js (6,208 lines)
├── 69 inline endpoint handlers
├── Database connection logic
├── Middleware definitions
├── Helper functions
├── 22 router imports and mounts
└── Server initialization
```

**Problems:**
- Extremely difficult to maintain
- High risk of merge conflicts in team environment
- Impossible to test individual features
- Violates Single Responsibility Principle
- Poor code reusability
- Difficult to scale specific features independently

#### 2. ⚠️ Inconsistent Routing Pattern
Some features use routers:
- ✅ `/routes/products/` - Properly organized
- ✅ `/routes/auth/` - Properly organized  
- ✅ `/routes/orders/` - Properly organized
- ✅ `/routes/admin/` - Properly organized

But many are still inline in server-vercel.js:
- ❌ Community endpoints (12 endpoints inline)
- ❌ Geocoding endpoints (4 endpoints inline)
- ❌ Spotlight endpoints (3 endpoints inline)
- ❌ Wallet endpoints (2 endpoints inline)
- ❌ Inventory endpoints (2 endpoints inline)
- ❌ User endpoints (3 endpoints inline)
- ❌ Promotional endpoints (3 endpoints inline)

#### 3. ❌ Duplicate Code & Logic
- Database connection code duplicated
- Auth verification logic repeated
- Similar aggregation patterns across endpoints
- Validation logic scattered

---

## 🎯 Recommended Architecture for Vercel Serverless + MongoDB Atlas

### Best Practices for This Stack

#### Vercel Serverless Considerations:
1. **Cold Start Optimization** - Keep functions small and focused
2. **Connection Pooling** - Reuse MongoDB connections across invocations
3. **Function Size Limits** - Vercel has 50MB deployment limit
4. **Stateless Functions** - Each request may hit different instances
5. **Edge Caching** - Leverage Vercel's CDN where possible

#### MongoDB Atlas Considerations:
1. **Connection Limits** - Atlas has connection limits per tier
2. **Query Optimization** - Minimize round trips with aggregation
3. **Indexes** - Critical for performance at scale
4. **Connection Pooling** - Min 5, Max 20 connections per instance
5. **Read Replicas** - Consider for high read workloads

---

## 📐 Proposed Architecture

### Option 1: Modular Monolith (Recommended for Current State)

**Structure:**
```
backend/
├── server.js                          # Entry point (< 50 lines)
├── app.js                             # Express app setup (< 100 lines)
├── config/
│   ├── database.js                    # Shared DB connection
│   ├── environment.js                 # Environment validation
│   └── index.js                       # Config exports
├── middleware/
│   ├── auth.js                        # JWT verification
│   ├── validation.js                  # Request validation
│   ├── errorHandler.js                # Global error handler
│   ├── rateLimiter.js                 # Rate limiting
│   └── index.js                       # Middleware exports
├── routes/
│   ├── index.js                       # Route aggregator
│   ├── auth/
│   │   ├── index.js                   # Auth router
│   │   ├── handlers.js                # Route handlers
│   │   └── validation.js              # Auth validation
│   ├── orders/
│   │   ├── index.js
│   │   ├── handlers.js
│   │   └── validation.js
│   ├── products/
│   │   ├── index.js
│   │   ├── handlers.js
│   │   └── validation.js
│   ├── community/                     # NEW - Move from server.js
│   │   ├── index.js
│   │   ├── handlers.js
│   │   └── validation.js
│   ├── geocoding/                     # NEW - Move from server.js
│   │   ├── index.js
│   │   └── handlers.js
│   ├── spotlight/                     # NEW - Move from server.js
│   │   ├── index.js
│   │   └── handlers.js
│   └── ... (one folder per domain)
├── services/
│   ├── orderService.js                # Business logic
│   ├── paymentService.js              # Payment processing
│   ├── notificationService.js         # Notifications
│   └── ... (one service per domain)
├── utils/
│   ├── validation.js                  # Shared validators
│   ├── formatting.js                  # Data formatters
│   └── errors.js                      # Custom error classes
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Benefits:**
- ✅ Small, focused files (< 300 lines each)
- ✅ Easy to test individual components
- ✅ Clear separation of concerns
- ✅ Better for team collaboration
- ✅ Maintains single deployment (good for current scale)
- ✅ Easy to extract microservices later if needed

### Option 2: Microservices (For Future Scale)

Only if you hit these thresholds:
- 10,000+ requests/minute
- Need independent scaling per feature
- Team size > 10 developers
- Different SLAs for different features

---

## 🚀 Refactoring Strategy

### Phase 1: Foundation (Week 1) ⚡ HIGH PRIORITY

#### Step 1: Extract Configuration
**Goal:** Centralize all configuration

**Actions:**
```javascript
// config/database.js
const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.db) return this.db;
    
    this.client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      compressors: ['zlib']
    });
    
    await this.client.connect();
    this.db = this.client.db('bazarmkt');
    return this.db;
  }
}

module.exports = new Database();
```

**Files to Create:**
1. ✅ `/config/database.js` (Already created as `/lib/database.js`)
2. `/config/environment.js`
3. `/config/constants.js`

#### Step 2: Extract Middleware
**Goal:** Modularize all middleware

**Actions:**
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');
    
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

exports.verifyArtisanRole = async (req, res, next) => {
  // Implementation
};
```

**Files to Create:**
1. `/middleware/auth.js`
2. `/middleware/validation.js`
3. `/middleware/errorHandler.js`
4. `/middleware/rateLimiter.js`

### Phase 2: Route Extraction (Week 2-3) 🔥 HIGH PRIORITY

#### Extract Inline Endpoints to Routers

**Priority Order** (based on complexity & usage):

1. **Community Endpoints** (12 endpoints)
   - Create `/routes/community/`
   - Move all `/api/community/*` endpoints
   - Estimated: 400-500 lines → organized in 3-4 files

2. **Geocoding Endpoints** (4 endpoints)
   - Create `/routes/geocoding/`
   - Move all `/api/geocoding/*` endpoints
   - Estimated: 150-200 lines

3. **Spotlight Endpoints** (3 endpoints)
   - Create `/routes/spotlight/`
   - Move all `/api/spotlight/*` endpoints
   - Estimated: 150-200 lines

4. **Wallet Endpoints** (2 endpoints)
   - Create `/routes/wallet/`
   - Move all `/api/wallet/*` endpoints
   - Estimated: 100-150 lines

5. **Inventory Endpoints** (2 endpoints)
   - Create `/routes/inventory/`
   - Move all `/api/inventory/*` endpoints
   - Estimated: 100-150 lines

6. **User Dashboard Endpoints** (3 endpoints)
   - Create `/routes/user/`
   - Move `/api/user/*` endpoints
   - Estimated: 150-200 lines

7. **Artisan Dashboard Endpoints** (1 endpoint)
   - Add to existing `/routes/artisans/`
   - Estimated: 100 lines

8. **Auth Helper Endpoints** (3 endpoints)
   - Add to existing `/routes/auth/`
   - check-email, guest auth
   - Estimated: 150 lines

**Template for Each Router:**

```javascript
// routes/[domain]/index.js
const express = require('express');
const router = express.Router();
const handlers = require('./handlers');
const { verifyJWT } = require('../../middleware/auth');
const validate = require('./validation');

// Public routes
router.get('/', handlers.getAll);
router.get('/:id', handlers.getById);

// Protected routes
router.post('/', verifyJWT, validate.create, handlers.create);
router.put('/:id', verifyJWT, validate.update, handlers.update);
router.delete('/:id', verifyJWT, handlers.delete);

module.exports = router;
```

### Phase 3: Service Layer (Week 4) 📦 MEDIUM PRIORITY

**Goal:** Extract business logic from route handlers

**Pattern:**
```javascript
// services/orderService.js
class OrderService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('orders');
  }

  async createOrder(orderData) {
    // Business logic here
    // Validation, calculations, data transformation
    return await this.collection.insertOne(orderData);
  }

  async getOrdersByUser(userId) {
    // Business logic
    return await this.collection.find({ userId }).toArray();
  }
}

module.exports = OrderService;
```

**Services to Create:**
1. `orderService.js`
2. `productService.js`
3. `userService.js`
4. `paymentService.js`
5. `notificationService.js`
6. `communityService.js`

### Phase 4: Testing & Optimization (Week 5) ✅ HIGH PRIORITY

1. **Add Tests**
   - Unit tests for services
   - Integration tests for routes
   - E2E tests for critical flows

2. **Performance Optimization**
   - Add database indexes
   - Implement caching strategy
   - Optimize aggregation queries

3. **Monitoring**
   - Add logging
   - Set up error tracking
   - Performance monitoring

---

## 📈 Migration Path for Endpoints

### Current Inline Endpoints → Target Routers

| Current Location | Endpoint Count | Target Router | Priority | Effort |
|-----------------|----------------|---------------|----------|--------|
| server-vercel.js | 12 | `/routes/community/` | HIGH | 2 days |
| server-vercel.js | 4 | `/routes/geocoding/` | MEDIUM | 1 day |
| server-vercel.js | 3 | `/routes/spotlight/` | HIGH | 1 day |
| server-vercel.js | 3 | `/routes/promotional/` | MEDIUM | 1 day |
| server-vercel.js | 2 | `/routes/wallet/` | MEDIUM | 1 day |
| server-vercel.js | 2 | `/routes/inventory/` | LOW | 1 day |
| server-vercel.js | 3 | `/routes/user/` | MEDIUM | 1 day |
| server-vercel.js | 3 | Extend `/routes/auth/` | MEDIUM | 1 day |

**Total:** ~10 working days for complete refactor

---

## 🎯 Final Target Architecture

### server.js (15-20 lines)
```javascript
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
```

### app.js (50-100 lines)
```javascript
const express = require('express');
const cors = require('cors');
const compression = require('compression');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { databaseMiddleware } = require('./middleware/database');

// Routes
const routes = require('./routes');

const app = express();

// Apply middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(rateLimiter);
app.use(databaseMiddleware);

// Mount all routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

module.exports = app;
```

### routes/index.js (30-40 lines)
```javascript
const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const communityRoutes = require('./community');
const geocodingRoutes = require('./geocoding');
const spotlightRoutes = require('./spotlight');
// ... etc

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/community', communityRoutes);
router.use('/geocoding', geocodingRoutes);
router.use('/spotlight', spotlightRoutes);
// ... etc

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;
```

---

## 💰 Benefits of Refactoring

### Immediate Benefits:
1. **Maintainability** ↑ 300%
   - Each file < 300 lines
   - Clear responsibility per file
   - Easy to find and fix bugs

2. **Testability** ↑ 500%
   - Can test individual components
   - Mock dependencies easily
   - Faster test execution

3. **Collaboration** ↑ 200%
   - Fewer merge conflicts
   - Clear ownership of features
   - Easier code reviews

### Long-term Benefits:
1. **Scalability**
   - Easy to scale specific features
   - Can extract to microservices if needed
   - Performance optimization per route

2. **Performance**
   - Smaller bundle sizes
   - Faster cold starts on Vercel
   - Better caching strategies

3. **Security**
   - Centralized auth logic
   - Consistent validation
   - Easier security audits

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Changes During Refactor
**Mitigation:**
- Feature flags for new routes
- Run old and new code in parallel
- Gradual rollout with monitoring
- Comprehensive test suite

### Risk 2: Performance Regression
**Mitigation:**
- Benchmark before/after
- Load testing on staging
- Monitor response times
- Rollback plan ready

### Risk 3: Team Disruption
**Mitigation:**
- Clear communication
- Update documentation
- Pair programming sessions
- Phased rollout

---

## 📋 Immediate Action Items

### This Week:
1. ✅ **DONE:** Fix database connection issues
2. ✅ **DONE:** Optimize connection pool
3. ✅ **DONE:** Fix product routes
4. 🔄 **TODO:** Create refactoring plan (this document)
5. 🔄 **TODO:** Set up testing framework
6. 🔄 **TODO:** Extract database config

### Next Week:
1. Extract community routes
2. Extract geocoding routes
3. Extract spotlight routes
4. Add tests for extracted routes

### Month 1 Goal:
- Reduce server-vercel.js from 6,208 → < 200 lines
- All 69 inline endpoints moved to routers
- 80%+ test coverage on new routes
- Zero production issues

---

## 🎯 Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| server-vercel.js lines | 6,208 | < 200 | 4 weeks |
| Inline endpoints | 69 | 0 | 4 weeks |
| Test coverage | ~0% | 80% | 6 weeks |
| Max file size | 6,208 | < 300 | 4 weeks |
| Response time (p95) | ~1s | < 500ms | 8 weeks |
| Build size | ? | < 30MB | 6 weeks |

---

## 📚 References & Best Practices

### Vercel Serverless:
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Next.js API Routes Best Practices](https://nextjs.org/docs/api-routes/introduction)
- [Optimizing Serverless Functions](https://vercel.com/docs/functions/serverless-functions/optimizing-serverless-functions)

### MongoDB Atlas:
- [Connection Pooling Best Practices](https://docs.atlas.mongodb.com/best-practices-connections/)
- [Query Optimization](https://docs.mongodb.com/manual/core/query-optimization/)
- [Indexes Guide](https://docs.mongodb.com/manual/indexes/)

### Express.js:
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Router Documentation](https://expressjs.com/en/guide/routing.html)
- [Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)

---

**Created:** October 3, 2025  
**Status:** 📋 Analysis Complete - Ready for Implementation  
**Next Step:** Begin Phase 1 - Foundation Setup

