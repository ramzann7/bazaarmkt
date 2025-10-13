/**
 * Artisan Profile Schema Utilities
 * Unified functions for creating, updating, and managing artisan profiles
 */

const { ObjectId } = require('mongodb');
const redisCacheService = require('../services/redisCacheService');

/**
 * Default artisan hours schedule
 */
const getDefaultHours = () => ({
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '09:00', close: '17:00', closed: false },
  sunday: { open: '09:00', close: '17:00', closed: true }
});

/**
 * Normalize contact information structure
 */
const normalizeContactInfo = (contactInfo = {}) => ({
  phone: contactInfo.phone || '',
  email: contactInfo.email || '',
  website: contactInfo.website || '',
  socialMedia: {
    instagram: contactInfo.socialMedia?.instagram || '',
    facebook: contactInfo.socialMedia?.facebook || '',
    twitter: contactInfo.socialMedia?.twitter || '',
    tiktok: contactInfo.socialMedia?.tiktok || ''
  }
});

/**
 * Normalize address structure
 */
const normalizeAddress = (address = {}) => ({
  street: address.street || '',
  city: address.city || '',
  province: address.province || address.state || '',
  postalCode: address.postalCode || address.zipCode || '',
  country: address.country || 'Canada',
  coordinates: address.coordinates || null
});

/**
 * Generate location object from address for geo queries
 */
const generateLocationFromAddress = (address) => {
  if (address.coordinates && Array.isArray(address.coordinates)) {
    return {
      type: 'Point',
      coordinates: address.coordinates // [longitude, latitude]
    };
  }
  return null;
};

/**
 * Normalize fulfillment settings from legacy delivery options
 */
const normalizeFulfillmentSettings = (deliveryOptions = {}) => {
  // Handle pickup location - could be string or address object
  let pickupLocation = deliveryOptions.pickupLocation;
  
  // If pickupAddress is an object, use it as the location
  if (deliveryOptions.pickupAddress && typeof deliveryOptions.pickupAddress === 'object') {
    pickupLocation = deliveryOptions.pickupAddress;
  }
  
  return {
    methods: {
      pickup: {
        enabled: deliveryOptions.pickup || false,
        location: pickupLocation || null,
        instructions: deliveryOptions.pickupInstructions || '',
        useBusinessAddress: deliveryOptions.pickupUseBusinessAddress !== undefined ? 
          deliveryOptions.pickupUseBusinessAddress : true,
        schedule: deliveryOptions.pickupSchedule || {}
      },
      delivery: {
        enabled: deliveryOptions.delivery || false,
        fee: deliveryOptions.deliveryFee || 0,
        radius: deliveryOptions.deliveryRadius || 10,
        instructions: deliveryOptions.deliveryInstructions || '',
        estimatedTime: deliveryOptions.estimatedDeliveryTime || '1-2 hours'
      },
      professionalDelivery: {
        enabled: deliveryOptions.professionalDelivery?.enabled || false,
        fee: deliveryOptions.professionalDeliveryFee || 
          deliveryOptions.professionalDelivery?.fee || 0,
        providers: deliveryOptions.professionalDelivery?.providers || []
      },
      shipping: {
        enabled: deliveryOptions.shipping || false,
        regions: deliveryOptions.shippingRegions || []
      }
    }
  };
};

/**
 * Create legacy delivery options object for backward compatibility
 */
const createLegacyDeliveryOptions = (fulfillment) => {
  const pickupLocation = fulfillment.methods.pickup.location;
  
  // Generate string representation of location for pickupLocation field
  const pickupLocationString = typeof pickupLocation === 'object' && pickupLocation !== null
    ? `${pickupLocation.street || ''}, ${pickupLocation.city || ''}, ${pickupLocation.state || ''} ${pickupLocation.zipCode || ''}`.trim()
    : pickupLocation || '';
  
  return {
    pickup: fulfillment.methods.pickup.enabled,
    delivery: fulfillment.methods.delivery.enabled,
    shipping: fulfillment.methods.shipping.enabled,
    deliveryFee: fulfillment.methods.delivery.fee,
    professionalDeliveryFee: fulfillment.methods.professionalDelivery.fee,
    pickupSchedule: fulfillment.methods.pickup.schedule,
    pickupLocation: pickupLocationString, // String format for legacy compatibility
    pickupAddress: pickupLocation, // Keep object format for detailed address info
    pickupInstructions: fulfillment.methods.pickup.instructions,
    pickupUseBusinessAddress: fulfillment.methods.pickup.useBusinessAddress,
    deliveryInstructions: fulfillment.methods.delivery.instructions
  };
};

/**
 * Calculate profile completion score (0-100)
 */
const calculateCompletionScore = (profile) => {
  const fields = {
    artisanName: !!profile.artisanName,
    businessName: !!profile.businessName,
    description: !!profile.description && profile.description.length > 20,
    type: !!profile.type,
    category: profile.category?.length > 0,
    contactPhone: !!profile.contactInfo?.phone,
    contactEmail: !!profile.contactInfo?.email,
    address: !!profile.address?.street && !!profile.address?.city,
    profileImage: !!profile.images?.profile || !!profile.profileImage,
    businessImage: !!profile.images?.business || !!profile.businessImage,
    hours: Object.keys(profile.hours?.schedule || profile.artisanHours || {}).length > 0,
    fulfillmentMethods: (profile.fulfillment?.methods?.pickup?.enabled || 
      profile.fulfillment?.methods?.delivery?.enabled || 
      profile.deliveryOptions?.pickup || 
      profile.deliveryOptions?.delivery) || false
  };

  const completedFields = Object.values(fields).filter(Boolean).length;
  const totalFields = Object.keys(fields).length;
  
  return Math.round((completedFields / totalFields) * 100);
};

/**
 * Creates a unified artisan profile for all creation scenarios
 * Clean schema without backward compatibility
 */
const createUnifiedArtisanProfile = async (profileParams, db = null) => {
  const {
    // Required
    userId,
    artisanName,
    type = 'general',
    
    // Optional basic info
    businessName = null,
    description = '',
    category = [],
    
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
    operationDetails = {},
    
    // Creation context
    creationMethod = 'manual', // 'registration' or 'manual'
    
    // Status
    rating = 0,
    isActive = true,
    isVerified = false
  } = profileParams;

  // Get platform commission rate
  let commissionRate = 0.10; // Default fallback
  if (db) {
    try {
      const PlatformSettingsService = require('../services/platformSettingsService');
      const platformSettingsService = new PlatformSettingsService(db);
      commissionRate = await platformSettingsService.getPlatformFeeRate('order');
    } catch (error) {
      console.warn('Failed to fetch platform commission rate, using default:', error.message);
    }
  }

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

  // Create unified profile with clean schema
  const unifiedProfile = {
    user: new ObjectId(userId),
    artisanName: artisanName,
    businessName: businessName || artisanName,
    displayName: displayName,
    type: type,
    description: description,
    category: normalizedCategories,
    
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
      timezone: 'America/Toronto',
      specialHours: []
    },
    
    fulfillment: fulfillment,
    
    operationDetails: {
      productionMethods: operationDetails.productionMethods || '',
      certifications: operationDetails.certifications || [],
      yearsInBusiness: operationDetails.yearsInBusiness || '',
      productionCapacity: operationDetails.productionCapacity || '',
      qualityStandards: operationDetails.qualityStandards || '',
      ingredients: operationDetails.ingredients || ''
    },
    
    financial: {
      stripeAccountId: null,
      payoutSettings: {},
      commissionRate: commissionRate,
      currency: 'CAD'
    },
    
    metrics: {
      rating: rating,
      reviewCount: 0,
      orderCount: 0,
      responseTime: '1-2 hours',
      fulfillmentRate: 1.0
    },
    
    status: {
      isActive: isActive,
      isVerified: isVerified,
      isPremium: false,
      suspensionReason: null,
      verificationLevel: 'basic'
    },
    
    features: {
      spotlightEnabled: false,
      promotionsEnabled: true,
      customBrandingEnabled: false
    },
    
    // Metadata
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    onboardingCompleted: creationMethod === 'manual',
    profileCompletionScore: 0
  };

  // Calculate completion score
  unifiedProfile.profileCompletionScore = calculateCompletionScore(unifiedProfile);

  return unifiedProfile;
};

/**
 * Updates artisan profile with field validation and synchronization
 * Clean schema without backward compatibility
 */
const updateUnifiedArtisanProfile = (currentProfile, updateData) => {
  const updates = {
    ...updateData,
    updatedAt: new Date()
  };

  // Sync display name if business name changed
  if (updates.businessName) {
    updates.displayName = updates.businessName;
  } else if (updates.artisanName && !currentProfile.businessName) {
    updates.displayName = updates.artisanName;
  }

  // Sync category array if type changed
  if (updates.type) {
    const currentCategories = updates.category || currentProfile.category || [];
    if (!currentCategories.includes(updates.type)) {
      updates.category = [updates.type, ...currentCategories];
    }
  }

  // Process image updates - update the images object
  if (updates.profileImage || updates.businessImage || updates.photos || updates.images) {
    const currentImages = currentProfile.images || { profile: null, business: null, gallery: [] };
    updates.images = {
      ...currentImages,
      ...(updates.profileImage !== undefined && { profile: updates.profileImage }),
      ...(updates.businessImage !== undefined && { business: updates.businessImage }),
      ...(updates.photos !== undefined && { gallery: updates.photos }),
      ...(updates.images && updates.images)
    };
    
    // Remove standalone fields from updates
    delete updates.profileImage;
    delete updates.businessImage;
    delete updates.photos;
  }

  // Update hours structure if artisanHours provided
  if (updates.artisanHours) {
    const currentHours = currentProfile.hours || { schedule: {}, timezone: 'America/Toronto', specialHours: [] };
    updates.hours = {
      ...currentHours,
      schedule: updates.artisanHours
    };
    delete updates.artisanHours;
  }

  // Update fulfillment settings
  if (updates.deliveryOptions || updates.fulfillment) {
    const currentFulfillment = currentProfile.fulfillment || { methods: {} };
    let newFulfillment = { ...currentFulfillment };
    
    if (updates.deliveryOptions) {
      newFulfillment = normalizeFulfillmentSettings(updates.deliveryOptions);
    }
    
    if (updates.fulfillment) {
      newFulfillment = {
        ...newFulfillment,
        ...updates.fulfillment
      };
    }
    
    updates.fulfillment = newFulfillment;
    delete updates.deliveryOptions;
  }

  // Update operationDetails
  if (updates.operationDetails) {
    updates.operationDetails = {
      ...(currentProfile.operationDetails || {}),
      ...updates.operationDetails
    };
  }
  
  // Remove operations field if present (use operationDetails only)
  if (updates.operations) {
    if (!updates.operationDetails) {
      updates.operationDetails = updates.operations;
    }
    delete updates.operations;
  }

  // Update metrics structure
  if (updates.rating !== undefined) {
    updates.metrics = {
      ...(currentProfile.metrics || {}),
      rating: updates.rating
    };
    delete updates.rating;
  }

  // Update status structure
  if (updates.isActive !== undefined || updates.isVerified !== undefined) {
    updates.status = {
      ...(currentProfile.status || {}),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      ...(updates.isVerified !== undefined && { isVerified: updates.isVerified })
    };
    delete updates.isActive;
    delete updates.isVerified;
  }

  // Update completion score
  const mergedProfile = { ...currentProfile, ...updates };
  updates.profileCompletionScore = calculateCompletionScore(mergedProfile);

  return updates;
};

/**
 * Gets artisan display information for consumers
 * Uses new unified schema structure
 */
const getArtisanDisplayInfo = (artisan) => {
  if (!artisan) return null;
  
  return {
    id: artisan._id,
    name: artisan.displayName || artisan.businessName || artisan.artisanName,
    artisanName: artisan.artisanName,
    businessName: artisan.businessName,
    description: artisan.description || '',
    image: artisan.images?.profile,
    businessImage: artisan.images?.business,
    rating: artisan.metrics?.rating || 0,
    reviewCount: artisan.metrics?.reviewCount || 0,
    isVerified: artisan.status?.isVerified || false,
    isActive: artisan.status?.isActive || false,
    isPremium: artisan.status?.isPremium || false,
    responseTime: artisan.metrics?.responseTime || '1-2 hours',
    type: artisan.type,
    category: artisan.category || [],
    location: {
      city: artisan.address?.city,
      province: artisan.address?.province || artisan.address?.state
    }
  };
};

/**
 * Gets artisan fulfillment options for orders
 * Uses new unified schema structure
 */
const getArtisanFulfillmentOptions = (artisan) => {
  if (!artisan) return { 
    pickup: { enabled: false }, 
    delivery: { enabled: false },
    professionalDelivery: { enabled: false },
    shipping: { enabled: false }
  };
  
  // Support both new unified schema and old schema with intelligent fallback
  return {
    pickup: artisan.fulfillment?.methods?.pickup || {
      enabled: artisan.deliveryOptions?.pickup ?? false,
      location: artisan.pickupLocation || artisan.address,
      instructions: artisan.pickupInstructions || '',
      useBusinessAddress: true,
      schedule: artisan.pickupSchedule || {}
    },
    delivery: artisan.fulfillment?.methods?.delivery || {
      enabled: artisan.deliveryOptions?.delivery ?? false,
      fee: artisan.deliveryOptions?.deliveryFee ?? 0,
      radius: artisan.deliveryOptions?.deliveryRadius ?? 10,
      freeThreshold: artisan.deliveryOptions?.freeDeliveryThreshold ?? 0,
      instructions: artisan.deliveryInstructions || ''
    },
    professionalDelivery: artisan.fulfillment?.methods?.professionalDelivery || {
      enabled: artisan.professionalDelivery?.enabled ?? artisan.deliveryOptions?.professionalDelivery?.enabled ?? false,
      fee: artisan.deliveryOptions?.professionalDeliveryFee ?? artisan.professionalDelivery?.fee ?? 0,
      serviceRadius: artisan.professionalDelivery?.serviceRadius ?? 25,
      uberDirectEnabled: artisan.professionalDelivery?.uberDirectEnabled ?? false,
      regions: artisan.professionalDelivery?.regions ?? [],
      packaging: artisan.professionalDelivery?.packaging ?? '',
      restrictions: artisan.professionalDelivery?.restrictions ?? '',
      providers: artisan.professionalDelivery?.providers ?? []
    },
    shipping: artisan.fulfillment?.methods?.shipping || {
      enabled: artisan.deliveryOptions?.shipping ?? false,
      regions: artisan.shippingRegions || []
    }
  };
};

/**
 * Get delivery fee for a specific delivery method
 * Handles both old and new schema
 * @param {Object} artisan - Artisan document
 * @param {String} deliveryMethod - 'personalDelivery' or 'professionalDelivery'
 * @returns {Number} Delivery fee
 */
const getDeliveryFee = (artisan, deliveryMethod) => {
  if (!artisan || !deliveryMethod) return 0;
  
  const fulfillmentOptions = getArtisanFulfillmentOptions(artisan);
  
  if (deliveryMethod === 'personalDelivery') {
    return fulfillmentOptions.delivery.fee || 0;
  } else if (deliveryMethod === 'professionalDelivery') {
    return fulfillmentOptions.professionalDelivery.fee || 0;
  }
  
  return 0;
};

/**
 * Cached artisan lookup with standardized projection
 */
const getCachedArtisanById = async (db, artisanId, includeFinancial = false) => {
  if (!artisanId || !ObjectId.isValid(artisanId)) {
    return null;
  }

  const cacheKey = `artisan:${artisanId}:${includeFinancial ? 'full' : 'public'}`;
  
  try {
    // Try cache first
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheError) {
    console.warn('Cache lookup failed:', cacheError.message);
  }

  const projection = {
    // Core identity fields
    artisanName: 1,
    businessName: 1,
    displayName: 1,
    description: 1,
    type: 1,
    category: 1,
    
    // Contact & location
    contactInfo: 1,
    address: 1,
    location: 1,
    
    // New unified structure
    images: 1,
    hours: 1,
    fulfillment: 1,
    operationDetails: 1,
    metrics: 1,
    status: 1,
    features: 1,
    
    // Metadata
    createdAt: 1,
    updatedAt: 1,
    lastActiveAt: 1,
    onboardingCompleted: 1,
    profileCompletionScore: 1,
    
    // Conditionally include financial data
    ...(includeFinancial && {
      financial: 1
    })
  };

  try {
    const artisan = await db.collection('artisans').findOne(
      { _id: new ObjectId(artisanId) },
      { projection }
    );

    if (artisan) {
      // Cache for 5 minutes
      try {
        await redisCacheService.set(cacheKey, JSON.stringify(artisan), 300);
      } catch (cacheError) {
        console.warn('Cache set failed:', cacheError.message);
      }
    }

    return artisan;
  } catch (error) {
    console.error('Error fetching artisan by ID:', error);
    return null;
  }
};

/**
 * Invalidate artisan cache entries
 */
const invalidateArtisanCache = async (artisanId) => {
  if (!artisanId) return;
  
  try {
    await Promise.all([
      redisCacheService.del(`artisan:${artisanId}:public`),
      redisCacheService.del(`artisan:${artisanId}:full`)
    ]);
  } catch (error) {
    console.warn('Failed to invalidate artisan cache:', error.message);
  }
};

/**
 * Get multiple artisans with caching
 */
const getCachedArtisansByIds = async (db, artisanIds, includeFinancial = false) => {
  if (!Array.isArray(artisanIds) || artisanIds.length === 0) {
    return [];
  }

  const validIds = artisanIds.filter(id => id && ObjectId.isValid(id));
  if (validIds.length === 0) return [];

  // Try to get from cache first
  const cachedArtisans = [];
  const uncachedIds = [];

  for (const id of validIds) {
    const cached = await getCachedArtisanById(db, id, includeFinancial);
    if (cached) {
      cachedArtisans.push(cached);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached artisans
  let uncachedArtisans = [];
  if (uncachedIds.length > 0) {
    const projection = {
      artisanName: 1, businessName: 1, displayName: 1, description: 1,
      type: 1, category: 1, address: 1, images: 1, hours: 1, fulfillment: 1,
      operationDetails: 1, metrics: 1, status: 1, features: 1,
      createdAt: 1, updatedAt: 1, profileCompletionScore: 1,
      ...(includeFinancial && { financial: 1 })
    };

    uncachedArtisans = await db.collection('artisans').find(
      { _id: { $in: uncachedIds.map(id => new ObjectId(id)) } },
      { projection }
    ).toArray();

    // Cache the results
    for (const artisan of uncachedArtisans) {
      const cacheKey = `artisan:${artisan._id}:${includeFinancial ? 'full' : 'public'}`;
      try {
        await redisCacheService.set(cacheKey, JSON.stringify(artisan), 300);
      } catch (error) {
        console.warn('Failed to cache artisan:', error.message);
      }
    }
  }

  return [...cachedArtisans, ...uncachedArtisans];
};

module.exports = {
  // Schema creation and updates
  createUnifiedArtisanProfile,
  updateUnifiedArtisanProfile,
  
  // Consumer helpers
  getArtisanDisplayInfo,
  getArtisanFulfillmentOptions,
  getDeliveryFee,
  
  // Caching utilities
  getCachedArtisanById,
  getCachedArtisansByIds,
  invalidateArtisanCache,
  
  // Utility functions
  getDefaultHours,
  normalizeContactInfo,
  normalizeAddress,
  generateLocationFromAddress,
  normalizeFulfillmentSettings,
  createLegacyDeliveryOptions,
  calculateCompletionScore
};
