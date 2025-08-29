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
    ref: 'Product'
  },
  
  // Feature type
  featureType: {
    type: String,
    enum: ['product_featured', 'product_sponsored', 'artisan_spotlight', 'category_promotion', 'search_boost', 'homepage_featured'],
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
    default: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
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
  
  // Feature specifications
  specifications: {
    placement: {
      type: String,
      enum: ['homepage', 'category_page', 'search_results', 'product_page', 'email_newsletter', 'social_media']
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
      enum: ['local', 'regional', 'national', 'international']
    }
  },
  
  // Performance tracking
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }, // Click-through rate
    cpc: { type: Number, default: 0 }  // Cost per click
  },
  
  // Status and approval
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'active', 'paused', 'completed', 'cancelled'],
    default: 'pending_approval'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  
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
};

module.exports = mongoose.model('PromotionalFeature', promotionalFeatureSchema);
