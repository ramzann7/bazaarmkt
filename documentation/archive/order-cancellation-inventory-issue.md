# Order Cancellation & Inventory Restoration - Issue Analysis

## Problem Reported

When an order is cancelled, the product inventory is restored, but the product is not showing up in featured/popular product listings.

## Current Status Investigation

### Inventory Restoration - ✅ Working

**Location:** `/backend/routes/orders/index.js` (Lines 1569-1629)

The inventory restoration logic is correctly implemented for declined/cancelled orders:

```javascript
if (status === 'declined' || status === 'cancelled') {
  // ... restore inventory for each product type
  // ready_to_ship: restore stock
  // made_to_order: restore remainingCapacity
  // scheduled_order: restore availableQuantity
  
  // Update product status back to 'active' if inventory > 0
  if (restoredStock > 0 && product.status === 'out_of_stock') {
    updateFields.status = 'active';
  }
}
```

**✅ This works correctly** - inventory is restored and status set to 'active'

---

### Featured Products Filtering

**Location:** `/backend/routes/products/index.js` (Lines 171-219)

**Query:**
```javascript
const featuredProducts = await productsCollection.aggregate([
  { $match: { status: 'active', isFeatured: true } },
  // ...
]).toArray();
```

**Requirements:**
1. ✅ `status: 'active'` - Set by inventory restoration
2. ❓ `isFeatured: true` - **This might not be set!**

---

### Popular Products Filtering

**Location:** `/backend/routes/products/index.js` (Lines 118-168)

**Query:**
```javascript
const popularProducts = await productsCollection.aggregate([
  { $match: { status: 'active' } },
  { $sort: { soldCount: -1, views: -1 } },
  { $limit: 8 }
]).toArray();
```

**Requirements:**
1. ✅ `status: 'active'` - Set by inventory restoration
2. ✅ Sorted by `soldCount` and `views`

**Note:** Popular products only requires `status: 'active'`, so if it's not showing, might be:
- Product has low `soldCount` (it gets decremented when order cancelled)
- Product has low `views`
- Cache not cleared after restoration

---

## Root Causes Identified

### Issue 1: Product Cache Not Cleared After Cancellation

**Problem:** When inventory is restored, product caches might not be cleared, so the frontend still sees old data (out of stock).

**Evidence from logs:**
```
productService.js:86 Returning cached featured products: {success: true, data: Array(0)}
productService.js:111 Returning cached popular products: {success: true, data: Array(1)}
```

**Solution:** Clear product caches after inventory restoration

---

### Issue 2: `isFeatured` Flag Not Set

**Problem:** Products need `isFeatured: true` to appear in featured products list

**Solution:** Ensure products have this flag, or featured products won't show them

---

### Issue 3: `soldCount` Not Properly Decremented

**Problem:** When order is cancelled, `soldCount` should be decremented, but if it becomes 0 or negative, product might not appear in popular products (sorted by soldCount)

**Current code:**
```javascript
soldCount: Math.max(0, (product.soldCount || 0) - item.quantity)
```

**This is correct** - it prevents negative soldCount, but might push product down in popular list

---

## Recommended Fixes

### Fix 1: Clear Product Caches After Inventory Restoration ✅ PRIORITY

**File:** `/backend/routes/orders/index.js`

**Add after inventory restoration (around line 1629):**

```javascript
// After restoring inventory for declined/cancelled orders
if (status === 'declined' || status === 'cancelled') {
  // ... existing restoration code ...
  
  // CLEAR PRODUCT CACHES AFTER RESTORATION
  try {
    const redisCacheService = require('../../services/redisCacheService');
    
    for (const item of order.items) {
      // Clear individual product cache
      await redisCacheService.del(`product:${item.productId}`);
      console.log(`🗑️ Cleared cache for product: ${item.productId}`);
    }
    
    // Clear listing caches
    await redisCacheService.del('products:featured');
    await redisCacheService.del('products:popular');
    await redisCacheService.del('products:all');
    console.log('🗑️ Cleared featured/popular product caches');
    
  } catch (cacheError) {
    console.error('❌ Error clearing product caches:', cacheError);
    // Don't fail the cancellation if cache clear fails
  }
}
```

---

### Fix 2: Check Product Configuration

**Issue:** If products don't have `isFeatured: true`, they won't show in featured products

**Check database:**
```javascript
// Check if product has isFeatured flag
db.products.find({ isFeatured: true, status: 'active' }).count()

// If 0, you need to set isFeatured on products
db.products.updateMany(
  { status: 'active' },
  { $set: { isFeatured: true } }
)
```

**Alternative:** Modify featured products query to not require `isFeatured`:
```javascript
// Option A: Show all active products as featured
{ $match: { status: 'active' } }

// Option B: Show products with high views/soldCount
{ 
  $match: { 
    status: 'active',
    $or: [
      { isFeatured: true },
      { views: { $gt: 10 } },
      { soldCount: { $gt: 5 } }
    ]
  } 
}
```

---

### Fix 3: Frontend Cache Busting

**File:** `/frontend/src/services/productService.js`

**Ensure cache is cleared after order operations:**

```javascript
// After order creation/cancellation
export const clearAllProductCaches = () => {
  // Clear Map cache
  featuredProductsCache.clear();
  popularProductsCache.clear();
  
  // Clear any localStorage caches
  Object.keys(localStorage).forEach(key => {
    if (key.includes('product') || key.includes('featured') || key.includes('popular')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('🗑️ Cleared all product caches');
};
```

---

## Implementation Plan

### Step 1: Add Cache Clearing to Order Cancellation (Backend)

**Priority:** HIGH
**Time:** 10 minutes

1. Open `/backend/routes/orders/index.js`
2. Find the inventory restoration section (line ~1629)
3. Add cache clearing code after restoration loop
4. Test order cancellation

---

### Step 2: Verify Product Configuration (Database)

**Priority:** MEDIUM
**Time:** 5 minutes

1. Check if products have `isFeatured: true`
2. If not, either:
   - Set flag on products that should be featured
   - Modify featured products query to be more flexible

---

### Step 3: Add Frontend Cache Clearing

**Priority:** MEDIUM
**Time:** 5 minutes

1. Ensure frontend clears caches after order cancellation
2. Add manual cache clear option in UI (for testing)

---

## Testing Checklist

### Test Order Cancellation

- [ ] 1. Create order with a product
- [ ] 2. Verify product inventory decreased
- [ ] 3. Cancel the order
- [ ] 4. **Check backend logs:** "✅ Restored inventory for product..."
- [ ] 5. **Check backend logs:** "🗑️ Cleared cache for product..."
- [ ] 6. Refresh featured/popular products page
- [ ] 7. **Verify:** Product appears in listings
- [ ] 8. **Verify:** Product has correct inventory

### Test Declined Order

- [ ] 1. Create order as patron
- [ ] 2. Artisan declines order
- [ ] 3. **Check backend logs:** "✅ Restored inventory..."
- [ ] 4. **Check backend logs:** "🗑️ Cleared cache..."
- [ ] 5. **Verify:** Product appears in listings

---

## Quick Diagnostic Commands

### Check Product Status in Database

```bash
cd /Users/ramzan/Documents/bazaarMKT/backend

node -e "
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function checkProduct(productId) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const product = await db.collection('products').findOne({ 
    _id: new ObjectId(productId) 
  });
  
  if (product) {
    console.log('Product Status:');
    console.log('  Name:', product.name);
    console.log('  Status:', product.status);
    console.log('  isFeatured:', product.isFeatured);
    console.log('  Product Type:', product.productType);
    console.log('  Stock/Capacity:');
    console.log('    stock:', product.stock);
    console.log('    availableQuantity:', product.availableQuantity);
    console.log('    remainingCapacity:', product.remainingCapacity);
    console.log('  soldCount:', product.soldCount);
    console.log('  views:', product.views);
  } else {
    console.log('Product not found');
  }
  
  await client.close();
}

// Replace with your product ID
checkProduct('YOUR_PRODUCT_ID_HERE');
"
```

### Check Featured Products

```bash
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkFeatured() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const featured = await db.collection('products').find({
    status: 'active',
    isFeatured: true
  }).toArray();
  
  console.log('Featured Products:', featured.length);
  featured.forEach(p => {
    console.log('  -', p.name, '| Status:', p.status, '| isFeatured:', p.isFeatured);
  });
  
  const allActive = await db.collection('products').countDocuments({ status: 'active' });
  console.log('\\nTotal Active Products:', allActive);
  
  await client.close();
}

checkFeatured();
"
```

---

## Summary

**Problems:**
1. ✅ Inventory restoration works correctly
2. ❌ Product caches not cleared after restoration
3. ❓ Products might not have `isFeatured: true` flag

**Solutions:**
1. Add cache clearing after inventory restoration
2. Verify/set `isFeatured` flag on products
3. Ensure frontend clears caches

**Next Steps:**
1. Implement cache clearing in order cancellation endpoint
2. Test order cancellation flow
3. Verify products appear in featured/popular lists

---

**Status:** Issue Identified - Fix Ready to Implement
**Priority:** Medium-High (affects product visibility)
**Estimated Fix Time:** 10-15 minutes

---

**Last Updated:** October 10, 2025

