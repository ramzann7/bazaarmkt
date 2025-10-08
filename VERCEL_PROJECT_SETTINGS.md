# ✅ Vercel Project Settings Configuration

**IMPORTANT:** Configure these in Vercel Dashboard to fix the build!

---

## 🎯 Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Click your project: **bazaarmkt**
3. Go to: **Settings** → **General**

---

## ⚙️ Required Settings

### **Root Directory**
```
frontend
```
✅ Set this to `frontend` (not `.` or empty)

**Why:** This tells Vercel the frontend is in the `frontend/` subdirectory

---

### **Framework Preset**
```
Vite
```
✅ Select **"Vite"** from dropdown

**Why:** Auto-configures build commands for Vite projects

---

### **Build & Output Settings**

Vercel should auto-detect these, but verify:

**Build Command:**
```
npm run build
```
(Vercel will run this inside the `frontend/` directory)

**Output Directory:**
```
dist
```
(Relative to frontend/, so it's `frontend/dist`)

**Install Command:**
```
npm install
```
(Default is fine)

---

## 🔧 API Function Configuration

Since your API is in `/api/index.js`, it will automatically work as a serverless function!

**No additional configuration needed for the API** ✅

---

## 📋 Step-by-Step in Dashboard:

1. **Settings** → **General**
   - Scroll to **"Build & Development Settings"**
   - Click **"Edit"** (if not already editing)

2. **Root Directory:**
   - Change from: `.` or empty
   - To: **`frontend`** ✅
   - Click outside to save

3. **Framework Preset:**
   - Select: **Vite** ✅

4. **Build Command** (should auto-fill):
   - Should show: `npm run build` ✅

5. **Output Directory** (should auto-fill):
   - Should show: `dist` ✅

6. **Install Command** (should auto-fill):
   - Should show: `npm install` ✅

7. **Click "Save"** at the bottom

---

## 🔄 After Changing Settings:

Click **"Redeploy"** or just push a new commit:

```bash
# Settings are saved, now redeploy
# Vercel will use the new settings
```

---

## ✅ What This Does:

- Vercel will `cd` into `frontend/` automatically
- Run `npm install` there (gets all 573 packages including vite)
- Run `npm run build` (vite will be found!)
- Serve from `dist/` (inside frontend)
- Your `/api/` routes will still work via `/api/index.js`

---

## 🎯 Alternative: Remove vercel.json

If settings still conflict:

**Option A: Let Vercel Auto-Detect**

1. Rename or delete `vercel.json` temporarily
2. Set Root Directory to `frontend` in dashboard
3. Let Vercel auto-detect Vite framework
4. Deploy

---

## 📝 Summary

**RIGHT NOW, go to Vercel Dashboard and:**

1. ✅ Set **Root Directory** to: `frontend`
2. ✅ Set **Framework** to: `Vite`
3. ✅ Verify **Build Command** is: `npm run build`
4. ✅ Click **Save**
5. ✅ Click **Redeploy**

**This should fix the build!** The project settings are what matter most.

---

*After you change these settings, let me know and I'll push one more update if needed!*

