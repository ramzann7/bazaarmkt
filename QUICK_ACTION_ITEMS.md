# ⚡ Quick Action Items - What You Need To Do

**Date:** October 9, 2025  
**Priority:** Before deploying to Vercel production

---

## ✅ Code Fixes (ALL DONE)

All code issues have been fixed. Nothing for you to do here. ✅

---

## ⚠️ USER ACTIONS REQUIRED (2 items)

### 1. Update Brevo API Key (5 minutes)

**Why:** Current key returns 401 Unauthorized

**Steps:**
```bash
# 1. Get new API key
Visit: https://app.brevo.com/settings/keys/api
Click: "Generate a new API Key"
Name: "BazaarMKT Production"
Copy: xkeysib-...

# 2. Update backend
cd /Users/ramzan/Documents/bazaarMKT/backend
# Edit .env and update:
BREVO_API_KEY=xkeysib-YOUR_NEW_KEY

# 3. Update frontend
cd /Users/ramzan/Documents/bazaarMKT/frontend
# Edit .env and update:
VITE_BREVO_API_KEY=xkeysib-YOUR_NEW_KEY

# 4. Restart servers
pkill -f node
# Backend
cd /Users/ramzan/Documents/bazaarMKT/backend && npm run dev &
# Frontend
cd /Users/ramzan/Documents/bazaarMKT/frontend && npm run dev &
```

### 2. Configure Vercel Blob Storage (10 minutes)

**Why:** File uploads won't work without it (filesystem is read-only)

**Steps:**
```bash
# 1. Create Blob Store
Visit: https://vercel.com/dashboard
Go to: Storage tab
Click: "Create Database" → "Blob"
Name: bazaarmkt-uploads
Region: Washington, D.C., USA (iad1)

# 2. Get Token
Click on your new blob store
Go to: Settings tab
Click: "Create Token"
Access: Read and Write
Copy: vercel_blob_rw_...

# 3. Add to Vercel Environment Variables
Visit: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
Add:
  - Name: BLOB_READ_WRITE_TOKEN
  - Value: vercel_blob_rw_YOUR_TOKEN
  - Environment: Production, Preview, Development
  
# 4. Add to local .env for testing
cd /Users/ramzan/Documents/bazaarMKT/backend
echo "BLOB_READ_WRITE_TOKEN=vercel_blob_rw_YOUR_TOKEN" >> .env
```

---

## 🚀 Then Deploy (5 minutes)

```bash
cd /Users/ramzan/Documents/bazaarMKT

# Commit all changes
git add .
git commit -m "fix: Complete serverless optimization for Vercel

- Remove serverless-incompatible code (Map cache, compression, filesystem)
- Optimize database pooling (maxPoolSize: 1)
- Fix cold start issues with pre-warming
- Fix frontend modal/popup distortions
- Fix guest order delivery address and storage
- Add Vercel Blob integration
- Complete monorepo configuration"

# Push to GitHub
git push origin main

# Vercel will auto-deploy OR manually deploy:
vercel --prod
```

---

## 📋 Deployment Checklist

Before deploying:

- [ ] ✅ Code fixes complete (already done)
- [ ] Update Brevo API key in .env files
- [ ] Update Brevo API key in Vercel dashboard
- [ ] Create Vercel Blob store
- [ ] Add BLOB_READ_WRITE_TOKEN to Vercel
- [ ] Test locally: `vercel dev`
- [ ] Commit all changes
- [ ] Push to GitHub
- [ ] Monitor deployment logs
- [ ] Test health endpoint
- [ ] Test guest order flow
- [ ] Verify emails send

---

## ✅ Quick Verification

After deployment, test:

```bash
# 1. Health check
curl https://your-url.vercel.app/api/health
# Should show: {"status":"OK","database":{"connected":true}}

# 2. Profile API (with auth token)
curl -H "Authorization: Bearer TOKEN" \
  https://your-url.vercel.app/api/auth/profile
# Should return user profile

# 3. Place test guest order
# - No 401 errors from Brevo
# - Email received
# - Delivery address shows correctly
```

---

## 📚 Documentation Reference

**Quick Start:** `/documentation/deployment/VERCEL_QUICK_FIX_SUMMARY.md`  
**Complete Guide:** `/documentation/deployment/VERCEL_DEPLOYMENT_GUIDE.md`  
**Serverless Fixes:** `/documentation/deployment/SERVERLESS_FIXES_COMPLETE.md`  
**All Issues:** `/documentation/FINAL_SESSION_SUMMARY.md`

---

## 🎯 Summary

**Code:** ✅ All fixed  
**Brevo Key:** ⚠️ Update required  
**Vercel Blob:** ⚠️ Setup required  
**Documentation:** ✅ Complete  
**Deploy:** 🚀 Ready after 2 actions

**Time Needed:** ~20 minutes for both actions

---

**Created:** October 9, 2025  
**Next Step:** Update Brevo API key (5 min) → Configure Vercel Blob (10 min) → Deploy! 🚀


