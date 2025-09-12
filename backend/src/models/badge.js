const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  icon: {
    type: String,
    required: true // URL or icon identifier
  },
  category: {
    type: String,
    enum: [
      'sales',
      'community',
      'quality',
      'milestone',
      'special',
      'seasonal',
      'achievement'
    ],
    required: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  requirements: {
    type: {
      type: String,
      enum: [
        'points',
        'orders',
        'revenue',
        'reviews',
        'rating',
        'community_posts',
        'community_engagement',
        'custom'
      ],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    description: String
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    title: String,
    specialPrivileges: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  background: {
    type: String,
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String],
    version: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
badgeSchema.index({ name: 1 });
badgeSchema.index({ category: 1 });
badgeSchema.index({ rarity: 1 });
badgeSchema.index({ isActive: 1, isVisible: 1 });
badgeSchema.index({ displayOrder: 1 });

// Virtual for total earned count
badgeSchema.virtual('earnedCount', {
  ref: 'ArtisanPoints',
  localField: '_id',
  foreignField: 'badges.badge',
  count: true
});

// Method to check if artisan qualifies for badge
badgeSchema.methods.checkQualification = function(artisanStats) {
  switch (this.requirements.type) {
    case 'points':
      return artisanStats.totalPoints >= this.requirements.value;
    case 'orders':
      return artisanStats.totalOrders >= this.requirements.value;
    case 'revenue':
      return artisanStats.totalRevenue >= this.requirements.value;
    case 'reviews':
      return artisanStats.totalReviews >= this.requirements.value;
    case 'rating':
      return artisanStats.averageRating >= this.requirements.value;
    case 'community_posts':
      return artisanStats.communityPosts >= this.requirements.value;
    case 'community_engagement':
      return (artisanStats.communityPosts + artisanStats.communityComments + artisanStats.communityLikes) >= this.requirements.value;
    default:
      return false;
  }
};

// Static method to get badges by category
badgeSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true, isVisible: true })
    .sort({ displayOrder: 1, name: 1 });
};

// Static method to get available badges for artisan
badgeSchema.statics.getAvailableForArtisan = function(artisanStats) {
  return this.find({ isActive: true, isVisible: true })
    .then(badges => {
      return badges.filter(badge => badge.checkQualification(artisanStats));
    });
};

// Static method to create default badges
badgeSchema.statics.createDefaultBadges = async function() {
  const defaultBadges = [
    {
      name: 'First Sale',
      description: 'Made your first sale on the platform',
      icon: '🎉',
      category: 'sales',
      rarity: 'common',
      requirements: {
        type: 'orders',
        value: 1,
        description: 'Complete 1 order'
      },
      rewards: {
        points: 50,
        title: 'New Seller'
      },
      color: '#10B981',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
    },
    {
      name: 'Rising Star',
      description: 'Reached 100 total points',
      icon: '⭐',
      category: 'milestone',
      rarity: 'uncommon',
      requirements: {
        type: 'points',
        value: 100,
        description: 'Earn 100 points'
      },
      rewards: {
        points: 25,
        title: 'Rising Star'
      },
      color: '#F59E0B',
      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    },
    {
      name: 'Community Builder',
      description: 'Active in the community with 10 posts',
      icon: '👥',
      category: 'community',
      rarity: 'uncommon',
      requirements: {
        type: 'community_posts',
        value: 10,
        description: 'Create 10 community posts'
      },
      rewards: {
        points: 100,
        title: 'Community Builder'
      },
      color: '#8B5CF6',
      background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
    },
    {
      name: 'Quality Master',
      description: 'Maintained a 4.5+ star rating with 20+ reviews',
      icon: '🏆',
      category: 'quality',
      rarity: 'rare',
      requirements: {
        type: 'rating',
        value: 4.5,
        description: 'Maintain 4.5+ star rating with 20+ reviews'
      },
      rewards: {
        points: 200,
        title: 'Quality Master'
      },
      color: '#EF4444',
      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
    },
    {
      name: 'Sales Champion',
      description: 'Generated $1000+ in revenue',
      icon: '💰',
      category: 'sales',
      rarity: 'rare',
      requirements: {
        type: 'revenue',
        value: 1000,
        description: 'Generate $1000+ in revenue'
      },
      rewards: {
        points: 300,
        title: 'Sales Champion'
      },
      color: '#06B6D4',
      background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)'
    }
  ];

  for (const badgeData of defaultBadges) {
    const existingBadge = await this.findOne({ name: badgeData.name });
    if (!existingBadge) {
      await this.create(badgeData);
    }
  }
};

module.exports = mongoose.model('Badge', badgeSchema);