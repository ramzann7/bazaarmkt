# 🚀 BazaarMKT Production Deployment Plan

## Date: October 8, 2025
## Target Platform: Vercel
## Domain: www.bazaarmkt.ca

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Code Changes Required](#code-changes-required)
4. [Database Preparation](#database-preparation)
5. [Vercel Configuration](#vercel-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [Backend Deployment](#backend-deployment)
8. [Post-Deployment Tasks](#post-deployment-tasks)
9. [Monitoring & Rollback](#monitoring--rollback)
10. [Security Hardening](#security-hardening)

---

## 🔍 Pre-Deployment Checklist

### Critical Reviews Completed
- ✅ Admin account functionality verified
- ✅ Payment method saving fixed (Stripe setup_future_usage)
- ✅ Email notifications configured
- ✅ Error page issue resolved
- ✅ Profile component supports all user types

### Outstanding Issues to Address

#### 🔴 CRITICAL - Must Fix Before Deployment

1. **Remove Console Logs** (1,113 instances in backend)
   - Replace with proper Winston logging
   - Only log errors and critical info in production
   
2. **Enable HTTPS Only**
   - Update CORS to only allow HTTPS origins
   - Implement HSTS (HTTP Strict Transport Security)

3. **Secure Sensitive Routes**
   - All admin routes need middleware (DONE ✅)
   - Add rate limiting to auth routes
   - Implement CSRF protection

4. **Database Indexes**
   - Create indexes for frequently queried fields
   - Optimize query performance

#### 🟡 HIGH PRIORITY - Should Fix

5. **Error Handling**
   - Sanitize error messages in production
   - Don't expose stack traces
   - Implement error tracking (Sentry)

6. **File Upload Security**
   - Move from local storage to Vercel Blob
   - Implement file size limits
   - Add virus scanning (optional)

7. **Redis Configuration**
   - Set up Redis for production caching
   - Configure session storage

#### 🟢 MEDIUM PRIORITY - Nice to Have

8. **Performance Optimization**
   - Enable CDN for static assets
   - Implement image optimization
   - Add HTTP/2 support

9. **Monitoring**
   - Set up application monitoring
   - Configure uptime monitoring
   - Add performance tracking

---

## 🔐 Environment Variables

### Backend Environment Variables (Vercel)

#### ✅ Required - Application Won't Start Without These

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazarmkt?retryWrites=true&w=majority

# Authentication & Security
JWT_SECRET=<generate-strong-secret-min-64-chars>
NODE_ENV=production

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_<your-live-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>

# Email Notifications (Brevo)
BREVO_API_KEY=xkeysib-<your-api-key>
```

#### ⚠️ Highly Recommended

```bash
# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_<your-token>

# Cron Job Security
CRON_SECRET=<generate-random-secret-for-cron-endpoints>

# Google Services
GOOGLE_MAPS_API_KEY=<your-google-maps-key>
GEOCODING_API_KEY=<your-geocoding-key>

# CORS Configuration
CORS_ORIGIN=https://www.bazaarmkt.ca

# Redis Cache (Optional but recommended)
REDIS_URL=redis://:<password>@<host>:6379
REDIS_PORT=6379

# Uber Direct (Professional Delivery)
UBER_DIRECT_CLIENT_ID=<your-client-id>
UBER_DIRECT_CLIENT_SECRET=<your-client-secret>
UBER_DIRECT_CUSTOMER_ID=<your-customer-id>
UBER_DIRECT_SERVER_TOKEN=<your-server-token>
UBER_DIRECT_BASE_URL=https://api.uber.com
```

#### 📊 Optional - Monitoring & Analytics

```bash
# Error Tracking
SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<id>

# Application Monitoring
NEW_RELIC_LICENSE_KEY=<your-license-key>

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_ANALYTICS=true
```

### Frontend Environment Variables (Vercel)

#### ✅ Required

```bash
# API Configuration
VITE_API_URL=https://www.bazaarmkt.ca/api
VITE_BASE_URL=https://www.bazaarmkt.ca

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_<your-publishable-key>

# Environment
VITE_NODE_ENV=production
```

#### ⚠️ Highly Recommended

```bash
# File Storage
VITE_UPLOADS_URL=https://www.bazaarmkt.ca/api/upload
VITE_VERCEL_BLOB_DOMAIN=blob.vercel-storage.com
VITE_VERCEL_BLOB_URL=https://blob.vercel-storage.com

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-key>

# Brevo (for frontend email features)
VITE_BREVO_API_KEY=xkeysib-<your-api-key>
```

---

## 💻 Code Changes Required

### 1. Remove/Reduce Console Logs

**Priority:** 🔴 CRITICAL

**Files to Update:**
- All backend route files
- All backend service files
- Frontend service files

**Action:**
```javascript
// ❌ REMOVE in production
console.log('Debug info:', data);
console.log('🔍 Checking...');

// ✅ REPLACE with Winston logger
const logger = require('./utils/logger');
logger.info('Processing request', { userId, orderId });
logger.error('Payment failed', { error: error.message });
```

**Script to Help:**
```bash
# Find all console.log statements
grep -r "console\." backend/ --include="*.js" | wc -l

# Replace in specific files
sed -i 's/console\.log/logger.debug/g' backend/routes/**/*.js
```

### 2. Update CORS Configuration

**Priority:** 🔴 CRITICAL

**File:** `backend/server-working.js` (Lines 49-56)

**Current:**
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

**Change to:**
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://bazaarmkt.ca',
      'https://www.bazaarmkt.ca',
      /^https:\/\/bazaarmkt-.*\.vercel\.app$/  // Preview deployments
    ]
  : [
      'http://localhost:5173',
      'http://localhost:5180',
      'http://localhost:3000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Add Security Headers

**Priority:** 🔴 CRITICAL

**File:** `backend/server-working.js` (After line 31)

**Add Helmet Security Middleware:**
```javascript
const helmet = require('helmet');

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://api.brevo.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### 4. Update Error Handler for Production

**Priority:** 🔴 CRITICAL

**File:** `backend/middleware/errorHandler.js`

**Add at the end of error handler:**
```javascript
// In production, don't send stack traces
if (process.env.NODE_ENV === 'production') {
  delete err.stack;
  
  // Send generic message for operational errors
  if (!err.isOperational) {
    err.message = 'An unexpected error occurred';
  }
}
```

### 5. Implement Proper Logging

**Priority:** 🟡 HIGH

**Create:** `backend/config/logger.js`

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      level: 'info'
    }),
    // Write errors to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

**Replace console.log with logger:**
```javascript
// ❌ Before
console.log('User logged in:', userId);
console.error('Payment failed:', error);

// ✅ After
const logger = require('./config/logger');
logger.info('User logged in', { userId });
logger.error('Payment failed', { error: error.message, orderId });
```

### 6. Database Connection Pooling

**Priority:** 🟡 HIGH

**File:** `backend/server-working.js` (Lines 72-77)

**Current is OK but increase pool for production:**
```javascript
client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 20,
  minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true
});
```

### 7. Rate Limiting for Auth Routes

**Priority:** 🟡 HIGH

**File:** `backend/routes/auth/index.js` (After imports)

```javascript
const rateLimit = require('express-rate-limit');

// Strict rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

// Apply to login route
router.post('/login', loginLimiter, login);
```

### 8. Environment-Based Image URLs

**Priority:** 🟡 HIGH

**Files with hardcoded localhost:**
- `frontend/src/components/Profile.jsx`
- `frontend/src/components/home.jsx`
- `frontend/src/components/AdminProductManagement.jsx`
- `frontend/src/services/productService.js`
- `frontend/src/services/cartService.js`

**Find and replace:**
```javascript
// ❌ Hardcoded
const imageUrl = `http://localhost:4000/uploads/${imagePath}`;

// ✅ Use environment config
import config from '../config/environment';
const imageUrl = `${config.UPLOADS_URL}/${imagePath}`;
```

### 9. Remove Debug/Test Routes

**Priority:** 🟡 HIGH

**File:** `frontend/src/app.jsx` (Lines 174-180)

**Remove these test routes in production:**
```javascript
// ❌ REMOVE BEFORE PRODUCTION
<Route path="/dashboard-test" element={<DashboardTest />} />
<Route path="/user-role-check" element={<UserRoleCheck />} />
<Route path="/dashboard-debug" element={<DashboardDebug />} />
<Route path="/dashboard-simple" element={<DashboardSimple />} />
<Route path="/dashboard-minimal" element={<DashboardMinimal />} />
<Route path="/dashboard-test-simple" element={<DashboardTestSimple />} />
<Route path="/dashboard-fixed" element={<DashboardFixed />} />
<Route path="/login-debug" element={<LoginDebug />} />
```

**Or wrap them:**
```javascript
{import.meta.env.MODE === 'development' && (
  <>
    <Route path="/dashboard-test" element={<DashboardTest />} />
    <Route path="/user-role-check" element={<UserRoleCheck />} />
    {/* ... other debug routes */}
  </>
)}
```

### 10. Enable Compression

**Priority:** 🟢 MEDIUM

**File:** `backend/server-working.js` (Already implemented ✅)

Current compression is good. Consider adjusting for production:
```javascript
app.use(compression({
  level: 9, // Maximum compression for production
  threshold: 512, // Compress responses > 512 bytes
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

---

## 🗄️ Database Preparation

### 1. Create Production Database

**Platform:** MongoDB Atlas

**Steps:**
1. Create new cluster or use existing
2. Database name: `bazarmkt` (not `bazarmkt-prod` to match code)
3. Create dedicated database user:
   ```
   Username: bazarmkt-prod
   Password: <generate-strong-password>
   Role: readWrite on bazarmkt database
   ```

### 2. Run Database Initialization Scripts

**Before deployment, run these scripts:**

```bash
# 1. Initialize platform settings
node backend/scripts/initialize-platform-settings.js

# 2. Create database indexes (if script exists)
node backend/scripts/setup-database.js

# 3. Migrate order statuses (if needed)
node backend/scripts/migrate-to-comprehensive-statuses.js
```

### 3. Create Database Indexes

**Run these commands in MongoDB Atlas or via script:**

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ stripeCustomerId: 1 });
db.users.createIndex({ createdAt: -1 });

// Orders collection
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ artisan: 1, status: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ paymentIntentId: 1 });
db.orders.createIndex({ createdAt: -1 });

// Products collection
db.products.createIndex({ artisan: 1, status: 1 });
db.products.createIndex({ category: 1, status: 1 });
db.products.createIndex({ status: 1, isFeatured: -1 });
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ createdAt: -1 });

// Artisans collection
db.artisans.createIndex({ user: 1 }, { unique: true });
db.artisans.createIndex({ isActive: 1, isVerified: 1 });
db.artisans.createIndex({ 'location.coordinates': '2dsphere' });

// Wallets collection
db.wallets.createIndex({ artisanId: 1 }, { unique: true });

// Notifications collection
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });
```

### 4. Create Initial Admin User

**Run this in MongoDB or via script:**

```javascript
db.users.insertOne({
  email: "admin@bazaarmkt.ca",
  password: "<bcrypt-hashed-password>",  // Use bcrypt to hash
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  userType: "admin",
  isActive: true,
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  addresses: [],
  notificationPreferences: {
    email: {
      marketing: true,
      orderUpdates: true,
      promotions: true,
      security: true
    }
  }
});
```

---

## ⚙️ Vercel Configuration

### 1. Update vercel.json

**Current file is good but add environment-specific settings:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server-working.js",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 30
      }
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/cron/(.*)",
      "dest": "backend/api/cron/$1.js",
      "methods": ["POST"],
      "headers": {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    },
    {
      "src": "/api/(.*)",
      "dest": "backend/server-working.js",
      "headers": {
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    },
    {
      "src": "/uploads/(.*)",
      "dest": "backend/server-working.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/payouts",
      "schedule": "0 9 * * 5"
    },
    {
      "path": "/api/cron/inventory-restoration",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/auto-capture-payments",
      "schedule": "0 * * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 2. Add Build Scripts

**File:** `package.json` (Root)

```json
{
  "scripts": {
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm install && npm run build",
    "build:backend": "cd backend && npm install",
    "deploy": "vercel --prod",
    "deploy:preview": "vercel"
  }
}
```

### 3. Configure Vercel Project Settings

**In Vercel Dashboard:**

1. **Framework Preset:** Other
2. **Build Command:** `npm run build:frontend`
3. **Output Directory:** `frontend/dist`
4. **Install Command:** `npm install && cd frontend && npm install`
5. **Root Directory:** `/`

**Advanced Settings:**
- Node.js Version: `18.x` or `20.x`
- Enable: Include source files outside of Root Directory
- Function Region: `iad1` (US East) or closest to your MongoDB cluster

---

## 🎨 Frontend Deployment

### 1. Build Configuration

**File:** `frontend/vite.config.js`

**Update for production:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          icons: ['@heroicons/react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5180,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
```

### 2. Create Production Build

```bash
cd frontend
npm run build
```

**Verify build output:**
- Check `dist/` folder exists
- Verify `index.html` is present
- Check asset sizes are reasonable
- Test build locally: `npm run preview`

### 3. Environment Variables in Vercel

**Set in Vercel Dashboard → Project → Settings → Environment Variables:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://www.bazaarmkt.ca/api` | Production |
| `VITE_BASE_URL` | `https://www.bazaarmkt.ca` | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` | Production |
| `VITE_GOOGLE_MAPS_API_KEY` | Your key | Production |
| `VITE_BREVO_API_KEY` | Your key | Production |
| `VITE_NODE_ENV` | `production` | Production |

---

## 🖥️ Backend Deployment

### 1. Serverless Function Configuration

**Vercel automatically creates serverless functions from:**
- `backend/server-working.js` (main API)
- `backend/api/cron/*.js` (cron jobs)

**No changes needed** - Current setup is correct ✅

### 2. File Upload Strategy

**Current:** Local file system (`public/uploads/`)  
**Production:** Vercel Blob Storage

**Code Change Required:**

**File:** `backend/services/imageUploadService.js`

**Update to use Vercel Blob:**
```javascript
const { put } = require('@vercel/blob');

async function uploadImage(file) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Use Vercel Blob in production
    const blob = await put(file.originalname, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return blob.url;
  } else {
    // Use local storage in development
    // ... existing local upload code
  }
}
```

### 3. Cron Jobs Authentication

**File:** `backend/api/cron/payouts.js`, `auto-capture-payments.js`, `inventory-restoration.js`

**Add authentication check:**
```javascript
module.exports = async (req, res) => {
  // Verify Vercel Cron secret
  const authHeader = req.headers.authorization;
  
  if (process.env.NODE_ENV === 'production') {
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
  }
  
  // ... rest of cron logic
};
```

---

## 📊 Monitoring & Alerts

### 1. Set Up Health Checks

**Already implemented:** `/api/health` ✅

**Add to monitoring service:**
- Uptime Robot: https://www.bazaarmkt.ca/api/health
- Check every 5 minutes
- Alert if down for > 2 minutes

### 2. Error Tracking with Sentry

**Install:**
```bash
npm install @sentry/node --save
```

**File:** `backend/server-working.js` (After imports)

```javascript
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1 // Sample 10% of transactions
  });
  
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ... routes ...

// Error handler (at the end)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
```

### 3. Performance Monitoring

**Already implemented:** `PerformanceMonitor.jsx` ✅

**Add backend equivalent:**
```javascript
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    
    if (duration > 1000) {
      logger.warn('Slow request', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
});
```

---

## 🔒 Security Hardening

### 1. Secrets Rotation

**Before going live:**

| Secret | Action | Priority |
|--------|--------|----------|
| JWT_SECRET | Generate new 64-char random string | 🔴 CRITICAL |
| CRON_SECRET | Generate new 32-char random string | 🔴 CRITICAL |
| STRIPE Keys | Switch from test to live keys | 🔴 CRITICAL |
| MongoDB Password | Update to strong password | 🔴 CRITICAL |

**Generate secrets:**
```bash
# JWT Secret (64 characters)
openssl rand -base64 48

# Cron Secret (32 characters)
openssl rand -hex 32
```

### 2. Stripe Configuration

**Switch to Live Mode:**

1. Go to Stripe Dashboard → Developers → API Keys
2. Reveal live keys (need 2FA)
3. Copy:
   - Live Secret Key: `sk_live_...`
   - Live Publishable Key: `pk_live_...`
4. Set up webhooks for production:
   - URL: `https://www.bazaarmkt.ca/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.created`
   - Get webhook secret: `whsec_...`

### 3. HTTPS Enforcement

**File:** `backend/server-working.js` (After app initialization)

```javascript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

### 4. IP Whitelisting for Admin Routes

**File:** `backend/middleware/auth.js`

**Add to verifyAdminRole:**
```javascript
const verifyAdminRole = async (req, res, next) => {
  try {
    // ... existing auth logic ...
    
    // In production, you can add IP whitelist for extra security
    if (process.env.ADMIN_IP_WHITELIST) {
      const allowedIPs = process.env.ADMIN_IP_WHITELIST.split(',');
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      
      if (!allowedIPs.includes(clientIP)) {
        logger.warn('Admin access attempt from unauthorized IP', { ip: clientIP });
        return res.status(403).json({
          success: false,
          message: 'Access denied from this location'
        });
      }
    }
    
    // ... rest of logic ...
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 📝 Deployment Steps

### Phase 1: Preparation (2-3 days before)

#### Day -3: Code Cleanup
- [ ] Remove all console.log statements
- [ ] Remove debug routes
- [ ] Update hardcoded localhost URLs
- [ ] Run linter and fix all warnings
- [ ] Run all tests and ensure they pass

#### Day -2: Environment Setup
- [ ] Create production MongoDB database
- [ ] Run database initialization scripts
- [ ] Create all required indexes
- [ ] Set up Vercel Blob storage
- [ ] Configure Redis (if using)

#### Day -1: Testing
- [ ] Test locally with production environment variables
- [ ] Test payment flow with Stripe test mode
- [ ] Verify all email notifications work
- [ ] Test admin dashboard access
- [ ] Load test critical endpoints

### Phase 2: Deployment Day

#### Step 1: Create Vercel Project (30 minutes)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project (creates new project or links existing)
vercel link

# 4. Configure project settings
# Select framework: Other
# Set build command: npm run build:frontend
# Set output directory: frontend/dist
```

#### Step 2: Set Environment Variables (30 minutes)

```bash
# Set all backend variables
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add BREVO_API_KEY production
vercel env add BLOB_READ_WRITE_TOKEN production
vercel env add CRON_SECRET production

# Set all frontend variables
vercel env add VITE_API_URL production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_GOOGLE_MAPS_API_KEY production
vercel env add VITE_NODE_ENV production
```

**Or use Vercel Dashboard:**
1. Go to Project → Settings → Environment Variables
2. Add each variable one by one
3. Select "Production" environment
4. Save

#### Step 3: Deploy to Preview (15 minutes)

```bash
# Deploy to preview environment first
vercel

# This creates a preview URL like: bazaarmkt-xyz123.vercel.app
# Test thoroughly on preview
```

**Preview Testing Checklist:**
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Product browsing works
- [ ] Cart functionality works
- [ ] Checkout and payment works
- [ ] Email notifications sent
- [ ] Admin dashboard accessible
- [ ] All images load correctly

#### Step 4: Deploy to Production (5 minutes)

```bash
# If preview tests pass, deploy to production
vercel --prod

# This deploys to your production domain
```

#### Step 5: Configure Custom Domain (15 minutes)

**In Vercel Dashboard:**

1. Go to Project → Settings → Domains
2. Add domain: `www.bazaarmkt.ca`
3. Add domain: `bazaarmkt.ca` (redirect to www)
4. Vercel provides DNS configuration
5. Update your domain's DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel's IP)
   ```
6. Wait for DNS propagation (5-60 minutes)
7. Vercel automatically provisions SSL certificate

### Phase 3: Post-Deployment (Same day)

#### Immediate Verification (30 minutes)

- [ ] Visit https://www.bazaarmkt.ca
- [ ] Homepage loads with HTTPS
- [ ] Register new test account
- [ ] Place test order
- [ ] Verify email received
- [ ] Check MongoDB for test data
- [ ] Test admin login
- [ ] Verify cron jobs scheduled

#### Data Migration (If needed)

If you have existing users/orders in dev database:

```bash
# Export from development
mongodump --uri="mongodb+srv://dev-uri" --db=bazarmkt --out=backup/

# Import to production
mongorestore --uri="mongodb+srv://prod-uri" --db=bazarmkt backup/bazarmkt/
```

**⚠️ WARNING:** Only do this if you have real user data. Otherwise start fresh.

---

## 🔧 Code Changes Summary

### Files That MUST Be Changed

| File | Change | Lines | Priority |
|------|--------|-------|----------|
| `backend/server-working.js` | Update CORS origins | 49-56 | 🔴 CRITICAL |
| `backend/server-working.js` | Add Helmet security | After 31 | 🔴 CRITICAL |
| `backend/server-working.js` | HTTPS redirect | After 31 | 🔴 CRITICAL |
| `backend/middleware/errorHandler.js` | Hide stack traces | 85+ | 🔴 CRITICAL |
| `backend/routes/auth/index.js` | Add rate limiting | After imports | 🔴 CRITICAL |
| `backend/api/cron/*.js` | Add cron auth | Line 1 | 🔴 CRITICAL |
| `frontend/src/app.jsx` | Remove debug routes | 174-180 | 🟡 HIGH |
| All backend files | Replace console.log | Various | 🟡 HIGH |
| `backend/config/logger.js` | Create Winston logger | New file | 🟡 HIGH |
| `frontend/src/config/environment.js` | Already OK ✅ | - | - |
| `vercel.json` | Enhance configuration | All | 🟡 HIGH |

### Files That CAN Be Changed (Optional)

| File | Change | Priority |
|------|--------|----------|
| `backend/services/imageUploadService.js` | Add Vercel Blob support | 🟢 MEDIUM |
| `backend/server-working.js` | Increase connection pool | 🟢 MEDIUM |
| `backend/server-working.js` | Add performance monitoring | 🟢 MEDIUM |
| All routes | Add request logging | 🟢 LOW |

---

## 🧪 Pre-Production Testing Checklist

### Functional Testing

#### Authentication
- [ ] User registration works
- [ ] Email verification works (if implemented)
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works (if implemented)
- [ ] Admin login works
- [ ] JWT token refresh works

#### E-Commerce Flow
- [ ] Browse products
- [ ] Search products
- [ ] Add to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Checkout as guest
- [ ] Checkout as authenticated user
- [ ] Payment with Stripe succeeds
- [ ] Payment method saves (if checkbox checked)
- [ ] Order confirmation received
- [ ] Email notification sent
- [ ] Order appears in My Orders

#### Artisan Features
- [ ] Create artisan profile
- [ ] Add products
- [ ] Upload product images
- [ ] Set delivery options
- [ ] View incoming orders
- [ ] Confirm orders
- [ ] Update order status
- [ ] View wallet balance
- [ ] Configure payout settings

#### Admin Features
- [ ] Access admin dashboard
- [ ] View all users
- [ ] View all products
- [ ] View all artisans
- [ ] Update user roles
- [ ] Manage products
- [ ] View revenue reports
- [ ] Access platform settings

### Performance Testing

- [ ] Homepage loads in < 2 seconds
- [ ] Search results appear in < 1 second
- [ ] Cart operations are instant
- [ ] Checkout completes in < 5 seconds
- [ ] Image loading is optimized
- [ ] Mobile performance is acceptable

### Security Testing

- [ ] Cannot access admin routes without auth
- [ ] Cannot access other users' data
- [ ] SQL injection attempts fail
- [ ] XSS attempts blocked
- [ ] CSRF protection works
- [ ] Rate limiting prevents abuse
- [ ] File upload validation works

---

## 🚨 Rollback Plan

### If Deployment Fails

**Immediate Actions:**

1. **Revert to Previous Version**
   ```bash
   # Vercel maintains version history
   # Go to Deployments → Find previous working version → Promote to Production
   ```

2. **Check Logs**
   ```bash
   vercel logs <deployment-url> --follow
   ```

3. **Common Issues:**

   | Issue | Solution |
   |-------|----------|
   | Build fails | Check build logs, fix dependencies |
   | Functions timeout | Increase maxDuration in vercel.json |
   | Database connection fails | Verify MONGODB_URI is correct |
   | CORS errors | Check origin configuration |
   | Stripe errors | Verify live keys are set |

### Emergency Contacts

- **Technical Lead:** Your contact
- **MongoDB Support:** Atlas support chat
- **Vercel Support:** Vercel support chat (Pro plan)
- **Stripe Support:** Stripe dashboard support

---

## 📈 Post-Deployment Monitoring

### Week 1: Daily Monitoring

**Check These Metrics:**
- [ ] Error rate (should be < 1%)
- [ ] Response time (should be < 500ms average)
- [ ] Database connections (should not max out pool)
- [ ] Successful payments (should be 100% - failures are user errors)
- [ ] Email delivery rate (should be > 95%)
- [ ] Uptime (should be > 99.9%)

**Monitor These Logs:**
```bash
# View real-time logs
vercel logs --follow

# Filter for errors only
vercel logs --follow | grep "ERROR"

# Check specific function
vercel logs <function-url> --follow
```

### Week 2-4: Weekly Monitoring

- [ ] Review error logs weekly
- [ ] Check database size growth
- [ ] Monitor API usage
- [ ] Review performance metrics
- [ ] Check user feedback
- [ ] Verify cron jobs running

---

## 🎯 Production Deployment Checklist

### Pre-Deployment

#### Environment
- [ ] All environment variables set in Vercel
- [ ] Secrets rotated (new JWT_SECRET, etc.)
- [ ] Stripe switched to live mode
- [ ] MongoDB production database created
- [ ] Database indexes created
- [ ] Admin user created

#### Code
- [ ] Console.logs removed or replaced with logger
- [ ] Debug routes removed or gated
- [ ] CORS updated for production domains
- [ ] Security headers added (Helmet)
- [ ] HTTPS redirect implemented
- [ ] Error messages sanitized
- [ ] Rate limiting configured
- [ ] Cron jobs authenticated

#### Testing
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Payment flow tested (Stripe test mode)
- [ ] Email notifications tested
- [ ] Admin dashboard tested
- [ ] Mobile responsive checked

### Deployment

#### Vercel Setup
- [ ] Project created in Vercel
- [ ] Environment variables configured
- [ ] Build settings configured
- [ ] Custom domain added
- [ ] SSL certificate active

#### Deploy
- [ ] Preview deployment successful
- [ ] Preview fully tested
- [ ] Production deployment initiated
- [ ] Production deployment successful
- [ ] DNS updated and propagated
- [ ] HTTPS working on custom domain

### Post-Deployment

#### Verification
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] Login works
- [ ] Payment processing works
- [ ] Emails being sent
- [ ] Admin access works
- [ ] Cron jobs scheduled

#### Monitoring
- [ ] Health check endpoint responding
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Backup strategy implemented

---

## 🔄 Continuous Deployment

### Git Workflow

```bash
# Production branch
git checkout main

# Development branch
git checkout development

# Feature branches
git checkout -b feature/new-feature
```

### Vercel Auto-Deploy

**Configure in Vercel:**
- **Production Branch:** `main` → Auto-deploy to production
- **Preview Branches:** All other branches → Auto-deploy to preview URLs
- **Ignored Build Step:** Configure to skip builds for docs-only changes

**Settings:**
```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "development": false
    }
  }
}
```

---

## 📋 Environment Variable Reference

### Complete List for Vercel

#### Backend (Server-side)

```bash
# Required
MONGODB_URI=mongodb+srv://bazarmkt-prod:PASSWORD@cluster.mongodb.net/bazarmkt?retryWrites=true&w=majority
JWT_SECRET=<64-char-secret>
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
BREVO_API_KEY=xkeysib-...

# Highly Recommended
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
CRON_SECRET=<32-char-secret>
CORS_ORIGIN=https://www.bazaarmkt.ca
GOOGLE_MAPS_API_KEY=...
GEOCODING_API_KEY=...

# Optional
REDIS_URL=redis://...
REDIS_PORT=6379
UBER_DIRECT_CLIENT_ID=...
UBER_DIRECT_CLIENT_SECRET=...
UBER_DIRECT_CUSTOMER_ID=...
UBER_DIRECT_SERVER_TOKEN=...
SENTRY_DSN=https://...
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

#### Frontend (Build-time)

```bash
# Required
VITE_API_URL=https://www.bazaarmkt.ca/api
VITE_BASE_URL=https://www.bazaarmkt.ca
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_NODE_ENV=production

# Recommended
VITE_UPLOADS_URL=https://www.bazaarmkt.ca/api/upload
VITE_VERCEL_BLOB_DOMAIN=blob.vercel-storage.com
VITE_VERCEL_BLOB_URL=https://blob.vercel-storage.com
VITE_GOOGLE_MAPS_API_KEY=...
VITE_BREVO_API_KEY=xkeysib-...
```

---

## 🛡️ Security Best Practices

### 1. Never Commit Secrets

**Add to `.gitignore`:**
```
.env
.env.local
.env.production
.env.production.local
*.pem
*.key
secrets/
```

### 2. Use Vercel Environment Variables

**Never hardcode:**
- API keys
- Database passwords
- JWT secrets
- Stripe keys

**Always use:**
```javascript
process.env.VARIABLE_NAME
```

### 3. Implement Rate Limiting

**Already implemented** in middleware ✅

**Verify limits are appropriate:**
- Auth routes: 5 requests per 15 minutes
- API routes: 100 requests per 15 minutes
- Public routes: 1000 requests per 15 minutes

### 4. Enable Security Headers

**CSP, HSTS, X-Frame-Options** - Add via Helmet ✅

---

## 📞 Post-Launch Support Plan

### First 24 Hours: Active Monitoring

**Check Every Hour:**
- Error rate
- Payment success rate
- Email delivery
- Database performance
- API response times

**Be Ready To:**
- Roll back deployment
- Fix critical bugs
- Respond to user reports
- Scale resources if needed

### First Week: Daily Check-ins

**Review:**
- Error logs
- User feedback
- Performance metrics
- Database growth
- Costs

### Ongoing: Weekly Reviews

**Analyze:**
- Traffic patterns
- Popular features
- Error trends
- Performance bottlenecks
- User behavior

---

## 💰 Cost Estimates

### Vercel Costs

**Pro Plan:** ~$20/month
- Includes:
  - Custom domains
  - Team collaboration
  - Analytics
  - More bandwidth
  - Priority support

**Bandwidth:**
- Free tier: 100GB/month
- Overage: $40/TB

**Function Duration:**
- Free tier: 100GB-hours
- Overage: $0.18/GB-hour

**Serverless Functions:**
- Included in Pro plan
- No extra cost for API calls

### MongoDB Atlas Costs

**M2 Shared Cluster:** $9/month
- 2GB storage
- Shared RAM
- Good for up to ~1000 users

**M10 Dedicated:** $57/month
- 10GB storage
- 2GB RAM
- Good for production (recommended)

**M20 Dedicated:** $149/month
- 20GB storage
- 4GB RAM
- Good for scaling

### Third-Party Services

| Service | Cost | Purpose |
|---------|------|---------|
| Stripe | 2.9% + 30¢ per transaction | Payment processing |
| Brevo | Free up to 300 emails/day | Email notifications |
| Vercel Blob | $0.15/GB stored | Image storage |
| Google Maps | $200 free credit/month | Geocoding |
| Sentry | Free up to 5K events/month | Error tracking |

**Estimated Monthly Total:** $100-200/month (depending on usage)

---

## 🎓 Knowledge Transfer

### Key System Components

1. **Authentication Flow:** Uses JWT tokens stored in localStorage
2. **Payment Processing:** Stripe with manual capture → automatic transfer
3. **Email System:** Brevo for transactional emails
4. **File Storage:** Local in dev, Vercel Blob in production
5. **Database:** MongoDB Atlas with native driver (no Mongoose)
6. **Caching:** Redis (optional) + in-memory Map cache

### Critical Files to Understand

| File | Purpose | Importance |
|------|---------|------------|
| `backend/server-working.js` | Main server entry point | 🔴 Critical |
| `backend/routes/orders/index.js` | Order & payment logic | 🔴 Critical |
| `backend/routes/auth/index.js` | Authentication | 🔴 Critical |
| `backend/middleware/auth.js` | Auth middleware | 🔴 Critical |
| `frontend/src/contexts/AuthContext.jsx` | Auth state | 🔴 Critical |
| `frontend/src/components/Cart.jsx` | Checkout flow | 🔴 Critical |

### Emergency Procedures

**Database Issues:**
```bash
# Check connection
mongosh "mongodb+srv://cluster.mongodb.net" --username bazarmkt-prod

# View recent errors
db.getCollection('logs').find().sort({createdAt: -1}).limit(10)

# Check active connections
db.serverStatus().connections
```

**Vercel Issues:**
```bash
# View logs
vercel logs --follow

# Inspect deployment
vercel inspect <deployment-url>

# Redeploy same code
vercel --force
```

**Rollback:**
```bash
# Via CLI
vercel rollback

# Or via Dashboard
Deployments → Previous version → Promote to Production
```

---

## ✅ Final Pre-Launch Checklist

### Legal & Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy if using cookies
- [ ] GDPR compliance if EU users
- [ ] Payment processing disclosure
- [ ] Data retention policy

### Business Setup
- [ ] Stripe account verified
- [ ] Bank account for payouts connected
- [ ] Business email configured
- [ ] Support email configured (support@bazaarmkt.ca)
- [ ] Social media accounts created
- [ ] Domain email forwarding set up

### Technical
- [ ] SSL certificate active
- [ ] Domain DNS configured
- [ ] Email deliverability tested
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Error tracking active

### Content
- [ ] Homepage content finalized
- [ ] About page complete
- [ ] How It Works page complete
- [ ] FAQs written
- [ ] Contact information current
- [ ] Product categories defined

---

## 🎊 Launch Day Plan

### T-2 Hours: Final Prep
- [ ] Announce maintenance window (if migrating data)
- [ ] Export production database backup
- [ ] Verify all team members ready
- [ ] Test payment flow one final time

### T-1 Hour: Deploy
- [ ] Deploy to production: `vercel --prod`
- [ ] Verify deployment successful
- [ ] Check all environment variables loaded
- [ ] Test health endpoint

### T-0: Go Live
- [ ] Update DNS if needed
- [ ] Announce launch on social media
- [ ] Send announcement email (if mailing list)
- [ ] Monitor logs actively

### T+1 Hour: Verification
- [ ] Test complete user journey
- [ ] Verify emails being sent
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Be available for support

### T+4 Hours: First Check-in
- [ ] Review any errors
- [ ] Check user sign-ups
- [ ] Verify payments working
- [ ] Review performance metrics

### T+24 Hours: Day 1 Complete
- [ ] Comprehensive review of all metrics
- [ ] Address any issues found
- [ ] Plan fixes for non-critical issues
- [ ] Celebrate launch! 🎉

---

## 📖 Additional Resources

### Documentation to Review
- `ADMIN_FUNCTIONALITY_REPORT.md` - Admin features
- `PAYMENT_AND_NOTIFICATION_FIXES.md` - Payment flow
- `FINAL_EMAIL_NOTIFICATION_FLOW.md` - Email system
- `WALLET_IMPLEMENTATION_COMPLETE.md` - Wallet system

### External Documentation
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Brevo API Docs](https://developers.brevo.com)

---

## 🎯 Success Criteria

### Day 1
- ✅ Site is accessible at https://www.bazaarmkt.ca
- ✅ No critical errors in logs
- ✅ At least one test transaction completes successfully
- ✅ Emails are being delivered

### Week 1
- ✅ Uptime > 99.5%
- ✅ Average response time < 500ms
- ✅ No data loss incidents
- ✅ No security incidents
- ✅ User feedback positive

### Month 1
- ✅ All features working as expected
- ✅ Performance metrics stable
- ✅ Costs within budget
- ✅ User growth positive
- ✅ No major issues

---

**Status: READY FOR REVIEW**

This plan should be reviewed by all stakeholders before proceeding with production deployment.

**Next Steps:**
1. Review this plan with team
2. Schedule deployment date
3. Assign responsibilities
4. Begin code cleanup
5. Set up production services
6. Execute deployment

---

*Document prepared for BazaarMKT production launch*
*Review and update as needed before deployment*

