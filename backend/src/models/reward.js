const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      'discount',
      'free_shipping',
      'premium_feature',
      'priority_support',
      'exclusive_access',
      'physical_item',
      'digital_item',
      'service'
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'marketing',
      'feature',
      'support',
      'exclusive',
      'physical',
      'digital'
    ],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can be number, string, or object depending on type
    required: true
  },
  cost: {
    points: {
      type: Number,
      required: true,
      min: 1
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  availability: {
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: Date,
    endDate: Date,
    maxRedemptions: {
      type: Number,
      default: null // null means unlimited
    },
    currentRedemptions: {
      type: Number,
      default: 0
    },
    maxPerUser: {
      type: Number,
      default: 1
    }
  },
  requirements: {
    minLevel: {
      type: Number,
      default: 1
    },
    minPoints: {
      type: Number,
      default: 0
    },
    requiredBadges: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    }],
    customConditions: String
  },
  delivery: {
    method: {
      type: String,
      enum: ['automatic', 'manual', 'email', 'physical'],
      default: 'automatic'
    },
    instructions: String,
    contactInfo: {
      email: String,
      phone: String,
      address: String
    }
  },
  metadata: {
    image: String,
    icon: String,
    color: {
      type: String,
      default: '#3B82F6'
    },
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
rewardSchema.index({ name: 1 });
rewardSchema.index({ type: 1, category: 1 });
rewardSchema.index({ 'availability.isActive': 1 });
rewardSchema.index({ 'cost.points': 1 });
rewardSchema.index({ 'cost.level': 1 });

// Virtual for availability status
rewardSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return this.availability.isActive &&
    (!this.availability.startDate || this.availability.startDate <= now) &&
    (!this.availability.endDate || this.availability.endDate >= now) &&
    (!this.availability.maxRedemptions || this.availability.currentRedemptions < this.availability.maxRedemptions);
});

// Method to check if user can redeem
rewardSchema.methods.canRedeem = function(userLevel, userPoints, userBadges = []) {
  if (!this.isAvailable) {
    return { canRedeem: false, reason: 'Reward is not available' };
  }

  if (userLevel < this.requirements.minLevel) {
    return { canRedeem: false, reason: `Minimum level ${this.requirements.minLevel} required` };
  }

  if (userPoints < this.cost.points) {
    return { canRedeem: false, reason: `Insufficient points. Need ${this.cost.points}, have ${userPoints}` };
  }

  if (this.requirements.requiredBadges.length > 0) {
    const hasRequiredBadges = this.requirements.requiredBadges.every(badgeId =>
      userBadges.some(userBadge => userBadge.badge.toString() === badgeId.toString())
    );
    if (!hasRequiredBadges) {
      return { canRedeem: false, reason: 'Required badges not earned' };
    }
  }

  return { canRedeem: true };
};

// Method to redeem reward
rewardSchema.methods.redeem = function() {
  if (this.availability.maxRedemptions) {
    this.availability.currentRedemptions += 1;
  }
  return this.save();
};

// Static method to get available rewards
rewardSchema.statics.getAvailable = function() {
  const now = new Date();
  return this.find({
    'availability.isActive': true,
    $or: [
      { 'availability.startDate': { $exists: false } },
      { 'availability.startDate': { $lte: now } }
    ],
    $or: [
      { 'availability.endDate': { $exists: false } },
      { 'availability.endDate': { $gte: now } }
    ],
    $or: [
      { 'availability.maxRedemptions': { $exists: false } },
      { 'availability.maxRedemptions': null },
      { $expr: { $lt: ['$availability.currentRedemptions', '$availability.maxRedemptions'] } }
    ]
  }).sort({ 'cost.points': 1, name: 1 });
};

// Static method to get rewards by category
rewardSchema.statics.getByCategory = function(category) {
  return this.getAvailable().then(rewards => 
    rewards.filter(reward => reward.category === category)
  );
};

// Static method to create default rewards
rewardSchema.statics.createDefaultRewards = async function() {
  const defaultRewards = [
    {
      name: '10% Discount on Next Order',
      description: 'Get 10% off your next order from any artisan',
      type: 'discount',
      category: 'marketing',
      value: { percentage: 10, maxAmount: 50 },
      cost: { points: 100, level: 1 },
      delivery: { method: 'automatic' },
      metadata: {
        icon: '🎟️',
        color: '#10B981'
      }
    },
    {
      name: 'Free Shipping',
      description: 'Free shipping on your next order',
      type: 'free_shipping',
      category: 'marketing',
      value: { type: 'free_shipping' },
      cost: { points: 150, level: 2 },
      delivery: { method: 'automatic' },
      metadata: {
        icon: '🚚',
        color: '#3B82F6'
      }
    },
    {
      name: 'Priority Support',
      description: 'Get priority customer support for 30 days',
      type: 'priority_support',
      category: 'support',
      value: { duration: 30, type: 'priority' },
      cost: { points: 200, level: 3 },
      delivery: { method: 'automatic' },
      metadata: {
        icon: '⚡',
        color: '#F59E0B'
      }
    },
    {
      name: 'Featured Product Listing',
      description: 'Feature your product in the premium showcase for 7 days',
      type: 'premium_feature',
      category: 'feature',
      value: { duration: 7, type: 'featured_listing' },
      cost: { points: 500, level: 4 },
      delivery: { method: 'automatic' },
      metadata: {
        icon: '⭐',
        color: '#8B5CF6'
      }
    },
    {
      name: 'Custom Badge',
      description: 'Create a custom badge for your artisan profile',
      type: 'exclusive_access',
      category: 'exclusive',
      value: { type: 'custom_badge' },
      cost: { points: 1000, level: 5 },
      delivery: { method: 'manual', instructions: 'Contact support to create your custom badge' },
      metadata: {
        icon: '🏅',
        color: '#EF4444'
      }
    }
  ];

  for (const rewardData of defaultRewards) {
    const existingReward = await this.findOne({ name: rewardData.name });
    if (!existingReward) {
      await this.create(rewardData);
    }
  }
};

module.exports = mongoose.model('Reward', rewardSchema);
