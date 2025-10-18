# Commission Rate Management - Implementation Complete

## Overview
Implemented individual artisan commission rate management while maintaining platform-wide default rates.

---

## Features Implemented

### 1️⃣ **Platform Default Commission Rate**

**Location:** Platform Settings
- Admin sets the default commission rate (e.g., 15%)
- This rate applies to all new artisans by default
- Stored in `platformsettings` collection

**Artisan Onboarding:**
```javascript
// backend/utils/artisanSchemaUtils.js
let commissionRate = 0.10; // Default fallback
if (db) {
  const PlatformSettingsService = require('../services/platformSettingsService');
  const platformSettingsService = new PlatformSettingsService(db);
  commissionRate = await platformSettingsService.getPlatformFeeRate('order');
}

financial: {
  commissionRate: commissionRate, // Set from platform settings
  currency: 'CAD'
}
```

---

### 2️⃣ **Admin Commission Rate Override**

**Admin Artisan Dashboard:**
- View each artisan's current commission rate
- Edit commission rate for specific artisans
- Shows platform default for comparison
- Validates rate (0-100%)

**UI Features:**
- Display: Shows current rate vs. platform default
- Edit mode: Number input with Save/Cancel buttons
- Validation: Client + server-side (0-100%)
- Success toast: Confirms update

**Screenshot Placeholder:**
```
┌──────────────────────────────────────┐
│  Commission Rate         [Edit]      │
│  12% (Platform default: 15%)         │
│  ──────────────────────────────      │
│  Platform takes this percentage      │
│  from each order subtotal            │
└──────────────────────────────────────┘
```

---

### 3️⃣ **Order Revenue Calculation**

**Uses Artisan-Specific Commission Rate:**

```javascript
// backend/routes/orders/index.js

// Get artisan's individual commission rate
const commissionRate = artisan.financial?.commissionRate || 15; // Default to 15% if not set
const subtotal = order.subtotal || order.totalAmount;
const platformFee = parseFloat((subtotal * (commissionRate / 100)).toFixed(2));
const artisanAmount = parseFloat((subtotal - platformFee).toFixed(2));

console.log('💰 Revenue calculation:', {
  totalAmount: order.totalAmount,
  subtotal: order.subtotal,
  commissionRate: `${commissionRate}%`,
  platformFee,
  artisanAmount
});
```

**Applied To:**
- ✅ Wallet orders (delivered/picked_up)
- ✅ Card orders (payment capture)
- ✅ Guest orders (completion)
- ✅ Revenue analytics (stored in revenues collection)

---

## Technical Implementation

### Backend Routes

**1. Update Commission Rate**
```javascript
// backend/routes/admin/index.js
PATCH /api/admin/artisans/:id/commission-rate

Body: {
  commissionRate: 12.5  // 0-100
}

Response: {
  success: true,
  message: 'Commission rate updated successfully',
  data: { commissionRate: 12.5 }
}
```

**Validation:**
- Required field
- Must be a number
- Range: 0-100
- Stored in `artisan.financial.commissionRate`

---

### Frontend Service

**1. Admin Service Method**
```javascript
// frontend/src/services/adminService.js
export const updateArtisanCommissionRate = async (artisanId, commissionRate) => {
  const response = await api.patch(
    `${API_URL}/admin/artisans/${artisanId}/commission-rate`, 
    { commissionRate },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.data;
};
```

**2. Admin UI Component**
```javascript
// frontend/src/components/AdminArtisanManagement.jsx
- State management for editing mode
- Load platform default rate
- Input validation
- Optimistic UI updates
- Toast notifications
```

---

## Database Schema

### Artisan Collection
```json
{
  "_id": "...",
  "artisanName": "Ramzna's Bakery",
  "financial": {
    "commissionRate": 12.5,  // Individual rate (can differ from platform default)
    "stripeAccountId": null,
    "currency": "CAD"
  }
}
```

### Revenue Collection (Analytics)
```json
{
  "_id": "...",
  "orderId": "...",
  "artisanId": "...",
  "totalAmount": 100.00,
  "subtotal": 90.00,
  "commissionRate": 12.5,  // Stored for historical accuracy
  "platformFee": 11.25,    // 90 * 0.125
  "artisanAmount": 78.75,  // 90 - 11.25
  "recognizedAt": "2025-10-18T..."
}
```

---

## Files Modified

### Backend
1. **`backend/routes/admin/index.js`**
   - Added `PATCH /artisans/:id/commission-rate` endpoint
   - Line 2175-2233

2. **`backend/routes/orders/index.js`**
   - Updated revenue calculation (wallet orders)
   - Line 2616-2620, 2653
   - Updated revenue calculation (card orders)
   - Line 2687-2698, 2737
   - Updated revenue calculation (guest orders)
   - Line 2847-2851, 2877

3. **`backend/utils/artisanSchemaUtils.js`**
   - Already fetches platform commission rate on artisan creation
   - Line 198-208, 264

### Frontend
4. **`frontend/src/services/adminService.js`**
   - Added `updateArtisanCommissionRate` method
   - Line 196-211

5. **`frontend/src/components/AdminArtisanManagement.jsx`**
   - Added commission rate edit UI
   - Line 31-33 (state)
   - Line 171-221 (handlers)
   - Line 672-724 (UI)

---

## Usage Flow

### For New Artisans
```
1. Artisan registers → createUnifiedArtisanProfile()
2. Fetches platform default rate (e.g., 15%)
3. Sets artisan.financial.commissionRate = 15%
4. All orders use 15% commission
```

### For Admin Override
```
1. Admin navigates to /admin/artisans
2. Clicks "View" on artisan
3. Sees commission rate field
4. Clicks "Edit"
5. Changes rate (e.g., 12%)
6. Clicks "Save"
7. Backend validates and updates
8. All future orders use 12% commission
```

### For Order Processing
```
1. Order reaches delivered/picked_up status
2. Backend fetches artisan document
3. Reads artisan.financial.commissionRate (e.g., 12%)
4. Calculates: platformFee = subtotal * 0.12
5. Calculates: artisanAmount = subtotal - platformFee
6. Credits artisan wallet
7. Records in revenues collection with commissionRate
```

---

## Benefits

### ✅ Flexibility
- Different rates for different artisans
- Negotiate custom rates for high-volume sellers
- Promotional rates for new artisans

### ✅ Transparency
- Admin sees both individual and default rates
- Analytics include commission rate used
- Historical accuracy preserved

### ✅ Scalability
- Easy to implement tiered pricing
- Can add automation rules later
- Performance-based rate adjustments

---

## Testing Checklist

- [x] New artisan gets platform default rate
- [x] Admin can view artisan's commission rate
- [x] Admin can edit commission rate
- [x] Rate validation (0-100%)
- [x] Order uses artisan-specific rate (wallet)
- [x] Order uses artisan-specific rate (card)
- [x] Order uses artisan-specific rate (guest)
- [x] Revenue analytics stores commission rate
- [x] Platform default remains unchanged

---

## Next Steps (Future Enhancements)

1. **Bulk Update Tool**
   - Update rates for multiple artisans at once
   - Filter by category, region, performance

2. **Automated Rate Adjustment**
   - Volume-based: Lower rates for high sellers
   - Performance-based: Lower rates for 5-star artisans
   - Time-based: Promotional rates for new artisans

3. **Rate History**
   - Track commission rate changes over time
   - Analytics: "How did rate changes affect revenue?"

4. **Artisan Notification**
   - Email artisan when their rate changes
   - Dashboard notification for rate updates

---

**Last Updated:** October 18, 2025  
**Status:** ✅ Fully Implemented and Tested  
**Breaking Changes:** None - backward compatible with existing orders

