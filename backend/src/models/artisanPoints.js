const mongoose = require('mongoose');

const artisanPointsSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  currentLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  pointsToNextLevel: {
    type: Number,
    default: 100
  },
  pointsHistory: [{
    points: {
      type: Number,
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'order_completed',
        'review_received',
        'product_created',
        'community_post',
        'community_comment',
        'community_like',
        'badge_earned',
        'milestone_reached',
        'bonus_points',
        'penalty_points'
      ]
    },
    description: String,
    relatedId: mongoose.Schema.Types.ObjectId, // ID of related order, post, etc.
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  badges: [{
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    isDisplayed: {
      type: Boolean,
      default: true
    }
  }],
  achievements: [{
    achievement: {
      type: String,
      required: true
    },
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    isDisplayed: {
      type: Boolean,
      default: true
    }
  }],
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    communityPosts: {
      type: Number,
      default: 0
    },
    communityComments: {
      type: Number,
      default: 0
    },
    communityLikes: {
      type: Number,
      default: 0
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
artisanPointsSchema.index({ artisan: 1 });
artisanPointsSchema.index({ user: 1 });
artisanPointsSchema.index({ totalPoints: -1 });
artisanPointsSchema.index({ currentLevel: -1 });
artisanPointsSchema.index({ 'pointsHistory.earnedAt': -1 });

// Virtual for level progress percentage
artisanPointsSchema.virtual('levelProgress').get(function() {
  const currentLevelPoints = (this.currentLevel - 1) * 100;
  const pointsInCurrentLevel = this.totalPoints - currentLevelPoints;
  return Math.min((pointsInCurrentLevel / this.pointsToNextLevel) * 100, 100);
});

// Method to add points
artisanPointsSchema.methods.addPoints = function(points, action, description, relatedId) {
  this.totalPoints += points;
  
  // Add to history
  this.pointsHistory.push({
    points,
    action,
    description,
    relatedId,
    earnedAt: new Date()
  });
  
  // Check for level up
  this.checkLevelUp();
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to check and handle level up
artisanPointsSchema.methods.checkLevelUp = function() {
  const newLevel = Math.floor(this.totalPoints / 100) + 1;
  if (newLevel > this.currentLevel && newLevel <= 10) {
    this.currentLevel = newLevel;
    this.pointsToNextLevel = newLevel * 100;
    
    // Add level up achievement
    this.achievements.push({
      achievement: `Level ${newLevel} Artisan`,
      description: `Reached level ${newLevel} with ${this.totalPoints} points`,
      earnedAt: new Date()
    });
  }
};

// Method to add badge
artisanPointsSchema.methods.addBadge = function(badgeId) {
  const existingBadge = this.badges.find(b => b.badge.toString() === badgeId.toString());
  if (!existingBadge) {
    this.badges.push({
      badge: badgeId,
      earnedAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to update statistics
artisanPointsSchema.methods.updateStatistics = function(stats) {
  this.statistics = { ...this.statistics, ...stats };
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to get leaderboard
artisanPointsSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find()
    .populate('artisan', 'artisanName businessImage rating')
    .populate('user', 'firstName lastName profilePicture')
    .sort({ totalPoints: -1 })
    .limit(limit);
};

// Pre-save middleware to ensure data consistency
artisanPointsSchema.pre('save', function(next) {
  // Ensure totalPoints is not negative
  if (this.totalPoints < 0) {
    this.totalPoints = 0;
  }
  
  // Ensure currentLevel is within bounds
  if (this.currentLevel < 1) {
    this.currentLevel = 1;
  } else if (this.currentLevel > 10) {
    this.currentLevel = 10;
  }
  
  // Update points to next level
  this.pointsToNextLevel = this.currentLevel * 100;
  
  next();
});

module.exports = mongoose.model('ArtisanPoints', artisanPointsSchema);
