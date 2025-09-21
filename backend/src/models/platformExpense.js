const mongoose = require('mongoose');

const platformExpenseSchema = new mongoose.Schema({
  // Expense details
  type: {
    type: String,
    enum: ['delivery', 'marketing', 'infrastructure', 'payment_processing', 'other'],
    required: true
  },
  subtype: {
    type: String,
    enum: ['uber_direct', 'stripe_fees', 'server_costs', 'advertising', 'other'],
    required: function() {
      return this.type !== 'other';
    }
  },
  
  // Associated records
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: function() {
      return this.type === 'delivery';
    }
  },
  revenueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Revenue',
    required: function() {
      return this.type === 'delivery';
    }
  },
  artisanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: function() {
      return this.type === 'delivery';
    }
  },
  
  // Financial details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'CAD',
    enum: ['CAD', 'USD', 'EUR', 'GBP']
  },
  
  // Delivery-specific details (for Uber Direct)
  deliveryDetails: {
    uberDirectId: String, // Uber Direct delivery ID
    pickupAddress: String,
    dropoffAddress: String,
    distance: Number, // in kilometers
    duration: Number, // in minutes
    courierInfo: {
      name: String,
      phone: String,
      vehicle: String
    },
    deliveryStatus: {
      type: String,
      enum: ['requested', 'courier_assigned', 'picked_up', 'delivered', 'cancelled'],
      default: 'requested'
    }
  },
  
  // Expense status and tracking
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Payment details
  paymentProcessor: {
    type: String,
    enum: ['uber_direct', 'stripe', 'paypal', 'manual'],
    default: 'uber_direct'
  },
  transactionId: String, // External transaction reference
  paymentDate: Date,
  
  // Settlement details
  settlementStatus: {
    type: String,
    enum: ['pending', 'processing', 'settled', 'failed'],
    default: 'pending'
  },
  settlementDate: Date,
  settlementReference: String,
  
  // Metadata
  description: String,
  notes: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
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

// Indexes for efficient querying
platformExpenseSchema.index({ type: 1, subtype: 1 });
platformExpenseSchema.index({ orderId: 1 });
platformExpenseSchema.index({ artisanId: 1 });
platformExpenseSchema.index({ status: 1 });
platformExpenseSchema.index({ createdAt: -1 });
platformExpenseSchema.index({ 'deliveryDetails.uberDirectId': 1 });

// Update timestamp on save
platformExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create delivery expense
platformExpenseSchema.statics.createDeliveryExpense = async function(expenseData) {
  const expense = new this({
    type: 'delivery',
    subtype: 'uber_direct',
    ...expenseData
  });
  
  return await expense.save();
};

// Static method to get total expenses by type
platformExpenseSchema.statics.getTotalExpensesByType = async function(type, startDate, endDate) {
  const match = { type };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$subtype',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result;
};

// Static method to get delivery expenses summary
platformExpenseSchema.statics.getDeliveryExpensesSummary = async function(startDate, endDate) {
  const match = { type: 'delivery' };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          subtype: '$subtype',
          status: '$status'
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.subtype',
        totalAmount: { $sum: '$totalAmount' },
        totalCount: { $sum: '$count' },
        averageAmount: { $avg: '$averageAmount' },
        byStatus: {
          $push: {
            status: '$_id.status',
            amount: '$totalAmount',
            count: '$count'
          }
        }
      }
    }
  ]);
  
  return result;
};

module.exports = mongoose.model('PlatformExpense', platformExpenseSchema);
