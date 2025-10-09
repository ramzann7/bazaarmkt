# 🔧 Backend Server Not Running - Quick Fix

**Error:** `GET http://localhost:4000/api/auth/profile net::ERR_CONNECTION_REFUSED`

**Cause:** Backend server was stopped when we cleared ports earlier

**Solution:** Start the backend server

---

## ✅ Starting Backend Server

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev
```

This will:
- Start backend on port 4000
- Auto-reload on file changes (nodemon)
- Connect to MongoDB
- Initialize with database pre-warming

**Expected Output:**
```
🔄 Initializing server...
🔄 Connecting to MongoDB Atlas (attempt 1)...
📊 Pool config: max=5, min=1
✅ MongoDB connected successfully to database: bazarmkt
✅ Database pre-warmed
✅ Database connection verified
🚀 Server running on port 4000
✅ Server fully initialized with database connection
```

---

## 🚀 Both Servers Running

### Terminal 1 - Backend (Port 4000)
```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
npm run dev
```

### Terminal 2 - Frontend (Port 5180)
```bash
cd /Users/ramzan/Documents/bazaarMKT/frontend
npm run dev
```

---

## ✅ Verify Both Running

```bash
# Backend health check
curl http://localhost:4000/api/health

# Frontend (in browser)
open http://localhost:5180
```

---

**Status:** Backend starting now...  
**Frontend:** Should already be on port 5180  
**Profile API:** Will work once backend is up ✅


