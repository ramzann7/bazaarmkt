# 🚀 Production Deployment - Quick Start Guide

## For Immediate Action

This is your step-by-step checklist to deploy BazaarMKT to production.

---

## ⚡ Critical Path (Must Do First)

### Step 1: Code Changes (2-3 hours)

Run these commands to make critical security fixes:

```bash
cd /Users/ramzan/Documents/bazaarMKT
```

#### 1.1 Update CORS (15 min)

**File:** `backend/server-working.js` line 49

Replace the cors configuration with production-ready version (see REQUIRED_CODE_CHANGES.md section 1)

#### 1.2 Add Security Headers (15 min)

**File:** `backend/server-working.js` after line 31

Add Helmet middleware (see REQUIRED_CODE_CHANGES.md section 2)

#### 1.3 Add Rate Limiting (20 min)

**File:** `backend/routes/auth/index.js` after imports

Add rate limiters (see REQUIRED_CODE_CHANGES.md section 5)

#### 1.4 Secure Cron Jobs (15 min)

**Files:** `backend/api/cron/*.js` at the beginning

Add authentication check (see REQUIRED_CODE_CHANGES.md section 4)

#### 1.5 Sanitize Errors (30 min)

**File:** `backend/middleware/errorHandler.js`

Add production error sanitization (see REQUIRED_CODE_CHANGES.md section 3)

### Step 2: Environment Variables (1 hour)

#### 2.1 Generate Secrets

```bash
# Generate JWT Secret
openssl rand -base64 48
# Save output as JWT_SECRET

# Generate Cron Secret
openssl rand -hex 32
# Save output as CRON_SECRET
```

#### 2.2 Collect All Credentials

Create a secure document with these values:

```
MongoDB URI: mongodb+srv://...
JWT Secret: [generated above]
Cron Secret: [generated above]
Stripe Live Secret: sk_live_...
Stripe Live Publishable: pk_live_...
Stripe Webhook Secret: whsec_...
Brevo API Key: xkeysib-...
Google Maps Key: AIzaSy...
```

**Get credentials from:**
- MongoDB: https://cloud.mongodb.com
- Stripe: https://dashboard.stripe.com/apikeys
- Brevo: https://app.brevo.com/settings/keys/api
- Google Maps: https://console.cloud.google.com/apis/credentials

### Step 3: Set Up Vercel (30 min)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project (in your project directory)
cd /Users/ramzan/Documents/bazaarMKT
vercel link

# Add environment variables (use VERCEL_ENV_VARIABLES.md)
# Backend variables
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add NODE_ENV production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add BREVO_API_KEY production
vercel env add CRON_SECRET production
vercel env add CORS_ORIGIN production

# Frontend variables
vercel env add VITE_API_URL production
vercel env add VITE_BASE_URL production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
vercel env add VITE_NODE_ENV production
```

### Step 4: Deploy to Preview (15 min)

```bash
# Build and deploy to preview
vercel

# You'll get a URL like: https://bazaarmkt-xyz.vercel.app
# Test this URL thoroughly before going to production
```

### Step 5: Test Preview (1 hour)

**Complete these tests on preview URL:**

- [ ] Homepage loads
- [ ] Register new account
- [ ] Login with account
- [ ] Browse products
- [ ] Add to cart
- [ ] Complete checkout (use Stripe test card: 4242 4242 4242 4242)
- [ ] Verify email notification received
- [ ] Login as admin (if you have admin account)
- [ ] View admin dashboard

**If all tests pass → Proceed to Step 6**  
**If any test fails → Fix issues and redeploy preview**

### Step 6: Deploy to Production (15 min)

```bash
# Deploy to production
vercel --prod

# Configure custom domain (in Vercel Dashboard)
# Settings → Domains → Add domain: www.bazaarmkt.ca
```

### Step 7: Post-Deployment Verification (30 min)

```bash
# Check health
curl https://www.bazaarmkt.ca/api/health

# Should return: {"status":"OK","timestamp":"..."}
```

**Test on production:**
- [ ] Visit https://www.bazaarmkt.ca
- [ ] Register test account
- [ ] Place test order
- [ ] Verify email sent
- [ ] Check admin access

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] Critical security fixes applied (Step 1)
- [ ] No exposed secrets in code
- [ ] Error handling production-ready

### Services Configured
- [ ] MongoDB Atlas production cluster created
- [ ] Stripe account in live mode
- [ ] Brevo sender verified
- [ ] Vercel Blob storage created (optional)
- [ ] Google Maps API enabled

### Environment Variables
- [ ] All backend vars in Vercel (min 8 critical)
- [ ] All frontend vars in Vercel (min 4 critical)
- [ ] Secrets are strong and new
- [ ] Test keys replaced with live keys

### Testing
- [ ] Preview deployment tested
- [ ] Payment flow works
- [ ] Emails delivered
- [ ] Admin access works

### Documentation
- [ ] Deployment plan reviewed
- [ ] Team understands rollback procedure
- [ ] Support contacts documented

---

## ⚠️ Common Issues & Solutions

### Issue: Build Fails

**Check:**
```bash
# Verify package.json exists
ls -la frontend/package.json

# Check build command
cd frontend && npm run build
```

**Fix:** Ensure all dependencies installed

### Issue: API Returns 500 Errors

**Check:**
```bash
# View Vercel logs
vercel logs --follow

# Look for:
# - Database connection errors
# - Missing environment variables
# - Undefined variables
```

**Fix:** Verify all environment variables are set correctly

### Issue: CORS Errors

**Check browser console:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix:** Update CORS_ORIGIN in Vercel environment variables

### Issue: Stripe Not Working

**Check:**
- Using LIVE keys (sk_live_, pk_live_)
- Webhook endpoint configured
- Webhook secret matches

**Fix:** Verify Stripe configuration in Vercel

### Issue: No Emails Sent

**Check backend logs:**
```
⚠️ BREVO_API_KEY not configured
```

**Fix:** Add BREVO_API_KEY to Vercel environment variables

---

## 🆘 Emergency Rollback

If something breaks in production:

```bash
# Method 1: Quick rollback via CLI
vercel rollback

# Method 2: Promote previous deployment
# 1. Go to Vercel Dashboard → Deployments
# 2. Find last working deployment
# 3. Click "..." → Promote to Production

# Method 3: Emergency revert
git revert HEAD
git push origin main
# Auto-deploys reverted code
```

---

## ⏱️ Time Estimates

| Phase | Task | Time | Can Skip? |
|-------|------|------|-----------|
| **Prep** | Critical code changes | 2-3 hours | ❌ NO |
| **Prep** | Collect credentials | 1 hour | ❌ NO |
| **Prep** | Set up Vercel | 30 min | ❌ NO |
| **Deploy** | Preview deployment | 15 min | ❌ NO |
| **Deploy** | Test preview | 1 hour | ❌ NO |
| **Deploy** | Production deployment | 15 min | ❌ NO |
| **Deploy** | Verify production | 30 min | ❌ NO |
| **Optional** | Winston logger | 3-4 hours | ✅ Yes (later) |
| **Optional** | Remove debug routes | 10 min | ✅ Yes |
| **Optional** | Vercel Blob | 1-2 hours | ✅ Yes (if not uploading files) |

**Total Minimum Time:** ~6 hours  
**Total with Optional:** ~12 hours

---

## 🎯 Today's Action Items

If deploying today, do this:

### Morning (3-4 hours)
1. ✅ Make critical code changes
2. ✅ Commit and push to GitHub
3. ✅ Collect all credentials
4. ✅ Set up Vercel project

### Afternoon (2-3 hours)
5. ✅ Configure environment variables
6. ✅ Deploy to preview
7. ✅ Test preview deployment
8. ✅ Fix any issues found

### Evening (1-2 hours)
9. ✅ Deploy to production
10. ✅ Configure custom domain
11. ✅ Test production deployment
12. ✅ Monitor for first 2 hours

---

## ✅ Quick Wins (Do These Now)

These take < 30 minutes total and significantly improve production readiness:

### 1. Add NODE_ENV Check (5 min)

**File:** `backend/server-working.js` (after line 1)

```javascript
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}
```

### 2. Add Health Check Logging (5 min)

**File:** `backend/server-working.js` (line 123)

```javascript
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: db ? 'connected' : 'disconnected'
  };
  res.json(health);
});
```

### 3. Add Deployment Info (5 min)

**File:** `frontend/src/components/Footer.jsx`

```javascript
{process.env.NODE_ENV === 'development' && (
  <div className="text-xs text-gray-400 mt-2">
    Build: {import.meta.env.MODE} | 
    API: {import.meta.env.VITE_API_URL}
  </div>
)}
```

### 4. Add Error Boundary (10 min)

**File:** `frontend/src/app.jsx` (wrap Routes)

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Then wrap your routes:
<ErrorBoundary>
  <Routes>
    {/* ... all routes ... */}
  </Routes>
</ErrorBoundary>
```

---

## 🎊 You're Ready When...

### All These Are True

✅ Critical code changes committed  
✅ All environment variables documented  
✅ Credentials collected and secured  
✅ Vercel project created  
✅ Preview deployment successful  
✅ Preview testing complete  
✅ Team understands rollback procedure  
✅ Monitoring configured  
✅ Support plan in place

**Then:** Execute production deployment with confidence! 🚀

---

## 📞 Need Help?

### Reference Documents
- **Overall Strategy:** PRODUCTION_DEPLOYMENT_PLAN.md
- **Code Changes:** REQUIRED_CODE_CHANGES.md
- **Environment Vars:** VERCEL_ENV_VARIABLES.md
- **Timeline:** DEPLOYMENT_ROADMAP.md

### Support Channels
- **Vercel:** https://vercel.com/support
- **MongoDB:** https://cloud.mongodb.com/support
- **Stripe:** https://support.stripe.com

---

**Last Updated:** October 8, 2025  
**Next Step:** Review with team and schedule deployment

---

*Good luck with your deployment! 🎉*

