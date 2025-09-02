const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  // Transaction details
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patronId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  guestInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  
  // Financial breakdown
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformCommission: {
    type: Number,
    required: true,
    min: 0,
    default: function() {
      return this.grossAmount * 0.10; // 10% platform commission
    }
  },
  artisanEarnings: {
    type: Number,
    required: true,
    min: 0,
    default: function() {
      return this.grossAmount - this.platformCommission;
    }
  },
  
  // Commission rate (for transparency and future flexibility)
  commissionRate: {
    type: Number,
    required: true,
    default: 0.10, // 10%
    min: 0,
    max: 1
  },
  
  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Payment processing details
  paymentProcessor: {
    type: String,
    enum: ['stripe', 'paypal', 'square', 'manual'],
    required: true
  },
  transactionId: String,
  paymentDate: Date,
  
  // Settlement details
  settlementStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'paid', 'failed'],
    default: 'pending'
  },
  settlementDate: Date,
  settlementReference: String,
  
  // Metadata
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    commission: Number,
    artisanEarnings: Number
  }],
  
  // Notes and disputes
  notes: String,
  disputeStatus: {
    type: String,
    enum: ['none', 'pending', 'resolved', 'escalated'],
    default: 'none'
  },
  disputeReason: String,
  
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

// Validate that either patronId or guestInfo is provided
revenueSchema.pre('save', function(next) {
  if (!this.patronId && !this.guestInfo) {
    return next(new Error('Either patronId or guestInfo must be provided'));
  }
  if (this.patronId && this.guestInfo) {
    return next(new Error('Cannot have both patronId and guestInfo'));
  }
  next();
});

// Update timestamp on save
revenueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate commission and earnings before saving
revenueSchema.pre('save', function(next) {
  if (this.isModified('grossAmount') || this.isModified('commissionRate')) {
    this.platformCommission = this.grossAmount * this.commissionRate;
    this.artisanEarnings = this.grossAmount - this.platformCommission;
  }
  next();
});

module.exports = mongoose.model('Revenue', revenueSchema);
