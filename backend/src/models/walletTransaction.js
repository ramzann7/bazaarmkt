const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'revenue',           // Money earned from sales
      'top_up',           // Manual top-up via Stripe
      'purchase',         // Spending on promotions/spotlights
      'payout',           // Money paid out to artisan
      'refund',           // Refund for cancelled promotions
      'fee',              // Platform fees
      'adjustment'        // Manual adjustments by admin
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CAD',
    enum: ['CAD', 'USD']
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String,
    default: null // Reference to order, promotion, or external transaction
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // ID of related document (Order, PromotionalFeature, etc.)
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'stripe', 'bank_transfer', 'manual'],
    default: 'wallet'
  },
  stripeTransactionId: {
    type: String,
    default: null
  },
  metadata: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromotionalFeature',
      default: null
    },
    platformFee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: 0
    },
    exchangeRate: {
      type: Number,
      default: 1
    }
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ artisanId: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1 });
walletTransactionSchema.index({ status: 1 });
walletTransactionSchema.index({ referenceId: 1 });

// Virtual for transaction direction (credit/debit)
walletTransactionSchema.virtual('isCredit').get(function() {
  return ['revenue', 'top_up', 'refund', 'adjustment'].includes(this.type);
});

walletTransactionSchema.virtual('isDebit').get(function() {
  return ['purchase', 'payout', 'fee'].includes(this.type);
});

// Method to get formatted amount with sign
walletTransactionSchema.methods.getFormattedAmount = function() {
  const sign = this.isCredit ? '+' : '-';
  return `${sign}${this.currency} ${Math.abs(this.amount).toFixed(2)}`;
};

// Method to get transaction summary
walletTransactionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    formattedAmount: this.getFormattedAmount(),
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    balanceAfter: this.balanceAfter
  };
};

// Static method to create revenue transaction
walletTransactionSchema.statics.createRevenueTransaction = async function(walletId, artisanId, orderId, grossAmount, platformFee) {
  const netAmount = grossAmount - platformFee;
  
  return this.create({
    walletId,
    artisanId,
    type: 'revenue',
    amount: netAmount,
    balanceBefore: 0, // Will be updated by wallet
    balanceAfter: 0,  // Will be updated by wallet
    description: `Revenue from order #${orderId}`,
    reference: orderId.toString(),
    referenceId: orderId,
    metadata: {
      orderId,
      platformFee,
      netAmount
    }
  });
};

// Static method to create promotion purchase transaction
walletTransactionSchema.statics.createPurchaseTransaction = async function(walletId, artisanId, promotionId, amount, description) {
  return this.create({
    walletId,
    artisanId,
    type: 'purchase',
    amount: -amount, // Negative for debit
    balanceBefore: 0, // Will be updated by wallet
    balanceAfter: 0,  // Will be updated by wallet
    description,
    reference: promotionId.toString(),
    referenceId: promotionId,
    metadata: {
      promotionId
    }
  });
};

// Static method to create top-up transaction
walletTransactionSchema.statics.createTopUpTransaction = async function(walletId, artisanId, amount, stripeTransactionId) {
  return this.create({
    walletId,
    artisanId,
    type: 'top_up',
    amount,
    balanceBefore: 0, // Will be updated by wallet
    balanceAfter: 0,  // Will be updated by wallet
    description: 'Wallet top-up via Stripe',
    stripeTransactionId,
    paymentMethod: 'stripe'
  });
};

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
