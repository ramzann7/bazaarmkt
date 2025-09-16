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
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['story', 'recipe', 'tip', 'question', 'product_showcase', 'event', 'poll'],
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
  // Rich content fields for different post types
  recipe: {
    prepTime: String,
    cookTime: String,
    servings: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },
    ingredients: [{
      amount: String,
      unit: String,
      name: String
    }],
    steps: [{
      description: String,
      order: Number
    }]
  },
  event: {
    date: Date,
    time: String,
    location: String,
    maxAttendees: Number,
    eventLink: String,
    rsvpRequired: {
      type: Boolean,
      default: false
    },
    rsvps: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      artisan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artisan'
      },
      rsvpedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['confirmed', 'waitlist', 'cancelled'],
        default: 'confirmed'
      }
    }]
  },
  product: {
    productName: String,
    productPrice: String,
    productLink: String,
    discountCode: String
  },
  poll: {
    question: String,
    options: [String],
    expiresAt: Date,
    allowMultipleVotes: {
      type: Boolean,
      default: false
    },
    votes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      options: [Number], // Array of option indices
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
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

// RSVP Methods
communityPostSchema.methods.addRSVP = function(userId, artisanId) {
  // Check if user already has an RSVP
  const existingRSVP = this.event.rsvps.find(rsvp => rsvp.user.toString() === userId.toString());
  
  if (existingRSVP) {
    // If user has cancelled RSVP, reactivate it
    if (existingRSVP.status === 'cancelled') {
      existingRSVP.status = 'confirmed';
      existingRSVP.rsvpedAt = new Date();
      return this.save();
    }
    return Promise.resolve(this); // Already RSVP'd
  }
  
  // Check if event has capacity
  const confirmedRSVPs = this.event.rsvps.filter(rsvp => rsvp.status === 'confirmed');
  const status = confirmedRSVPs.length >= this.event.maxAttendees ? 'waitlist' : 'confirmed';
  
  this.event.rsvps.push({
    user: userId,
    artisan: artisanId,
    rsvpedAt: new Date(),
    status: status
  });
  
  return this.save();
};

communityPostSchema.methods.cancelRSVP = function(userId) {
  const rsvpIndex = this.event.rsvps.findIndex(rsvp => rsvp.user.toString() === userId.toString());
  
  if (rsvpIndex !== -1) {
    this.event.rsvps[rsvpIndex].status = 'cancelled';
    
    // If there are waitlist users, promote the first one to confirmed
    const waitlistRSVP = this.event.rsvps.find(rsvp => rsvp.status === 'waitlist');
    if (waitlistRSVP) {
      waitlistRSVP.status = 'confirmed';
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

communityPostSchema.methods.isRSVPedBy = function(userId) {
  const rsvp = this.event.rsvps.find(rsvp => rsvp.user.toString() === userId.toString());
  return rsvp ? rsvp.status : false;
};

// Virtual for RSVP counts
communityPostSchema.virtual('rsvpCount').get(function() {
  if (this.type !== 'event' || !this.event) return 0;
  return this.event.rsvps.filter(rsvp => rsvp.status === 'confirmed').length;
});

communityPostSchema.virtual('waitlistCount').get(function() {
  if (this.type !== 'event' || !this.event) return 0;
  return this.event.rsvps.filter(rsvp => rsvp.status === 'waitlist').length;
});

communityPostSchema.virtual('hasCapacity').get(function() {
  if (this.type !== 'event' || !this.event) return false;
  return this.rsvpCount < this.event.maxAttendees;
});

// Pre-save middleware to update engagement metrics
communityPostSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.engagement = this.engagement || {};
  }
  next();
});

module.exports = mongoose.model('CommunityPost', communityPostSchema);
