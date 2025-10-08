# 🚀 BazaarMKT Deployment Completion Guide

## Current Status: ✅ Code Ready, Deployment in Progress

**Date:** October 8, 2025  
**Branch:** feature/serverless-microservices-dev-clean  
**Last Update:** Code pushed to remote, security implemented

---

## ✅ What's Already Complete

### Code Changes (100% Complete)
- ✅ Security headers implemented (Helmet middleware)
- ✅ CORS configuration ready
- ✅ Error handler with production sanitization
- ✅ Winston logger implemented
- ✅ Cron job authentication implemented
- ✅ HTTPS redirect configured
- ✅ Rate limiting implemented
- ✅ vercel.json configured for serverless deployment

### Git Status
- ✅ All 20 commits pushed to remote
- ✅ Working tree clean
- ✅ Branch: feature/serverless-microservices-dev-clean

---

## 📋 Remaining Steps

### Step 1: Login to Vercel and Link Project (5 minutes)

**You need to run:**
```bash
cd /Users/ramzan/Documents/bazaarMKT

# Login to Vercel (will open browser)
npx vercel login

# Link the project (first time only)
npx vercel link
```

**When prompted:**
- Set up and deploy? → **Yes**
- Which scope? → Select your Vercel account
- Link to existing project? → **No** (if first time) or **Yes** (if already exists)
- What's your project's name? → **bazaarmkt** or **bazaarmkt-production**
- In which directory is your code located? → **./** (press Enter)

---

### Step 2: Configure Environment Variables (20-30 minutes)

You have two options:

#### Option A: Via Vercel Dashboard (Recommended - Easier)

1. Go to: https://vercel.com/dashboard
2. Select your project (bazaarmkt)
3. Go to: **Settings** → **Environment Variables**
4. Add each variable from the list below
5. For each variable:
   - **Key:** Variable name (e.g., `MONGODB_URI`)
   - **Value:** Your actual value
   - **Environment:** Select **Production**
   - Click **Save**

#### Option B: Via CLI (Faster if you have values ready)

Create a file with your values first, then run:
```bash
cd /Users/ramzan/Documents/bazaarMKT

# For each variable, you'll be prompted to paste the value:
npx vercel env add MONGODB_URI production
npx vercel env add JWT_SECRET production
npx vercel env add STRIPE_SECRET_KEY production
# ... (continue for all variables)
```

#### Critical Environment Variables Required

**Backend (Minimum 6 required):**
```bash
1. MONGODB_URI          # Get from MongoDB Atlas → Connect
2. JWT_SECRET          # Generate: openssl rand -base64 48
3. NODE_ENV            # Value: production
4. STRIPE_SECRET_KEY   # Get from Stripe Dashboard (USE LIVE KEY)
5. STRIPE_WEBHOOK_SECRET # Get from Stripe Webhooks
6. BREVO_API_KEY       # Get from Brevo Dashboard
```

**Backend (Highly Recommended +5):**
```bash
7. BLOB_READ_WRITE_TOKEN  # Get from Vercel Blob Storage
8. CRON_SECRET           # Generate: openssl rand -hex 32
9. CORS_ORIGIN          # Value: https://www.bazaarmkt.ca
10. GOOGLE_MAPS_API_KEY  # Get from Google Cloud Console
11. GEOCODING_API_KEY    # Same as Google Maps or separate
```

**Frontend (Minimum 4 required):**
```bash
1. VITE_API_URL              # Value: https://www.bazaarmkt.ca/api
2. VITE_BASE_URL             # Value: https://www.bazaarmkt.ca
3. VITE_STRIPE_PUBLISHABLE_KEY # Get from Stripe (USE LIVE KEY)
4. VITE_NODE_ENV             # Value: production
```

**Frontend (Recommended +2):**
```bash
5. VITE_UPLOADS_URL          # Value: https://www.bazaarmkt.ca/api/upload
6. VITE_GOOGLE_MAPS_API_KEY  # Same as backend Google Maps key
```

**📖 Full details:** See `VERCEL_ENV_VARIABLES.md` for complete list

---

### Step 3: Set Up Production Database (15 minutes)

#### A. MongoDB Atlas Configuration

1. **Create Production Cluster** (if not already done)
   - Go to: https://cloud.mongodb.com
   - Create new cluster: `bazarmkt-production`
   - Tier: M10 or higher
   - Region: us-east-1 (same as Vercel)

2. **Create Database User**
   - Database Access → Add New Database User
   - Username: `bazarmkt-prod`
   - Password: [Generate strong password]
   - Role: Read and write to any database
   - **Save password securely!**

3. **Configure Network Access**
   - Network Access → Add IP Address
   - Allow access from anywhere: `0.0.0.0/0`
   - (Vercel uses dynamic IPs, so must allow all)

4. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string:
   ```
   mongodb+srv://bazarmkt-prod:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bazarmkt?retryWrites=true&w=majority
   ```
   - Replace `YOUR_PASSWORD` with actual password
   - This is your `MONGODB_URI`

#### B. Initialize Database (Run locally first)

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend

# Create .env.production with production MONGODB_URI
echo "MONGODB_URI=your_production_mongodb_uri_here" > .env.production

# Run initialization script
NODE_ENV=production node scripts/initialize-platform-settings.js

# Verify settings created
# Should see: "✅ Platform settings initialized successfully!"
```

#### C. Create Database Indexes

Run this in MongoDB Atlas Data Explorer or via MongoDB Compass:

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ stripeCustomerId: 1 }, { sparse: true });

// Orders
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ artisan: 1, status: 1, createdAt: -1 });
db.orders.createIndex({ paymentIntentId: 1 }, { sparse: true });

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
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
```

Or run the setup script:
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
NODE_ENV=production node scripts/setup-database.js
```

---

### Step 4: Configure External Services (20-30 minutes)

#### A. Stripe Live Mode Setup

1. **Switch to Live Mode**
   - Go to: https://dashboard.stripe.com
   - Toggle: **Test mode** → **Live mode**

2. **Get Live API Keys**
   - Developers → API Keys
   - Copy **Publishable key**: `pk_live_...` (for VITE_STRIPE_PUBLISHABLE_KEY)
   - Reveal **Secret key**: `sk_live_...` (for STRIPE_SECRET_KEY)

3. **Configure Webhook**
   - Developers → Webhooks → Add endpoint
   - URL: `https://www.bazaarmkt.ca/api/webhooks/stripe`
   - Events to send:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_method.attached`
     - `customer.created`
     - `customer.updated`
   - Get signing secret: `whsec_...` (for STRIPE_WEBHOOK_SECRET)

4. **Verify Business Info**
   - Settings → Business settings
   - Ensure all required information is complete

#### B. Brevo Email Service

1. **Get API Key**
   - Go to: https://app.brevo.com/settings/keys/api
   - Create new key: "BazaarMKT Production"
   - Copy: `xkeysib-...` (for BREVO_API_KEY)

2. **Verify Sender Domain**
   - Senders & IP → Domains
   - Add domain: `bazaarmkt.ca`
   - Add DNS records (provided by Brevo)
   - Wait for verification (can take 24-48 hours)

3. **Configure Sender Email**
   - Set default sender: `orders@bazaarmkt.ca`
   - Or: `noreply@bazaarmkt.ca`

#### C. Vercel Blob Storage (for image uploads)

1. **Create Blob Store**
   - Vercel Dashboard → Storage → Create
   - Store name: `bazaarmkt-images`
   - Region: Same as functions (us-east-1)

2. **Get Token**
   - Click on store → Settings → Tokens
   - Create new token with read/write access
   - Copy: `vercel_blob_rw_...` (for BLOB_READ_WRITE_TOKEN)

#### D. Google Maps API (Optional but recommended)

1. **Enable APIs**
   - Go to: https://console.cloud.google.com
   - Enable: Maps JavaScript API
   - Enable: Geocoding API
   - Enable: Places API

2. **Create API Key**
   - APIs & Services → Credentials → Create Credentials → API Key
   - Restrict key to your domain: `https://www.bazaarmkt.ca/*`
   - Copy key: `AIzaSy...` (for GOOGLE_MAPS_API_KEY and GEOCODING_API_KEY)

---

### Step 5: Deploy to Preview (10 minutes)

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Deploy to preview environment (NOT production yet)
npx vercel --yes

# Wait for deployment to complete
# You'll get a preview URL like: https://bazaarmkt-xxxx.vercel.app
```

**Test the preview deployment:**

1. **Health Check**
   ```bash
   curl https://bazaarmkt-xxxx.vercel.app/api/health
   # Should return: {"status":"OK","timestamp":"..."}
   ```

2. **Test in Browser**
   - Visit: `https://bazaarmkt-xxxx.vercel.app`
   - Homepage should load
   - Try to register a user
   - Try to browse products
   - Try to login

3. **Check Logs**
   ```bash
   npx vercel logs --yes
   # Look for any errors
   ```

---

### Step 6: Test Critical Flows in Preview (30 minutes)

Use the preview URL to test:

- [ ] ✅ Homepage loads without errors
- [ ] ✅ User registration works
- [ ] ✅ User login works
- [ ] ✅ Browse products page works
- [ ] ✅ Product detail pages load
- [ ] ✅ Add to cart works
- [ ] ✅ Checkout page loads
- [ ] ✅ Can process a test payment (use Stripe test cards)
- [ ] ✅ Email notification sent after order
- [ ] ✅ Artisan dashboard loads
- [ ] ✅ Admin dashboard accessible
- [ ] ✅ Admin can manage users

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

### Step 7: Deploy to Production (5 minutes)

**Only proceed if all preview tests pass!**

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Deploy to production
npx vercel --prod --yes

# Wait for deployment to complete
# You'll get the production URL
```

**Verify production deployment:**
```bash
# Check health
curl https://www.bazaarmkt.ca/api/health

# Check logs
npx vercel logs --prod --yes
```

---

### Step 8: Configure Custom Domain (15 minutes)

#### Via Vercel Dashboard

1. Go to: Project Settings → Domains
2. Click **Add Domain**
3. Enter: `bazaarmkt.ca` and `www.bazaarmkt.ca`
4. Vercel will show DNS records you need to add

#### Update DNS (at your domain registrar)

Add these records to your DNS:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

```
Type: A
Name: @
Value: 76.76.21.21
```

**DNS propagation takes 10 minutes to 24 hours**

---

### Step 9: Post-Deployment Verification (1 hour monitoring)

#### Immediate Checks (within 5 minutes)

```bash
# 1. Health check
curl https://www.bazaarmkt.ca/api/health

# 2. Check environment loaded
curl https://www.bazaarmkt.ca/api/config/status
# Should NOT expose secrets, just status

# 3. Test authentication
curl -X POST https://www.bazaarmkt.ca/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

#### Browser Tests (within 30 minutes)

Visit: `https://www.bazaarmkt.ca`

- [ ] Homepage loads with HTTPS
- [ ] No console errors (open DevTools)
- [ ] Can register new user
- [ ] Can login
- [ ] Place a test order with real payment
- [ ] Verify email notification received
- [ ] Verify order appears in admin dashboard
- [ ] Check cron jobs are scheduled in Vercel

#### Monitor for 1 hour

```bash
# Watch logs in real-time
npx vercel logs --prod --follow --yes
```

Look for:
- ✅ No errors
- ✅ API requests completing successfully
- ✅ Database connections working
- ✅ Payment processing working
- ✅ Emails sending

---

### Step 10: Enable Cron Jobs

Vercel cron jobs should be automatically scheduled based on `vercel.json`.

**Verify in Vercel Dashboard:**
1. Project → Settings → Cron Jobs
2. Should see:
   - `/api/cron/payouts` - Every Friday at 9 AM
   - `/api/cron/inventory-restoration` - Daily at 2 AM
   - `/api/cron/auto-capture-payments` - Every hour

**Test cron jobs manually:**
```bash
curl -X POST https://www.bazaarmkt.ca/api/cron/auto-capture-payments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 Success Criteria

### Must Achieve Before Considering Deployment Successful

- ✅ Site loads on https://www.bazaarmkt.ca
- ✅ No critical errors in logs for first hour
- ✅ Users can register and login
- ✅ Orders can be placed with real payments
- ✅ Email notifications are delivered
- ✅ Admin dashboard is accessible
- ✅ Response time < 2 seconds (average)

### Monitor for First 24 Hours

- [ ] Uptime > 99%
- [ ] Error rate < 2%
- [ ] All cron jobs run successfully
- [ ] At least 1 successful test order
- [ ] No security issues detected

---

## 🚨 If Something Goes Wrong

### Rollback Procedure

```bash
# 1. List recent deployments
npx vercel ls --yes

# 2. Identify working deployment URL
# 3. Promote previous deployment to production
npx vercel promote <deployment-url> --yes

# Or redeploy previous version
git checkout <previous-commit>
npx vercel --prod --yes
```

### Check Logs

```bash
# Real-time logs
npx vercel logs --prod --follow --yes

# Filter for errors
npx vercel logs --prod --yes | grep -i error

# Check specific endpoint
npx vercel logs --prod --yes | grep "/api/orders"
```

### Common Issues

1. **"Cannot connect to database"**
   - Check MONGODB_URI is set correctly
   - Verify MongoDB Atlas network access allows Vercel IPs (0.0.0.0/0)
   - Check database user credentials

2. **"CORS errors"**
   - Verify CORS_ORIGIN is set to production domain
   - Check vercel.json routes configuration

3. **"Images not loading"**
   - Verify BLOB_READ_WRITE_TOKEN is set
   - Check Vercel Blob store is created
   - Ensure upload endpoints work

4. **"Payments failing"**
   - Verify using LIVE Stripe keys (not test)
   - Check STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
   - Verify webhook endpoint is reachable

5. **"Emails not sending"**
   - Check BREVO_API_KEY is correct
   - Verify sender domain is verified in Brevo
   - Check ENABLE_EMAIL_NOTIFICATIONS=true

---

## 📞 Support Resources

### Documentation
- Vercel Deployment: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Stripe API: https://stripe.com/docs/api
- Brevo API: https://developers.brevo.com

### Your Documentation
- `VERCEL_ENV_VARIABLES.md` - All environment variables
- `DEPLOYMENT_ROADMAP.md` - High-level deployment plan
- `PRODUCTION_DEPLOYMENT_PLAN.md` - Detailed deployment steps
- `REQUIRED_CODE_CHANGES.md` - Code modifications reference

---

## ✅ Deployment Completion Checklist

Use this as your final checklist:

### Pre-Deployment
- [x] Code pushed to remote
- [x] Security implemented
- [x] Error handling configured
- [ ] Vercel CLI logged in
- [ ] Project linked to Vercel

### Configuration
- [ ] All environment variables added to Vercel
- [ ] Production database created
- [ ] Database indexes created
- [ ] Platform settings initialized
- [ ] Stripe live mode configured
- [ ] Brevo email configured
- [ ] Vercel Blob storage created (optional)

### Deployment
- [ ] Preview deployment successful
- [ ] Preview tests passed
- [ ] Production deployment successful
- [ ] Custom domain configured
- [ ] DNS records updated

### Verification
- [ ] Health check returns OK
- [ ] Homepage loads
- [ ] User registration works
- [ ] Login works
- [ ] Orders can be placed
- [ ] Payments process successfully
- [ ] Emails are delivered
- [ ] Admin dashboard accessible
- [ ] No critical errors in logs

### Post-Deployment
- [ ] Monitoring enabled
- [ ] Cron jobs scheduled
- [ ] First hour of monitoring complete
- [ ] Documentation updated
- [ ] Team notified

---

## 🎯 Your Next Action

**Right now, you should:**

1. **Login to Vercel**
   ```bash
   cd /Users/ramzan/Documents/bazaarMKT
   npx vercel login
   ```

2. **Link your project**
   ```bash
   npx vercel link
   ```

3. **Add environment variables** (see Step 2)

4. **Then come back and let me know**, and I'll help you with the next steps!

---

**Status:** Ready for manual deployment steps  
**Prepared:** October 8, 2025  
**Your Code:** Pushed and ready at `feature/serverless-microservices-dev-clean`

Good luck! 🚀

