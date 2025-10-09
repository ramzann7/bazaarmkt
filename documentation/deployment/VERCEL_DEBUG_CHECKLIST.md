# 🔍 Debugging Vercel 500 Errors - Checklist

**Status:** Still failing after database fix  
**Need:** Check Vercel Function Logs for actual error

---

## 🚨 Check Vercel Function Logs

### Step 1: Access Logs
1. Go to: https://vercel.com/dashboard
2. Click on: **bazaarmkt** project
3. Click: **Deployments** tab
4. Click on: Latest deployment (top of list)
5. Click: **Functions** tab
6. Click on: **api/index.js**
7. Scroll to: **Logs** section

### Step 2: Look For These Errors

**Database Connection:**
```
❌ MONGODB_URI is not defined
❌ Error: bad auth
❌ MongoDB connection failed
❌ Cannot find module
❌ Database unavailable
```

**Code Errors:**
```
❌ TypeError: Cannot read property
❌ ReferenceError: X is not defined
❌ SyntaxError:
❌ Error: Cannot find module
```

**Timeout:**
```
❌ Task timed out after 10 seconds
❌ Function execution timeout
```

---

## 🎯 Common Issues & Solutions

### Issue 1: Environment Variable Not Set

**Log shows:** `MONGODB_URI is not defined`

**Solution:**
1. Verify in Vercel Settings → Environment Variables
2. Ensure **ALL** environments selected (Production, Preview, Development)
3. Click "Save"
4. **Redeploy**

---

### Issue 2: Wrong Database Name

**Log shows:** `Connected to database: bazarmkt` (should be `bazaarmkt-prod`)

**Solution:** Already fixed in latest deployment (auto-detects from URI)

---

### Issue 3: Deployment Using Old Code

**How to check:**
- Look at deployment timestamp
- Should be within last 5 minutes

**Solution:**
1. Make a dummy change (add a space somewhere)
2. Commit and push
3. Wait for Vercel to deploy

OR

1. Deployments → Latest → "..." → Redeploy

---

### Issue 4: Function Timeout

**Log shows:** `Task timed out`

**Reason:** Database connection takes too long

**Solution:** Already optimized (maxPoolSize: 1, fast timeouts)

---

### Issue 5: Missing Dependencies

**Log shows:** `Cannot find module 'mongodb'`

**Solution:**
1. Check `api/package.json` has all dependencies
2. Should include: mongodb, express, dotenv, etc.

---

## 📋 Verification Steps

### Step 1: Check Latest Deployment Time
- Go to Deployments
- Latest should be within 5 minutes
- Status should be "Ready"

### Step 2: Check Environment Variables
```
✅ MONGODB_URI is set
✅ Value has /bazaarmkt-prod
✅ JWT_SECRET is set
✅ All environments selected
```

### Step 3: Test API Directly

Try this URL in browser:
```
https://www.bazaarmkt.ca/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

**If 500 error:** Check function logs immediately

---

## 🆘 Debug Commands

### Test Database Connection Locally

```bash
cd backend
node -e "
const { getDB } = require('./config/database');
process.env.MONGODB_URI = 'mongodb+srv://bazaarMKT:RlQZWii3bEXeV9t2@cluster0.c8vyia3.mongodb.net/bazaarmkt-prod?retryWrites=true&w=majority';
getDB().then(db => {
  console.log('✅ Connected to:', db.databaseName);
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
"
```

### Check Vercel Deployment Status

```bash
# If you have Vercel CLI
vercel ls
vercel logs
```

---

## 🎯 What to Share

If still not working, check Vercel logs and share:

1. **Error message** from function logs
2. **Database name** shown in logs
3. **Deployment timestamp**
4. **Environment variables** status (set/not set)

---

**Next Step:** Check Vercel Function Logs and share the actual error message


