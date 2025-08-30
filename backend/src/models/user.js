const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: function() { return !this.isGuest; },
    unique: function() { return !this.isGuest; },
    lowercase: true
  },
  password: {
    type: String,
    required: function() { return !this.isGuest; },
    minlength: 6
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  guestId: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Address Information
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    label: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Canada'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],

  // Account Information
  role: {
    type: String,
    enum: ['patron', 'buyer', 'artisan', 'admin'], // 'buyer' for backward compatibility, 'patron' preferred
    default: 'patron'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Profile Picture
  profilePicture: {
    type: String,
    default: null
  },

  // Notification Preferences
  notificationPreferences: {
    email: {
      marketing: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      security: { type: Boolean, default: true }
    },
    push: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      newArtisans: { type: Boolean, default: true },
      nearbyOffers: { type: Boolean, default: true }
    },
    sms: {
      orderUpdates: { type: Boolean, default: false },
      promotions: { type: Boolean, default: false }
    }
  },

  // Payment Methods
  paymentMethods: [{
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal'],
      required: true
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: {
      type: Boolean,
      default: false
    },
    cardholderName: String,
    // Note: In production, store only encrypted/hashed card data
    token: String // Payment processor token
  }],

  // Account Settings
  accountSettings: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'CAD'
    },
    timezone: {
      type: String,
      default: 'America/Toronto'
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },

  // Favorite Artisans
  favoriteArtisans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan'
  }],

  // Location Coordinates
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    }
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);