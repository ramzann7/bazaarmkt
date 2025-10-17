# Troubleshooting: "Unexpected Token '<'" Error

**Issue:** Application crashes with `SyntaxError: Unexpected token '<'`  
**Vercel Error:** `404: NOT_FOUND Code: NOT_FOUND ID: iad1::...`

---

## Root Cause

This error occurs when **JavaScript tries to parse HTML as code**. It typically happens when:

1. A JavaScript module import fails and returns an HTML error page (404) instead
2. The frontend tries to load a file that doesn't exist in the deployment
3. API routes return HTML error pages instead of JSON

**Example Flow:**
```
Frontend: import NotificationBell from './NotificationBell.jsx'
↓
Vercel: 404 - Returns HTML error page
↓
Browser: Tries to parse HTML as JavaScript
↓
Error: Unexpected token '<' (from <html> tag)
```

---

## Common Causes & Solutions

### 1. **Stale Cache After Deployment**

**Symptom:** Error appears immediately after deploying new code

**Solution:**
```bash
# Hard refresh in browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# OR

# Clear browser cache completely
# OR

# Wait 5-10 minutes for Vercel's CDN to update
```

### 2. **Missing Build Files**

**Symptom:** Specific components fail to load

**Solution:**
```bash
# Rebuild frontend locally
cd frontend
rm -rf dist node_modules/.vite
npm run build

# Verify build succeeded
ls -la dist/assets/*.js | wc -l  # Should show ~97 files

# Commit and push to trigger new deployment
git add frontend/dist
git commit -m "Rebuild frontend assets"
git push origin main
```

### 3. **Vercel Deployment Not Triggered**

**Symptom:** Changes pushed but not reflected on site

**Solution:**
```bash
# Check if Vercel deployment was triggered
# Visit: https://vercel.com/dashboard

# Manual trigger if needed:
# 1. Go to Vercel dashboard
# 2. Click "Deployments"
# 3. Click "Redeploy" on latest deployment

# OR force push to trigger:
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

### 4. **API Route Not Found (404)**

**Symptom:** API calls return HTML instead of JSON

**Check:**
```bash
# Verify route exists in backend/server-working.js
grep "app.use('/api/notifications" backend/server-working.js

# Verify route file exists
ls backend/routes/notifications/index.js

# Verify route is exported
grep "module.exports" backend/routes/notifications/index.js
```

**Solution:**
```javascript
// backend/server-working.js
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);
```

### 5. **CORS Issues**

**Symptom:** API calls blocked, returns HTML error

**Solution:**
```javascript
// backend/server-working.js
const allowedOrigins = [
  'https://bazaarmkt.ca',
  'https://www.bazaarmkt.ca',
  'https://bazaarmkt.vercel.app',
  /^https:\/\/bazaarmkt-.*\.vercel\.app$/  // Preview deployments
];
```

### 6. **Import Path Issues**

**Symptom:** Specific component fails to load

**Check:**
```bash
# Find all imports of problematic component
grep -r "import.*NotificationBell" frontend/src
```

**Common Issues:**
```javascript
// ❌ Wrong
import NotificationBell from './NotificationBell';

// ✅ Correct
import NotificationBell from './NotificationBell.jsx';

// ❌ Wrong (case sensitive)
import notificationBell from './NotificationBell.jsx';

// ✅ Correct
import NotificationBell from './NotificationBell.jsx';
```

---

## Immediate Fixes (In Order)

### Fix 1: Hard Refresh Browser
```
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### Fix 2: Clear All Caches
```bash
# Browser
- Clear all cookies and cache for bazaarmkt.ca
- Close and reopen browser

# Vercel
- Wait 5-10 minutes for CDN propagation
```

### Fix 3: Verify Build
```bash
cd /Users/ramzan/Documents/bazaarMKT/frontend
npm run build

# Check for errors
# Look for "✓ built in X.XXs" at the end
```

### Fix 4: Redeploy to Vercel
```bash
# Push latest changes
git add -A
git commit -m "Force redeploy"
git push origin main

# Vercel will auto-deploy within 1-2 minutes
```

### Fix 5: Check Vercel Logs
```
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click "Deployments"
4. Click latest deployment
5. Check "Build Logs" and "Function Logs"
6. Look for errors or 404s
```

---

## Prevention

### 1. Always Build Locally Before Pushing
```bash
npm run build
# Verify it completes successfully
```

### 2. Test in Development First
```bash
npm run dev
# Test all functionality locally
```

### 3. Monitor Vercel Deployments
- Watch deployment status after push
- Check build logs for warnings
- Verify deployment completes successfully

### 4. Use Preview Deployments
- Test on Vercel preview URLs before merging to main
- Catch issues before production

---

## Current Deployment Status

**Last Commits:**
- `51b9d7d` - Remove unused CheckIcon import
- `3c5383c` - Fix duplicate toast notifications on login  
- `77fd38c` - Major fixes: product forms, notifications, wallet payments

**Expected Behavior:**
- Vercel auto-deploys on push to main
- Build takes ~1-2 minutes
- CDN propagation takes ~5-10 minutes

**If Error Persists:**
1. Wait 10 minutes for CDN update
2. Hard refresh browser (Cmd+Shift+R)
3. Check Vercel deployment logs
4. Try incognito/private browsing mode
5. Check different browser

---

## Technical Details

### Why HTML Gets Parsed as JavaScript

When a module import fails:
```javascript
// Frontend code
import NotificationBell from './NotificationBell.jsx';

// Vercel returns (404):
<!DOCTYPE html>
<html>
  <head><title>404 - Not Found</title></head>
  ...
</html>

// Browser tries to parse:
<!DOCTYPE ...
^
Unexpected token '<'
```

### Proper Error vs This Error

**Proper JavaScript Error:**
```
ReferenceError: NotificationBell is not defined
TypeError: Cannot read property 'map' of undefined
```

**HTML Parsing Error (Our Issue):**
```
SyntaxError: Unexpected token '<'
```

This confirms the issue is **file serving**, not **code logic**.

---

## Verification Commands

```bash
# 1. Verify all routes exist
ls backend/routes/notifications/index.js
ls backend/routes/orders/index.js

# 2. Verify build output
ls frontend/dist/index.html
ls frontend/dist/assets/*.js | wc -l

# 3. Test API locally
cd backend
node server-working.js
# Then: curl http://localhost:4000/api/health

# 4. Check git status
git status
git log --oneline -3
```

---

**Last Updated:** October 17, 2025  
**Status:** Changes pushed, awaiting Vercel deployment

