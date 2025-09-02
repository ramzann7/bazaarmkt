const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  patron: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for guest users
  },
  // Guest user information (when patron is not provided)
  guestInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'],
    default: 'pending'
  },
  preparationStage: {
    type: String,
    enum: ['order_received', 'ingredients_gathered', 'production_started', 'quality_check', 'packaging', 'ready_for_delivery'],
    default: 'order_received'
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  deliveryInstructions: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  specialRequests: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery']
  },
  paymentMethodId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Revenue tracking
  revenue: {
    grossAmount: Number,
    platformCommission: Number,
    artisanEarnings: Number,
    commissionRate: { type: Number, default: 0.10 }
  },
  
  notes: {
    buyer: String,
    artisan: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate that either patron or guestInfo is provided
orderSchema.pre('save', function(next) {
  if (!this.patron && !this.guestInfo) {
    return next(new Error('Either patron or guestInfo must be provided'));
  }
  if (this.patron && this.guestInfo) {
    return next(new Error('Cannot have both patron and guestInfo'));
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);


