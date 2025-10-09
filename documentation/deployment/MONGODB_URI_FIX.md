# 🔍 MongoDB URI Configuration Issue

**Date:** October 9, 2025  
**Issue:** Database name missing from connection string  
**Status:** Found and fixing

---

## 🚨 Problem Identified

### Current URI (INCORRECT):
```
mongodb+srv://bazaarMKT:0oo2HhbHB5MCeDdq@cluster0.c8vyia3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Issue:** Missing database name after `.net/`

### Corrected URI (CORRECT):
```
mongodb+srv://bazaarMKT:0oo2HhbHB5MCeDdq@cluster0.c8vyia3.mongodb.net/bazarmkt?retryWrites=true&w=majority&appName=Cluster0
```

**Fixed:** Added `/bazarmkt` before the `?`

---

## 📋 URI Format Breakdown

```
mongodb+srv://          ← Protocol
bazaarMKT               ← Username
:0oo2HhbHB5MCeDdq       ← Password
@cluster0.c8vyia3       ← Cluster address
.mongodb.net            ← Domain
/bazarmkt               ← DATABASE NAME (was missing!)
?retryWrites=true       ← Options
&w=majority
&appName=Cluster0
```

---

## ⚡ How to Fix in Vercel

### Step 1: Go to Vercel Dashboard
1. https://vercel.com/dashboard
2. Select your project: **bazaarmkt**
3. Settings → Environment Variables

### Step 2: Update MONGODB_URI

**Find:** `MONGODB_URI`

**Click "Edit"**

**Replace with:**
```
mongodb+srv://bazaarMKT:0oo2HhbHB5MCeDdq@cluster0.c8vyia3.mongodb.net/bazarmkt?retryWrites=true&w=majority&appName=Cluster0
```

**Important Changes:**
- ✅ Changed: `.mongodb.net/?` 
- ✅ To: `.mongodb.net/bazarmkt?`
- ✅ Added database name: `bazarmkt`

### Step 3: Save and Redeploy

1. Click **"Save"**
2. Go to **"Deployments"** tab
3. Click **"..."** on latest deployment
4. Click **"Redeploy"**

---

## 🔍 Why This Matters

### Without Database Name:
```javascript
const db = client.db('bazarmkt'); // Code specifies 'bazarmkt'
// But URI doesn't specify which database
// MongoDB might use 'test' or 'admin' as default
// Causes: Collections not found, empty queries
```

### With Database Name:
```javascript
const db = client.db('bazarmkt'); // ✅ Matches URI
// MongoDB knows exactly which database to use
// Result: Correct collections, data found
```

---

## 📊 Impact

| Scenario | Without DB Name | With DB Name |
|----------|----------------|--------------|
| **Connection** | ✅ Works | ✅ Works |
| **Finding Collections** | ❌ Wrong DB | ✅ Correct |
| **Queries** | ❌ Empty results | ✅ Returns data |
| **Writes** | ❌ Wrong DB | ✅ Correct DB |

---

## ✅ Verification

### Test Locally (if needed):
```bash
cd backend
node -e "
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://bazaarMKT:0oo2HhbHB5MCeDdq@cluster0.c8vyia3.mongodb.net/bazarmkt?retryWrites=true&w=majority';
const client = new MongoClient(uri);
client.connect()
  .then(() => {
    const db = client.db('bazarmkt');
    return db.listCollections().toArray();
  })
  .then(collections => {
    console.log('Collections:', collections.map(c => c.name));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
"
```

**Expected Output:**
```
Collections: [ 'users', 'products', 'artisans', 'orders', ... ]
```

### Test in Production:
After redeploying, visit:
```
https://www.bazaarmkt.ca/api/health
```

**Should return:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🎯 Complete MongoDB URI Checklist

- [x] Protocol: `mongodb+srv://` ✅
- [x] Username: `bazaarMKT` ✅
- [x] Password: `0oo2HhbHB5MCeDdq` ✅
- [x] Cluster: `cluster0.c8vyia3.mongodb.net` ✅
- [x] **Database name: `/bazarmkt`** ✅ (ADDED)
- [x] Options: `?retryWrites=true&w=majority` ✅

---

## 📝 Quick Fix Summary

**Old (Wrong):**
```
...mongodb.net/?retryWrites=true...
              ↑
          Missing database name!
```

**New (Correct):**
```
...mongodb.net/bazarmkt?retryWrites=true...
              ↑
          Database name added!
```

---

**Status:** Issue identified ✅  
**Fix:** Add `/bazarmkt` to URI  
**Location:** Vercel Environment Variables  
**Action:** Update and redeploy  


