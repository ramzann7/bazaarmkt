const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  // Platform fee configuration
  platformFeePercentage: {
    type: Number,
    default: 10, // Default 10%
    min: 0,
    max: 50, // Maximum 50% fee
    required: true
  },
  
  // Currency settings
  currency: {
    type: String,
    default: 'CAD',
    enum: ['CAD', 'USD', 'EUR'],
    required: true
  },
  
  // Payment processing fees
  paymentProcessingFee: {
    type: Number,
    default: 2.9, // Default 2.9% for payment processing
    min: 0,
    max: 10
  },
  
  // Minimum order amount
  minimumOrderAmount: {
    type: Number,
    default: 5.00,
    min: 0
  },
  
  // Payout settings
  payoutSettings: {
    minimumPayoutAmount: {
      type: Number,
      default: 25.00,
      min: 0
    },
    payoutFrequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      default: 'weekly'
    },
    payoutDelay: {
      type: Number,
      default: 7, // Days to wait before payout
      min: 0,
      max: 30
    }
  },
  
  // Platform information
  platformInfo: {
    name: {
      type: String,
      default: 'bazaar'
    },
    supportEmail: {
      type: String,
      default: 'support@thebazaar.com'
    },
    termsOfService: String,
    privacyPolicy: String
  },
  
  // Feature flags
  features: {
    promotionalFeatures: {
      type: Boolean,
      default: true
    },
    spotlights: {
      type: Boolean,
      default: true
    },
    wallet: {
      type: Boolean,
      default: true
    },
    reviews: {
      type: Boolean,
      default: true
    }
  },
  
  // Audit trail
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
platformSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one platform settings document exists
platformSettingsSchema.index({}, { unique: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);

