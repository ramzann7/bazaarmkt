# 🔴 URGENT: Production API Down - Quick Fix Guide

**Status:** All API endpoints returning 500 errors  
**Cause:** Missing MONGODB_URI in Vercel environment variables  
**Fix Time:** 5 minutes

---

## ⚡ IMMEDIATE FIX - Step by Step

### Step 1: Check Current Environment Variables (1 min)

1. Go to: https://vercel.com/dashboard
2. Click on your project: **bazaarmkt**
3. Click **"Settings"** tab
4. Click **"Environment Variables"** in left sidebar
5. Check if you see: `MONGODB_URI`

**If MONGODB_URI is NOT there → Go to Step 2**  
**If MONGODB_URI IS there → Go to Step 4**

---

### Step 2: Add MONGODB_URI (2 min)

1. Click **"Add New"** button
2. Fill in:
   - **Key:** `MONGODB_URI`
   - **Value:** Your MongoDB connection string (see format below)
   - **Environments:** ✅ Check ALL three: Production, Preview, Development
3. Click **"Save"**

**MongoDB URI Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/bazarmkt?retryWrites=true&w=majority
```

**Example:**
```
mongodb+srv://ramzan:MyPassword123@cluster0.abc123.mongodb.net/bazarmkt?retryWrites=true&w=majority
```

**Important:**
- Replace `username` with your MongoDB Atlas username
- Replace `password` with your MongoDB Atlas password
- Replace `cluster0.abc123` with your actual cluster address
- Keep `/bazarmkt` (database name)

---

### Step 3: Add Other Required Variables (1 min)

While you're there, add these too:

**JWT_SECRET:**
- Key: `JWT_SECRET`
- Value: Any long random string (e.g., `my-super-secret-jwt-key-change-in-prod-12345`)
- Environments: All ✅

---

### Step 4: Redeploy (2 min)

**CRITICAL:** Environment variables only take effect after redeployment!

**Option A - Quick Redeploy:**
1. Stay in Vercel Dashboard
2. Click **"Deployments"** tab
3. Find the latest deployment (top of list)
4. Click the **"..."** menu on the right
5. Click **"Redeploy"**
6. Wait 1-2 minutes for build to complete

**Option B - Push to GitHub:**
```bash
# Make any small change
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

### Step 5: Verify Fix (30 seconds)

Once redeployed, test these URLs:

1. **Health Check:**
   ```
   https://www.bazaarmkt.ca/api/health
   ```
   **Expected:** Should return JSON with `{"status":"ok"}` or similar

2. **Your Production Site:**
   ```
   https://www.bazaarmkt.ca
   ```
   **Expected:** Products should load, no 500 errors in console

---

## 🔍 How to Check Vercel Logs

If still failing after redeploy:

1. Go to Vercel Dashboard → **Deployments**
2. Click on the **latest deployment**
3. Click **"Functions"** tab
4. Click **"api/index.js"**
5. Scroll down to **"Logs"**

**Look for these error messages:**
```
❌ MONGODB_URI is undefined
❌ Error connecting to database
❌ MongoServerError: Authentication failed
❌ MongooseServerSelectionError: connect ETIMEDOUT
```

---

## 📋 Complete Environment Variables Checklist

For full functionality, you need these in Vercel:

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | ✅ YES | Database connection |
| `JWT_SECRET` | ✅ YES | Authentication |
| `NODE_ENV` | Optional | Already set to "production" in vercel.json |
| `STRIPE_SECRET_KEY` | If using payments | Stripe integration |
| `BREVO_API_KEY` | If using emails | Email service |
| `BLOB_READ_WRITE_TOKEN` | If using file uploads | Vercel Blob storage |

---

## 🆘 Still Not Working?

### Check MongoDB Atlas Network Access:

1. Go to: https://cloud.mongodb.com
2. Click your cluster
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"**
6. Enter: `0.0.0.0/0`
7. Description: "Vercel Serverless"
8. Click **"Confirm"**

### Check MongoDB Atlas Database User:

1. Click **"Database Access"** (left sidebar)
2. Verify your user exists
3. Verify it has **"Read and write to any database"** permissions
4. Note the username and password (use in MONGODB_URI)

---

## ✅ Success Indicators

After fixing, you should see:

**In Browser Console:**
```
✅ No 500 errors
✅ Products load successfully
✅ Registration works
✅ Address validation works
```

**Testing URLs:**
```bash
# Should return 200 OK
curl https://www.bazaarmkt.ca/api/health

# Should return products
curl https://www.bazaarmkt.ca/api/products/featured
```

---

## 📞 Quick Troubleshooting

### Error: "Still getting 500 after adding MONGODB_URI"

**Solution:** Did you redeploy? Environment variables require redeployment.

### Error: "MongoServerError: Authentication failed"

**Solution:** Check username/password in MONGODB_URI match MongoDB Atlas.

### Error: "ETIMEDOUT"

**Solution:** Add 0.0.0.0/0 to MongoDB Atlas Network Access.

---

## 🎯 Action Checklist

- [ ] Add `MONGODB_URI` to Vercel environment variables
- [ ] Add `JWT_SECRET` to Vercel environment variables  
- [ ] Select ALL environments (Production, Preview, Development)
- [ ] Click "Save"
- [ ] Redeploy from Vercel dashboard
- [ ] Wait 1-2 minutes for build
- [ ] Test: https://www.bazaarmkt.ca/api/health
- [ ] Test: https://www.bazaarmkt.ca (homepage)
- [ ] Verify: No 500 errors in console

---

**Estimated Fix Time:** 5 minutes  
**Priority:** CRITICAL - Production Down  
**Next Step:** Add MONGODB_URI to Vercel NOW


