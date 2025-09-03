const mongoose = require('mongoose');

const promotionalFeatureSchema = new mongoose.Schema({
  // Feature details
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Feature type - Updated for new system
  featureType: {
    type: String,
    enum: ['featured_product', 'sponsored_product', 'artisan_spotlight', 'category_promotion', 'search_boost', 'homepage_featured'],
    required: true
  },
  
  // Duration and scheduling
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false // Changed to false, requires admin approval
  },
  
  // Pricing - Updated for new system
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Feature duration in days
  durationDays: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
  },
  transactionId: String,
  paymentDate: Date,
  
  // Feature specifications - Enhanced for new system
  specifications: {
    placement: {
      type: String,
      enum: ['homepage', 'category_page', 'search_results', 'product_page', 'email_newsletter', 'social_media'],
      required: true
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    customText: String,
    customImage: String,
    targetAudience: [String],
    geographicTarget: {
      type: String,
      enum: ['local', 'regional', 'national', 'international'],
      default: 'local'
    },
    // New fields for enhanced targeting
    searchKeywords: [String], // For sponsored products
    categoryBoost: [String], // Categories to boost in
    proximityBoost: {
      type: Boolean,
      default: true // Boost for nearby users
    }
  },
  
  // Performance tracking - Enhanced
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }, // Click-through rate
    cpc: { type: Number, default: 0 }, // Cost per click
    searchAppearances: { type: Number, default: 0 }, // For sponsored products
    searchClicks: { type: Number, default: 0 }, // For sponsored products
    searchCTR: { type: Number, default: 0 } // Search click-through rate
  },
  
  // Status and approval - Enhanced workflow
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'active', 'paused', 'completed', 'cancelled', 'expired'],
    default: 'pending_approval'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Auto-expiration handling
  autoExpire: {
    type: Boolean,
    default: true
  },
  lastProcessed: {
    type: Date,
    default: Date.now
  },
  
  // Notes
  notes: String,
  
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
promotionalFeatureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate performance metrics
promotionalFeatureSchema.methods.calculatePerformance = function() {
  if (this.performance.impressions > 0) {
    this.performance.ctr = (this.performance.clicks / this.performance.impressions) * 100;
  }
  if (this.performance.clicks > 0) {
    this.performance.cpc = this.price / this.performance.clicks;
  }
  if (this.performance.searchAppearances > 0) {
    this.performance.searchCTR = (this.performance.searchClicks / this.performance.searchAppearances) * 100;
  }
};

// Check if feature is active and not expired
promotionalFeatureSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.isActive === true && 
         this.startDate <= now && 
         this.endDate >= now;
};

// Get remaining days
promotionalFeatureSchema.methods.getRemainingDays = function() {
  const now = new Date();
  if (this.endDate <= now) return 0;
  const diffTime = this.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate ROI
promotionalFeatureSchema.methods.calculateROI = function() {
  if (this.price === 0) return 0;
  return ((this.performance.revenue - this.price) / this.price) * 100;
};

// Indexes for better performance
promotionalFeatureSchema.index({ featureType: 1, status: 1, isActive: 1 });
promotionalFeatureSchema.index({ productId: 1, status: 1 });
promotionalFeatureSchema.index({ artisanId: 1, status: 1 });
promotionalFeatureSchema.index({ startDate: 1, endDate: 1 });
promotionalFeatureSchema.index({ 'specifications.placement': 1, status: 1 });
promotionalFeatureSchema.index({ status: 1, isActive: 1, endDate: 1 });

module.exports = mongoose.model('PromotionalFeature', promotionalFeatureSchema);
