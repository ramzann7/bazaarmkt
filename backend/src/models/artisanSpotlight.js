const mongoose = require('mongoose');

const artisanSpotlightSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 10 // $10 per day
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  paymentId: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
artisanSpotlightSchema.index({ artisan: 1, status: 1 });
artisanSpotlightSchema.index({ endDate: 1, status: 1 });
artisanSpotlightSchema.index({ createdAt: -1 });

// Virtual for duration in days
artisanSpotlightSchema.virtual('durationDays').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for remaining days
artisanSpotlightSchema.virtual('remainingDays').get(function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  if (now > this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if spotlight is active
artisanSpotlightSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && now <= this.endDate;
};

// Static method to get active spotlights
artisanSpotlightSchema.statics.getActiveSpotlights = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    endDate: { $gt: now }
  }).populate('artisan', 'firstName lastName businessName profilePicture location')
    .populate('user', 'firstName lastName email');
};

// Static method to get spotlight for specific artisan
artisanSpotlightSchema.statics.getArtisanSpotlight = function(artisanId) {
  const now = new Date();
  return this.findOne({
    artisan: artisanId,
    status: 'active',
    endDate: { $gt: now }
  });
};

// Pre-save middleware to update updatedAt
artisanSpotlightSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ArtisanSpotlight', artisanSpotlightSchema);
