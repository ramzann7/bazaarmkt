# Required Code Changes for Production

## Priority Legend
- 🔴 CRITICAL - Must fix before deployment
- 🟡 HIGH - Should fix before deployment
- 🟢 MEDIUM - Can fix after initial deployment
- 🔵 LOW - Nice to have

---

## 🔴 CRITICAL Changes

### 1. Update CORS Configuration

**File:** `backend/server-working.js`  
**Lines:** 49-56

**Current Code:**
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5180',
    'https://bazaarmkt.vercel.app'
  ],
  credentials: true
}));
```

**Replace With:**
```javascript
const getCorsOrigin = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://bazaarmkt.ca',
      'https://www.bazaarmkt.ca',
      /^https:\/\/bazaarmkt-.*\.vercel\.app$/ // Preview deployments
    ];
  }
  return [
    'http://localhost:5173',
    'http://localhost:5180',
    'http://localhost:3000'
  ];
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigin();
    
    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      return allowed instanceof RegExp ? allowed.test(origin) : allowed === origin;
    });
    
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 2. Add Security Headers (Helmet)

**File:** `backend/server-working.js`  
**Location:** After line 31 (after `app.set('trust proxy', 1)`)

**Add:**
```javascript
const helmet = require('helmet');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.brevo.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

### 3. Sanitize Errors in Production

**File:** `backend/middleware/errorHandler.js`  
**Location:** In the error handler middleware function

**Find the section that sends error response and update:**

**Add before sending response:**
```javascript
// Don't expose sensitive information in production
if (process.env.NODE_ENV === 'production') {
  // Remove stack trace
  delete err.stack;
  
  // For non-operational errors, use generic message
  if (!err.isOperational) {
    err.message = 'An unexpected error occurred. Please try again or contact support.';
  }
  
  // Don't expose internal error details
  if (err.code && err.code.startsWith('ER_')) {
    err.message = 'A system error occurred. Please contact support.';
  }
}
```

---

### 4. Authenticate Cron Jobs

**Files:** 
- `backend/api/cron/payouts.js`
- `backend/api/cron/auto-capture-payments.js`
- `backend/api/cron/inventory-restoration.js`

**Add at the beginning of each function:**

```javascript
module.exports = async (req, res) => {
  try {
    // Verify cron secret in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('Unauthorized cron attempt');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
    }
    
    // ... rest of cron logic
  } catch (error) {
    // ... error handling
  }
};
```

---

### 5. Add Rate Limiting to Auth Routes

**File:** `backend/routes/auth/index.js`  
**Location:** After imports, before route definitions

**Add:**
```javascript
const rateLimit = require('express-rate-limit');

// Strict rate limiting for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Moderate rate limiting for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again later.'
  },
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Apply to routes
router.post('/login', authLimiter, login);
router.post('/register', registerLimiter, register);
```

---

## 🟡 HIGH Priority Changes

### 6. Create Winston Logger

**File:** `backend/config/logger.js` (NEW FILE)

**Create this file:**
```javascript
const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'bazaarmkt-api' },
  transports: [
    // Write all logs with level 'error' to error.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

**Then update imports in all backend files:**
```javascript
const logger = require('./config/logger');

// Replace console.log
logger.info('message', { data });
logger.error('error', { error: error.message });
logger.warn('warning', { detail });
logger.debug('debug info', { data });
```

---

### 7. Remove Debug Routes

**File:** `frontend/src/app.jsx`  
**Lines:** 174-181

**Option A - Remove completely:**
```javascript
// DELETE these lines:
<Route path="/dashboard-test" element={<DashboardTest />} />
<Route path="/user-role-check" element={<UserRoleCheck />} />
<Route path="/dashboard-debug" element={<DashboardDebug />} />
<Route path="/dashboard-simple" element={<DashboardSimple />} />
<Route path="/dashboard-minimal" element={<DashboardMinimal />} />
<Route path="/dashboard-test-simple" element={<DashboardTestSimple />} />
<Route path="/dashboard-fixed" element={<DashboardFixed />} />
<Route path="/login-debug" element={<LoginDebug />} />
```

**Option B - Gate with environment check:**
```javascript
{/* Debug routes - only in development */}
{import.meta.env.MODE === 'development' && (
  <>
    <Route path="/dashboard-test" element={<DashboardTest />} />
    <Route path="/user-role-check" element={<UserRoleCheck />} />
    <Route path="/dashboard-debug" element={<DashboardDebug />} />
    <Route path="/dashboard-simple" element={<DashboardSimple />} />
    <Route path="/dashboard-minimal" element={<DashboardMinimal />} />
    <Route path="/dashboard-test-simple" element={<DashboardTestSimple />} />
    <Route path="/dashboard-fixed" element={<DashboardFixed />} />
    <Route path="/login-debug" element={<LoginDebug />} />
  </>
)}
```

---

### 8. Update Image URLs

**Files with hardcoded localhost:**
- `frontend/src/components/Profile.jsx`
- `frontend/src/components/home.jsx`
- `frontend/src/components/AdminProductManagement.jsx`
- `frontend/src/services/productService.js`
- `frontend/src/services/cartService.js`

**Example Fix:**

**File:** `frontend/src/components/AdminProductManagement.jsx` (Line 148)

**Current:**
```javascript
return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${imagePath}`;
```

**Change to:**
```javascript
import config from '../config/environment';
return `${config.BASE_URL}/${imagePath}`;
```

**Apply similar fix to all files with image URLs.**

---

### 9. Implement Vercel Blob for File Uploads

**File:** `backend/services/imageUploadService.js`

**Current:** Uses local file system  
**Change to:** Use Vercel Blob in production

**Add:**
```javascript
const { put, list, del } = require('@vercel/blob');

async function uploadProductImage(file, productId) {
  try {
    // Use Vercel Blob in production
    if (process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === 'production') {
      const blob = await put(
        `products/${productId}/${Date.now()}-${file.originalname}`,
        file.buffer,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        }
      );
      
      return {
        url: blob.url,
        filename: file.originalname,
        size: file.size,
        uploadedAt: new Date()
      };
    }
    
    // Use local storage in development
    // ... existing code ...
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}
```

---

### 10. Update Frontend Build Configuration

**File:** `frontend/vite.config.js`

**Add production optimizations:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production', // Disable in prod
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          icons: ['@heroicons/react'],
          utils: ['axios', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.VITE_BASE_URL || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      'react-router-dom': 'react-router-dom'
    }
  }
})
```

---

## 🟢 MEDIUM Priority Changes

### 11. Add Request Logging Middleware

**File:** `backend/server-working.js`  
**Location:** After database middleware, before routes

**Add:**
```javascript
const logger = require('./config/logger');

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    if (res.statusCode >= 400) {
      logger.error('Request error', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request', logData);
    } else if (process.env.NODE_ENV === 'development') {
      logger.info('Request completed', logData);
    }
  });
  
  next();
});
```

---

### 12. Improve Database Connection Handling

**File:** `backend/server-working.js`  
**Lines:** 62-87

**Enhance error handling:**
```javascript
const getDB = async () => {
  if (db && client && client.topology && client.topology.isConnected()) {
    return db;
  }
  
  try {
    if (client) {
      await client.close().catch(() => {});
    }
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    client = new MongoClient(uri, {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 20,
      minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    });
    
    await client.connect();
    db = client.db('bazarmkt');
    
    logger.info('MongoDB connected successfully', {
      database: 'bazarmkt',
      poolSize: client.options.maxPoolSize
    });
    
    return db;
  } catch (error) {
    logger.error('Database connection failed', { 
      error: error.message,
      uri: process.env.MONGODB_URI ? 'Set' : 'Missing'
    });
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection');
  if (client) {
    await client.close();
  }
  process.exit(0);
});
```

---

### 13. Add Stripe Webhook Handler

**File:** `backend/routes/webhooks/stripe.js` (NEW FILE)

**Create:**
```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Webhook endpoint - must use raw body
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      // Update order status if needed
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.error('PaymentIntent failed:', failedPayment.id);
      // Send notification to user
      break;
      
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod attached:', paymentMethod.id);
      // Could sync to MongoDB here
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

module.exports = router;
```

**Then add to server:**
```javascript
// In server-working.js
const webhookRoutes = require('./routes/webhooks/stripe');
app.use('/api/webhooks', webhookRoutes);
```

---

### 14. Environment-Aware Error Messages

**File:** `backend/routes/orders/index.js` and all other routes

**Find error responses like:**
```javascript
res.status(500).json({
  success: false,
  message: 'Failed to create order',
  error: error.message  // ❌ Exposes internal errors
});
```

**Replace with:**
```javascript
res.status(500).json({
  success: false,
  message: 'Failed to create order',
  ...(process.env.NODE_ENV === 'development' && { error: error.message })
});
```

---

## 🔵 LOW Priority Changes (Post-Launch)

### 15. Add API Response Caching

**File:** `backend/server-working.js`

**Current cache middleware is basic. Enhance it:**
```javascript
const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

app.use((req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') return next();
  
  // Don't cache authenticated requests
  if (req.headers.authorization) return next();
  
  // Don't cache admin routes
  if (req.path.startsWith('/api/admin')) return next();
  
  const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    apiCache.set(cacheKey, data);
    return originalJson(data);
  };
  
  next();
});
```

---

### 16. Add Database Query Monitoring

**File:** All route files with database queries

**Wrap expensive queries:**
```javascript
// Before
const products = await db.collection('products').find({ status: 'active' }).toArray();

// After
const startTime = Date.now();
const products = await db.collection('products').find({ status: 'active' }).toArray();
const queryTime = Date.now() - startTime;

if (queryTime > 1000) {
  logger.warn('Slow query detected', {
    collection: 'products',
    operation: 'find',
    duration: queryTime
  });
}
```

---

### 17. Add Input Sanitization

**File:** All routes that accept user input

**Install:**
```bash
npm install express-mongo-sanitize
```

**Add to server:**
```javascript
const mongoSanitize = require('express-mongo-sanitize');

// Sanitize user input to prevent NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('Sanitized malicious input', { 
      path: req.path,
      key 
    });
  }
}));
```

---

## 📝 Quick Reference: Files to Modify

### Must Modify (Critical)
```
✅ backend/server-working.js           - CORS, Helmet, HTTPS
✅ backend/middleware/errorHandler.js  - Sanitize errors
✅ backend/api/cron/payouts.js         - Add auth
✅ backend/api/cron/auto-capture-payments.js - Add auth
✅ backend/api/cron/inventory-restoration.js - Add auth
✅ backend/routes/auth/index.js        - Rate limiting
✅ vercel.json                         - Enhanced config
```

### Should Modify (High Priority)
```
□ backend/config/logger.js             - Create new file
□ All backend route files              - Replace console.log
□ All backend service files            - Replace console.log
□ frontend/src/app.jsx                 - Remove debug routes
□ frontend/vite.config.js              - Production optimizations
```

### Can Modify (Medium Priority)
```
□ backend/services/imageUploadService.js - Vercel Blob
□ backend/routes/webhooks/stripe.js      - Create new file
□ All route files                        - Add query monitoring
```

---

## 🎬 Deployment Command Sequence

### Local Testing First

```bash
# 1. Set production environment variables locally
export NODE_ENV=production
export MONGODB_URI="mongodb+srv://..."
export JWT_SECRET="your-secret"
# ... etc

# 2. Test backend
cd backend
npm start

# 3. Test frontend with production API
cd ../frontend
npm run build
npm run preview

# 4. Test complete flow
# - Register user
# - Place order
# - Verify email sent
# - Check admin dashboard
```

### Deploy to Preview

```bash
# 1. Commit all changes
git add .
git commit -m "Production-ready: Security, logging, and configuration updates"
git push origin main

# 2. Deploy to preview
vercel

# 3. Get preview URL
# Example: https://bazaarmkt-abc123.vercel.app

# 4. Test preview deployment thoroughly
```

### Deploy to Production

```bash
# Only after preview is fully tested
vercel --prod

# Verify deployment
curl https://www.bazaarmkt.ca/api/health
```

---

## 🔄 Rollback Procedure

If something goes wrong:

```bash
# Method 1: CLI Rollback
vercel rollback

# Method 2: Promote previous deployment
vercel list
vercel promote <previous-deployment-url>

# Method 3: Redeploy previous git commit
git checkout <previous-commit-hash>
vercel --prod
git checkout main
```

---

## 📞 Support Contacts

### Services to Configure

| Service | Purpose | URL |
|---------|---------|-----|
| Vercel | Hosting | https://vercel.com/dashboard |
| MongoDB Atlas | Database | https://cloud.mongodb.com |
| Stripe | Payments | https://dashboard.stripe.com |
| Brevo | Email | https://app.brevo.com |
| Cloudflare (optional) | DNS/CDN | https://dash.cloudflare.com |

### Get Support

- **Vercel:** support@vercel.com or dashboard chat
- **MongoDB:** Atlas support chat
- **Stripe:** support@stripe.com or dashboard
- **Brevo:** support@brevo.com

---

## ✅ Final Checklist Before Going Live

### Code Quality
- [ ] All linter warnings fixed
- [ ] All console.logs removed or replaced
- [ ] Debug routes removed or gated
- [ ] Error handling production-ready
- [ ] Tests passing

### Security
- [ ] HTTPS enforced
- [ ] Security headers added
- [ ] CORS restricted to production domains
- [ ] Rate limiting configured
- [ ] Secrets rotated
- [ ] Admin routes protected

### Configuration
- [ ] All environment variables set in Vercel
- [ ] Stripe in live mode
- [ ] Email service configured
- [ ] Database indexes created
- [ ] Cron jobs authenticated

### Testing
- [ ] Full user journey tested
- [ ] Payment flow tested
- [ ] Email delivery verified
- [ ] Admin access tested
- [ ] Mobile responsiveness checked

### Monitoring
- [ ] Error tracking configured
- [ ] Uptime monitoring set up
- [ ] Performance monitoring active
- [ ] Logs accessible

### Business
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Terms of service published
- [ ] Privacy policy published
- [ ] Support email configured

**When all checked:** ✅ **READY FOR PRODUCTION DEPLOYMENT**

---

*Last Updated: October 8, 2025*
*Review before each deployment*

