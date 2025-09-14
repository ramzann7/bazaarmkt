const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['story', 'tip', 'question', 'achievement', 'product_showcase', 'event'],
    default: 'story'
  },
  category: {
    type: String,
    enum: ['general', 'business', 'craft', 'food', 'marketing', 'community'],
    default: 'general'
  },
  images: [{
    url: String,
    caption: String,
    alt: String
  }],
  tags: [{
    type: String,
    trim: true
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityComment'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['public', 'artisans_only', 'followers_only'],
    default: 'public'
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'flagged'],
    default: 'published'
  },
  moderation: {
    isModerated: {
      type: Boolean,
      default: false
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationReason: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
communityPostSchema.index({ author: 1, createdAt: -1 });
communityPostSchema.index({ artisan: 1, createdAt: -1 });
communityPostSchema.index({ type: 1, category: 1 });
communityPostSchema.index({ status: 1, isFeatured: 1 });
communityPostSchema.index({ tags: 1 });
communityPostSchema.index({ createdAt: -1 });

// Virtual for like count
communityPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
communityPostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Method to add like
communityPostSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove like
communityPostSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Method to check if user liked the post
communityPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Pre-save middleware to update engagement metrics
communityPostSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.engagement = this.engagement || {};
  }
  next();
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);
