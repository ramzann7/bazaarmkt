# 🚨 Vercel Function Crash - Quick Fix Guide

**Error:** `500: INTERNAL_SERVER_ERROR - FUNCTION_INVOCATION_FAILED`

**Cause:** The serverless function is crashing - most likely missing environment variables!

---

## ✅ **IMMEDIATE FIX**

Your app deployed successfully, but it needs environment variables to run. Here's what to do:

### **Step 1: Add Critical Environment Variables**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

**Add these MINIMUM required variables:**

```bash
# Database (CRITICAL)
MONGODB_URI = mongodb+srv://your-username:your-password@cluster.mongodb.net/bazarmkt

# Authentication (CRITICAL)
JWT_SECRET = [Generate with: openssl rand -base64 48]

# Environment
NODE_ENV = production

# Stripe (Use TEST keys first!)
STRIPE_SECRET_KEY = sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET = whsec_your_webhook_secret

# Email
BREVO_API_KEY = xkeysib-your-brevo-api-key

# CORS
CORS_ORIGIN = https://your-deployment-url.vercel.app
```

### **Step 2: Redeploy**

After adding environment variables:
1. Go to: **Deployments** tab
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Wait for redeployment to complete

---

## 🔍 **Check Vercel Logs**

To see the exact error:

1. Go to: **Vercel Dashboard → Your Project → Deployments**
2. Click on the failed deployment
3. Click **"Functions"** tab
4. Click on the function log
5. Look for error messages

**Common errors you'll see:**
- `MongoClient is not defined` - Missing MongoDB dependency (shouldn't happen)
- `Cannot connect to database` - Wrong MONGODB_URI
- `JWT_SECRET is not defined` - Missing JWT_SECRET env var
- `STRIPE_SECRET_KEY is required` - Missing Stripe env var

---

## 📋 **Complete Environment Variables List**

### **Required (App won't work without these):**

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazarmkt?retryWrites=true&w=majority
JWT_SECRET=[64+ character random string]
NODE_ENV=production
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
BREVO_API_KEY=xkeysib-...
```

### **Highly Recommended:**

```bash
CORS_ORIGIN=https://your-url.vercel.app
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=[Generate with: openssl rand -hex 32]
GOOGLE_MAPS_API_KEY=AIzaSy...
GEOCODING_API_KEY=AIzaSy...
```

### **Optional (for advanced features):**

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

---

## 🎯 **Quick Test After Fix**

Once you've added env vars and redeployed:

```bash
# Test health endpoint
curl https://your-deployment-url.vercel.app/api/health

# Should return:
# {"status":"OK","timestamp":"2025-10-08T..."}
```

---

## 🔧 **Generate Required Secrets**

Run these locally to generate secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate CRON_SECRET
openssl rand -hex 32
```

---

## 📊 **Step-by-Step Fix**

### 1. Get MongoDB URI

```bash
# Go to: https://cloud.mongodb.com
# Click: Databases → Your Cluster → Connect
# Choose: "Connect your application"
# Copy the connection string
# Replace <password> with your actual password
```

### 2. Get Stripe Keys

```bash
# Go to: https://dashboard.stripe.com/test/apikeys
# Copy:
# - Secret key: sk_test_...
# - Publishable key: pk_test_...
```

### 3. Get Brevo API Key

```bash
# Go to: https://app.brevo.com/settings/keys/api
# Create new key
# Copy: xkeysib-...
```

### 4. Add to Vercel

For each variable:
1. **Key:** Variable name (e.g., `MONGODB_URI`)
2. **Value:** Your actual value
3. **Environment:** Select **"Production"**
4. Click **"Save"**

### 5. Redeploy

Click **"Redeploy"** after adding all variables

---

## 🆘 **Still Not Working?**

### Check Vercel Logs:

1. **Dashboard → Deployments → Click deployment**
2. **Functions tab → Click function**
3. **Read error logs**

### Common Issues:

**Error: "Cannot find module 'mongodb'"**
- Fix: Check package.json has all dependencies
- Redeploy

**Error: "MONGODB_URI is not defined"**
- Fix: Add MONGODB_URI environment variable
- Redeploy

**Error: "Connection to MongoDB failed"**
- Fix: Check MongoDB URI is correct
- Fix: Check MongoDB Network Access allows Vercel (0.0.0.0/0)

**Error: "JWT_SECRET is required"**
- Fix: Add JWT_SECRET environment variable
- Must be at least 64 characters

---

## 📝 **Environment Variables Template**

Copy this template and fill in your values:

```bash
# === CRITICAL - App won't start without these ===
MONGODB_URI=mongodb+srv://bazarmkt-prod:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bazarmkt?retryWrites=true&w=majority
JWT_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
NODE_ENV=production
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY
BREVO_API_KEY=xkeysib-YOUR_KEY

# === RECOMMENDED ===
CORS_ORIGIN=https://your-deployment.vercel.app
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
CRON_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE

# === OPTIONAL ===
GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_KEY
GEOCODING_API_KEY=AIzaSy_YOUR_KEY
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_YOUR_TOKEN
```

---

## ✅ **Success Criteria**

After fix, you should see:

1. ✅ Health endpoint returns: `{"status":"OK",...}`
2. ✅ Homepage loads without 500 error
3. ✅ No "FUNCTION_INVOCATION_FAILED" errors
4. ✅ Logs show successful requests

---

## 🎯 **Action Items**

- [ ] 1. Go to Vercel Dashboard → Settings → Environment Variables
- [ ] 2. Add MONGODB_URI
- [ ] 3. Generate and add JWT_SECRET
- [ ] 4. Add STRIPE_SECRET_KEY (test key first)
- [ ] 5. Add BREVO_API_KEY
- [ ] 6. Add NODE_ENV=production
- [ ] 7. Click "Redeploy" in Deployments tab
- [ ] 8. Test: `curl https://your-url.vercel.app/api/health`
- [ ] 9. Visit homepage - should load!

---

**Most likely:** You just need to add environment variables and redeploy. The function itself is fine!

**Quick Link:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables

---

*Created: October 8, 2025*  
*Issue: Function crashing due to missing environment variables*  
*Solution: Add env vars and redeploy*

