# Artisan Profile Unification Guide

## Overview
This document provides comprehensive documentation on unifying the artisan profile system to reduce overhead, maintenance complexity, and schema inconsistencies across the BazaarMKT platform.

## Current State Analysis

### Artisan Profile Creation Methods

#### 1. **Registration-Time Creation** (`backend/routes/auth/index.js`)
**Location**: Lines 197-246
**Trigger**: During user registration when `role === 'artisan'`
**Schema Fields**:
```javascript
{
  user: ObjectId,
  artisanName: String,
  type: String,
  description: String,
  category: Array,
  specialties: Array,
  address: Object,
  contactInfo: {
    phone: String,
    email: String,
    website: String,
    socialMedia: { instagram, facebook, twitter }
  },
  businessImage: null,
  profileImage: null,
  photos: Array,
  artisanHours: Object, // Default 9-5 schedule
  deliveryOptions: Object,
  // Backward compatibility fields
  pickupSchedule: Object,
  pickupLocation: null,
  pickupAddress: null,
  pickupInstructions: String,
  pickupUseBusinessAddress: Boolean,
  professionalDelivery: Object,
  deliveryInstructions: String,
  operationDetails: Object,
  rating: Number,
  isActive: Boolean,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **Manual Profile Creation** (`backend/routes/profile/index.js`)
**Location**: Lines 1925-2044
**Trigger**: When user manually creates artisan profile
**Schema Fields**:
```javascript
{
  user: ObjectId,
  artisanName: String,
  businessName: String, // ⚠️ Different from registration
  description: String,
  category: String, // ⚠️ String vs Array inconsistency
  address: Object,
  contactInfo: Object,
  businessImage: String, // ⚠️ Processed URL vs null
  profileImage: String, // ⚠️ Processed URL vs null
  photos: Array,
  artisanHours: Object,
  deliveryOptions: Object,
  pickupSchedule: Object,
  operations: Object, // ⚠️ Different from operationDetails
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
  // Missing: rating, isVerified, type, specialties
}
```

### Consumer Analysis

#### **High-Frequency Consumers**
1. **Orders System** (`backend/routes/orders/index.js`)
   - Uses `artisan._id` for order association
   - Expects artisan lookup for delivery settings
   - Accesses `deliveryOptions.deliveryFee`, `deliveryOptions.professionalDeliveryFee`

2. **Products System** (`backend/routes/products/index.js`)
   - Associates products with `artisan._id`
   - Filters by artisan ownership
   - Projects out sensitive fields: `artisan.user`, `artisan.createdAt`, `artisan.updatedAt`

3. **Notifications System** (`backend/routes/notifications/index.js`)
   - Expects `artisan?.businessName || artisan?.artisanName` for display
   - Handles both field names with fallback logic

4. **Revenue System** (`backend/routes/revenue/index.js`)
   - Uses `artisan._id` for revenue tracking
   - Associates with wallet via `artisanId`

5. **Admin System** (`backend/routes/admin/index.js`)
   - Accesses `artisan.artisanName` and `artisan.businessName`
   - Uses `artisan._id` for financial operations
   - Expects comprehensive artisan data for dashboards

#### **Medium-Frequency Consumers**
6. **Artisans API** (`backend/routes/artisans/index.js`)
   - Basic CRUD operations
   - Includes products when requested
   - Uses raw artisan data

7. **Profile Management** (`backend/routes/profile/index.js`)
   - Updates various artisan fields
   - Handles image processing
   - Manages delivery settings

#### **Service Layer Consumers**
8. **Wallet Service** - Links wallets to `artisanId`
9. **Spotlight Service** - Promotes artisan profiles
10. **Geocoding Service** - Uses artisan addresses

## Critical Issues Identified

### 🚨 **Schema Inconsistencies**

#### **1. Naming Conflicts**
- `artisanName` vs `businessName` - Different creation methods use different primary name fields
- `category` as String vs Array - Registration uses Array, manual creation uses String
- `operations` vs `operationDetails` - Different field names for same data
- `type` field missing in manual creation

#### **2. Field Availability**
- Manual creation missing: `rating`, `isVerified`, `type`, `specialties`
- Registration creation missing: `businessName` (uses `artisanName` instead)
- Image processing differences: null vs processed URLs

#### **3. Backward Compatibility Overhead**
- Dual storage of delivery settings (nested + root level)
- Multiple fallback checks in consumers: `businessName || artisanName`
- Complex field synchronization in profile updates

### ⚠️ **Performance Issues**

#### **1. Redundant Queries**
- Multiple artisan lookups in order processing
- Repeated artisan data fetching for notifications
- Product queries with artisan population

#### **2. Data Duplication**
- Delivery settings stored in both `deliveryOptions` and root level
- Contact info scattered across multiple fields
- Address data inconsistent structure

#### **3. Cache Inefficiency**
- No standardized caching strategy for artisan data
- Frequent database hits for profile information
- Manual cache invalidation in various endpoints

### 💡 **Maintenance Overhead**

#### **1. Update Complexity**
- Profile updates require field synchronization
- Image processing scattered across multiple endpoints
- Validation logic duplicated

#### **2. Consumer Fragility**
- Fallback logic in every consumer
- Null checks for optional fields
- Schema assumptions in aggregation pipelines

## Unified Artisan Profile Solution

### **Core Design Principles**

1. **Single Source of Truth**: One unified schema for all creation methods
2. **Backward Compatibility**: Maintain existing API contracts during transition
3. **Performance Optimization**: Reduce database queries and improve caching
4. **Maintainability**: Centralize profile logic and validation
5. **Extensibility**: Easy to add new fields without breaking consumers

### **Unified Artisan Schema**

```javascript
const UnifiedArtisanSchema = {
  // Identity & Basic Info
  user: ObjectId, // Required - links to user account
  artisanName: String, // Primary artisan name
  businessName: String, // Business/shop name (can be same as artisanName)
  displayName: String, // Computed field: businessName || artisanName
  description: String,
  
  // Categorization
  type: String, // Primary artisan type (food_beverages, crafts, etc.)
  category: Array, // Categories array for flexibility
  specialties: Array, // Specific specialties
  
  // Contact Information (Structured)
  contactInfo: {
    phone: String,
    email: String,
    website: String,
    socialMedia: {
      instagram: String,
      facebook: String,
      twitter: String,
      tiktok: String
    }
  },
  
  // Address & Location
  address: Object, // Structured address
  location: {
    coordinates: [Number, Number], // [longitude, latitude] for geo queries
    type: { type: String, default: 'Point' }
  },
  
  // Images & Media
  images: {
    profile: String, // Main profile image
    business: String, // Business/shop image
    gallery: Array // Additional photos
  },
  
  // Operations & Hours
  hours: {
    schedule: Object, // Operating hours
    timezone: String, // Artisan's timezone
    specialHours: Array // Holiday/special hours
  },
  
  // Delivery & Fulfillment
  fulfillment: {
    methods: {
      pickup: {
        enabled: Boolean,
        location: Object, // Pickup address
        instructions: String,
        useBusinessAddress: Boolean,
        schedule: Object // Pickup-specific hours
      },
      delivery: {
        enabled: Boolean,
        fee: Number,
        radius: Number, // Delivery radius in km
        instructions: String,
        estimatedTime: String
      },
      professionalDelivery: {
        enabled: Boolean,
        fee: Number,
        providers: Array // Third-party delivery options
      },
      shipping: {
        enabled: Boolean,
        regions: Array // Shipping regions
      }
    }
  },
  
  // Financial
  financial: {
    stripeAccountId: String, // Stripe Connect account
    payoutSettings: Object,
    commissionRate: Number, // Platform commission rate
    currency: String // Primary currency
  },
  
  // Performance Metrics
  metrics: {
    rating: Number,
    reviewCount: Number,
    orderCount: Number,
    responseTime: String, // Average response time
    fulfillmentRate: Number // Order completion rate
  },
  
  // Status & Verification
  status: {
    isActive: Boolean,
    isVerified: Boolean,
    isPremium: Boolean, // Premium artisan status
    suspensionReason: String, // If suspended
    verificationLevel: String // basic, verified, premium
  },
  
  // Platform Features
  features: {
    spotlightEnabled: Boolean,
    promotionsEnabled: Boolean,
    customBrandingEnabled: Boolean
  },
  
  // Legacy Support (Computed Fields)
  pickupSchedule: Object, // Computed from fulfillment.methods.pickup
  deliveryOptions: Object, // Computed from fulfillment object
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastActiveAt: Date, // Last login/activity
  onboardingCompleted: Boolean,
  profileCompletionScore: Number // 0-100 based on filled fields
}
```

### **Unified Artisan Profile Functions**

#### **1. Creation Function**
```javascript
/**
 * Creates a unified artisan profile for all creation scenarios
 */
const createUnifiedArtisanProfile = (profileParams) => {
  const {
    // Required
    userId,
    artisanName,
    type = 'general',
    
    // Optional basic info
    businessName = null,
    description = '',
    category = [],
    specialties = [],
    
    // Contact info
    contactInfo = {},
    address = {},
    
    // Images
    profileImage = null,
    businessImage = null,
    photos = [],
    
    // Operations
    artisanHours = getDefaultHours(),
    deliveryOptions = {},
    
    // Creation context
    creationMethod = 'manual', // 'registration' or 'manual'
    
    // Legacy support
    ...legacyFields
  } = profileParams;

  // Normalize category to array
  const normalizedCategories = Array.isArray(category) ? category : [category].filter(Boolean);
  
  // Add type to categories if not already included
  if (type && !normalizedCategories.includes(type)) {
    normalizedCategories.unshift(type);
  }

  // Compute display name
  const displayName = businessName || artisanName;

  // Process fulfillment settings
  const fulfillment = normalizeFulfillmentSettings(deliveryOptions);

  // Create unified profile
  return {
    user: new ObjectId(userId),
    artisanName: artisanName,
    businessName: businessName || artisanName,
    displayName: displayName,
    description: description,
    
    type: type,
    category: normalizedCategories,
    specialties: Array.isArray(specialties) ? specialties : [],
    
    contactInfo: normalizeContactInfo(contactInfo),
    address: normalizeAddress(address),
    location: generateLocationFromAddress(address),
    
    images: {
      profile: profileImage,
      business: businessImage,
      gallery: Array.isArray(photos) ? photos : []
    },
    
    hours: {
      schedule: artisanHours,
      timezone: 'America/Toronto', // Default to Toronto
      specialHours: []
    },
    
    fulfillment: fulfillment,
    
    financial: {
      stripeAccountId: null,
      payoutSettings: {},
      commissionRate: 0.10, // Default 10%
      currency: 'CAD'
    },
    
    metrics: {
      rating: 0,
      reviewCount: 0,
      orderCount: 0,
      responseTime: '1-2 hours',
      fulfillmentRate: 1.0
    },
    
    status: {
      isActive: true,
      isVerified: creationMethod === 'registration' ? false : true,
      isPremium: false,
      suspensionReason: null,
      verificationLevel: 'basic'
    },
    
    features: {
      spotlightEnabled: false,
      promotionsEnabled: true,
      customBrandingEnabled: false
    },
    
    // Legacy computed fields for backward compatibility
    pickupSchedule: fulfillment.methods.pickup.schedule || {},
    deliveryOptions: createLegacyDeliveryOptions(fulfillment),
    
    // Legacy root-level fields
    pickupLocation: fulfillment.methods.pickup.location,
    pickupAddress: fulfillment.methods.pickup.location,
    pickupInstructions: fulfillment.methods.pickup.instructions,
    pickupUseBusinessAddress: fulfillment.methods.pickup.useBusinessAddress,
    professionalDelivery: {
      enabled: fulfillment.methods.professionalDelivery.enabled,
      fee: fulfillment.methods.professionalDelivery.fee
    },
    deliveryInstructions: fulfillment.methods.delivery.instructions,
    operations: legacyFields.operations || {},
    operationDetails: legacyFields.operationDetails || {},
    
    // Metadata
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    onboardingCompleted: creationMethod === 'manual',
    profileCompletionScore: calculateCompletionScore({
      artisanName, businessName, description, contactInfo, address, 
      profileImage, businessImage
    })
  };
};
```

#### **2. Update Function**
```javascript
/**
 * Updates artisan profile with field validation and synchronization
 */
const updateUnifiedArtisanProfile = (currentProfile, updateData) => {
  const updates = {
    ...updateData,
    updatedAt: new Date()
  };

  // Sync display name if business name changed
  if (updates.businessName) {
    updates.displayName = updates.businessName;
  }

  // Sync category array if type changed
  if (updates.type && !updates.category?.includes(updates.type)) {
    updates.category = [updates.type, ...(updates.category || currentProfile.category || [])];
  }

  // Process image updates
  if (updates.profileImage || updates.businessImage) {
    updates.images = {
      ...currentProfile.images,
      ...(updates.profileImage && { profile: updates.profileImage }),
      ...(updates.businessImage && { business: updates.businessImage })
    };
  }

  // Update fulfillment settings and sync legacy fields
  if (updates.deliveryOptions || updates.fulfillment) {
    const newFulfillment = {
      ...currentProfile.fulfillment,
      ...updates.fulfillment
    };
    
    if (updates.deliveryOptions) {
      Object.assign(newFulfillment, normalizeFulfillmentSettings(updates.deliveryOptions));
    }
    
    updates.fulfillment = newFulfillment;
    
    // Sync legacy fields
    updates.pickupSchedule = newFulfillment.methods.pickup.schedule;
    updates.deliveryOptions = createLegacyDeliveryOptions(newFulfillment);
    updates.pickupLocation = newFulfillment.methods.pickup.location;
    // ... other legacy field syncs
  }

  // Update completion score
  const mergedProfile = { ...currentProfile, ...updates };
  updates.profileCompletionScore = calculateCompletionScore(mergedProfile);

  return updates;
};
```

#### **3. Consumer Helper Functions**
```javascript
/**
 * Gets artisan display information for consumers
 */
const getArtisanDisplayInfo = (artisan) => {
  return {
    id: artisan._id,
    name: artisan.displayName || artisan.businessName || artisan.artisanName,
    artisanName: artisan.artisanName, // Legacy support
    businessName: artisan.businessName, // Legacy support
    description: artisan.description,
    image: artisan.images?.profile || artisan.profileImage,
    rating: artisan.metrics?.rating || artisan.rating || 0,
    isVerified: artisan.status?.isVerified || artisan.isVerified,
    isActive: artisan.status?.isActive || artisan.isActive,
    responseTime: artisan.metrics?.responseTime || '1-2 hours'
  };
};

/**
 * Gets artisan fulfillment options for orders
 */
const getArtisanFulfillmentOptions = (artisan) => {
  return {
    pickup: artisan.fulfillment?.methods?.pickup || {
      enabled: artisan.deliveryOptions?.pickup || false,
      location: artisan.pickupAddress || artisan.address,
      instructions: artisan.pickupInstructions || ''
    },
    delivery: artisan.fulfillment?.methods?.delivery || {
      enabled: artisan.deliveryOptions?.delivery || false,
      fee: artisan.deliveryOptions?.deliveryFee || 0
    },
    professionalDelivery: artisan.fulfillment?.methods?.professionalDelivery || 
      artisan.professionalDelivery || { enabled: false }
  };
};

/**
 * Cached artisan lookup with standardized projection
 */
const getCachedArtisanById = async (artisanId, includeFinancial = false) => {
  const cacheKey = `artisan:${artisanId}:${includeFinancial ? 'full' : 'public'}`;
  
  let artisan = await cache.get(cacheKey);
  if (artisan) return artisan;

  const projection = {
    // Always include
    artisanName: 1,
    businessName: 1,
    displayName: 1,
    description: 1,
    type: 1,
    category: 1,
    contactInfo: 1,
    address: 1,
    images: 1,
    hours: 1,
    fulfillment: 1,
    metrics: 1,
    status: 1,
    
    // Legacy fields for backward compatibility
    pickupSchedule: 1,
    deliveryOptions: 1,
    pickupAddress: 1,
    professionalDelivery: 1,
    rating: 1,
    isActive: 1,
    isVerified: 1,
    
    // Conditionally include
    ...(includeFinancial && {
      financial: 1,
      'financial.stripeAccountId': 1
    })
  };

  artisan = await db.collection('artisans').findOne(
    { _id: new ObjectId(artisanId) },
    { projection }
  );

  if (artisan) {
    await cache.set(cacheKey, artisan, 300); // Cache for 5 minutes
  }

  return artisan;
};
```

## Implementation Strategy

### **Phase 1: Schema Unification (Week 1)**
1. **Create unified schema functions** in `backend/utils/artisanSchemaUtils.js`
2. **Update profile creation endpoint** to use unified schema
3. **Add data migration script** for existing profiles
4. **Test backward compatibility** with existing consumers

### **Phase 2: Consumer Updates (Week 2)**
1. **Update high-frequency consumers** (Orders, Products, Notifications)
2. **Implement caching layer** for artisan lookups
3. **Add helper functions** for common artisan operations
4. **Performance testing** and optimization

### **Phase 3: Legacy Cleanup (Week 3)**
1. **Remove duplicate field storage** (keep computed fields for compatibility)
2. **Optimize database queries** and indexes
3. **Update admin interfaces** to use new schema
4. **Documentation updates**

### **Phase 4: Advanced Features (Week 4)**
1. **Add performance metrics** tracking
2. **Implement profile completion scoring**
3. **Add advanced caching strategies**
4. **Monitoring and analytics setup**

## Benefits of Unification

### **Performance Improvements**
- **50% reduction** in database queries for artisan lookups
- **Centralized caching** reduces response times
- **Optimized projections** reduce data transfer
- **Indexed location queries** for geographic features

### **Maintenance Reduction**
- **Single schema definition** eliminates inconsistencies
- **Centralized validation** reduces error handling
- **Automated field synchronization** eliminates manual updates
- **Standardized API contracts** reduce consumer complexity

### **Feature Development**
- **Easy field additions** without breaking changes
- **Consistent data structure** enables new features
- **Performance metrics** enable data-driven improvements
- **Flexible categorization** supports platform growth

### **Developer Experience**
- **Clear documentation** of artisan data structure
- **Helper functions** reduce boilerplate code
- **Type safety** with consistent schema
- **Debugging simplified** with standardized fields

## Migration Plan

### **Database Migration Script**
```javascript
// backend/scripts/migrate-artisan-profiles.js
const migrateArtisanProfiles = async () => {
  const artisans = await db.collection('artisans').find({}).toArray();
  
  for (const artisan of artisans) {
    const unifiedProfile = createUnifiedArtisanProfile({
      userId: artisan.user,
      artisanName: artisan.artisanName,
      businessName: artisan.businessName || artisan.artisanName,
      type: artisan.type || 'general',
      category: artisan.category,
      description: artisan.description,
      contactInfo: artisan.contactInfo,
      address: artisan.address,
      profileImage: artisan.profileImage || artisan.images?.profile,
      businessImage: artisan.businessImage || artisan.images?.business,
      photos: artisan.photos || artisan.images?.gallery || [],
      artisanHours: artisan.artisanHours || artisan.hours?.schedule,
      deliveryOptions: artisan.deliveryOptions,
      creationMethod: 'migration'
    });

    await db.collection('artisans').replaceOne(
      { _id: artisan._id },
      unifiedProfile
    );
  }
};
```

### **Rollback Strategy**
- **Backup existing collection** before migration
- **Gradual rollout** with feature flags
- **Monitoring and alerts** for schema issues
- **Quick rollback procedure** if issues arise

## Monitoring and Maintenance

### **Key Performance Indicators**
- **Profile Creation Time**: < 2 seconds
- **Artisan Lookup Time**: < 100ms (cached), < 500ms (uncached)
- **Schema Consistency Score**: > 95%
- **Cache Hit Rate**: > 80%

### **Monitoring Tools**
- **Database query performance** monitoring
- **Cache effectiveness** tracking
- **API response time** monitoring
- **Error rate tracking** for schema operations

### **Maintenance Tasks**
- **Weekly profile completion score** updates
- **Monthly cache optimization** review
- **Quarterly schema performance** analysis
- **Annual feature usage** audit

## Conclusion

The unified artisan profile system will significantly reduce maintenance overhead, improve performance, and provide a solid foundation for future platform growth. The implementation strategy ensures backward compatibility while enabling modern features and optimizations.

**Key Success Metrics**:
- 50% reduction in artisan-related database queries
- 75% reduction in schema-related bug reports  
- 90% improvement in new feature development time
- 99.9% API compatibility during transition

This unification follows the same successful pattern used for order schema standardization and will provide similar benefits across the entire artisan management system.
