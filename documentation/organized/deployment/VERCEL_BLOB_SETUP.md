# Vercel Blob Setup for Production Images

**Status:** ✅ CODE READY - Needs Vercel Blob Token

## Overview

The application now supports **production-ready image handling** with:
- ✅ Automatic image optimization (resize + compress)
- ✅ Upload to Vercel Blob storage
- ✅ Fallback to optimized base64 if Vercel Blob unavailable
- ✅ All future uploads automatically use Vercel Blob

## Current Status

**Without Vercel Blob Token (Development):**
- Images are optimized (70% smaller)
- Stored as base64 in database
- Works but not ideal for production

**With Vercel Blob Token (Production):**
- Images are optimized (70% smaller)
- Uploaded to Vercel Blob CDN
- Database stores only URLs (~100 bytes vs 100KB+)
- Global CDN delivery
- Much better performance

## Setup Instructions

### Step 1: Get Vercel Blob Token

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (bazaarMKT)
3. Go to **Storage** tab
4. Click **Create Database** → **Blob Storage**
5. Copy the `BLOB_READ_WRITE_TOKEN`

### Step 2: Add Token to Environment

**Backend .env file:**
```bash
# Add this line to backend/.env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

**Vercel Environment Variables:**
```bash
# Add to Vercel project settings → Environment Variables
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### Step 3: Restart Backend

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend
node server-vercel.js
```

### Step 4: Migrate Existing Images (Optional)

```bash
cd /Users/ramzan/Documents/bazaarMKT
node tools/scripts/migration/migrate-images-to-vercel-blob.js
```

This will:
- Find all base64 images in database
- Optimize and upload to Vercel Blob
- Update database with URLs
- Reduce database size by ~1MB per artisan

## How It Works

### Image Upload Flow

1. **User uploads image** (via profile/artisan settings)
2. **Frontend sends** base64 image to backend
3. **Backend optimizes** image (resize, compress)
4. **Backend uploads** to Vercel Blob (or stores as base64 if token missing)
5. **Database stores** URL (or optimized base64)
6. **Frontend displays** image from URL

### Image Types Supported

| Type | Max Size | Quality | Location |
|------|----------|---------|----------|
| Profile | 400x400px | 80% | `profiles/` |
| Business | 800x800px | 85% | `businesses/` |
| Product | 600x600px | 85% | `products/` |
| Community | 800x800px | 85% | `community/` |

### Files Created

**Services:**
- `backend/services/imageOptimizationService.js` - Image optimization
- `backend/services/vercelBlobService.js` - Vercel Blob integration
- `backend/services/imageUploadService.js` - Unified service

**Routes:**
- `backend/routes/artisans/index.js` - Auto-processes images on upload

**Migration:**
- `tools/scripts/migration/migrate-images-to-vercel-blob.js`
- `tools/scripts/migration/optimize-existing-images.js`

## Testing

### Test Without Vercel Blob (Current)

1. Upload artisan business image
2. Check backend logs: "⚠️ Vercel Blob not available, storing optimized base64"
3. Image should be optimized (70% smaller)
4. Database stores optimized base64

### Test With Vercel Blob (Production)

1. Add `BLOB_READ_WRITE_TOKEN` to `.env`
2. Restart backend
3. Upload artisan business image
4. Check backend logs: "✅ Business image uploaded: https://..."
5. Database stores only URL
6. Image loads from Vercel CDN

## Benefits

### Before (Base64 in Database)
- ❌ 363 KB per image in database
- ❌ 1.5+ MB API responses
- ❌ Slow page loads (5+ seconds)
- ❌ High database costs
- ❌ No CDN

### After (Vercel Blob)
- ✅ ~100 bytes per image in database (just URL)
- ✅ ~50 KB API responses (just URLs)
- ✅ Fast page loads (1-2 seconds)
- ✅ Low database costs
- ✅ Global CDN delivery
- ✅ Automatic optimization

## API Examples

### Upload Business Image

```javascript
// Frontend
const imageData = "data:image/jpeg;base64,...";
const response = await fetch('/api/artisans/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ businessImage: imageData })
});

// Backend (automatic)
// 1. Optimizes image (363 KB → 103 KB)
// 2. Uploads to Vercel Blob
// 3. Returns URL: https://xxx.blob.vercel-storage.com/businesses/...
// 4. Stores URL in database
```

### Display Image

```jsx
// Frontend
<img 
  src={artisan.businessImage} 
  alt={artisan.artisanName}
/>

// Works with both:
// - Vercel Blob URL: https://xxx.blob.vercel-storage.com/...
// - Optimized base64: data:image/jpeg;base64,...
```

## Troubleshooting

### Images not uploading to Vercel Blob

**Check token:**
```bash
# In backend directory
grep BLOB_READ_WRITE_TOKEN .env
```

**Check logs:**
```bash
# Look for these messages
✅ Vercel Blob is configured and available
📸 Processing businessImage (optimize + upload to Vercel Blob)...
✅ businessImage uploaded: https://...
```

### Images still showing as base64

**Possible causes:**
1. Token not configured → Fallback to base64 (working as designed)
2. Token invalid → Check Vercel dashboard
3. Network error → Check internet connection

**Check if image is base64 or URL:**
```javascript
console.log(artisan.businessImage.startsWith('data:image') ? 'Base64' : 'URL');
```

### Migration script errors

**BLOB_READ_WRITE_TOKEN not found:**
```bash
# Add token to .env first
echo "BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx" >> backend/.env
```

**Upload fails during migration:**
- Check internet connection
- Verify token is valid
- Check Vercel Blob quota

## Cost Estimates

### Vercel Blob Pricing (as of 2025)

**Hobby Plan (Free):**
- 1 GB storage
- 100 GB bandwidth/month
- Perfect for development

**Pro Plan ($20/month):**
- 100 GB storage
- 1 TB bandwidth/month
- Suitable for small production

**Example:**
- 1000 optimized images @ 100 KB each = 100 MB storage
- 10,000 page views @ 10 images each @ 100 KB = 10 GB bandwidth
- **Cost: FREE (within Hobby limits)**

## Deployment

### Local Development
```bash
# Works without Vercel Blob token
# Images stored as optimized base64
npm run dev
```

### Production (Vercel)
```bash
# Add BLOB_READ_WRITE_TOKEN to Vercel env vars
# Images uploaded to Vercel Blob automatically
git push
vercel deploy
```

### Environment Variables Checklist

**Required:**
- ✅ `MONGODB_URI`
- ✅ `JWT_SECRET`

**Optional (but recommended for production):**
- ✅ `BLOB_READ_WRITE_TOKEN` - For Vercel Blob storage

## Monitoring

### Check Vercel Blob Usage

1. Go to Vercel dashboard
2. Select project → Storage
3. View usage metrics:
   - Storage used
   - Bandwidth used
   - Request count

### Backend Logs

Watch for these messages:
```
✅ Vercel Blob is configured and available
📸 Processing businessImage (optimize + upload to Vercel Blob)...
📸 Image optimized: 279118 bytes → 79193 bytes (72% reduction)
✅ Business image uploaded: https://xxx.blob.vercel-storage.com/...
```

## Next Steps

1. **Get Vercel Blob Token** - See Step 1 above
2. **Add to .env** - Backend and Vercel
3. **Test Upload** - Upload artisan image
4. **Migrate Existing** - Run migration script
5. **Deploy** - Push to production

## Support

**Issues:**
- Images not displaying → Check browser console
- Upload fails → Check backend logs
- Migration errors → Check token configuration

**Documentation:**
- Vercel Blob: https://vercel.com/docs/storage/vercel-blob
- Sharp (optimization): https://sharp.pixelplumbing.com/

---

**Status: Ready for Production** ✅  
**Next: Add BLOB_READ_WRITE_TOKEN to enable Vercel Blob**

