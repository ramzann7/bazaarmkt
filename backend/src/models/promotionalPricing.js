const mongoose = require('mongoose');

const promotionalPricingSchema = new mongoose.Schema({
  // Feature type
  featureType: {
    type: String,
    enum: ['featured_product', 'sponsored_product', 'artisan_spotlight', 'category_promotion', 'search_boost', 'homepage_featured'],
    required: true,
    unique: true
  },
  
  // Pricing configuration
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerDay: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Feature details
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  benefits: [String],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin management
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
promotionalPricingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PromotionalPricing', promotionalPricingSchema);
