const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema({
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
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  pointsSpent: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  redemptionCode: {
    type: String,
    unique: true,
    sparse: true
  },
  delivery: {
    method: {
      type: String,
      enum: ['automatic', 'manual', 'email', 'physical'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    trackingInfo: String,
    notes: String
  },
  usage: {
    isUsed: {
      type: Boolean,
      default: false
    },
    usedAt: Date,
    usedFor: String, // Order ID, feature activation, etc.
    expiresAt: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    redemptionSource: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
rewardRedemptionSchema.index({ artisan: 1, createdAt: -1 });
rewardRedemptionSchema.index({ user: 1, createdAt: -1 });
rewardRedemptionSchema.index({ reward: 1 });
rewardRedemptionSchema.index({ status: 1 });
rewardRedemptionSchema.index({ redemptionCode: 1 });
rewardRedemptionSchema.index({ 'usage.expiresAt': 1 });

// Pre-save middleware to generate redemption code
rewardRedemptionSchema.pre('save', function(next) {
  if (this.isNew && !this.redemptionCode) {
    // Generate a unique redemption code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.redemptionCode = `RWD-${timestamp}-${random}`.toUpperCase();
  }
  
  // Set expiration date if not set (default 30 days)
  if (this.isNew && !this.usage.expiresAt) {
    this.usage.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  next();
});

// Method to mark as used
rewardRedemptionSchema.methods.markAsUsed = function(usedFor = null) {
  this.usage.isUsed = true;
  this.usage.usedAt = new Date();
  if (usedFor) {
    this.usage.usedFor = usedFor;
  }
  return this.save();
};

// Method to cancel redemption
rewardRedemptionSchema.methods.cancel = function() {
  if (this.status === 'pending' || this.status === 'processing') {
    this.status = 'cancelled';
    return this.save();
  }
  return Promise.reject(new Error('Cannot cancel redemption in current status'));
};

// Method to complete redemption
rewardRedemptionSchema.methods.complete = function() {
  this.status = 'completed';
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

// Method to check if redemption is expired
rewardRedemptionSchema.methods.isExpired = function() {
  return this.usage.expiresAt && this.usage.expiresAt < new Date();
};

// Method to check if redemption can be used
rewardRedemptionSchema.methods.canBeUsed = function() {
  return this.status === 'completed' && 
         !this.usage.isUsed && 
         !this.isExpired();
};

// Static method to get redemptions by artisan
rewardRedemptionSchema.statics.getByArtisan = function(artisanId, limit = 20) {
  return this.find({ artisan: artisanId })
    .populate('reward', 'name description type value')
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get redemptions by user
rewardRedemptionSchema.statics.getByUser = function(userId, limit = 20) {
  return this.find({ user: userId })
    .populate('reward', 'name description type value')
    .populate('artisan', 'artisanName businessImage')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get active redemptions
rewardRedemptionSchema.statics.getActive = function(artisanId) {
  return this.find({
    artisan: artisanId,
    status: 'completed',
    'usage.isUsed': false,
    'usage.expiresAt': { $gt: new Date() }
  })
    .populate('reward', 'name description type value')
    .sort({ createdAt: -1 });
};

// Static method to get redemption statistics
rewardRedemptionSchema.statics.getStatistics = function(artisanId) {
  return this.aggregate([
    { $match: { artisan: mongoose.Types.ObjectId(artisanId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPoints: { $sum: '$pointsSpent' }
      }
    }
  ]);
};

// Static method to cleanup expired redemptions
rewardRedemptionSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      'usage.expiresAt': { $lt: new Date() },
      'usage.isUsed': false,
      status: { $in: ['pending', 'processing', 'completed'] }
    },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema);
