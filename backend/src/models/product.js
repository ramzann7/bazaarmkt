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
  
  // Inventory
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'piece',
    enum: ['piece', 'kg', 'lb', 'g', 'oz', 'dozen', 'bunch', 'pack', 'bottle', 'jar']
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
    enum: ['active', 'inactive', 'out_of_stock'],
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
  
  // Lead time for orders
  leadTime: {
    type: Number,
    default: 1,
    min: 0
  },
  leadTimeUnit: {
    type: String,
    enum: ['hours', 'days'],
    default: 'days'
  },
  
  // Artisan Information (required - replaces seller concept)
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  
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

// Index for better query performance
productSchema.index({ artisan: 1, status: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ tags: 1 });

module.exports = mongoose.model('Product', productSchema);


