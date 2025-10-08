# 🚀 Pre-Deployment Checklist - BazaarMKT
## Updated: October 8, 2025

**Status:** ✅ READY FOR DEPLOYMENT

This document provides a streamlined checklist for deploying BazaarMKT to production on Vercel.

---

## ✅ Critical Security Fixes (COMPLETED)

### 1. CORS Configuration
- ✅ **COMPLETED** - Production-ready CORS with environment-based origins
- ✅ Supports `bazaarmkt.ca`, `www.bazaarmkt.ca`, and Vercel preview URLs
- ✅ Regex pattern for preview deployments
- **File:** `backend/server-working.js` (Lines 49-89)

### 2. Security Headers (Helmet)
- ✅ **COMPLETED** - Helmet middleware configured
- ✅ Content Security Policy (CSP) for Stripe, Google Maps, and Brevo
- ✅ HSTS with 1-year max-age
- ✅ XSS Protection and Frame Guard
- ✅ HTTPS redirect in production
- **Files:** `backend/server-working.js` (Lines 34-84)

### 3. Rate Limiting
- ✅ **COMPLETED** - Auth routes protected
- ✅ Login: 5 attempts per 15 minutes
- ✅ Registration: 3 accounts per hour per IP
- ✅ Password reset: 3 attempts per hour
- **File:** `backend/routes/auth/index.js` (Lines 15-49)

### 4. Cron Job Security
- ✅ **COMPLETED** - All cron endpoints secured
- ✅ Bearer token authentication required in production
- ✅ Uses `CRON_SECRET` environment variable
- **Files:** 
  - `backend/api/cron/payouts.js`
  - `backend/api/cron/inventory-restoration.js`
  - `backend/api/cron/auto-capture-payments.js`

### 5. Error Message Sanitization
- ✅ **COMPLETED** - Production errors sanitized
- ✅ Stack traces hidden in production
- ✅ Generic error messages for unknown errors
- ✅ Operational errors provide safe details
- **File:** `backend/middleware/errorHandler.js`

### 6. Debug Routes Removed
- ✅ **COMPLETED** - Debug routes gated behind development check
- ✅ Debug components only loaded in development mode
- ✅ Auth debug utilities conditional
- **File:** `frontend/src/app.jsx`

---

## 📋 Environment Variables Checklist

### Backend Variables (Required)

| Variable | Status | Priority | Notes |
|----------|--------|----------|-------|
| `MONGODB_URI` | ⚠️ Verify | 🔴 Critical | Production cluster connection string |
| `JWT_SECRET` | ⚠️ Verify | 🔴 Critical | Min 64 characters, rotated for production |
| `NODE_ENV` | ⚠️ Set to `production` | 🔴 Critical | Must be exactly "production" |
| `STRIPE_SECRET_KEY` | ⚠️ Use LIVE key | 🔴 Critical | sk_live_... (not test key) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Verify | 🔴 Critical | whsec_... from Stripe Dashboard |
| `BREVO_API_KEY` | ⚠️ Verify | 🔴 Critical | xkeysib-... for email notifications |
| `CRON_SECRET` | ⚠️ Generate new | 🔴 Critical | Random 32-char hex for cron auth |
| `CORS_ORIGIN` | ⚠️ Set | 🟡 High | https://www.bazaarmkt.ca |
| `GOOGLE_MAPS_API_KEY` | ⚠️ Verify | 🟡 High | For geocoding features |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ Verify | 🟡 High | Vercel Blob storage token |

### Frontend Variables (Required)

| Variable | Status | Priority | Notes |
|----------|--------|----------|-------|
| `VITE_API_URL` | ⚠️ Set | 🔴 Critical | https://www.bazaarmkt.ca/api |
| `VITE_BASE_URL` | ⚠️ Set | 🔴 Critical | https://www.bazaarmkt.ca |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ⚠️ Use LIVE key | 🔴 Critical | pk_live_... (not test key) |
| `VITE_NODE_ENV` | ⚠️ Set to `production` | 🔴 Critical | Must be "production" |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ Verify | 🟡 High | Same as backend key |

---

## 🔐 Security Audit

### Pre-Deployment Security Checklist

- [x] **CORS** - Production domains configured ✅
- [x] **Helmet** - Security headers active ✅
- [x] **Rate Limiting** - Auth routes protected ✅
- [x] **Cron Auth** - Endpoints secured ✅
- [x] **Error Sanitization** - Stack traces hidden ✅
- [x] **Debug Routes** - Removed from production ✅
- [ ] **Secrets Rotation** - Generate new JWT_SECRET and CRON_SECRET
- [ ] **Stripe Keys** - Switch from test to live mode
- [ ] **HTTPS** - SSL certificate active (automatic on Vercel)
- [ ] **Database** - Production cluster ready with indexes

---

## 🗄️ Database Preparation

### MongoDB Atlas Checklist

- [ ] **Production Cluster** - M10+ recommended for production
- [ ] **Database User** - Create dedicated user for production
- [ ] **IP Whitelist** - Configure for Vercel IPs (or allow all: 0.0.0.0/0)
- [ ] **Connection String** - Updated in MONGODB_URI
- [ ] **Indexes** - Created for all collections (see below)

### Required Database Indexes

```javascript
// Run these in MongoDB Atlas Data Explorer

// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ stripeCustomerId: 1 });

// Orders
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ artisan: 1, status: 1, createdAt: -1 });
db.orders.createIndex({ paymentIntentId: 1 });

// Products
db.products.createIndex({ artisan: 1, status: 1 });
db.products.createIndex({ category: 1, status: 1 });
db.products.createIndex({ status: 1, isFeatured: -1 });
db.products.createIndex({ name: 'text', description: 'text' });

// Artisans
db.artisans.createIndex({ user: 1 }, { unique: true });
db.artisans.createIndex({ isActive: 1, isVerified: 1 });
db.artisans.createIndex({ 'location.coordinates': '2dsphere' });

// Wallets
db.wallets.createIndex({ artisanId: 1 }, { unique: true });

// Notifications
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });
```

### Initialize Platform Settings

```bash
# Run this script to initialize platform settings
cd backend
node scripts/initialize-platform-settings.js
```

---

## 🚀 Deployment Steps

### Step 1: Verify Code Changes ✅

All critical code changes have been completed:

- ✅ CORS configuration updated
- ✅ Helmet security headers added
- ✅ Rate limiting implemented
- ✅ Cron job authentication added
- ✅ Error messages sanitized
- ✅ Debug routes removed

### Step 2: Generate Secrets

```bash
# Generate JWT Secret (64 characters)
openssl rand -base64 48
# Output: Copy to JWT_SECRET

# Generate Cron Secret (32 characters)
openssl rand -hex 32
# Output: Copy to CRON_SECRET
```

### Step 3: Update Environment Variables in Vercel

**Option A: Using Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Update all variables for "Production" environment
5. Redeploy if needed

**Option B: Using Vercel CLI**
```bash
# Update critical variables
vercel env add JWT_SECRET production
vercel env add CRON_SECRET production
vercel env add NODE_ENV production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

### Step 4: Verify Stripe Configuration

1. Go to https://dashboard.stripe.com
2. Switch to "Live Mode" (toggle in top-right)
3. Copy Live Keys:
   - Secret Key: sk_live_...
   - Publishable Key: pk_live_...
4. Configure Webhook:
   - URL: `https://www.bazaarmkt.ca/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy Webhook Secret: whsec_...
5. Update keys in Vercel environment variables

### Step 5: Test Locally with Production Config

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Frontend (in another terminal)
cd frontend
VITE_NODE_ENV=production npm run build
npm run preview
```

**Test Checklist:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Registration works
- [ ] Products display
- [ ] Cart functions
- [ ] Checkout works (use Stripe test card: 4242 4242 4242 4242)
- [ ] Emails send
- [ ] Admin dashboard accessible

### Step 6: Deploy to Preview

```bash
# Deploy to preview environment first
vercel

# This creates a preview URL: https://bazaarmkt-xxx.vercel.app
# Test thoroughly before promoting to production
```

### Step 7: Deploy to Production

```bash
# Only after preview testing passes
vercel --prod
```

### Step 8: Verify Production Deployment

```bash
# Check health endpoint
curl https://www.bazaarmkt.ca/api/health
# Expected: {"status":"OK","environment":"production",...}

# Check HTTPS redirect
curl -I http://www.bazaarmkt.ca
# Expected: 301 redirect to https://

# Check CORS headers
curl -I https://www.bazaarmkt.ca/api/health \
  -H "Origin: https://www.bazaarmkt.ca"
# Expected: Access-Control-Allow-Origin header present
```

---

## 📊 Post-Deployment Monitoring

### Immediate Checks (First Hour)

- [ ] Site accessible at https://www.bazaarmkt.ca
- [ ] SSL certificate active (🔒 in browser)
- [ ] Login/Registration working
- [ ] Place test order
- [ ] Verify email notification received
- [ ] Check error logs in Vercel dashboard
- [ ] Verify cron jobs scheduled

### First 24 Hours

- [ ] Monitor error rate (should be < 1%)
- [ ] Check response times (should be < 500ms avg)
- [ ] Verify all payments processing
- [ ] Monitor email delivery rate
- [ ] Check database performance
- [ ] Review user feedback

### Tools for Monitoring

**Vercel Dashboard:**
- Deployments → Functions → Logs
- Analytics → Performance metrics
- Deployments → Cron jobs

**MongoDB Atlas:**
- Metrics → Performance
- Real-time → Operations
- Alerts → Set up alerts for high CPU/memory

**Stripe Dashboard:**
- Payments → Check successful/failed
- Logs → API requests
- Webhooks → Delivery status

---

## 🆘 Rollback Plan

### If Deployment Fails

**Method 1: Vercel Dashboard Rollback**
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

**Method 2: CLI Rollback**
```bash
vercel rollback
```

**Method 3: Git Revert**
```bash
git revert HEAD
git push origin main
# Auto-deploys reverted code
```

---

## ✅ Pre-Flight Checklist

### Code ✅
- [x] Critical security fixes applied
- [x] Debug routes removed
- [x] Error handling production-ready
- [x] Rate limiting configured
- [x] CORS configured for production

### Environment ⚠️
- [ ] All environment variables set in Vercel
- [ ] JWT_SECRET rotated (new secret generated)
- [ ] CRON_SECRET generated
- [ ] Stripe switched to live mode
- [ ] NODE_ENV=production
- [ ] VITE_NODE_ENV=production

### Database ⚠️
- [ ] Production cluster created (M10+ recommended)
- [ ] Database indexes created
- [ ] Platform settings initialized
- [ ] Admin user created
- [ ] Connection string updated

### External Services ⚠️
- [ ] Stripe live mode activated
- [ ] Stripe webhook configured
- [ ] Brevo sender verified
- [ ] Google Maps API enabled
- [ ] Vercel Blob storage configured (optional)

### Testing ⚠️
- [ ] Local testing with production config passed
- [ ] Preview deployment tested
- [ ] All critical flows verified
- [ ] Payment flow tested
- [ ] Email notifications tested

---

## 📞 Support Contacts

### Service Providers

| Service | Support | Response Time |
|---------|---------|---------------|
| Vercel | Dashboard chat / support@vercel.com | < 4 hours (Pro) |
| MongoDB Atlas | Support chat | < 24 hours |
| Stripe | Dashboard support | < 24 hours |
| Brevo | support@brevo.com | < 48 hours |

### Emergency Procedures

**Database Issues:**
```bash
# Check connection
mongosh "mongodb+srv://..." --username prod-user
db.serverStatus().connections
```

**Vercel Issues:**
```bash
# View logs
vercel logs --follow

# Redeploy
vercel --prod --force
```

---

## 🎯 Success Criteria

### Deployment Successful When:

- ✅ Site loads at https://www.bazaarmkt.ca with HTTPS
- ✅ Users can register and login
- ✅ Orders can be placed and paid
- ✅ Emails are delivered
- ✅ Admin dashboard accessible
- ✅ No critical errors in logs (first hour)
- ✅ Response time < 1 second average
- ✅ Uptime > 99% (first 24 hours)

---

## 🎊 Ready for Deployment!

**Current Status:** 
- ✅ **Code Ready** - All critical security fixes complete
- ⚠️ **Environment** - Needs verification and updates
- ⚠️ **Database** - Needs setup and indexes
- ⚠️ **Testing** - Needs final verification

**Next Steps:**
1. ⚠️ Update all environment variables in Vercel
2. ⚠️ Rotate secrets (JWT_SECRET, CRON_SECRET)
3. ⚠️ Switch Stripe to live mode
4. ⚠️ Create database indexes
5. ⚠️ Test preview deployment
6. 🚀 Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Review Status:** Ready for team review and execution

---

*For detailed deployment guide, see: `/documentation/deployment/DEPLOYMENT_ROADMAP.md`*

