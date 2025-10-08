# Vercel Environment Variables Configuration

## Complete Guide for BazaarMKT Production Deployment

---

## 🚀 Quick Setup

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: Settings → Environment Variables
4. Add each variable below
5. Select "Production" for environment
6. Click "Save"

### Option 2: Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Add each variable (you'll be prompted for value)
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
# ... (repeat for each variable below)
```

---

## 📋 Backend Environment Variables

Copy these into Vercel **one by one**. Replace placeholder values with your actual credentials.

### 🔴 CRITICAL - Required for Application to Function

```bash
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
# Your MongoDB Atlas connection string
# Get from: MongoDB Atlas → Connect → Connect your application
MONGODB_URI
# Value: mongodb+srv://bazarmkt-prod:YOUR_PASSWORD@cluster0.mongodb.net/bazarmkt?retryWrites=true&w=majority


# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================
# Secret key for JWT token signing (generate with: openssl rand -base64 48)
# MUST be at least 64 characters for security
JWT_SECRET
# Value: [Generate using: openssl rand -base64 48]
# Example: kJ8n3H9mP2vL5xQ4wR7yT0uI6oS1dF3gH8jK2lM9nB5vC4xZ7aQ2wE6rT9yU3iO1p


# ============================================================================
# APPLICATION ENVIRONMENT
# ============================================================================
NODE_ENV
# Value: production


# ============================================================================
# STRIPE PAYMENT PROCESSING
# ============================================================================
# Stripe SECRET key (server-side only) - USE LIVE KEY FOR PRODUCTION
# Get from: Stripe Dashboard → Developers → API Keys
STRIPE_SECRET_KEY
# Value: sk_live_YOUR_LIVE_SECRET_KEY

# Stripe Webhook Secret for verifying webhook signatures
# Get from: Stripe Dashboard → Developers → Webhooks → Add endpoint
# Endpoint URL: https://www.bazaarmkt.ca/api/webhooks/stripe
STRIPE_WEBHOOK_SECRET
# Value: whsec_YOUR_WEBHOOK_SECRET


# ============================================================================
# EMAIL NOTIFICATIONS (BREVO)
# ============================================================================
# Brevo API Key for sending transactional emails
# Get from: https://app.brevo.com/settings/keys/api
BREVO_API_KEY
# Value: xkeysib-YOUR_API_KEY


```

### 🟡 HIGHLY RECOMMENDED - For Full Functionality

```bash
# ============================================================================
# FILE STORAGE (VERCEL BLOB)
# ============================================================================
# Token for uploading images to Vercel Blob storage
# Get from: Vercel Dashboard → Storage → Create Store → Get Token
BLOB_READ_WRITE_TOKEN
# Value: vercel_blob_rw_YOUR_TOKEN


# ============================================================================
# CRON JOB SECURITY
# ============================================================================
# Secret for authenticating cron job requests
# Generate with: openssl rand -hex 32
CRON_SECRET
# Value: [Generate using: openssl rand -hex 32]


# ============================================================================
# CORS & SECURITY
# ============================================================================
# Allowed origin for CORS (your production frontend URL)
CORS_ORIGIN
# Value: https://www.bazaarmkt.ca


# ============================================================================
# GOOGLE SERVICES
# ============================================================================
# Google Maps JavaScript API Key
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY
# Value: AIzaSy_YOUR_GOOGLE_MAPS_KEY

# Geocoding API Key (can be same as Google Maps)
GEOCODING_API_KEY
# Value: AIzaSy_YOUR_GEOCODING_KEY


# ============================================================================
# REDIS CACHE (Optional but recommended)
# ============================================================================
# Redis connection URL for caching
# Get from: Upstash, Redis Cloud, or self-hosted
REDIS_URL
# Value: redis://default:PASSWORD@HOST:PORT

REDIS_PORT
# Value: 6379


```

### 🟢 OPTIONAL - Enhanced Features

```bash
# ============================================================================
# UBER DIRECT (Professional Delivery)
# ============================================================================
# Only needed if using Uber Direct for professional delivery
UBER_DIRECT_CLIENT_ID
# Value: YOUR_CLIENT_ID

UBER_DIRECT_CLIENT_SECRET
# Value: YOUR_CLIENT_SECRET

UBER_DIRECT_CUSTOMER_ID
# Value: YOUR_CUSTOMER_ID

UBER_DIRECT_SERVER_TOKEN
# Value: YOUR_SERVER_TOKEN

UBER_DIRECT_BASE_URL
# Value: https://api.uber.com


# ============================================================================
# MONITORING & ERROR TRACKING
# ============================================================================
# Sentry DSN for error tracking
# Get from: https://sentry.io → Create Project → Get DSN
SENTRY_DSN
# Value: https://YOUR_KEY@YOUR_PROJECT.ingest.sentry.io/YOUR_ID

# New Relic License Key (if using New Relic)
NEW_RELIC_LICENSE_KEY
# Value: YOUR_LICENSE_KEY


# ============================================================================
# LOGGING & DEBUGGING
# ============================================================================
# Logging level: error, warn, info, debug
LOG_LEVEL
# Value: info


# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_EMAIL_NOTIFICATIONS
# Value: true

ENABLE_SMS_NOTIFICATIONS
# Value: false

ENABLE_PUSH_NOTIFICATIONS
# Value: false

ENABLE_ANALYTICS
# Value: true


# ============================================================================
# RATE LIMITING
# ============================================================================
RATE_LIMIT_WINDOW_MS
# Value: 900000

RATE_LIMIT_MAX_REQUESTS
# Value: 100


# ============================================================================
# SECURITY
# ============================================================================
BCRYPT_ROUNDS
# Value: 12

# Optional: IP whitelist for admin access (comma-separated)
ADMIN_IP_WHITELIST
# Value: 1.2.3.4,5.6.7.8


```

---

## 🎨 Frontend Environment Variables

Copy these into Vercel for the **frontend build environment**.

### 🔴 CRITICAL - Required

```bash
# ============================================================================
# API CONFIGURATION
# ============================================================================
# Your production API URL
VITE_API_URL
# Value: https://www.bazaarmkt.ca/api

# Base URL for your application
VITE_BASE_URL
# Value: https://www.bazaarmkt.ca


# ============================================================================
# STRIPE (PUBLIC KEY)
# ============================================================================
# Stripe PUBLISHABLE key (client-side) - USE LIVE KEY FOR PRODUCTION
# Get from: Stripe Dashboard → Developers → API Keys
VITE_STRIPE_PUBLISHABLE_KEY
# Value: pk_live_YOUR_LIVE_PUBLISHABLE_KEY


# ============================================================================
# ENVIRONMENT
# ============================================================================
VITE_NODE_ENV
# Value: production


```

### 🟡 HIGHLY RECOMMENDED

```bash
# ============================================================================
# FILE UPLOADS
# ============================================================================
# URL for uploaded images
VITE_UPLOADS_URL
# Value: https://www.bazaarmkt.ca/api/upload

# Vercel Blob configuration
VITE_VERCEL_BLOB_DOMAIN
# Value: blob.vercel-storage.com

VITE_VERCEL_BLOB_URL
# Value: https://blob.vercel-storage.com


# ============================================================================
# GOOGLE MAPS (CLIENT-SIDE)
# ============================================================================
# Same API key as backend (if same project)
VITE_GOOGLE_MAPS_API_KEY
# Value: AIzaSy_YOUR_GOOGLE_MAPS_KEY


# ============================================================================
# BREVO (CLIENT-SIDE - Optional)
# ============================================================================
# Only if frontend needs direct Brevo access
VITE_BREVO_API_KEY
# Value: xkeysib-YOUR_API_KEY


```

---

## 🔑 How to Generate Secrets

### JWT Secret (64+ characters)
```bash
openssl rand -base64 48
```

### Cron Secret (32+ characters)
```bash
openssl rand -hex 32
```

### Session Secret
```bash
openssl rand -base64 32
```

---

## 🧪 Testing Environment Variables

### How to Test Locally with Production Config

**Create:** `backend/.env.production.local`

```bash
# Copy all production values here for local testing
# This file should NOT be committed (.gitignore it)

NODE_ENV=production
MONGODB_URI=mongodb+srv://test-prod:password@cluster.mongodb.net/bazarmkt-test
JWT_SECRET=test-secret-at-least-64-chars-long-for-production-simulation
# ... etc
```

**Run:**
```bash
# Load production config locally
NODE_ENV=production node backend/server-working.js
```

---

## 📊 Environment Variable Checklist

### Before Deploying to Vercel

#### Backend Variables (19 critical + optional)
- [ ] MONGODB_URI
- [ ] JWT_SECRET
- [ ] NODE_ENV
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] BREVO_API_KEY
- [ ] BLOB_READ_WRITE_TOKEN
- [ ] CRON_SECRET
- [ ] CORS_ORIGIN
- [ ] GOOGLE_MAPS_API_KEY
- [ ] GEOCODING_API_KEY
- [ ] REDIS_URL (optional)
- [ ] REDIS_PORT (optional)
- [ ] SENTRY_DSN (optional)
- [ ] LOG_LEVEL
- [ ] RATE_LIMIT_WINDOW_MS
- [ ] RATE_LIMIT_MAX_REQUESTS
- [ ] BCRYPT_ROUNDS
- [ ] ENABLE_EMAIL_NOTIFICATIONS

#### Frontend Variables (9 required)
- [ ] VITE_API_URL
- [ ] VITE_BASE_URL
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] VITE_NODE_ENV
- [ ] VITE_UPLOADS_URL
- [ ] VITE_VERCEL_BLOB_DOMAIN
- [ ] VITE_VERCEL_BLOB_URL
- [ ] VITE_GOOGLE_MAPS_API_KEY
- [ ] VITE_BREVO_API_KEY (optional)

---

## 🎯 Configuration by Service

### MongoDB Atlas Setup

1. **Create Production Cluster**
   - Cluster Name: `bazarmkt-production`
   - Region: Same as Vercel function region (US East recommended)
   - Tier: M10 or higher for production

2. **Create Database User**
   ```
   Username: bazarmkt-prod
   Password: [Generate strong password]
   Database: bazarmkt
   Role: Read and write to any database
   ```

3. **Network Access**
   - Allow access from anywhere: `0.0.0.0/0` (Vercel IPs are dynamic)
   - Or add Vercel's IP ranges if available

4. **Get Connection String**
   ```
   mongodb+srv://bazarmkt-prod:PASSWORD@cluster0.mongodb.net/bazarmkt?retryWrites=true&w=majority
   ```

### Stripe Setup

1. **Switch to Live Mode**
   - Toggle from Test to Live in Stripe Dashboard

2. **Get Live API Keys**
   - Secret Key: `sk_live_...`
   - Publishable Key: `pk_live_...`

3. **Configure Webhooks**
   - URL: `https://www.bazaarmkt.ca/api/webhooks/stripe`
   - Events to send:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_method.attached`
     - `customer.created`
     - `customer.updated`
   - Get webhook secret: `whsec_...`

4. **Verify Business Info**
   - Business name: BazaarMKT
   - Business address: [Your address]
   - Support email: support@bazaarmkt.ca
   - Statement descriptor: "BAZAARMKT"

### Brevo Email Setup

1. **Get API Key**
   - Go to: https://app.brevo.com/settings/keys/api
   - Create new key: "BazaarMKT Production"
   - Copy: `xkeysib-...`

2. **Verify Sender Domain**
   - Add domain: `bazaarmkt.ca`
   - Verify DNS records
   - Wait for verification

3. **Configure Sender Email**
   - From email: `orders@bazaarmkt.ca`
   - From name: `BazaarMKT`

4. **Set Up Templates (Optional)**
   - Create email templates in Brevo
   - Use template IDs in code

### Vercel Blob Setup

1. **Create Blob Store**
   - Go to: Vercel Dashboard → Storage → Create
   - Store name: `bazaarmkt-images`
   - Region: Same as functions

2. **Get Token**
   - Click on store → Settings
   - Create token with read/write access
   - Copy: `vercel_blob_rw_...`

### Google Maps API Setup

1. **Enable APIs**
   - Go to: https://console.cloud.google.com
   - Enable: Maps JavaScript API
   - Enable: Geocoding API
   - Enable: Places API

2. **Create API Key**
   - Credentials → Create Credentials → API Key
   - Restrict key to your domain: `https://www.bazaarmkt.ca/*`
   - Copy key: `AIzaSy...`

---

## 📝 Environment Variables Template

### For Copy-Paste into Vercel

**Backend Variables (paste into text editor, fill in values, then add to Vercel):**

```ini
# === CRITICAL === 
MONGODB_URI=mongodb+srv://bazarmkt-prod:YOUR_DB_PASSWORD@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority
JWT_SECRET=GENERATE_WITH_openssl_rand_base64_48
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_LIVE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
BREVO_API_KEY=xkeysib-YOUR_BREVO_API_KEY

# === HIGHLY RECOMMENDED ===
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_YOUR_BLOB_TOKEN
CRON_SECRET=GENERATE_WITH_openssl_rand_hex_32
CORS_ORIGIN=https://www.bazaarmkt.ca
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_KEY
GEOCODING_API_KEY=AIzaSy_YOUR_GEOCODING_KEY

# === OPTIONAL ===
REDIS_URL=redis://default:PASSWORD@HOST:PORT
REDIS_PORT=6379
SENTRY_DSN=https://KEY@PROJECT.ingest.sentry.io/ID
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
ENABLE_EMAIL_NOTIFICATIONS=true
UBER_DIRECT_CLIENT_ID=YOUR_UBER_CLIENT_ID
UBER_DIRECT_CLIENT_SECRET=YOUR_UBER_CLIENT_SECRET
UBER_DIRECT_CUSTOMER_ID=YOUR_UBER_CUSTOMER_ID
UBER_DIRECT_SERVER_TOKEN=YOUR_UBER_SERVER_TOKEN
UBER_DIRECT_BASE_URL=https://api.uber.com
```

**Frontend Variables (paste into text editor, fill in values, then add to Vercel):**

```ini
# === CRITICAL ===
VITE_API_URL=https://www.bazaarmkt.ca/api
VITE_BASE_URL=https://www.bazaarmkt.ca
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_LIVE_PUBLISHABLE_KEY
VITE_NODE_ENV=production

# === HIGHLY RECOMMENDED ===
VITE_UPLOADS_URL=https://www.bazaarmkt.ca/api/upload
VITE_VERCEL_BLOB_DOMAIN=blob.vercel-storage.com
VITE_VERCEL_BLOB_URL=https://blob.vercel-storage.com
VITE_GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_GOOGLE_MAPS_KEY

# === OPTIONAL ===
VITE_BREVO_API_KEY=xkeysib_YOUR_BREVO_API_KEY
```

---

## 🔍 Validation

### After Adding All Variables

**Check in Vercel Dashboard:**

1. Go to: Settings → Environment Variables
2. Verify count:
   - Backend: At least 6 required variables
   - Frontend: At least 4 required variables

3. For each variable:
   - ✅ Value is not empty
   - ✅ No leading/trailing spaces
   - ✅ Environment is set to "Production"
   - ✅ No quotes around values (Vercel adds them automatically)

**Test Deployment:**
```bash
# Deploy to preview first
vercel

# Check if environment variables loaded
# Visit: https://preview-url.vercel.app/api/health
# Should return: { status: "OK", timestamp: "..." }

# If health check fails, variables might not be loaded
vercel logs --follow
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Including Quotes
```bash
# WRONG
MONGODB_URI="mongodb+srv://..."

# RIGHT
MONGODB_URI=mongodb+srv://...
```
*Vercel adds quotes automatically*

### ❌ Mistake 2: Trailing Whitespace
```bash
# WRONG
JWT_SECRET=abc123   

# RIGHT
JWT_SECRET=abc123
```
*Trim all values*

### ❌ Mistake 3: Using Test Keys in Production
```bash
# WRONG
STRIPE_SECRET_KEY=sk_test_...

# RIGHT
STRIPE_SECRET_KEY=sk_live_...
```
*Use LIVE keys for production*

### ❌ Mistake 4: Wrong Environment Selection
- Make sure "Production" is selected when adding variables
- Not "Preview" or "Development"

### ❌ Mistake 5: Missing VITE_ Prefix
```bash
# WRONG (frontend var without prefix)
API_URL=https://...

# RIGHT
VITE_API_URL=https://...
```
*Frontend vars MUST start with VITE_*

---

## 🔐 Security Checklist

### Before Adding Variables

- [ ] Generate new JWT_SECRET (don't reuse from dev)
- [ ] Generate new CRON_SECRET
- [ ] Use Stripe LIVE keys (not test)
- [ ] Verify MongoDB password is strong
- [ ] Don't copy secrets from git history
- [ ] Don't share secrets in Slack/email
- [ ] Use Vercel's encrypted storage

### After Adding Variables

- [ ] Verify no variables exposed in frontend bundle
- [ ] Check Vercel doesn't print secrets in logs
- [ ] Ensure STRIPE_SECRET_KEY is in backend only
- [ ] Confirm JWT_SECRET is in backend only
- [ ] Test that API works with new secrets

---

## 📲 Quick Copy-Paste for CLI

### Set All Critical Backend Variables

```bash
#!/bin/bash
# Run this script to add all critical backend variables
# Replace YOUR_* placeholders before running

vercel env add MONGODB_URI production
# Paste: mongodb+srv://bazarmkt-prod:YOUR_DB_PASSWORD@cluster0.mongodb.net/bazarmkt?retryWrites=true&w=majority

vercel env add JWT_SECRET production
# Paste: [Generated secret from openssl rand -base64 48]

vercel env add NODE_ENV production
# Paste: production

vercel env add STRIPE_SECRET_KEY production
# Paste: sk_live_YOUR_LIVE_SECRET_KEY

vercel env add STRIPE_WEBHOOK_SECRET production
# Paste: whsec_YOUR_WEBHOOK_SECRET

vercel env add BREVO_API_KEY production
# Paste: xkeysib-YOUR_BREVO_API_KEY

vercel env add BLOB_READ_WRITE_TOKEN production
# Paste: vercel_blob_rw_YOUR_TOKEN

vercel env add CRON_SECRET production
# Paste: [Generated secret from openssl rand -hex 32]

vercel env add CORS_ORIGIN production
# Paste: https://www.bazaarmkt.ca

vercel env add GOOGLE_MAPS_API_KEY production
# Paste: AIzaSy_YOUR_GOOGLE_MAPS_KEY

echo "✅ All backend variables added!"
```

### Set All Critical Frontend Variables

```bash
#!/bin/bash
# Run this script to add all critical frontend variables

vercel env add VITE_API_URL production
# Paste: https://www.bazaarmkt.ca/api

vercel env add VITE_BASE_URL production
# Paste: https://www.bazaarmkt.ca

vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Paste: pk_live_YOUR_LIVE_PUBLISHABLE_KEY

vercel env add VITE_NODE_ENV production
# Paste: production

vercel env add VITE_UPLOADS_URL production
# Paste: https://www.bazaarmkt.ca/api/upload

vercel env add VITE_GOOGLE_MAPS_API_KEY production
# Paste: AIzaSy_YOUR_GOOGLE_MAPS_KEY

echo "✅ All frontend variables added!"
```

---

## 🔄 Update Variables

### How to Update an Existing Variable

**Via Dashboard:**
1. Settings → Environment Variables
2. Find variable → Click Edit
3. Update value
4. Save
5. **Redeploy for changes to take effect:**
   ```bash
   vercel --prod
   ```

**Via CLI:**
```bash
# Remove old value
vercel env rm VARIABLE_NAME production

# Add new value
vercel env add VARIABLE_NAME production

# Redeploy
vercel --prod
```

---

## 🎓 Variable Naming Conventions

### Backend Variables
- Use UPPERCASE_SNAKE_CASE
- No special characters except underscore
- Descriptive names
- Group related variables

**Examples:**
```bash
✅ MONGODB_URI
✅ JWT_SECRET
✅ STRIPE_SECRET_KEY
✅ ENABLE_EMAIL_NOTIFICATIONS

❌ mongodb_uri (lowercase)
❌ jwt-secret (hyphens)
❌ STRIPE_KEY (not specific enough)
```

### Frontend Variables
- Must start with `VITE_`
- Use UPPERCASE_SNAKE_CASE after prefix
- Keep names consistent with backend where applicable

**Examples:**
```bash
✅ VITE_API_URL
✅ VITE_STRIPE_PUBLISHABLE_KEY
✅ VITE_GOOGLE_MAPS_API_KEY

❌ API_URL (missing VITE_ prefix)
❌ VITE_api_url (not uppercase)
❌ VITE-API-URL (hyphens not allowed)
```

---

## 📖 Reference URLs

### Get Your Credentials

| Service | URL to Get Credentials |
|---------|------------------------|
| MongoDB Atlas | https://cloud.mongodb.com → Clusters → Connect |
| Stripe | https://dashboard.stripe.com/apikeys |
| Brevo | https://app.brevo.com/settings/keys/api |
| Google Maps | https://console.cloud.google.com/apis/credentials |
| Vercel Blob | https://vercel.com/dashboard → Storage |
| Sentry | https://sentry.io → Settings → Projects → [Your Project] → Client Keys (DSN) |

---

## ✅ Pre-Deployment Verification

### Run These Checks

```bash
# 1. Verify all required variables are set
vercel env ls

# 2. Check variable count
# Should see: ~15-20 backend vars, ~6-10 frontend vars

# 3. Verify no duplicates
# Each variable should appear once per environment

# 4. Check for typos
# Variable names must match exactly what code expects

# 5. Test in preview deployment
vercel
# Test preview URL thoroughly before going to production
```

---

**Last Updated:** October 8, 2025  
**Next Review:** Before production deployment

---

*Keep this document updated as you add new services or features*

