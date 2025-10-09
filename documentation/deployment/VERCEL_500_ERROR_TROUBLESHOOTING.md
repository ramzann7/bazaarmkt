# 🔴 Vercel 500 Error - API Troubleshooting Guide

**Date:** October 9, 2025  
**Issue:** All API endpoints returning 500 Internal Server Error  
**Status:** Frontend deployed ✅ | API failing ❌

---

## 🚨 Current Errors

### Failing Endpoints:
```
❌ GET /api/community/posts - 500 Error
❌ GET /api/products/popular - 500 Error
❌ GET /api/products/featured - 500 Error
❌ GET /api/promotional/products/featured - 500 Error
```

---

## 🔍 Root Cause Analysis

### Most Likely Causes (in order):

1. **Missing Environment Variables** ⚠️ (90% likely)
   - `MONGODB_URI` not set in Vercel
   - Database connection failing

2. **Cold Start Issues** ⚠️
   - Database not pre-warming properly
   - First request timeout

3. **Missing Dependencies**
   - Backend modules not bundled correctly

4. **Serverless Function Timeout**
   - Functions timing out before response

---

## ✅ Solution: Environment Variables

### Check Vercel Dashboard:

**Go to:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### Required Variables:

| Variable | Type | Value | Status |
|----------|------|-------|--------|
| `MONGODB_URI` | Secret | mongodb+srv://... | ❓ CHECK |
| `JWT_SECRET` | Secret | your-secret-key | ❓ CHECK |
| `NODE_ENV` | Plain | production | ✅ Set in vercel.json |
| `STRIPE_SECRET_KEY` | Secret | sk_live_... | ❓ CHECK |
| `BREVO_API_KEY` | Secret | xkeysib-... | ❓ CHECK |
| `BLOB_READ_WRITE_TOKEN` | Secret | vercel_blob_rw_... | ❓ CHECK |

### How to Add:

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Click "Add New"
5. Enter:
   - **Key:** `MONGODB_URI`
   - **Value:** Your MongoDB connection string
   - **Environments:** Production, Preview, Development (select all)
6. Click "Save"
7. **Redeploy** (required for env vars to take effect)

---

## 🔧 Quick Fix Steps

### Step 1: Add MongoDB URI

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazarmkt?retryWrites=true&w=majority
```

**Important:** 
- Use your actual MongoDB Atlas connection string
- Include database name: `/bazarmkt`
- No quotes needed in Vercel dashboard

### Step 2: Add JWT Secret

```
JWT_SECRET=your-super-secret-key-change-this-in-production
```

### Step 3: Add Stripe Keys (if using payments)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Step 4: Redeploy

After adding environment variables:
- Click "Deployments" tab
- Find latest deployment
- Click "..." menu
- Click "Redeploy"

**OR**

- Make any small change to code
- Push to GitHub
- Vercel auto-deploys

---

## 📊 Verify Environment Variables

### Check if Variables Are Set:

Create a test endpoint (temporarily):

```javascript
// In api/index.js
app.get('/api/env-check', (req, res) => {
  res.json({
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    mongoUriPreview: process.env.MONGODB_URI ? 
      `mongodb+srv://***@${process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'unknown'}` : 
      'NOT SET'
  });
});
```

Visit: `https://www.bazaarmkt.ca/api/env-check`

**Expected Response:**
```json
{
  "hasMongoUri": true,
  "hasJwtSecret": true,
  "nodeEnv": "production",
  "mongoUriPreview": "mongodb+srv://***@cluster.mongodb.net"
}
```

---

## 🔍 Check Vercel Logs

### View Function Logs:

1. Go to Vercel Dashboard
2. Click on your project
3. Click "Deployments"
4. Click on the latest deployment
5. Click "Functions" tab
6. Click on `api/index.js`
7. View logs

### Look For:

```
❌ MongoDB connection error
❌ MONGODB_URI is undefined
❌ Error connecting to database
❌ Timeout connecting to database
❌ Authentication failed
```

---

## 🐛 Common Errors & Solutions

### Error 1: "MONGODB_URI is undefined"

**Solution:** Add MONGODB_URI to Vercel environment variables

### Error 2: "Authentication failed"

**Solution:** Check MongoDB Atlas:
- Database user exists
- Password is correct
- IP whitelist includes 0.0.0.0/0 (for Vercel)

### Error 3: "Connection timeout"

**Solution:** 
- Check MongoDB Atlas network access
- Add 0.0.0.0/0 to IP whitelist
- Ensure cluster is not paused

### Error 4: "Cannot find module"

**Solution:**
- Check api/package.json includes all backend dependencies
- Redeploy

---

## 📝 MongoDB Atlas Configuration

### Network Access:

1. Go to MongoDB Atlas
2. Click "Network Access" (left sidebar)
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere"
5. Add: `0.0.0.0/0` with description "Vercel Serverless"
6. Click "Confirm"

### Database User:

1. Go to "Database Access"
2. Ensure user has "Read and Write" permissions
3. Username and password match MONGODB_URI

---

## 🔄 Database Connection Check

### Test Connection Locally:

```bash
cd backend
node -e "
const { MongoClient } = require('mongodb');
const uri = 'YOUR_MONGODB_URI';
MongoClient.connect(uri)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

---

## 📊 Vercel Function Configuration

### Current Setup (vercel.json):

```json
{
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

**Status:** ✅ Correctly configured

---

## 🎯 Action Plan

### Immediate Actions:

1. ✅ **Add MONGODB_URI to Vercel**
   - Dashboard → Settings → Environment Variables
   - Add MONGODB_URI with your connection string
   - Select all environments

2. ✅ **Add JWT_SECRET to Vercel**
   - Same process as above

3. ✅ **Verify MongoDB Atlas Network Access**
   - Ensure 0.0.0.0/0 is whitelisted

4. ✅ **Redeploy**
   - Deployments → Redeploy
   - Wait for completion

5. ✅ **Test API**
   - Visit: https://www.bazaarmkt.ca/api/health
   - Should return 200 OK

### If Still Failing:

6. ✅ **Check Vercel Function Logs**
   - Dashboard → Functions → api/index.js
   - Look for specific error messages

7. ✅ **Test Specific Endpoint**
   - Try: /api/products/featured
   - Check error message

8. ✅ **Verify Database Connection String**
   - Ensure it includes database name
   - Format: `mongodb+srv://user:pass@cluster.net/DATABASE_NAME`

---

## 🔐 Security Checklist

- [ ] MONGODB_URI marked as "Secret" in Vercel
- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB Atlas user has minimum required permissions
- [ ] API keys (Stripe, Brevo) marked as "Secret"
- [ ] No sensitive data in logs

---

## 📞 Quick Support

### If You're Stuck:

1. **Check Vercel Logs** - Most errors show here
2. **MongoDB Atlas Status** - Check if cluster is running
3. **Environment Variables** - Verify all are set correctly
4. **Redeploy** - After any changes to env vars

---

## ✅ Success Indicators

After fixing, you should see:

```
✅ Frontend loads
✅ API health check returns 200
✅ Products load on homepage
✅ No 500 errors in console
✅ Database queries working
```

---

**Status:** Troubleshooting in progress  
**Next Step:** Add environment variables to Vercel  
**Priority:** HIGH - Production down


