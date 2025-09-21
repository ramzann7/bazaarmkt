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
    enum: [
      // Common statuses
      'pending', 'confirmed', 'preparing', 'cancelled', 'declined',
      // Pickup-specific statuses
      'ready_for_pickup', 'picked_up',
      // Delivery-specific statuses
      'ready_for_delivery', 'out_for_delivery', 'delivered',
      // Legacy statuses (for backward compatibility)
      'ready', 'delivering'
    ],
    default: 'pending'
  },
  
  // Decline information
  declineReason: {
    type: String,
    trim: true
  },
  declinedAt: {
    type: Date
  },
  declinedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  
  // Pickup time window information
  pickupTimeWindow: {
    selectedDate: Date,
    selectedTimeSlot: String,
    timeSlotLabel: String, // Human-readable time slot (e.g., "9:00 AM - 12:00 PM")
    artisanAvailableSlots: [String] // Available time slots from artisan
  },
  
  // Delivery method (pickup, personalDelivery, professionalDelivery)
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'personalDelivery', 'professionalDelivery'],
    default: 'pickup'
  },
  
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  deliveryInstructions: String,
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryDistance: Number, // Distance in kilometers for artisan reference
  
  // Professional delivery (Uber Direct) details
  delivery: {
    uberDirectId: String, // Uber Direct delivery ID
    status: String, // Uber Direct delivery status
    trackingUrl: String, // Uber tracking URL
    pickupEta: Date, // Estimated pickup time
    dropoffEta: Date, // Estimated dropoff time
    pickupTime: Date, // Actual pickup time
    dropoffTime: Date, // Actual dropoff time
    courier: {
      name: String,
      phone: String,
      vehicle: String,
      photo: String
    },
    liveLocation: {
      latitude: Number,
      longitude: Number,
      bearing: Number
    },
    cancelledAt: Date,
    cancelReason: String,
    quoteId: String // Reference to the original quote
  },
  specialRequests: String,
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'held_in_dispute'],
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
    commissionRate: { type: Number, default: null } // Will be set dynamically from platform settings
  },

  // Confirmation and Dispute Management
  confirmation: {
    // Pickup confirmation
    pickup: {
      artisanConfirmed: {
        confirmed: { type: Boolean, default: false },
        confirmedAt: Date,
        notes: String
      },
      buyerConfirmed: {
        confirmed: { type: Boolean, default: false },
        confirmedAt: Date,
        notes: String
      },
      autoCompletedAt: Date, // When order auto-completes after 24h
      completionDeadline: Date // 24 hours from artisan confirmation
    },
    // Delivery confirmation
    delivery: {
      artisanConfirmed: {
        confirmed: { type: Boolean, default: false },
        confirmedAt: Date,
        notes: String,
        deliveryProof: [String] // Array of image URLs as proof
      },
      buyerConfirmed: {
        confirmed: { type: Boolean, default: false },
        confirmedAt: Date,
        notes: String
      },
      autoCompletedAt: Date, // When order auto-completes after 24h
      completionDeadline: Date // 24 hours from delivery
    }
  },

  // Dispute Management
  dispute: {
    isDisputed: { type: Boolean, default: false },
    disputeType: {
      type: String,
      enum: ['pickup_not_confirmed', 'delivery_not_received', 'item_not_as_described', 'payment_issue', 'other'],
      required: function() { return this.dispute.isDisputed; }
    },
    disputeReason: {
      type: String,
      required: function() { return this.dispute.isDisputed; }
    },
    disputeDetails: String,
    reportedBy: {
      type: String,
      enum: ['buyer', 'artisan'],
      required: function() { return this.dispute.isDisputed; }
    },
    reportedAt: {
      type: Date,
      default: function() { return this.dispute.isDisputed ? Date.now() : undefined; }
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed'],
      default: function() { return this.dispute.isDisputed ? 'open' : undefined; }
    },
    adminNotes: String,
    resolution: {
      type: String,
      enum: ['buyer_refunded', 'artisan_paid', 'partial_refund', 'no_action_needed'],
      default: null
    },
    resolutionNotes: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    evidence: [{
      type: {
        type: String,
        enum: ['image', 'document', 'message'],
        required: true
      },
      url: { type: String, required: true },
      description: String,
      uploadedBy: {
        type: String,
        enum: ['buyer', 'artisan', 'admin'],
        required: true
      },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  
  // Order Notes
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


