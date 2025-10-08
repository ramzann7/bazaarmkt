# 🚀 Final Deployment Checklist

**Project:** BazaarMKT  
**Date:** October 8, 2025  
**Status:** Ready for Deployment

---

## ✅ Pre-Deployment Completed

- [x] All code pushed to remote (20 commits)
- [x] Security headers implemented (Helmet)
- [x] CORS configuration ready
- [x] Error handling with production sanitization
- [x] Winston logger implemented
- [x] Cron job authentication configured
- [x] Rate limiting implemented
- [x] vercel.json configured

---

## 📝 Manual Steps Required

### 1. Vercel Login & Setup (5 minutes)

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Login to Vercel
npx vercel login

# Link project
npx vercel link
```

**Status:** [ ] Complete

---

### 2. Generate Secrets (2 minutes)

```bash
# Run the secret generator
./scripts/generate-secrets.sh

# Save the output securely - you'll need these for Step 3
```

**Generated Values:**
- [ ] JWT_SECRET saved
- [ ] CRON_SECRET saved

**Status:** [ ] Complete

---

### 3. Set Up External Services (30 minutes)

#### MongoDB Atlas
- [ ] Production cluster created: `bazarmkt-production`
- [ ] Database user created: `bazarmkt-prod`
- [ ] Network access configured: `0.0.0.0/0`
- [ ] Connection string obtained

**Connection String:**
```
mongodb+srv://bazarmkt-prod:PASSWORD@cluster0.xxxxx.mongodb.net/bazarmkt?retryWrites=true&w=majority
```

#### Stripe
- [ ] Switched to Live Mode
- [ ] Live API keys obtained:
  - [ ] Secret key: `sk_live_...`
  - [ ] Publishable key: `pk_live_...`
- [ ] Webhook configured: `https://www.bazaarmkt.ca/api/webhooks/stripe`
- [ ] Webhook secret obtained: `whsec_...`
- [ ] Events configured:
  - [ ] payment_intent.succeeded
  - [ ] payment_intent.payment_failed
  - [ ] payment_method.attached
  - [ ] customer.created
  - [ ] customer.updated

#### Brevo Email
- [ ] API key obtained: `xkeysib-...`
- [ ] Sender domain verified: `bazaarmkt.ca`
- [ ] Sender email configured: `orders@bazaarmkt.ca`

#### Vercel Blob (Optional but recommended)
- [ ] Blob store created: `bazaarmkt-images`
- [ ] Token obtained: `vercel_blob_rw_...`

#### Google Maps (Optional but recommended)
- [ ] APIs enabled: Maps, Geocoding, Places
- [ ] API key created and restricted
- [ ] Key obtained: `AIzaSy...`

**Status:** [ ] Complete

---

### 4. Add Environment Variables to Vercel (20 minutes)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

#### Backend Variables (Required)

```bash
MONGODB_URI                 = [from MongoDB Atlas]
JWT_SECRET                  = [generated in step 2]
NODE_ENV                    = production
STRIPE_SECRET_KEY           = [from Stripe - sk_live_...]
STRIPE_WEBHOOK_SECRET       = [from Stripe - whsec_...]
BREVO_API_KEY              = [from Brevo - xkeysib-...]
```

#### Backend Variables (Highly Recommended)

```bash
BLOB_READ_WRITE_TOKEN      = [from Vercel Blob]
CRON_SECRET                = [generated in step 2]
CORS_ORIGIN                = https://www.bazaarmkt.ca
GOOGLE_MAPS_API_KEY        = [from Google Cloud]
GEOCODING_API_KEY          = [from Google Cloud]
```

#### Frontend Variables (Required)

```bash
VITE_API_URL                      = https://www.bazaarmkt.ca/api
VITE_BASE_URL                     = https://www.bazaarmkt.ca
VITE_STRIPE_PUBLISHABLE_KEY       = [from Stripe - pk_live_...]
VITE_NODE_ENV                     = production
```

#### Frontend Variables (Recommended)

```bash
VITE_UPLOADS_URL              = https://www.bazaarmkt.ca/api/upload
VITE_GOOGLE_MAPS_API_KEY      = [same as backend]
```

**Checklist:**
- [ ] All required backend variables added (6)
- [ ] All required frontend variables added (4)
- [ ] Recommended variables added
- [ ] All variables set to "Production" environment
- [ ] No quotes around values
- [ ] No trailing spaces

**Status:** [ ] Complete

---

### 5. Set Up Production Database (10 minutes)

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend

# Create .env.production file with your production MONGODB_URI
echo "MONGODB_URI=your_production_uri_here" > .env.production

# Run complete database setup
NODE_ENV=production node scripts/complete-database-setup.js

# Should see:
# ✅ All indexes created successfully!
# ✅ Platform settings created successfully!
# ✅ Database setup verification complete!
```

**Checklist:**
- [ ] Database indexes created
- [ ] Platform settings initialized
- [ ] Setup verification passed

**Status:** [ ] Complete

---

### 6. Deploy to Preview (10 minutes)

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Deploy to preview
./scripts/deploy-preview.sh

# Or manually:
# npx vercel --yes
```

**You'll get a preview URL like:**
```
https://bazaarmkt-xxxx.vercel.app
```

**Checklist:**
- [ ] Preview deployment successful
- [ ] Preview URL obtained

**Status:** [ ] Complete

---

### 7. Test Preview Deployment (30 minutes)

**Test in Browser:**
Visit your preview URL and test:

- [ ] ✅ Homepage loads
- [ ] ✅ No console errors
- [ ] ✅ User registration works
- [ ] ✅ User login works
- [ ] ✅ Browse products page works
- [ ] ✅ Product details load
- [ ] ✅ Add to cart works
- [ ] ✅ Checkout page loads
- [ ] ✅ Can place test order (use Stripe test card: 4242 4242 4242 4242)
- [ ] ✅ Email notification received
- [ ] ✅ Order shows in My Orders
- [ ] ✅ Artisan dashboard loads
- [ ] ✅ Admin dashboard accessible

**Test via CLI:**
```bash
cd /Users/ramzan/Documents/bazaarMKT

# Verify deployment health
./scripts/verify-deployment.sh https://bazaarmkt-xxxx.vercel.app

# Check logs
npx vercel logs --yes
```

**Checklist:**
- [ ] All critical flows tested
- [ ] No errors in logs
- [ ] Performance acceptable (< 2s)

**Status:** [ ] Complete

---

### 8. Deploy to Production (5 minutes)

**⚠️ ONLY proceed if ALL preview tests passed!**

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Deploy to production
./scripts/deploy-production.sh

# Or manually:
# npx vercel --prod --yes
```

**Checklist:**
- [ ] Production deployment successful
- [ ] Production URL working

**Status:** [ ] Complete

---

### 9. Configure Custom Domain (15 minutes)

#### In Vercel Dashboard:
1. Go to: **Project → Settings → Domains**
2. Click **Add Domain**
3. Enter: `bazaarmkt.ca` and `www.bazaarmkt.ca`
4. Vercel will show DNS records needed

#### At Your Domain Registrar:
Add these DNS records:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Note:** DNS propagation can take 10 minutes to 24 hours

**Checklist:**
- [ ] Domain added in Vercel
- [ ] DNS records added at registrar
- [ ] Waiting for DNS propagation

**Status:** [ ] Complete

---

### 10. Verify Production Deployment (1 hour monitoring)

#### Immediate Checks

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Run verification script
./scripts/verify-deployment.sh https://www.bazaarmkt.ca

# Or manually:
curl https://www.bazaarmkt.ca/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

#### Browser Tests

Visit: `https://www.bazaarmkt.ca`

- [ ] ✅ Homepage loads with HTTPS
- [ ] ✅ SSL certificate valid
- [ ] ✅ No console errors
- [ ] ✅ User registration works
- [ ] ✅ User login works
- [ ] ✅ Place REAL test order with real payment
- [ ] ✅ Email notification received
- [ ] ✅ Order in admin dashboard
- [ ] ✅ Admin can manage users
- [ ] ✅ Artisan can see order

#### Monitor Logs

```bash
# Watch logs in real-time
npx vercel logs --prod --follow --yes
```

**Look for:**
- [ ] ✅ No errors
- [ ] ✅ API requests succeeding
- [ ] ✅ Database connections working
- [ ] ✅ Payments processing
- [ ] ✅ Emails sending

**Status:** [ ] Complete

---

### 11. Verify Cron Jobs (5 minutes)

#### In Vercel Dashboard:
- Go to: **Project → Settings → Cron Jobs**
- Verify:
  - [ ] `/api/cron/payouts` - Every Friday at 9 AM
  - [ ] `/api/cron/inventory-restoration` - Daily at 2 AM
  - [ ] `/api/cron/auto-capture-payments` - Every hour

#### Test Manually:
```bash
curl -X POST https://www.bazaarmkt.ca/api/cron/auto-capture-payments \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Should return success (not unauthorized)
```

**Status:** [ ] Complete

---

## 🎯 Deployment Success Criteria

### Must Achieve (Required)
- [ ] ✅ Site loads on https://www.bazaarmkt.ca
- [ ] ✅ Users can register and login
- [ ] ✅ Orders can be placed with real payments
- [ ] ✅ Email notifications delivered
- [ ] ✅ Admin dashboard accessible
- [ ] ✅ No critical errors in first hour
- [ ] ✅ HTTPS certificate valid
- [ ] ✅ Cron jobs scheduled

### Should Achieve (Recommended)
- [ ] ✅ Response time < 2 seconds
- [ ] ✅ Uptime > 99% (first 24h)
- [ ] ✅ At least 1 successful real order
- [ ] ✅ All test flows pass
- [ ] ✅ Logs clean (no errors)

### Nice to Have
- [ ] ✅ Response time < 1 second
- [ ] ✅ All optional features working (Maps, Blob)
- [ ] ✅ Monitoring set up (Sentry, etc.)

---

## 📊 Post-Deployment Tasks

### First Hour
- [ ] Monitor error rates (should be 0%)
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Keep logs window open

### First Day
- [ ] Check logs 3-4 times
- [ ] Verify cron jobs ran (check logs at scheduled times)
- [ ] Test from different devices/browsers
- [ ] Verify emails sending consistently

### First Week
- [ ] Daily log reviews
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Fix any non-critical issues
- [ ] Plan improvements

---

## 🚨 Rollback Plan

If something goes wrong:

```bash
# 1. List recent deployments
npx vercel ls --yes

# 2. Identify last working deployment
# 3. Promote previous deployment
npx vercel promote <deployment-url> --yes
```

---

## 📞 Emergency Contacts

### Service Support
- **Vercel:** support@vercel.com (< 4 hours response)
- **MongoDB:** support@mongodb.com (< 24 hours)
- **Stripe:** support@stripe.com (< 24 hours)
- **Brevo:** support@brevo.com (< 48 hours)

### Documentation
- `DEPLOYMENT_COMPLETION_GUIDE.md` - Detailed step-by-step guide
- `VERCEL_ENV_VARIABLES.md` - All environment variables
- `DEPLOYMENT_ROADMAP.md` - High-level overview
- `REQUIRED_CODE_CHANGES.md` - Code modifications

---

## ✅ Sign-Off

### Pre-Deployment Sign-Off
- [ ] All code changes reviewed
- [ ] All security measures implemented
- [ ] All services configured
- [ ] All environment variables set
- [ ] Database initialized
- [ ] Preview deployment tested
- **Signed:** _________________ **Date:** _________

### Post-Deployment Sign-Off
- [ ] Production deployment successful
- [ ] All tests passed
- [ ] Monitoring enabled
- [ ] No critical issues
- [ ] Ready for users
- **Signed:** _________________ **Date:** _________

---

## 🎊 Congratulations!

Once all checkboxes are marked, your deployment is complete! 🚀

**Next Steps:**
1. Announce the launch
2. Monitor closely for 24 hours
3. Collect user feedback
4. Plan next features
5. Celebrate! 🎉

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Created by:** AI Assistant  
**Status:** Ready for use

