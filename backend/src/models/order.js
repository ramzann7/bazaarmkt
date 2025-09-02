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
    },
    // Product type specific information
    productType: {
      type: String,
      enum: ['ready_to_ship', 'made_to_order', 'scheduled_order'],
      required: true
    },
    // For made-to-order products
    estimatedCompletionDate: Date,
    // For scheduled orders
    scheduledPickupDate: Date,
    scheduledPickupTime: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Order Status - varies by product type
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Product Type Specific Status
  readyToShipStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'packaging', 'ready', 'shipped', 'delivered'],
    default: 'pending'
  },
  
  madeToOrderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'ingredients_gathered', 'production_started', 'quality_check', 'packaging', 'ready', 'delivered'],
    default: 'pending'
  },
  
  scheduledOrderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'scheduled', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered'],
    default: 'pending'
  },
  
  // Preparation Stage (legacy support)
  preparationStage: {
    type: String,
    enum: ['order_received', 'ingredients_gathered', 'production_started', 'quality_check', 'packaging', 'ready_for_delivery'],
    default: 'order_received'
  },
  
  // Timing Information
  orderDate: {
    type: Date,
    default: Date.now
  },
  estimatedReadyDate: Date,
  actualReadyDate: Date,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  
  // For made-to-order products
  productionStartDate: Date,
  productionEndDate: Date,
  
  // For scheduled orders
  scheduledDate: Date,
  scheduledTime: String,
  pickupDeadline: Date,
  
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
  
  // Payment Information
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
  
  // Order Notes
  notes: {
    buyer: String,
    artisan: String
  },
  
  // Confirmation tracking for made-to-order products
  requiresConfirmation: {
    type: Boolean,
    default: false
  },
  confirmedByPatron: {
    type: Boolean,
    default: false
  },
  confirmationDate: Date,
  
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
  // Check if patron exists and is a valid ObjectId
  const hasPatron = this.patron && this.patron.toString && this.patron.toString().length > 0;
  
  // Check if guestInfo exists and has meaningful content
  const hasGuestInfo = this.guestInfo && 
                      this.guestInfo.firstName && 
                      this.guestInfo.lastName && 
                      this.guestInfo.email;
  
  if (!hasPatron && !hasGuestInfo) {
    return next(new Error('Either patron or guestInfo must be provided'));
  }
  if (hasPatron && hasGuestInfo) {
    return next(new Error('Cannot have both patron and guestInfo'));
  }
  next();
});

// Set appropriate status based on product types in order
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Check if all items are the same product type
    const productTypes = [...new Set(this.items.map(item => item.productType))];
    
    if (productTypes.length === 1) {
      // All items are the same type, set the appropriate status field
      const productType = productTypes[0];
      
      if (productType === 'ready_to_ship') {
        this.readyToShipStatus = this.status;
      } else if (productType === 'made_to_order') {
        this.madeToOrderStatus = this.status;
      } else if (productType === 'scheduled_order') {
        this.scheduledOrderStatus = this.status;
      }
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);


