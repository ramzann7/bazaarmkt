# Artisan Schema Compatibility Review
**Date**: October 11, 2025  
**Status**: Critical Issues Found  
**Priority**: High

## Executive Summary

After implementing the unified artisan schema, a comprehensive review has revealed **critical compatibility issues** that will cause the application to malfunction. While the schema unification is complete and working for new profile creation, **several backend update endpoints and all frontend consumers** are still accessing the old schema fields.

### Impact Assessment
- **Severity**: 🔴 Critical
- **Affected Areas**: Backend update endpoints (3), Frontend components (13)
- **User Impact**: Artisan profile updates will fail or show incorrect data
- **Data Risk**: Profile updates may overwrite unified schema with old structure

---

## New Unified Schema Structure

### Core Structure
```javascript
{
  // Identity
  user: ObjectId,
  artisanName: String,
  businessName: String,
  displayName: String, // Computed: businessName || artisanName
  type: String,
  description: String,
  category: Array,
  
  // Structured Objects (NEW)
  images: {
    profile: String,
    business: String,
    gallery: Array
  },
  
  hours: {
    schedule: Object, // Previously artisanHours
    timezone: String,
    specialHours: Array
  },
  
  fulfillment: {
    methods: {
      pickup: { enabled, location, instructions, useBusinessAddress, schedule },
      delivery: { enabled, fee, radius, instructions, estimatedTime },
      professionalDelivery: { enabled, fee, providers },
      shipping: { enabled, regions }
    }
  },
  
  operationDetails: {
    productionMethods: String,
    certifications: Array,
    yearsInBusiness: String,
    productionCapacity: String,
    qualityStandards: String,
    ingredients: String
  },
  
  financial: {
    stripeAccountId: String,
    payoutSettings: Object,
    commissionRate: Number,
    currency: String
  },
  
  metrics: {
    rating: Number,        // Previously root-level
    reviewCount: Number,
    orderCount: Number,
    responseTime: String,
    fulfillmentRate: Number
  },
  
  status: {
    isActive: Boolean,     // Previously root-level
    isVerified: Boolean,   // Previously root-level
    isPremium: Boolean,
    suspensionReason: String,
    verificationLevel: String
  },
  
  features: {
    spotlightEnabled: Boolean,
    promotionsEnabled: Boolean,
    customBrandingEnabled: Boolean
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastActiveAt: Date,
  onboardingCompleted: Boolean,
  profileCompletionScore: Number
}
```

### Field Migration Map
| Old Schema | New Schema | Notes |
|------------|------------|-------|
| `profileImage` | `images.profile` | Root → Nested |
| `businessImage` | `images.business` | Root → Nested |
| `photos` | `images.gallery` | Root → Nested |
| `artisanHours` | `hours.schedule` | Root → Nested |
| `rating` | `metrics.rating` | Root → Nested |
| `isActive` | `status.isActive` | Root → Nested |
| `isVerified` | `status.isVerified` | Root → Nested |
| `deliveryOptions` | `fulfillment.methods` | Restructured |
| `operations` | `operationDetails` | Renamed |

---

## Issues Found

### 🔴 Critical: Backend Update Endpoints

#### 1. **updateArtisanHours** (`/backend/routes/profile/index.js:1306`)
**Issue**: Still sets `artisanHours` directly instead of `hours.schedule`

```javascript
// ❌ Current (WRONG)
updateData.artisanHours = hoursData;

// ✅ Should be
updateData['hours.schedule'] = hoursData;
updateData.updatedAt = new Date();
```

**Impact**: Hours updates won't work with the new schema

---

#### 2. **updateArtisanDelivery** (`/backend/routes/profile/index.js:1369`)
**Issue**: Still sets `deliveryOptions` and root-level fields instead of `fulfillment.methods`

```javascript
// ❌ Current (WRONG)
updateData.deliveryOptions = req.body.deliveryOptions;
updateData.pickupSchedule = opts.pickupSchedule || {};
updateData.pickupLocation = opts.pickupLocation || null;
// ... more root-level fields

// ✅ Should use unified schema update helper
const { updateUnifiedArtisanProfile } = require('../../utils/artisanSchemaUtils');
const updateData = updateUnifiedArtisanProfile(artisan, req.body);
```

**Impact**: Delivery settings won't be properly structured

---

#### 3. **updateArtisanPhotosContact** (`/backend/routes/profile/index.js:1447`)
**Issue**: Still sets `profileImage`, `businessImage`, `photos` at root level instead of `images` object

```javascript
// ❌ Current (WRONG)
updateData.profileImage = processedImage;
updateData.businessImage = processedImage;
updateData.photos = req.body.photos;

// ✅ Should be
updateData['images.profile'] = processedProfileImage;
updateData['images.business'] = processedBusinessImage;
updateData['images.gallery'] = req.body.photos || [];
```

**Impact**: Image updates won't be stored in the unified structure

---

### 🟡 Medium Priority: Frontend Compatibility

#### Frontend Files Accessing Old Schema (13 files)

1. **`frontend/src/components/ArtisanCard.jsx`** (4 accesses)
   - ❌ `artisan.photos?.main || artisan.businessImage`
   - ❌ `artisan.photos?.avatar || artisan.profileImage`
   - ❌ `artisan.rating?.average`
   - ❌ `artisan.rating?.count`

2. **`frontend/src/components/FindArtisans.jsx`** (10 accesses)
   - ❌ `artisan.businessImage`
   - ❌ `artisan.photos`
   - ❌ `artisan.artisanHours`
   - ❌ `artisan.rating`
   - ❌ `artisan.isVerified`

3. **`frontend/src/components/ArtisanTabs.jsx`** 
   - ❌ `profile.businessImage`
   - ❌ `profile.artisanName`
   - ❌ `profile.contactInfo`
   - ❌ `profile.address`

4. **Other affected files**:
   - `Cart.jsx` (2 accesses)
   - `OrderConfirmation.jsx` (3 accesses)
   - `Community.jsx` (3 accesses)
   - `ArtisanShop.jsx` (5 accesses)
   - `SpotlightArtisans.jsx` (2 accesses)
   - `AdminArtisanManagement.jsx` (17 accesses)
   - `Account.jsx` (2 accesses)
   - `deliveryService.js` (2 accesses)
   - `cartService.js` (2 accesses)
   - `enhancedSearchService.js` (1 access)

---

### ✅ Components Working Correctly

1. **Profile Creation** (`backend/routes/auth/index.js`)
   - ✅ Uses `createUnifiedArtisanProfile`
   - ✅ Creates profiles with unified schema

2. **Main Profile Update** (`backend/routes/profile/index.js:1039`)
   - ✅ Uses `updateUnifiedArtisanProfile`
   - ✅ Handles field synchronization correctly

3. **Backend Consumers** (Orders, Products, Notifications, Admin)
   - ✅ Don't directly access changed fields
   - ✅ Will work with both old and new schemas

---

## Solution Strategy

### Phase 1: Backend Fixes (HIGH PRIORITY)

#### Fix 1: Update `updateArtisanHours` endpoint
```javascript
const updateArtisanHours = async (req, res) => {
  // ... existing auth code ...
  
  const { updateUnifiedArtisanProfile, invalidateArtisanCache } = require('../../utils/artisanSchemaUtils');
  
  // Prepare update data
  const rawUpdateData = {};
  
  if (req.body.artisanHours) {
    // Handle double nesting if present
    let hoursData = req.body.artisanHours;
    if (hoursData.artisanHours && typeof hoursData.artisanHours === 'object') {
      hoursData = hoursData.artisanHours;
    }
    rawUpdateData.artisanHours = hoursData;
  }
  
  // Use unified schema update
  const updateData = updateUnifiedArtisanProfile(artisan, rawUpdateData);
  
  await artisansCollection.updateOne(
    { _id: artisan._id },
    { $set: updateData }
  );
  
  // Invalidate cache
  await invalidateArtisanCache(artisan._id.toString());
  
  // ... rest of response ...
};
```

#### Fix 2: Update `updateArtisanDelivery` endpoint
```javascript
const updateArtisanDelivery = async (req, res) => {
  // ... existing auth code ...
  
  const { updateUnifiedArtisanProfile, invalidateArtisanCache } = require('../../utils/artisanSchemaUtils');
  
  // Use unified schema update
  const updateData = updateUnifiedArtisanProfile(artisan, req.body);
  
  await artisansCollection.updateOne(
    { _id: artisan._id },
    { $set: updateData }
  );
  
  // Invalidate cache
  await invalidateArtisanCache(artisan._id.toString());
  
  // ... rest of response ...
};
```

#### Fix 3: Update `updateArtisanPhotosContact` endpoint
```javascript
const updateArtisanPhotosContact = async (req, res) => {
  // ... existing auth code ...
  
  const { updateUnifiedArtisanProfile, invalidateArtisanCache } = require('../../utils/artisanSchemaUtils');
  
  // Process images
  const rawUpdateData = { ...req.body };
  
  if (req.body.businessImage && typeof req.body.businessImage === 'string' && req.body.businessImage.startsWith('data:image')) {
    try {
      rawUpdateData.businessImage = await imageUploadService.handleImageUpload(
        req.body.businessImage,
        'business',
        `business-${decoded.userId}-${Date.now()}.jpg`
      );
    } catch (error) {
      console.error('Business image upload failed:', error);
    }
  }
  
  if (req.body.profileImage && typeof req.body.profileImage === 'string' && req.body.profileImage.startsWith('data:image')) {
    try {
      rawUpdateData.profileImage = await imageUploadService.handleImageUpload(
        req.body.profileImage,
        'profile',
        `profile-${decoded.userId}-${Date.now()}.jpg`
      );
    } catch (error) {
      console.error('Profile image upload failed:', error);
    }
  }
  
  // Use unified schema update
  const updateData = updateUnifiedArtisanProfile(artisan, rawUpdateData);
  
  await artisansCollection.updateOne(
    { _id: artisan._id },
    { $set: updateData }
  );
  
  // Invalidate cache
  await invalidateArtisanCache(artisan._id.toString());
  
  // ... rest of response ...
};
```

---

### Phase 2: Frontend Compatibility Layer (RECOMMENDED)

Instead of updating all 13 frontend files, create a **compatibility layer** that provides getters for old field names.

#### Create `frontend/src/utils/artisanSchemaCompat.js`
```javascript
/**
 * Artisan Schema Compatibility Layer
 * Provides unified access to artisan data regardless of schema version
 */

export const getArtisanImage = (artisan, type = 'business') => {
  if (type === 'business') {
    return artisan.images?.business || artisan.businessImage;
  }
  return artisan.images?.profile || artisan.profileImage;
};

export const getArtisanPhotos = (artisan) => {
  return artisan.images?.gallery || artisan.photos || [];
};

export const getArtisanHours = (artisan) => {
  return artisan.hours?.schedule || artisan.artisanHours || {};
};

export const getArtisanRating = (artisan) => {
  return artisan.metrics?.rating || artisan.rating || 0;
};

export const getArtisanReviewCount = (artisan) => {
  return artisan.metrics?.reviewCount || artisan.rating?.count || 0;
};

export const isArtisanVerified = (artisan) => {
  return artisan.status?.isVerified || artisan.isVerified || false;
};

export const isArtisanActive = (artisan) => {
  return artisan.status?.isActive || artisan.isActive || true;
};

export const getArtisanFulfillment = (artisan) => {
  return artisan.fulfillment?.methods || {
    pickup: { enabled: artisan.deliveryOptions?.pickup || false },
    delivery: { enabled: artisan.deliveryOptions?.delivery || false },
    professionalDelivery: { enabled: artisan.professionalDelivery?.enabled || false },
    shipping: { enabled: artisan.deliveryOptions?.shipping || false }
  };
};

// Main compatibility wrapper
export const wrapArtisanProfile = (artisan) => {
  if (!artisan) return null;
  
  return {
    ...artisan,
    // Add getters for easy access
    $getImage: (type) => getArtisanImage(artisan, type),
    $getPhotos: () => getArtisanPhotos(artisan),
    $getHours: () => getArtisanHours(artisan),
    $getRating: () => getArtisanRating(artisan),
    $getReviewCount: () => getArtisanReviewCount(artisan),
    $isVerified: () => isArtisanVerified(artisan),
    $isActive: () => isArtisanActive(artisan),
    $getFulfillment: () => getArtisanFulfillment(artisan)
  };
};
```

#### Usage in Components
```javascript
import { getArtisanImage, getArtisanRating, isArtisanVerified } from '../utils/artisanSchemaCompat';

// Instead of: artisan.businessImage
const businessImage = getArtisanImage(artisan, 'business');

// Instead of: artisan.rating
const rating = getArtisanRating(artisan);

// Instead of: artisan.isVerified
const verified = isArtisanVerified(artisan);
```

---

## Recommended Implementation Order

### Immediate (Today)
1. ✅ Fix the 3 backend update endpoints
2. ✅ Test artisan profile updates end-to-end
3. ✅ Verify no data corruption occurs

### Short-term (This Week)
4. Create frontend compatibility layer
5. Update high-traffic components (ArtisanCard, FindArtisans)
6. Test user-facing artisan features

### Medium-term (Next Sprint)
7. Gradually migrate all frontend components to use compatibility layer
8. Add TypeScript definitions for artisan schema
9. Update API documentation

### Long-term (Future)
10. Remove compatibility layer and use unified schema everywhere
11. Data migration script for any remaining old-schema profiles
12. Complete backward compatibility removal

---

## Testing Checklist

### Backend Tests
- [ ] Create new artisan profile via registration
- [ ] Update artisan hours
- [ ] Update delivery options
- [ ] Update photos and contact info
- [ ] Verify all fields stored in unified structure
- [ ] Check cache invalidation works

### Frontend Tests
- [ ] View artisan card in marketplace
- [ ] View artisan details page
- [ ] Edit artisan profile in ArtisanTabs
- [ ] Check artisan images display correctly
- [ ] Verify hours display correctly
- [ ] Test delivery options selection

### Integration Tests
- [ ] Create order with artisan products
- [ ] View artisan in admin dashboard
- [ ] Spotlight artisan promotion
- [ ] Search and filter artisans

---

## Risk Assessment

### High Risk
- **Data Corruption**: Old update endpoints may overwrite unified schema
- **UI Breaks**: Frontend may show blank images/data
- **Update Failures**: Profile updates may fail silently

### Medium Risk
- **Cache Inconsistency**: Mixed old/new schema in cache
- **Search Issues**: Old field indexes may not work
- **API Contract Break**: External consumers expecting old fields

### Mitigation
1. Deploy backend fixes immediately
2. Add monitoring for profile update errors
3. Keep compatibility layer long-term
4. Gradual frontend migration

---

## Conclusion

The unified artisan schema is **correctly implemented for creation** but has **critical compatibility issues** in update endpoints and frontend consumers. The backend update endpoints must be fixed immediately to prevent data corruption. The frontend can use a compatibility layer for gradual migration.

**Priority Actions**:
1. 🔴 Fix 3 backend update endpoints (2-3 hours)
2. 🟡 Create frontend compatibility layer (1-2 hours)
3. 🟢 Test end-to-end (1 hour)

**Total Estimated Time**: 4-6 hours for critical fixes

---

**Document Version**: 1.0  
**Last Updated**: October 11, 2025  
**Next Review**: After backend fixes deployed

