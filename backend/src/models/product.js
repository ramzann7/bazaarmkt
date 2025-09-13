const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Product Type and Management
  productType: {
    type: String,
    enum: ['ready_to_ship', 'made_to_order', 'scheduled_order'],
    required: true,
    default: 'ready_to_ship'
  },
  
  // Ready to Ship Product Fields
  stock: {
    type: Number,
    required: function() { return this.productType === 'ready_to_ship'; },
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    min: 0,
    default: 5
  },
  
  // Made to Order Product Fields
  leadTime: {
    type: Number,
    required: function() { return this.productType === 'made_to_order'; },
    min: 1,
    default: 1
  },
  leadTimeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks'],
    required: function() { return this.productType === 'made_to_order'; },
    default: 'days'
  },

  maxOrderQuantity: {
    type: Number,
    min: 1,
    default: 10
  },
  totalCapacity: {
    type: Number,
    required: function() { return this.productType === 'made_to_order'; },
    min: 1,
    default: 10
  },
  
  // Available quantity for scheduled orders (inventory to be made)
  availableQuantity: {
    type: Number,
    required: function() { return this.productType === 'scheduled_order'; },
    min: 1,
    default: 1
  },
  
  // Scheduled Order Product Fields
  scheduleType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: function() { return this.productType === 'scheduled_order'; }
  },
  scheduleDetails: {
    // For daily/weekly/monthly schedules
    frequency: {
      type: String,
      enum: ['every_day', 'every_week', 'every_month', 'custom']
    },
    // For custom schedules
    customSchedule: [{
      dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 6 = Saturday
      time: String, // Format: "HH:MM"
      enabled: { type: Boolean, default: true }
    }],
    // Cut-off time for orders (how many hours before production)
    orderCutoffHours: {
      type: Number,
      min: 1,
      default: 24
    }
  },
  nextAvailableDate: {
    type: Date,
    required: function() { return this.productType === 'scheduled_order'; }
  },
  nextAvailableTime: {
    type: String,
    required: function() { return this.productType === 'scheduled_order'; },
    default: '09:00'
  },
  
  // Common Inventory Fields
  unit: {
    type: String,
    required: true,
    default: 'piece',
    enum: [
      // Count/Quantity Units
      'piece', 'item', 'unit', 'each', 'dozen', 'half_dozen', 'gross',
      
      // Weight Units (Metric)
      'kg', 'g', 'mg', 'tonne',
      
      // Weight Units (Imperial)
      'lb', 'oz', 'ton',
      
      // Volume Units (Metric)
      'liter', 'ml', 'cl', 'dl',
      
      // Volume Units (Imperial)
      'gallon', 'quart', 'pint', 'cup', 'fl_oz', 'tbsp', 'tsp',
      
      // Length Units
      'meter', 'cm', 'mm', 'inch', 'foot', 'yard',
      
      // Area Units
      'sq_meter', 'sq_cm', 'sq_inch', 'sq_foot',
      
      // Food & Beverage Specific
      'bottle', 'can', 'jar', 'bag', 'box', 'pack', 'case', 'carton',
      'bunch', 'head', 'clove', 'slice', 'serving', 'portion',
      'loaf', 'roll', 'bun', 'muffin', 'cookie', 'cake',
      
      // Liquid Containers
      'bottle_ml', 'bottle_l', 'can_ml', 'can_l',
      
      // Bulk/Wholesale
      'pallet', 'crate', 'barrel', 'drum',
      
      // Time-based (for services)
      'hour', 'day', 'week', 'month', 'session',
      
      // Custom/Artisan
      'set', 'pair', 'collection', 'batch', 'lot'
    ]
  },
  soldCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Product Details
  weight: {
    type: Number,
    min: 0
  },
  expiryDate: {
    type: Date
  },
  
  // Images
  image: {
    type: String // URL or file path
  },
  
  // Tags and Categories
  tags: [{
    type: String,
    trim: true
  }],
  
  // Dietary Preferences
  isOrganic: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isHalal: {
    type: Boolean,
    default: false
  },
  isKosher: {
    type: Boolean,
    default: false
  },
  isDairyFree: {
    type: Boolean,
    default: false
  },
  isNutFree: {
    type: Boolean,
    default: false
  },
  isSoyFree: {
    type: Boolean,
    default: false
  },
  isSugarFree: {
    type: Boolean,
    default: false
  },
  isLowCarb: {
    type: Boolean,
    default: false
  },
  isKetoFriendly: {
    type: Boolean,
    default: false
  },
  isPaleo: {
    type: Boolean,
    default: false
  },
  isRaw: {
    type: Boolean,
    default: false
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'temporarily_unavailable'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Artisan Information (required - replaces seller concept)
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  
  // Promotional Features
  promotionalFeatures: [{
    featureType: {
      type: String,
      enum: ['featured_product', 'sponsored_product'],
      required: true
    },
    promotionalFeatureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromotionalFeature',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validation for product type specific requirements
productSchema.pre('save', function(next) {
  if (this.productType === 'ready_to_ship') {
    if (this.stock === undefined || this.stock < 0) {
      return next(new Error('Ready to ship products must have stock quantity (minimum 0)'));
    }
    // Clear non-applicable fields
    this.totalCapacity = undefined;
    this.availableQuantity = undefined;
    this.leadTime = undefined;
    this.leadTimeUnit = undefined;
    this.scheduleType = undefined;
    this.scheduleDetails = undefined;
    this.nextAvailableDate = undefined;
    this.nextAvailableTime = undefined;
  }
  
  if (this.productType === 'made_to_order') {
    if (!this.leadTime || this.leadTime < 1) {
      return next(new Error('Made to order products must have lead time (minimum 1)'));
    }
    if (!this.leadTimeUnit) {
      return next(new Error('Made to order products must have lead time unit'));
    }
    if (!this.totalCapacity || this.totalCapacity < 1) {
      return next(new Error('Made to order products must have total capacity (minimum 1)'));
    }
    // Clear non-applicable fields
    this.stock = undefined;
    this.lowStockThreshold = undefined;
    this.availableQuantity = undefined;
    this.scheduleType = undefined;
    this.scheduleDetails = undefined;
    this.nextAvailableDate = undefined;
    this.nextAvailableTime = undefined;
  }
  
  if (this.productType === 'scheduled_order') {
    if (!this.nextAvailableDate) {
      return next(new Error('Scheduled order products must have next available date'));
    }
    if (!this.scheduleType) {
      return next(new Error('Scheduled order products must have schedule type'));
    }
    if (!this.availableQuantity || this.availableQuantity < 1) {
      return next(new Error('Scheduled order products must have available quantity (minimum 1)'));
    }
    // Clear non-applicable fields
    this.stock = undefined;
    this.lowStockThreshold = undefined;
    this.totalCapacity = undefined;
    this.leadTime = undefined;
    this.leadTimeUnit = undefined;
  }
  
  next();
});

// Index for better query performance
productSchema.index({ artisan: 1, status: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ productType: 1 });
productSchema.index({ nextAvailableDate: 1 });

module.exports = mongoose.model('Product', productSchema);


