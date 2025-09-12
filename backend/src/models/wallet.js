const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'CAD',
    enum: ['CAD', 'USD']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripeAccountId: {
    type: String,
    default: null
  },
  payoutSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    schedule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    minimumPayout: {
      type: Number,
      default: 50 // Minimum $50 for payout
    },
    lastPayoutDate: {
      type: Date,
      default: null
    },
    nextPayoutDate: {
      type: Date,
      default: null
    }
  },
  metadata: {
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    totalPayouts: {
      type: Number,
      default: 0
    },
    platformFees: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
walletSchema.index({ artisanId: 1 });
walletSchema.index({ isActive: 1 });

// Virtual for available balance (balance minus pending transactions)
walletSchema.virtual('availableBalance').get(function() {
  return this.balance;
});

// Method to add funds to wallet
walletSchema.methods.addFunds = function(amount, transactionType = 'top_up') {
  this.balance += amount;
  if (transactionType === 'revenue') {
    this.metadata.totalEarnings += amount;
  }
  return this.save();
};

// Method to deduct funds from wallet
walletSchema.methods.deductFunds = function(amount, transactionType = 'purchase') {
  if (this.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }
  this.balance -= amount;
  if (transactionType === 'purchase') {
    this.metadata.totalSpent += amount;
  }
  return this.save();
};

// Method to check if wallet has sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

// Pre-save middleware to update next payout date
walletSchema.pre('save', function(next) {
  if (this.payoutSettings.enabled && this.payoutSettings.schedule) {
    const now = new Date();
    let nextPayout = new Date();
    
    switch (this.payoutSettings.schedule) {
      case 'daily':
        nextPayout.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextPayout.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextPayout.setMonth(now.getMonth() + 1);
        break;
    }
    
    this.payoutSettings.nextPayoutDate = nextPayout;
  }
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);
