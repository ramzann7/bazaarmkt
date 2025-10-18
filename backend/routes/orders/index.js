/**
 * Orders Routes
 * Handles order creation, management, and status updates
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const PlatformSettingsService = require('../../services/platformSettingsService');
const redisCacheService = require('../../services/redisCacheService');
const WalletService = require('../../services/WalletService');

// Import notification service functions  
const { sendNotification, sendPreferenceBasedNotification } = require('../notifications/index');

// Helper function to send notifications directly (with email via preference system)
const sendNotificationDirect = async (notificationData, db) => {
  try {
    // Skip guest notifications for now (they have no userId)
    if (!notificationData.userId) {
      console.log('⏭️ Skipping notification for guest/no userId');
      return true;
    }

    console.log('📧 Attempting to send notification:', {
      userId: notificationData.userId,
      type: notificationData.type,
      hasDb: !!db
    });

    // Use the preference-based notification system which handles both email and platform notifications
    // This system checks user roles and preferences to determine if email should be sent
    const result = await sendPreferenceBasedNotification(
      notificationData.userId,
      notificationData,
      db
    );
    
    console.log('✅ Notification sent via preference system:', {
      userId: notificationData.userId,
      type: notificationData.type,
      emailSent: result?.emailSent || false,
      pushSent: result?.pushSent || false,
      result
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error sending notification directly:', error);
    console.error('Error stack:', error.stack);
    return false;
  }
};

/**
 * Unified Order Schema Function
 * Creates a standardized order object for all order creation methods
 */
const createUnifiedOrderSchema = (orderParams) => {
  const {
    userId,
    items,
    totalAmount,
    subtotal,
    deliveryFee = 0,
    status = 'pending',
    paymentStatus = 'pending',
    paymentMethod = 'stripe',
    paymentIntentId = null,
    deliveryAddress = {},
    deliveryInstructions = '',
    deliveryMethod = 'pickup',
    pickupTimeWindows = {},
    deliveryMethodDetails = [],
    paymentDetails = {},
    notes = '',
    artisan = null,
    isGuestOrder = false,
    guestInfo = {},
    // Legacy support
    shippingAddress = null
  } = orderParams;

  // Standardize item schema with both new and legacy fields for compatibility
  const standardizedItems = items.map(item => {
    // Ensure all price fields are numbers (parseFloat to handle string values)
    const price = parseFloat(item.price || item.unitPrice || item.productPrice || 0);
    const quantity = parseInt(item.quantity || 0);
    const totalPrice = parseFloat(item.totalPrice || item.itemTotal || (quantity * price));
    
    return {
      productId: item.productId,
      product: item.product || {},
      name: item.name || item.productName || 'Unknown Product',
      productName: item.productName || item.name || 'Unknown Product', // Legacy support
      price: price,
      unitPrice: price,
      productPrice: price, // Legacy support
      quantity: quantity,
      totalPrice: totalPrice,
      itemTotal: totalPrice, // Legacy support
      productType: item.productType || 'ready_to_ship',
      artisanId: item.artisanId || item.artisan
    };
  });

  // Use deliveryAddress if provided, fallback to shippingAddress for legacy compatibility
  const finalDeliveryAddress = deliveryAddress && Object.keys(deliveryAddress).length > 0 
    ? deliveryAddress 
    : shippingAddress || {};

  // Calculate subtotal if not provided
  const finalSubtotal = subtotal !== undefined ? subtotal : (totalAmount - deliveryFee);

  return {
    userId: userId ? new (require('mongodb')).ObjectId(userId) : null,
    items: standardizedItems,
    totalAmount: totalAmount || 0,
    subtotal: finalSubtotal,
    deliveryFee: deliveryFee,
    status: status,
    paymentStatus: paymentStatus,
    paymentMethod: paymentMethod,
    paymentIntentId: paymentIntentId,
    deliveryAddress: finalDeliveryAddress,
    deliveryInstructions: deliveryInstructions,
    deliveryMethod: deliveryMethod,
    pickupTimeWindows: pickupTimeWindows,
    deliveryMethodDetails: deliveryMethodDetails,
    paymentDetails: paymentDetails,
    notes: notes,
    artisan: artisan,
    isGuestOrder: isGuestOrder,
    guestInfo: isGuestOrder ? guestInfo : {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Cache configuration
const CACHE_TTL = 300; // 5 minutes in seconds
const getCacheKey = (artisanId) => `completed_orders:${artisanId}`;

// Helper function to invalidate cache for an artisan
const invalidateArtisanCache = async (artisanId) => {
  const cacheKey = getCacheKey(artisanId.toString());
  await redisCacheService.del(cacheKey);
  console.log('🗑️ Invalidated Redis cache for artisan:', artisanId.toString());
};

// Helper function to get status display text
const getStatusDisplayText = (status, deliveryMethod = 'pickup') => {
  const statusTexts = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready_for_pickup': 'Ready for Pickup',
    'ready_for_delivery': 'Ready for Delivery',
    'picked_up': 'Picked Up',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'declined': 'Declined'
  };
  
  return statusTexts[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

// Create payment intent for order
const createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { items, deliveryAddress, deliveryMethod, deliveryInstructions, pickupTimeWindows } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    const db = req.db;
    const productsCollection = db.collection('products');

    // Validate and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await productsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(item.productId) 
      });
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product is not available: ${product.name}`,
          error: `Product status is '${product.status}' (must be 'active')`,
          productId: product._id.toString(),
          productName: product.name,
          currentStatus: product.status
        });
      }

      // Check inventory availability based on product type
      let hasEnoughInventory = false;
      let availableQuantity = 0;
      
      if (product.productType === 'ready_to_ship') {
        availableQuantity = Math.min(product.stock || 0, product.availableQuantity || 0);
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'made_to_order') {
        availableQuantity = product.remainingCapacity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'scheduled_order') {
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else {
        // Fallback for unknown types
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      }
      
      if (!hasEnoughInventory) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for product ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        artisanId: product.artisan,
        productType: product.productType
      });
    }

    // Add delivery fee if applicable
    // For professionalDelivery, prioritize frontend-provided fee (includes Uber buffer)
    // For personalDelivery, calculate from artisan settings
    let deliveryFee = 0;
    
    if (req.body.deliveryFee && deliveryMethod === 'professionalDelivery') {
      // Use the buffered delivery fee provided by frontend (includes 20% buffer)
      deliveryFee = parseFloat(req.body.deliveryFee);
      console.log('💰 Using frontend-provided delivery fee (buffered):', deliveryFee);
    } else if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Fallback: Calculate from artisan settings
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: validatedItems[0].artisanId });
      
      if (artisan) {
        const { getDeliveryFee } = require('../../utils/artisanSchemaUtils');
        deliveryFee = getDeliveryFee(artisan, deliveryMethod);
        console.log('💰 Calculated delivery fee from artisan settings:', deliveryFee);
      }
    }

    const finalAmount = totalAmount + deliveryFee;
    
    console.log('💰 Payment intent amounts:', {
      subtotal: totalAmount,
      deliveryFee,
      finalAmount,
      deliveryMethod
    });

    // Validate minimum order amount from platform settings
    const PlatformSettingsService = require('../../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    const platformSettings = await platformSettingsService.getPlatformSettings();
    const minimumOrderAmount = platformSettings.minimumOrderAmount || 5;
    
    if (finalAmount < minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Order total ($${finalAmount.toFixed(2)}) is below minimum order amount ($${minimumOrderAmount.toFixed(2)})`,
        minimumRequired: minimumOrderAmount,
        currentAmount: finalAmount
      });
    }

    // Create Stripe PaymentIntent with authorization (not immediate capture)
    // Get or create Stripe customer for the user
    let stripeCustomerId = null;
    try {
      // Check if user already has a Stripe customer ID
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
      
      if (user && user.stripeCustomerId) {
        stripeCustomerId = user.stripeCustomerId;
        console.log('✅ Using existing Stripe customer:', stripeCustomerId);
        
        // Migrate existing PaymentMethods to Customer if needed
        if (user.paymentMethods && Array.isArray(user.paymentMethods)) {
          for (const paymentMethod of user.paymentMethods) {
            if (paymentMethod.stripePaymentMethodId) {
              try {
                // Check if PaymentMethod is already attached to customer
                const pm = await stripe.paymentMethods.retrieve(paymentMethod.stripePaymentMethodId);
                if (!pm.customer) {
                  console.log('🔄 Migrating PaymentMethod to Customer:', paymentMethod.stripePaymentMethodId);
                  await stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
                    customer: stripeCustomerId,
                  });
                  console.log('✅ PaymentMethod migrated to Customer:', paymentMethod.stripePaymentMethodId);
                }
              } catch (migrationError) {
                console.warn('⚠️ Could not migrate PaymentMethod:', paymentMethod.stripePaymentMethodId, migrationError.message);
                // Continue - this PaymentMethod might not be usable but others might be
              }
            }
          }
        }
      } else {
        // Create new Stripe customer
        const stripeCustomer = await stripe.customers.create({
          email: user?.email || undefined,
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined,
          metadata: {
            userId: decoded.userId.toString()
          }
        });
        
        stripeCustomerId = stripeCustomer.id;
        console.log('✅ Created new Stripe customer:', stripeCustomerId);
        
        // Save Stripe customer ID to user document
        await usersCollection.updateOne(
          { _id: new (require('mongodb')).ObjectId(decoded.userId) },
          { 
            $set: { 
              stripeCustomerId: stripeCustomerId,
              updatedAt: new Date()
            }
          }
        );
        console.log('✅ Saved Stripe customer ID to user profile');
        
        // Migrate existing PaymentMethods to the new Customer
        if (user && user.paymentMethods && Array.isArray(user.paymentMethods)) {
          for (const paymentMethod of user.paymentMethods) {
            if (paymentMethod.stripePaymentMethodId) {
              try {
                console.log('🔄 Migrating PaymentMethod to new Customer:', paymentMethod.stripePaymentMethodId);
                await stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
                  customer: stripeCustomerId,
                });
                console.log('✅ PaymentMethod migrated to Customer:', paymentMethod.stripePaymentMethodId);
              } catch (migrationError) {
                console.warn('⚠️ Could not migrate PaymentMethod:', paymentMethod.stripePaymentMethodId, migrationError.message);
                // Continue - this PaymentMethod might not be usable but others might be
              }
            }
          }
        }
      }
    } catch (customerError) {
      console.error('❌ CRITICAL ERROR managing Stripe customer:', customerError);
      console.error('❌ Stack trace:', customerError.stack);
      
      // IMPORTANT: If we can't create/get a customer, payment methods won't be reusable
      // We should still continue to allow the payment, but warn clearly
      console.error('⚠️ PROCEEDING WITHOUT CUSTOMER - SAVED CARDS WILL NOT WORK');
      stripeCustomerId = null;
    }

    console.log('💳 Creating payment intent with customer:', stripeCustomerId);
    
    // CRITICAL: Verify we have a customer ID before creating payment intent
    if (!stripeCustomerId) {
      console.error('⚠️ WARNING: No Stripe customer ID available! PaymentMethods will not be reusable.');
      console.log('⚠️ This usually means the customer creation/retrieval failed.');
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency: 'cad',
      capture_method: 'manual', // Authorize now, capture later
      customer: stripeCustomerId, // Attach to Stripe customer for saved card support
      setup_future_usage: 'off_session', // Save payment method for future use
      metadata: {
        userId: decoded.userId.toString(),
        orderType: 'regular_order',
        itemCount: validatedItems.length,
        deliveryMethod: deliveryMethod || 'pickup'
      }
    });
    
    console.log('✅ Payment intent created:', {
      id: paymentIntent.id,
      customer: paymentIntent.customer,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        currency: 'CAD'
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Create payment intent for guest order
const createGuestPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

    const { items, deliveryAddress, deliveryMethod, deliveryInstructions, guestInfo } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    const db = req.db;
    const productsCollection = db.collection('products');

    // Validate and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await productsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(item.productId) 
      });
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Product is not available: ${product.name}`,
          error: `Product status is '${product.status}' (must be 'active')`,
          productId: product._id.toString(),
          productName: product.name,
          currentStatus: product.status
        });
      }

      // Check inventory availability based on product type
      let hasEnoughInventory = false;
      let availableQuantity = 0;
      
      if (product.productType === 'ready_to_ship') {
        availableQuantity = Math.min(product.stock || 0, product.availableQuantity || 0);
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'made_to_order') {
        availableQuantity = product.remainingCapacity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'scheduled_order') {
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else {
        // Fallback for unknown types
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      }
      
      if (!hasEnoughInventory) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for product ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        artisanId: product.artisan,
        productType: product.productType
      });
    }

    // Add delivery fee if applicable
    // For professionalDelivery, prioritize frontend-provided fee (includes Uber buffer)
    let deliveryFee = 0;
    
    if (req.body.deliveryFee && deliveryMethod === 'professionalDelivery') {
      // Use the buffered delivery fee provided by frontend (includes 20% buffer)
      deliveryFee = parseFloat(req.body.deliveryFee);
      console.log('💰 [Guest] Using frontend-provided delivery fee (buffered):', deliveryFee);
    } else if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Fallback: Calculate from artisan settings
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: validatedItems[0].artisanId });
      
      if (artisan) {
        const { getDeliveryFee } = require('../../utils/artisanSchemaUtils');
        deliveryFee = getDeliveryFee(artisan, deliveryMethod);
        console.log('💰 [Guest] Calculated delivery fee from artisan settings:', deliveryFee);
      }
    }

    const finalAmount = totalAmount + deliveryFee;
    
    console.log('💰 [Guest] Payment intent amounts:', {
      subtotal: totalAmount,
      deliveryFee,
      finalAmount,
      deliveryMethod
    });

    // Create Stripe PaymentIntent for guest with automatic capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Convert to cents
      currency: 'cad',
      capture_method: 'automatic', // Capture immediately for guest orders
      metadata: {
        orderType: 'guest_order',
        guestEmail: guestInfo?.email || 'guest@example.com',
        itemCount: validatedItems.length,
        deliveryMethod: deliveryMethod || 'pickup'
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: finalAmount,
        currency: 'CAD'
      }
    });
  } catch (error) {
    console.error('Create guest payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Confirm payment and create order
const confirmPaymentAndCreateOrder = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not available. Stripe is not configured.'
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    const { paymentIntentId, orderData } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Verify payment with Stripe
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Handle requires_capture status by capturing the payment
    if (paymentIntent.status === 'requires_capture') {
      try {
        console.log(`🔄 Capturing payment intent: ${paymentIntentId}`);
        paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
        console.log(`✅ Payment captured successfully: ${paymentIntentId}`);
      } catch (captureError) {
        console.error(`❌ Failed to capture payment ${paymentIntentId}:`, captureError);
        return res.status(400).json({
          success: false,
          message: 'Failed to capture payment: ' + captureError.message
        });
      }
    }

    // Check if payment is now successful
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${paymentIntent.status}`
      });
    }

    let userId = null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
      
      // Verify payment belongs to user
      if (paymentIntent.metadata.userId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Payment does not belong to user'
        });
      }
    }

    // Create order after successful payment
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');

    // Calculate total from payment intent
    const totalAmount = paymentIntent.amount / 100; // Convert from cents

    // Enrich order items with complete product data
    const enrichedItems = [];
    for (const item of orderData.items || []) {
      try {
        const product = await productsCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(item.productId) 
        });
        
        if (product) {
          enrichedItems.push({
            productId: product._id,
            product: {
              _id: product._id,
              name: product.name,
              price: product.price,
              description: product.description,
              images: product.images,
              category: product.category,
              productType: product.productType,
              artisan: product.artisan
            },
            name: product.name,
            productName: product.name, // Add productName for frontend compatibility
            price: product.price,
            quantity: item.quantity,
            totalPrice: product.price * item.quantity,
            unitPrice: product.price,
            productType: product.productType,
            artisanId: product.artisan
          });
        } else {
          console.warn(`⚠️ Product not found for order item: ${item.productId}`);
          // Fallback item with minimal data
          enrichedItems.push({
            productId: item.productId,
            name: 'Unknown Product',
            price: 0,
            quantity: item.quantity,
            totalPrice: 0,
            unitPrice: 0,
            productType: item.productType || 'ready_to_ship'
          });
        }
      } catch (error) {
        console.error(`❌ Error enriching order item ${item.productId}:`, error);
        // Fallback item with minimal data
        enrichedItems.push({
          productId: item.productId,
          name: 'Unknown Product',
          price: 0,
          quantity: item.quantity,
          totalPrice: 0,
          unitPrice: 0,
          productType: item.productType || 'ready_to_ship'
        });
      }
    }

    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    const deliveryMethod = orderData.deliveryMethod || 'pickup';
    if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Get artisan delivery settings from fulfillment object
      const artisansCollection = db.collection('artisans');
      if (enrichedItems.length > 0 && enrichedItems[0].artisanId) {
        const artisan = await artisansCollection.findOne({ _id: enrichedItems[0].artisanId });
        
        if (artisan) {
          // First try to get from fulfillment object (new structure)
          if (artisan.fulfillment?.methods) {
            if (deliveryMethod === 'personalDelivery' && artisan.fulfillment.methods.delivery?.fee !== undefined) {
              deliveryFee = artisan.fulfillment.methods.delivery.fee;
              console.log('💰 Using delivery fee from fulfillment.methods.delivery:', deliveryFee);
            } else if (deliveryMethod === 'professionalDelivery' && artisan.fulfillment.methods.professionalDelivery?.fee !== undefined) {
              deliveryFee = artisan.fulfillment.methods.professionalDelivery.fee;
              console.log('💰 Using delivery fee from fulfillment.methods.professionalDelivery:', deliveryFee);
            }
          }
          
          // Fallback to legacy deliveryOptions if fulfillment not set
          if (deliveryFee === 0 && artisan.deliveryOptions) {
            if (deliveryMethod === 'personalDelivery' && artisan.deliveryOptions.deliveryFee) {
              deliveryFee = artisan.deliveryOptions.deliveryFee;
              console.log('💰 Using legacy deliveryFee from deliveryOptions:', deliveryFee);
            } else if (deliveryMethod === 'professionalDelivery' && artisan.deliveryOptions.professionalDeliveryFee) {
              deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
              console.log('💰 Using legacy professionalDeliveryFee from deliveryOptions:', deliveryFee);
            }
          }
        }
      }
    }

    const subtotal = totalAmount - deliveryFee;

    // Determine payment status (guest orders captured immediately, authenticated orders authorized)
    const isGuestOrder = !userId;
    const paymentStatus = isGuestOrder ? 'captured' : 'authorized';
    
    // Use unified order schema
    const order = createUnifiedOrderSchema({
      userId: userId,
      items: enrichedItems,
      totalAmount: totalAmount,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      status: 'pending',
      paymentStatus: paymentStatus,
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntentId,
      deliveryAddress: orderData.deliveryAddress,
      deliveryInstructions: orderData.deliveryInstructions,
      deliveryMethod: orderData.deliveryMethod,
      pickupTimeWindows: orderData.pickupTimeWindows,
      deliveryMethodDetails: orderData.deliveryMethodDetails,
      paymentDetails: {
        stripePaymentIntentId: paymentIntentId,
        stripeAmount: paymentIntent.amount,
        stripeCurrency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method
      },
      notes: orderData.notes,
      artisan: enrichedItems.length > 0 ? enrichedItems[0].artisanId : null,
      isGuestOrder: isGuestOrder,
      guestInfo: orderData.guestInfo
    });
    
    // Add payment hold tracking for authorized payments
    if (paymentStatus === 'authorized') {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      order.paymentHold = {
        status: 'held',
        authorizedAt: now,
        expiresAt: expiresAt,
        amount: totalAmount,
        paymentIntentId: paymentIntentId,
        lastChecked: now
      };
      
      console.log('💳 Payment hold tracking added:', {
        amount: totalAmount,
        authorizedAt: now,
        expiresAt: expiresAt,
        daysUntilExpiry: 7
      });
    }
    
    // Add delivery pricing data for professional delivery (buffer system)
    if (orderData.deliveryPricing && orderData.deliveryMethod === 'professionalDelivery') {
      order.deliveryPricing = {
        estimatedFee: orderData.deliveryPricing.estimatedFee || 0,
        buffer: orderData.deliveryPricing.buffer || 0,
        bufferPercentage: orderData.deliveryPricing.bufferPercentage || 20,
        chargedAmount: orderData.deliveryPricing.chargedAmount || deliveryFee,
        uberQuoteId: orderData.deliveryPricing.uberQuoteId,
        uberQuoteExpiry: orderData.deliveryPricing.uberQuoteExpiry,
        lastUpdated: new Date()
      };
      console.log('💰 Added delivery pricing to order:', order.deliveryPricing);
    }

    const result = await ordersCollection.insertOne(order);

    // Reduce inventory for each product in the order
    const inventoryUpdates = [];
    
    for (const item of order.items) {
      try {
        const product = await productsCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(item.productId) 
        });
        
        if (product) {
          // Prepare inventory update based on product type
          const updateFields = {
            soldCount: (product.soldCount || 0) + item.quantity,
            updatedAt: new Date()
          };
          
          // Update the appropriate inventory field based on product type
          if (product.productType === 'ready_to_ship') {
            updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else if (product.productType === 'made_to_order') {
            updateFields.remainingCapacity = Math.max(0, (product.remainingCapacity || 0) - item.quantity);
          } else if (product.productType === 'scheduled_order') {
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else {
            // Fallback for unknown types
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
            if (product.productType === 'ready_to_ship') {
              updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            }
          }
          
          // Update product status based on remaining inventory
          const remainingStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                                product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                                product.productType === 'scheduled_order' ? updateFields.availableQuantity : 0;
          
          updateFields.status = remainingStock > 0 ? 'active' : 'out_of_stock';
          
          // Update the product
          await productsCollection.updateOne(
            { _id: new (require('mongodb')).ObjectId(item.productId) },
            { $set: updateFields }
          );
          
          inventoryUpdates.push({
            productId: item.productId,
            productName: product.name,
            quantityReduced: item.quantity,
            remainingStock: remainingStock,
            newStatus: updateFields.status
          });
          
          console.log(`✅ Inventory reduced for product ${product.name}: -${item.quantity}, remaining: ${remainingStock}`);
        } else {
          console.warn(`⚠️ Product not found for inventory reduction: ${item.productId}`);
        }
      } catch (inventoryError) {
        console.error(`❌ Error reducing inventory for product ${item.productId}:`, inventoryError);
        // Continue with other products even if one fails
      }
    }

    // Record wallet transaction for artisans if applicable
    if (order.items.length > 0) {
      const recordWalletTransaction = req.app.locals.recordWalletTransaction;
      if (recordWalletTransaction) {
        // Get artisan from first item
        const artisanId = order.items[0].artisanId;
        if (artisanId) {
        // Note: This is for legacy orders that were created with immediate payment
        // New orders will use the capture payment flow with proper platform fee calculation
        await recordWalletTransaction(db, {
          artisanId: artisanId,
          type: 'order_revenue',
          amount: totalAmount * 0.85, // 85% to artisan, 15% platform fee (legacy)
          description: `Legacy revenue from order #${result.insertedId} (immediate payment)`,
          status: 'completed',
          orderId: result.insertedId,
          isLegacy: true
        });
        }
      }
    }

    // Send order creation notifications
    try {
      const axios = require('axios');
      
      // Fetch user data for authenticated users to get email for notifications
      let customerUserInfo = {
        id: userId,
        isGuest: order.isGuestOrder,
        email: order.isGuestOrder ? order.guestInfo?.email : null,
        firstName: order.isGuestOrder ? order.guestInfo?.firstName : null,
        lastName: order.isGuestOrder ? order.guestInfo?.lastName : null,
        phone: order.isGuestOrder ? order.guestInfo?.phone : null
      };
      
      // For authenticated users, fetch their email from database
      if (userId && !order.isGuestOrder) {
        try {
          const usersCollection = db.collection('users');
          const user = await usersCollection.findOne({ 
            _id: new (require('mongodb')).ObjectId(userId) 
          });
          
          if (user) {
            customerUserInfo = {
              id: userId,
              isGuest: false,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              isArtisan: false
            };
            
            // Check if customer is also an artisan
            try {
              const buyerArtisan = await db.collection('artisans').findOne({ user: user._id });
              if (buyerArtisan) {
                customerUserInfo.isArtisan = true;
                customerUserInfo.artisanName = buyerArtisan.artisanName || buyerArtisan.businessName;
                customerUserInfo.businessName = buyerArtisan.businessName || buyerArtisan.artisanName;
                customerUserInfo.artisanId = buyerArtisan._id;
                console.log('✅ Customer is also an artisan:', customerUserInfo.artisanName);
              }
            } catch (artisanCheckError) {
              console.error('❌ Error checking if customer is artisan:', artisanCheckError);
            }
          }
        } catch (userFetchError) {
          console.error('❌ Error fetching user for notification:', userFetchError);
        }
      }
      
      // Send notification to customer about order placement
      const customerNotificationData = {
        type: 'order_placed',
        userId: userId ? userId.toString() : null,
        orderId: result.insertedId,
        orderNumber: result.insertedId.toString().slice(-8), // Add top-level orderNumber
        title: 'Order Placed Successfully',
        message: `Your order #${result.insertedId.toString().slice(-8)} has been placed successfully`,
        orderData: {
          _id: result.insertedId,
          orderId: result.insertedId.toString(), // Full ID as string
          orderNumber: result.insertedId.toString().slice(-8), // Last 8 chars as display number
          totalAmount: totalAmount,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          deliveryPricing: order.deliveryPricing, // Include professional delivery pricing with buffer
          status: 'pending',
          items: order.items,
          deliveryAddress: order.deliveryAddress,
          deliveryMethod: order.deliveryMethod,
          deliveryInstructions: order.deliveryInstructions,
          pickupTimeWindows: order.pickupTimeWindows,
          pickupAddress: order.pickupAddress, // Add pickup address
          pickupTime: order.pickupTime, // Add pickup time
          deliveryMethodDetails: order.deliveryMethodDetails,
          isGuestOrder: order.isGuestOrder,
          guestInfo: order.guestInfo,
          createdAt: order.createdAt
        },
        userInfo: customerUserInfo,
        userEmail: customerUserInfo.email, // Explicitly set userEmail for backend notification service
        timestamp: new Date().toISOString()
      };
      
      // Add artisan information for customer email
      if (order.artisan) {
        try {
          const artisansCollection = db.collection('artisans');
          const artisan = await artisansCollection.findOne({ _id: order.artisan });
          if (artisan) {
            // Extract pickup address from fulfillment structure
            let pickupAddress = null;
            if (artisan.fulfillment?.methods?.pickup?.enabled) {
              if (artisan.fulfillment.methods.pickup.useBusinessAddress) {
                pickupAddress = artisan.address;
              } else if (artisan.fulfillment.methods.pickup.location) {
                // Parse location string to address object if needed
                pickupAddress = artisan.fulfillment.methods.pickup.location;
              }
            }
            // Fallback to direct fields
            pickupAddress = pickupAddress || artisan.pickupAddress || artisan.address;
            
            const pickupInstructions = artisan.fulfillment?.methods?.pickup?.instructions || 
                                     artisan.fulfillment?.pickupInstructions || 
                                     artisan.pickupInstructions;
            
            customerNotificationData.orderData.artisanInfo = {
              id: artisan._id,
              name: artisan.artisanName || artisan.businessName,
              email: artisan.email || artisan.contactInfo?.email,
              phone: artisan.phone || artisan.contactInfo?.phone,
              pickupAddress: pickupAddress,
              businessHours: artisan.businessHours,
              pickupInstructions: pickupInstructions
            };
            // Also add pickup address if available
            if (order.deliveryMethod === 'pickup') {
              customerNotificationData.orderData.pickupAddress = pickupAddress;
            }
          }
        } catch (artisanFetchError) {
          console.error('❌ Error fetching artisan info for customer notification:', artisanFetchError);
        }
      }

      console.log('📧 Sending customer order placement notification:', {
        userId: customerNotificationData.userId,
        type: customerNotificationData.type,
        email: customerUserInfo.email
      });

      await sendNotificationDirect(customerNotificationData, db);
      console.log('✅ Customer order placement notification sent');

      // Send notification to artisan about new pending order
      if (order.artisan) {
        // Fetch artisan user email
        let artisanUserInfo = {
          id: order.artisan,
          isGuest: false,
          email: null,
          firstName: null,
          lastName: null,
          phone: null
        };
        
        try {
          const artisansCollection = db.collection('artisans');
          const usersCollection = db.collection('users');
          
          const artisan = await artisansCollection.findOne({ _id: order.artisan });
          if (artisan && artisan.user) {
            const artisanUser = await usersCollection.findOne({ _id: artisan.user });
            if (artisanUser) {
              artisanUserInfo = {
                id: artisan.user,
                isGuest: false,
                email: artisanUser.email,
                firstName: artisanUser.firstName,
                lastName: artisanUser.lastName,
                phone: artisanUser.phone
              };
            }
          }
        } catch (artisanFetchError) {
          console.error('❌ Error fetching artisan user for notification:', artisanFetchError);
        }
        
        // Fetch artisan details to include in notification
        let artisanDetailsForNotification = null;
        try {
          const artisan = await db.collection('artisans').findOne({ _id: order.artisan });
          if (artisan) {
            // Extract pickup address from fulfillment structure
            let pickupAddress = null;
            if (artisan.fulfillment?.methods?.pickup?.enabled) {
              if (artisan.fulfillment.methods.pickup.useBusinessAddress) {
                pickupAddress = artisan.address;
              } else if (artisan.fulfillment.methods.pickup.location) {
                pickupAddress = artisan.fulfillment.methods.pickup.location;
              }
            }
            pickupAddress = pickupAddress || artisan.pickupAddress || artisan.address;
            
            const pickupInstructions = artisan.fulfillment?.methods?.pickup?.instructions || 
                                     artisan.fulfillment?.pickupInstructions || 
                                     artisan.pickupInstructions;
            
            artisanDetailsForNotification = {
              name: artisan.artisanName || artisan.businessName,
              email: artisan.email || artisan.contactInfo?.email || artisan.user?.email,
              phone: artisan.phone || artisan.contactInfo?.phone || artisan.user?.phone,
              pickupAddress: pickupAddress,
              pickupInstructions: pickupInstructions
            };
          }
        } catch (err) {
          console.error('❌ Error fetching artisan details for notification:', err);
        }
        
        const artisanNotificationData = {
          type: 'new_order_pending',
          userId: artisanUserInfo.id ? artisanUserInfo.id.toString() : null,
          orderId: result.insertedId,
          orderNumber: result.insertedId.toString().slice(-8), // Add top-level orderNumber
          title: 'New Order Received',
          message: `You have a new order #${result.insertedId.toString().slice(-8)} from ${customerUserInfo.firstName || 'a customer'}`,
          orderData: {
            _id: result.insertedId,
            orderId: result.insertedId.toString(), // Full ID as string
            orderNumber: result.insertedId.toString().slice(-8), // Last 8 chars as display number
            totalAmount: totalAmount,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            status: 'pending',
            items: order.items,
            deliveryAddress: order.deliveryAddress,
            deliveryMethod: order.deliveryMethod,
            deliveryInstructions: order.deliveryInstructions,
            pickupTimeWindows: order.pickupTimeWindows,
            pickupAddress: order.pickupAddress, // Add pickup address
            pickupTime: order.pickupTime, // Add pickup time
            deliveryMethodDetails: order.deliveryMethodDetails,
            isGuestOrder: order.isGuestOrder,
            guestInfo: order.isGuestOrder ? {
              firstName: customerUserInfo.firstName,
              lastName: customerUserInfo.lastName,
              email: customerUserInfo.email,
              phone: customerUserInfo.phone
            } : null,
            patronInfo: !order.isGuestOrder ? {
              firstName: customerUserInfo.firstName,
              lastName: customerUserInfo.lastName,
              email: customerUserInfo.email,
              phone: customerUserInfo.phone,
              isArtisan: customerUserInfo.isArtisan || false,
              artisanName: customerUserInfo.artisanName || null,
              businessName: customerUserInfo.businessName || null,
              artisanId: customerUserInfo.artisanId || null
            } : null,
            customerInfo: {  // Add customer info for artisan
              firstName: customerUserInfo.firstName,
              lastName: customerUserInfo.lastName,
              email: customerUserInfo.email,
              phone: customerUserInfo.phone,
              isGuest: order.isGuestOrder,
              isArtisan: customerUserInfo.isArtisan || false,
              artisanName: customerUserInfo.artisanName || null,
              businessName: customerUserInfo.businessName || null,
              artisanId: customerUserInfo.artisanId || null
            },
            artisanInfo: artisanDetailsForNotification, // Add artisan info for email template
            createdAt: order.createdAt
          },
          userInfo: artisanUserInfo,
          userEmail: artisanUserInfo.email, // Explicitly set userEmail for backend notification service
          timestamp: new Date().toISOString()
        };

        console.log('📧 Sending artisan new order notification:', {
          userId: artisanNotificationData.userId,
          type: artisanNotificationData.type,
          email: artisanUserInfo.email
        });

        await sendNotificationDirect(artisanNotificationData, db);
        console.log('✅ Artisan new order notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error sending order notifications:', notificationError);
      // Don't fail the order creation if notification fails
    }

    // Invalidate cache for the artisan when new order is created
    if (enrichedItems.length > 0 && enrichedItems[0].artisanId) {
      await invalidateArtisanCache(enrichedItems[0].artisanId);
    }

    // Fetch the complete order data to return to frontend
    const completeOrder = await ordersCollection.findOne({ _id: result.insertedId });
    
    // Populate artisan information for the order
    let orderWithArtisan = { ...completeOrder };
    if (completeOrder.artisan) {
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: completeOrder.artisan });
      orderWithArtisan.artisan = artisan;
    } else if (completeOrder.items && completeOrder.items.length > 0 && completeOrder.items[0].artisanId) {
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: completeOrder.items[0].artisanId });
      orderWithArtisan.artisan = artisan;
    }
    
    res.json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...orderWithArtisan,
        orderId: result.insertedId,
        paymentIntentId: paymentIntentId,
        inventoryUpdates: inventoryUpdates // Include inventory update details
      }
    });
  } catch (error) {
    console.error('Confirm payment and create order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment and create order',
      error: error.message
    });
  }
};

// Wallet payment and create order (for artisans only)
const walletPaymentAndCreateOrder = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { orderData } = req.body;

    if (!orderData) {
      return res.status(400).json({
        success: false,
        message: 'Order data is required'
      });
    }

    // Verify user is an artisan
    const db = req.db;
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(userId) 
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Wallet payment is only available for artisans'
      });
    }

    // Initialize WalletService
    const walletService = new WalletService(db);
    
    // Calculate total amount
    const totalAmount = orderData.totalAmount || 0;

    // Enrich order items with complete product data
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    const enrichedItems = [];
    for (const item of orderData.items || []) {
      try {
        const product = await productsCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(item.productId) 
        });
        
        if (product) {
          enrichedItems.push({
            productId: product._id,
            product: {
              _id: product._id,
              name: product.name,
              price: product.price,
              description: product.description,
              images: product.images,
              category: product.category,
              productType: product.productType,
              artisan: product.artisan
            },
            name: product.name,
            productName: product.name,
            price: product.price,
            quantity: item.quantity,
            totalPrice: product.price * item.quantity,
            unitPrice: product.price,
            productType: product.productType,
            artisanId: product.artisan
          });
        }
      } catch (error) {
        console.error(`❌ Error enriching order item ${item.productId}:`, error);
      }
    }

    // Calculate delivery fee from artisan's fulfillment settings
    let deliveryFee = orderData.deliveryFee || 0;
    const deliveryMethod = orderData.deliveryMethod || 'pickup';
    
    if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      const artisansCollection = db.collection('artisans');
      if (enrichedItems.length > 0 && enrichedItems[0].artisanId) {
        const artisan = await artisansCollection.findOne({ _id: enrichedItems[0].artisanId });
        
        if (artisan) {
          // First try to get from fulfillment object (new structure)
          if (artisan.fulfillment?.methods) {
            if (deliveryMethod === 'personalDelivery' && artisan.fulfillment.methods.delivery?.fee !== undefined) {
              deliveryFee = artisan.fulfillment.methods.delivery.fee;
              console.log('💰 Wallet order: Using delivery fee from fulfillment.methods.delivery:', deliveryFee);
            } else if (deliveryMethod === 'professionalDelivery' && artisan.fulfillment.methods.professionalDelivery?.fee !== undefined) {
              deliveryFee = artisan.fulfillment.methods.professionalDelivery.fee;
              console.log('💰 Wallet order: Using delivery fee from fulfillment.methods.professionalDelivery:', deliveryFee);
            }
          }
          
          // Fallback to legacy deliveryOptions if fulfillment not set
          if (deliveryFee === 0 && artisan.deliveryOptions) {
            if (deliveryMethod === 'personalDelivery' && artisan.deliveryOptions.deliveryFee) {
              deliveryFee = artisan.deliveryOptions.deliveryFee;
              console.log('💰 Wallet order: Using legacy deliveryFee from deliveryOptions:', deliveryFee);
            } else if (deliveryMethod === 'professionalDelivery' && artisan.deliveryOptions.professionalDeliveryFee) {
              deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
              console.log('💰 Wallet order: Using legacy professionalDeliveryFee from deliveryOptions:', deliveryFee);
            }
          }
        }
      }
    }

    const subtotal = totalAmount - deliveryFee;

    // Deduct wallet immediately to prevent abuse (artisan can't over-order)
    // If order is cancelled/declined, wallet will be credited back
    try {
      await walletService.deductFunds(
        userId,
        totalAmount,
        `Order payment for #${Date.now().toString().slice(-8)}`,
        {
          orderType: 'purchase',
          deliveryMethod: orderData.deliveryMethod,
          itemCount: enrichedItems.length,
          reason: 'order_payment'
        }
      );
      
      console.log(`💰 Wallet deducted immediately: $${totalAmount} from user ${userId}`);
    } catch (walletError) {
      console.error('❌ Error deducting from wallet:', walletError);
      return res.status(400).json({
        success: false,
        message: walletError.message || 'Failed to process wallet payment',
        error: walletError.message
      });
    }

    // Create order using unified schema
    // Wallet already deducted - will be refunded if cancelled/declined
    const order = createUnifiedOrderSchema({
      userId: userId,
      items: enrichedItems,
      totalAmount: totalAmount,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      status: 'pending',
      paymentStatus: 'paid', // Wallet already deducted
      paymentMethod: 'wallet',
      paymentIntentId: `wallet_${Date.now()}_${userId}`,
      deliveryAddress: orderData.deliveryAddress,
      deliveryInstructions: orderData.deliveryInstructions,
      deliveryMethod: orderData.deliveryMethod,
      pickupTimeWindows: orderData.pickupTimeWindows,
      deliveryMethodDetails: orderData.deliveryMethodDetails,
      paymentDetails: {
        paymentMethod: 'wallet',
        paidAt: new Date()
      },
      notes: orderData.notes,
      artisan: enrichedItems.length > 0 ? enrichedItems[0].artisanId : null,
      isGuestOrder: false
    });

    // Add delivery pricing for professional delivery
    if (orderData.deliveryPricing && orderData.deliveryMethod === 'professionalDelivery') {
      order.deliveryPricing = {
        estimatedFee: orderData.deliveryPricing.estimatedFee || 0,
        buffer: orderData.deliveryPricing.buffer || 0,
        bufferPercentage: orderData.deliveryPricing.bufferPercentage || 20,
        chargedAmount: orderData.deliveryPricing.chargedAmount || deliveryFee,
        uberQuoteId: orderData.deliveryPricing.uberQuoteId,
        uberQuoteExpiry: orderData.deliveryPricing.uberQuoteExpiry,
        lastUpdated: new Date()
      };
    }

    const result = await ordersCollection.insertOne(order);

    // Reduce inventory
    const inventoryUpdates = [];
    for (const item of order.items) {
      try {
        const product = await productsCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(item.productId) 
        });
        
        if (product) {
          const updateFields = {
            soldCount: (product.soldCount || 0) + item.quantity,
            updatedAt: new Date()
          };
          
          if (product.productType === 'ready_to_ship') {
            updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else if (product.productType === 'made_to_order') {
            updateFields.remainingCapacity = Math.max(0, (product.remainingCapacity || 0) - item.quantity);
          } else if (product.productType === 'scheduled_order') {
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          }
          
          const remainingStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                                product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                                product.productType === 'scheduled_order' ? updateFields.availableQuantity : 0;
          
          updateFields.status = remainingStock > 0 ? 'active' : 'out_of_stock';
          
          await productsCollection.updateOne(
            { _id: new (require('mongodb')).ObjectId(item.productId) },
            { $set: updateFields }
          );
          
          inventoryUpdates.push({
            productId: item.productId,
            productName: product.name,
            quantityReduced: item.quantity,
            remainingStock: remainingStock,
            newStatus: updateFields.status
          });
          
          console.log(`✅ Inventory reduced for product ${product.name}: -${item.quantity}, remaining: ${remainingStock}`);
        }
      } catch (inventoryError) {
        console.error(`❌ Error reducing inventory for product ${item.productId}:`, inventoryError);
      }
    }

    // Send notifications
    try {
      // Notify buyer (artisan who made purchase)
      await sendNotificationDirect({
        userId: userId,
        type: 'order_created_buyer',
        title: 'Order Placed Successfully',
        message: `Your order #${result.insertedId.toString().slice(-8)} has been placed. Payment of $${totalAmount.toFixed(2)} was deducted from your wallet.`,
        orderNumber: result.insertedId.toString().slice(-8), // Add top-level orderNumber
        data: {
          orderId: result.insertedId.toString(),
          orderNumber: result.insertedId.toString().slice(-8),
          totalAmount: totalAmount,
          paymentMethod: 'wallet'
        },
        orderData: {
          _id: result.insertedId,
          orderId: result.insertedId.toString(),
          orderNumber: result.insertedId.toString().slice(-8),
          totalAmount: totalAmount,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          deliveryPricing: order.deliveryPricing,
          status: 'pending',
          items: order.items,
          deliveryAddress: order.deliveryAddress,
          deliveryMethod: order.deliveryMethod
        },
        priority: 'high'
      }, db);
      
      // Notify seller (artisan whose product was purchased)
      if (enrichedItems.length > 0 && enrichedItems[0].artisanId) {
        const artisansCollection = db.collection('artisans');
        const sellerArtisan = await artisansCollection.findOne({ _id: enrichedItems[0].artisanId });
        
        if (sellerArtisan && sellerArtisan.user) {
          await sendNotificationDirect({
            userId: sellerArtisan.user.toString(),
            type: 'order_created_seller',
            title: 'New Order Received',
            message: `You have a new order #${result.insertedId.toString().slice(-8)} from a fellow artisan!`,
            orderNumber: result.insertedId.toString().slice(-8), // Add top-level orderNumber
            data: {
              orderId: result.insertedId.toString(),
              orderNumber: result.insertedId.toString().slice(-8),
              totalAmount: totalAmount,
              itemCount: enrichedItems.length
            },
            orderData: {
              _id: result.insertedId,
              orderId: result.insertedId.toString(),
              orderNumber: result.insertedId.toString().slice(-8),
              totalAmount: totalAmount,
              subtotal: order.subtotal,
              deliveryFee: order.deliveryFee,
              deliveryPricing: order.deliveryPricing,
              status: 'pending',
              items: order.items,
              deliveryAddress: order.deliveryAddress,
              deliveryMethod: order.deliveryMethod
            },
            priority: 'high'
          }, db);
        }
      }
    } catch (notifError) {
      console.error('❌ Error sending notifications:', notifError);
      // Continue even if notifications fail
    }

    // Fetch complete order to return
    const completeOrder = await ordersCollection.findOne({ _id: result.insertedId });
    
    // Populate artisan information
    let orderWithArtisan = { ...completeOrder };
    if (completeOrder.artisan) {
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: completeOrder.artisan });
      orderWithArtisan.artisan = artisan;
    }

    res.json({
      success: true,
      message: 'Order created successfully with wallet payment',
      data: {
        ...orderWithArtisan,
        orderId: result.insertedId,
        inventoryUpdates: inventoryUpdates
      }
    });
  } catch (error) {
    console.error('❌ Wallet payment and create order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process wallet payment and create order',
      error: error.message
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    // Calculate total and validate items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const product = await productsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(item.productId),
        status: 'active'
      });
      
      if (!product) {
        // Connection managed by middleware - no close needed
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or inactive`
        });
      }
      
      // Check inventory availability based on product type
      let hasEnoughInventory = false;
      let availableQuantity = 0;
      
      if (product.productType === 'ready_to_ship') {
        availableQuantity = Math.min(product.stock || 0, product.availableQuantity || 0);
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'made_to_order') {
        availableQuantity = product.remainingCapacity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'scheduled_order') {
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else {
        // Fallback for unknown types
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      }
      
      if (!hasEnoughInventory) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for product ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: product._id,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          description: product.description,
          images: product.images,
          category: product.category,
          productType: product.productType,
          artisan: product.artisan
        },
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
        unitPrice: product.price,
        productType: product.productType,
        // Legacy fields for backward compatibility
        productName: product.name,
        productPrice: product.price,
        itemTotal: itemTotal,
        artisanId: product.artisan
      });
      
      console.log('🔍 Order item created:', {
        productId: product._id,
        productName: product.name,
        artisanId: product.artisan,
        artisanIdType: typeof product.artisan,
        artisanIdString: product.artisan?.toString()
      });
    }
    
    // Create order using unified schema
    const order = createUnifiedOrderSchema({
      userId: decoded.userId,
      items: validatedItems,
      totalAmount: totalAmount,
      subtotal: totalAmount, // No delivery fee in regular orders by default
      deliveryFee: 0,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || 'cash',
      paymentIntentId: null,
      deliveryAddress: {},
      deliveryInstructions: '',
      deliveryMethod: 'pickup',
      pickupTimeWindows: {},
      deliveryMethodDetails: [],
      paymentDetails: {},
      notes: notes || '',
      artisan: validatedItems[0]?.artisanId,
      isGuestOrder: false,
      guestInfo: {},
      // Legacy support
      shippingAddress: shippingAddress
    });
    
    const result = await ordersCollection.insertOne(order);
    const orderId = result.insertedId;
    
    // Update product quantities based on product type
    const inventoryUpdates = [];
    for (const item of validatedItems) {
      try {
        const product = await productsCollection.findOne({ _id: item.productId });
        if (product) {
          // Prepare inventory update based on product type
          const updateFields = {
            soldCount: (product.soldCount || 0) + item.quantity,
            updatedAt: new Date()
          };
          
          // Update the appropriate inventory field based on product type
          if (product.productType === 'ready_to_ship') {
            updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else if (product.productType === 'made_to_order') {
            updateFields.remainingCapacity = Math.max(0, (product.remainingCapacity || 0) - item.quantity);
          } else if (product.productType === 'scheduled_order') {
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else {
            // Fallback for unknown types
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
            if (product.productType === 'ready_to_ship') {
              updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            }
          }
          
          // Update product status based on remaining inventory
          const remainingStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                                product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                                product.productType === 'scheduled_order' ? updateFields.availableQuantity : 0;
          
          updateFields.status = remainingStock > 0 ? 'active' : 'out_of_stock';
          
          // Update the product
      await productsCollection.updateOne(
        { _id: item.productId },
            { $set: updateFields }
          );
          
          inventoryUpdates.push({
            productId: item.productId,
            productName: product.name,
            quantityReduced: item.quantity,
            remainingStock: remainingStock,
            newStatus: updateFields.status
          });
          
          console.log(`✅ Inventory reduced for product ${product.name}: -${item.quantity}, remaining: ${remainingStock}`);
        }
      } catch (inventoryError) {
        console.error(`❌ Error reducing inventory for product ${item.productId}:`, inventoryError);
      }
    }
    
    // Send order creation notifications
    try {
      const axios = require('axios');
      
      // Send notification to customer about order placement
      const customerNotificationData = {
        type: 'order_placed',
        userId: decoded.userId,
        orderId: orderId,
        orderData: {
          _id: orderId,
          orderNumber: orderId,
          totalAmount: totalAmount,
          status: 'pending',
          items: order.items,
          shippingAddress: order.shippingAddress,
          notes: order.notes,
          isGuestOrder: false
        },
        userInfo: {
          id: decoded.userId,
          isGuest: false
        },
        timestamp: new Date().toISOString()
      };

      await sendNotificationDirect(customerNotificationData, db);
      console.log('✅ Customer order placement notification sent');

      // Send notification to artisan about new pending order
      if (order.artisan) {
        const artisanNotificationData = {
          type: 'new_order_pending',
          userId: order.artisan,
          orderId: orderId,
          orderData: {
            _id: orderId,
            orderNumber: orderId,
            totalAmount: totalAmount,
            status: 'pending',
            items: order.items,
            shippingAddress: order.shippingAddress,
            notes: order.notes,
            isGuestOrder: false
          },
          userInfo: {
            id: decoded.userId,
            isGuest: false
          },
          timestamp: new Date().toISOString()
        };

        await sendNotificationDirect(artisanNotificationData, db);
        console.log('✅ Artisan new order notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error sending order notifications:', notificationError);
      // Don't fail the order creation if notification fails
    }
    
    // Invalidate cache for the artisan when new order is created
    if (order.artisan) {
      const artisanId = order.artisan._id || order.artisan;
      await invalidateArtisanCache(artisanId);
    }
    
    // Calculate initial order timeline (Phase 1 Implementation)
    try {
      const { createOrderTimelineService, createProductionQueueService } = require('../../services');
      const orderTimelineService = await createOrderTimelineService();
      
      console.log('🕐 Calculating initial timeline for new order:', orderId);
      
      // Get the created order with full data
      const createdOrder = await ordersCollection.findOne({ _id: orderId });
      
      // Calculate timeline for the order
      const timeline = await orderTimelineService.calculateOrderTimeline(createdOrder);
      
      // Update order with timeline
      await ordersCollection.updateOne(
        { _id: orderId },
        { 
          $set: { 
            timeline: timeline,
            'timeline.lastUpdated': new Date()
          }
        }
      );
      
      // Add order items to production queue for artisan
      if (order.artisan && timeline.productionRequirements.totalProductionTime > 0) {
        const productionQueueService = await createProductionQueueService();
        
        try {
          await productionQueueService.addOrderToQueue(
            orderId.toString(),
            order.artisan.toString(),
            timeline.overallTimeline.earliestStartDate || new Date(),
            'normal' // Default priority
          );
          
          console.log('✅ Order added to production queue');
        } catch (queueError) {
          console.warn('⚠️ Failed to add order to production queue:', queueError.message);
          // Don't fail order creation if queue addition fails
        }
      }
      
      console.log('✅ Timeline calculated and saved for order:', orderId);
      
    } catch (timelineError) {
      console.error('❌ Error calculating order timeline:', timelineError);
      // Don't fail order creation if timeline calculation fails
      // Timeline can be calculated later via API
    }
    
    // Connection managed by middleware - no close needed
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          _id: orderId,
          ...order,
          totalAmount
        }
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const ordersCollection = db.collection('orders');
    
    const orders = await ordersCollection
      .find({ userId: new (require('mongodb')).ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: {
        orders,
        count: orders.length
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');
    
    // Check if user is viewing their own order or if they're the artisan
    const orderId = new (require('mongodb')).ObjectId(req.params.id);
    const userObjectId = new (require('mongodb')).ObjectId(decoded.userId);
    
    let order = await ordersCollection.findOne({
      _id: orderId,
      userId: userObjectId
    });
    
    // If not found, check if user is the artisan for this order  
    if (!order) {
      order = await ordersCollection.findOne({
        _id: orderId,
        artisan: userObjectId
      });
    }
    
    // If still not found, check if userId matches the artisan's user field
    if (!order) {
      const artisan = await artisansCollection.findOne({ user: userObjectId });
      if (artisan) {
        order = await ordersCollection.findOne({
          _id: orderId,
          artisan: artisan._id
        });
      }
    }
    
    // Last resort: just get the order if user is artisan (may own orders from other artisans)
    if (!order) {
      order = await ordersCollection.findOne({ _id: orderId });
    }
    
    if (!order) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Populate artisan information with user details
    let orderWithArtisan = { ...order };
    if (order.artisan) {
      const artisanDoc = await artisansCollection.findOne({ _id: order.artisan });
      if (artisanDoc) {
        // Create plain artisan object
        const artisan = {
          _id: artisanDoc._id,
          artisanName: artisanDoc.artisanName,
          businessName: artisanDoc.businessName,
          email: artisanDoc.email,
          phone: artisanDoc.phone,
          address: artisanDoc.address,
          user: artisanDoc.user,
          fulfillment: artisanDoc.fulfillment,
          location: artisanDoc.location
        };
        
        // Populate artisan's user contact info
        if (artisan.user) {
          const artisanUser = await usersCollection.findOne({ _id: artisanDoc.user });
          if (artisanUser) {
            artisan.email = artisan.email || artisanUser.email;
            artisan.phone = artisan.phone || artisanUser.phone;
            artisan.firstName = artisanUser.firstName;
            artisan.lastName = artisanUser.lastName;
          }
        }
        // Map fulfillment data to legacy fields for compatibility
        if (artisan.fulfillment) {
          // Pickup information
          if (artisan.fulfillment.methods?.pickup) {
            const pickup = artisan.fulfillment.methods.pickup;
            
            // Use business address if pickup uses business address
            if (pickup.useBusinessAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            // Or use custom pickup location from fulfillment
            else if (pickup.location && typeof pickup.location === 'object') {
              artisan.pickupAddress = pickup.location;
            }
            // Fallback to address if no pickup location specified
            else if (!artisan.pickupAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            
            // Pickup instructions
            if (pickup.instructions) {
              artisan.pickupInstructions = pickup.instructions;
            }
            
            // Pickup schedule/times
            if (pickup.schedule) {
              artisan.pickupSchedule = pickup.schedule;
            }
          }
          
          // Delivery information
          if (artisan.fulfillment.methods?.delivery) {
            const delivery = artisan.fulfillment.methods.delivery;
            
            if (delivery.fee !== undefined) {
              artisan.deliveryFee = delivery.fee;
            }
            if (delivery.instructions) {
              artisan.deliveryInstructions = delivery.instructions;
            }
            if (delivery.radius !== undefined) {
              artisan.deliveryRadius = delivery.radius;
            }
            if (delivery.estimatedTime) {
              artisan.deliveryEstimatedTime = delivery.estimatedTime;
            }
          }
        }
        
        orderWithArtisan.artisan = artisan;
      }
    } else if (order.items && order.items.length > 0 && order.items[0].artisanId) {
      const artisanDoc = await artisansCollection.findOne({ _id: order.items[0].artisanId });
      if (artisanDoc) {
        // Create plain artisan object
        const artisan = {
          _id: artisanDoc._id,
          artisanName: artisanDoc.artisanName,
          businessName: artisanDoc.businessName,
          email: artisanDoc.email,
          phone: artisanDoc.phone,
          address: artisanDoc.address,
          user: artisanDoc.user,
          fulfillment: artisanDoc.fulfillment,
          location: artisanDoc.location
        };
        
        // Populate artisan's user contact info
        if (artisan.user) {
          const artisanUser = await usersCollection.findOne({ _id: artisanDoc.user });
          if (artisanUser) {
            artisan.email = artisan.email || artisanUser.email;
            artisan.phone = artisan.phone || artisanUser.phone;
            artisan.firstName = artisanUser.firstName;
            artisan.lastName = artisanUser.lastName;
          }
        }
        // Map fulfillment data to legacy fields for compatibility
        if (artisan.fulfillment) {
          // Pickup information
          if (artisan.fulfillment.methods?.pickup) {
            const pickup = artisan.fulfillment.methods.pickup;
            
            // Use business address if pickup uses business address
            if (pickup.useBusinessAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            // Or use custom pickup location from fulfillment
            else if (pickup.location && typeof pickup.location === 'object') {
              artisan.pickupAddress = pickup.location;
            }
            // Fallback to address if no pickup location specified
            else if (!artisan.pickupAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            
            // Pickup instructions
            if (pickup.instructions) {
              artisan.pickupInstructions = pickup.instructions;
            }
            
            // Pickup schedule/times
            if (pickup.schedule) {
              artisan.pickupSchedule = pickup.schedule;
            }
          }
          
          // Delivery information
          if (artisan.fulfillment.methods?.delivery) {
            const delivery = artisan.fulfillment.methods.delivery;
            
            if (delivery.fee !== undefined) {
              artisan.deliveryFee = delivery.fee;
            }
            if (delivery.instructions) {
              artisan.deliveryInstructions = delivery.instructions;
            }
            if (delivery.radius !== undefined) {
              artisan.deliveryRadius = delivery.radius;
            }
            if (delivery.estimatedTime) {
              artisan.deliveryEstimatedTime = delivery.estimatedTime;
            }
          }
        }
        
        orderWithArtisan.artisan = artisan;
      }
    }
    
    // Populate customer information (for artisan view)
    if (order.userId) {
      const customer = await usersCollection.findOne({ _id: order.userId });
      if (customer) {
        // Check if the customer is also an artisan
        const customerArtisan = await artisansCollection.findOne({ user: customer._id });
        
        orderWithArtisan.customer = {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          // Include artisan info if customer is an artisan
          artisanName: customerArtisan?.artisanName,
          businessName: customerArtisan?.businessName,
          isArtisan: !!customerArtisan
        };
        // Also populate patron field for backward compatibility
        orderWithArtisan.patron = {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          role: customer.role,
          artisanName: customerArtisan?.artisanName,
          businessName: customerArtisan?.businessName,
          isArtisan: !!customerArtisan
        };
      }
    }
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: { order: orderWithArtisan }
    });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
};

// Update order status (for artisans/admin)
const updateOrderStatus = async (req, res) => {
  console.log('🚀 updateOrderStatus function called');
  console.log('🔍 Request details:', {
    method: req.method,
    url: req.url,
    params: req.params,
    body: req.body,
    headers: req.headers
  });
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { status, updateReason } = req.body;
    
    console.log('🔍 Status update request:', {
      orderId: req.params.id,
      status: status,
      updateReason: updateReason,
      body: req.body
    });
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'picked_up', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'declined'];
    console.log('🔍 Status validation:', {
      receivedStatus: status,
      statusType: typeof status,
      isValid: validStatuses.includes(status),
      validStatuses: validStatuses
    });
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`
      });
    }
    
    // Require reason for declined orders
    if (status === 'declined' && !updateReason) {
      return res.status(400).json({
        success: false,
        message: 'Decline reason is required'
      });
    }
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const ordersCollection = db.collection('orders');
    
    // Check if user has permission to update this order
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id)
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is the artisan for this order or an admin
    // First, find the artisan record for this user
    const artisansCollection = db.collection('artisans');
    const userArtisan = await artisansCollection.findOne({ 
      user: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    const isArtisan = order.artisan && userArtisan && (
      (order.artisan._id && order.artisan._id.toString() === userArtisan._id.toString()) ||
      (order.artisan.toString && order.artisan.toString() === userArtisan._id.toString())
    );
    const isAdmin = decoded.role === 'admin' || decoded.userType === 'admin';
    
    if (!isArtisan && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this order'
      });
    }
    
    // Check if artisan can decline this order (only before confirmation)
    if (status === 'declined' && order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be declined. Current status: ${order.status}. Orders can only be declined when they are in "pending" status (before confirmation).`
      });
    }
    
    // Prepare update fields
    const updateFields = {
      status,
      updatedAt: new Date()
    };
    
    // Add decline-specific fields
    if (status === 'declined') {
      updateFields.declineReason = updateReason;
      updateFields.declinedAt = new Date();
      updateFields.lastStatusUpdate = {
        status: 'declined',
        reason: updateReason,
        updatedAt: new Date(),
        updatedBy: decoded.userId
      };
    } else {
      // For other status updates, track the update
      updateFields.lastStatusUpdate = {
        status: status,
        updatedAt: new Date(),
        updatedBy: decoded.userId
      };
    }
    
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: updateFields
      }
    );
    
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Restore inventory if order is declined or cancelled
    if (status === 'declined' || status === 'cancelled') {
      // Refund wallet if payment was already deducted
      if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
        try {
          const WalletService = require('../../services/WalletService');
          const walletService = new WalletService(db);
          
          await walletService.addFunds(
            order.userId.toString(),
            order.totalAmount,
            `Refund for ${status} order #${order._id.toString().slice(-8)}`,
            {
              orderId: order._id,
              orderNumber: order._id.toString().slice(-8),
              reason: status === 'declined' ? 'order_declined' : 'order_cancelled',
              refundAmount: order.totalAmount
            }
          );
          
          await ordersCollection.updateOne(
            { _id: order._id },
            {
              $set: {
                paymentStatus: 'refunded',
                cancelledAt: new Date()
              }
            }
          );
          
          console.log(`💰 Wallet refunded: $${order.totalAmount} to user ${order.userId.toString()}`);
        } catch (refundError) {
          console.error('❌ Error refunding wallet:', refundError);
          // Continue with cancellation even if refund fails
        }
      }
      
      const productsCollection = db.collection('products');
      
      console.log(`🔄 Restoring inventory for ${status} order:`, order._id);
      
      for (const item of order.items) {
        try {
          const product = await productsCollection.findOne({ 
            _id: new (require('mongodb')).ObjectId(item.productId) 
          });
          
          if (product) {
            // Prepare inventory restoration based on product type
            const updateFields = {
              soldCount: Math.max(0, (product.soldCount || 0) - item.quantity),
              updatedAt: new Date()
            };
            
            // Restore the appropriate inventory field based on product type
            if (product.productType === 'ready_to_ship') {
              updateFields.stock = (product.stock || 0) + item.quantity;
              updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
            } else if (product.productType === 'made_to_order') {
              updateFields.remainingCapacity = (product.remainingCapacity || 0) + item.quantity;
            } else if (product.productType === 'scheduled_order') {
              updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
            } else {
              // Fallback for unknown types
              updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
            }
            
            // Update product status back to active if it has inventory
            const restoredStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                                 product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                                 product.productType === 'scheduled_order' ? updateFields.availableQuantity : 
                                 updateFields.availableQuantity || 0;
            
            if (restoredStock > 0 && product.status === 'out_of_stock') {
              updateFields.status = 'active';
            }
            
            await productsCollection.updateOne(
              { _id: new (require('mongodb')).ObjectId(item.productId) },
              { $set: updateFields }
            );
            
            console.log(`✅ Restored inventory for ${status} order - product ${product.name} (${product.productType}):`, {
              quantity: item.quantity,
              updatedFields: updateFields
            });
          } else {
            console.warn(`⚠️ Product not found for inventory restoration: ${item.productId}`);
          }
        } catch (error) {
          console.error(`❌ Error restoring inventory for product ${item.productId}:`, error);
          // Continue with other products even if one fails
        }
      }
      
      // Clear product caches after inventory restoration
      try {
        console.log(`🗑️ Clearing product caches after ${status} order inventory restoration`);
        
        for (const item of order.items) {
          // Clear individual product cache
          await redisCacheService.del(`product:${item.productId}`);
        }
        
        // Clear listing caches
        await redisCacheService.del('products:featured');
        await redisCacheService.del('products:popular');
        await redisCacheService.del('products:all');
        
        console.log('✅ Product caches cleared after inventory restoration');
      } catch (cacheError) {
        console.warn('⚠️ Error clearing product caches:', cacheError);
        // Don't fail the cancellation if cache clear fails
      }
    }
    
    let updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    // CRITICAL: Process payment and revenue when order is delivered/picked_up
    if (status === 'delivered' || status === 'picked_up') {
      
      // WALLET PAYMENTS: Deduct from buyer and process revenue
      if (updatedOrder.paymentMethod === 'wallet') {
        // Deduct funds from buyer's wallet if not already done
        if (updatedOrder.paymentStatus === 'pending') {
          console.log('💰 Wallet order delivered/picked_up - deducting payment from buyer');
          
          try {
            const { createWalletService } = require('../../services');
            const walletService = await createWalletService();
            
            // Deduct funds from buyer's wallet
            await walletService.deductFunds(
              updatedOrder.userId.toString(),
              updatedOrder.totalAmount,
              `Purchase - Order #${updatedOrder._id.toString().slice(-8)}`,
              { 
                orderId: updatedOrder._id.toString(), 
                orderNumber: updatedOrder._id.toString().slice(-8), 
                paymentMethod: 'wallet',
                status: status
              }
            );
            
            // Update order payment status
            await ordersCollection.updateOne(
              { _id: updatedOrder._id },
              {
                $set: {
                  paymentStatus: 'paid',
                  paidAt: new Date(),
                  paymentProcessedOnStatus: status
                }
              }
            );
            
            // Refresh order object
            updatedOrder = await ordersCollection.findOne({ 
              _id: new (require('mongodb')).ObjectId(req.params.id) 
            });
            
            console.log(`✅ Deducted $${updatedOrder.totalAmount} from buyer's wallet on ${status}`);
            
            // Send notification to buyer about payment
            try {
              const usersCollection = db.collection('users');
              const buyerUser = await usersCollection.findOne({ _id: updatedOrder.userId });
              
              if (buyerUser) {
                await sendNotificationDirect({
                  userId: updatedOrder.userId.toString(),
                  type: 'order_payment_processed',
                  title: 'Payment Processed',
                  message: `Payment of $${updatedOrder.totalAmount.toFixed(2)} has been deducted from your wallet for order #${updatedOrder._id.toString().slice(-8)}`,
                  orderId: updatedOrder._id,
                  orderNumber: updatedOrder._id.toString().slice(-8),
                  orderData: updatedOrder,
                  data: {
                    amount: updatedOrder.totalAmount,
                    status: status
                  }
                }, db);
              }
            } catch (notifError) {
              console.error('❌ Error sending payment notification:', notifError);
            }
          } catch (deductError) {
            console.error('❌ Error deducting wallet payment on delivery/pickup:', deductError);
            // Don't fail the status update, but log for manual intervention
            // Payment can be retried on confirmation
          }
        } else if (updatedOrder.paymentStatus === 'paid') {
          console.log('💰 Wallet payment already processed for this order');
        }
        
        // Process revenue recognition (credit to seller's wallet)
        if (updatedOrder.paymentStatus === 'paid') {
          console.log('💰 Wallet order delivered/picked_up - processing revenue recognition');
          
          try {
            // Get artisan user ID for revenue crediting
            const artisan = await artisansCollection.findOne({ 
              _id: updatedOrder.artisan._id || updatedOrder.artisan 
            });
            
            if (artisan && artisan.user) {
              const { createWalletService } = require('../../services');
              const walletService = await createWalletService();
              
              // Calculate platform fee using artisan's individual commission rate
              const commissionRate = artisan.financial?.commissionRate || 15; // Default to 15% if not set
              const subtotal = updatedOrder.subtotal || updatedOrder.totalAmount;
              const platformFee = parseFloat((subtotal * (commissionRate / 100)).toFixed(2));
              const artisanAmount = parseFloat((subtotal - platformFee).toFixed(2));
              
              console.log('💰 Revenue calculation:', {
                totalAmount: updatedOrder.totalAmount,
                subtotal: updatedOrder.subtotal,
                commissionRate: `${commissionRate}%`,
                platformFee,
                artisanAmount
              });
              
              // Credit seller's wallet with their portion
              await walletService.addFunds(
                artisan.user.toString(),
                artisanAmount,
                'order_completion',
                {
                  orderId: updatedOrder._id.toString(),
                  orderNumber: updatedOrder._id.toString().slice(-8),
                  totalAmount: updatedOrder.totalAmount,
                  platformFee: platformFee,
                  artisanAmount: artisanAmount
                }
              );
              
              // Record revenue in revenues collection for analytics
              const revenuesCollection = db.collection('revenues');
              await revenuesCollection.insertOne({
                orderId: updatedOrder._id,
                artisanId: artisan._id,
                artisanUserId: artisan.user,
                totalAmount: updatedOrder.totalAmount,
                subtotal: updatedOrder.subtotal || updatedOrder.totalAmount,
                deliveryFee: updatedOrder.deliveryFee || 0,
                commissionRate: commissionRate, // Store artisan's commission rate
                platformFee: platformFee,
                artisanAmount: artisanAmount,
                paymentMethod: 'wallet',
                status: 'recognized',
                recognizedAt: new Date(),
                createdAt: new Date()
              });
              
              console.log(`✅ Revenue recognized: $${artisanAmount} credited to seller's wallet (platform fee: $${platformFee})`);
            } else {
              console.warn('⚠️ Artisan not found for revenue recognition');
            }
          } catch (revenueError) {
            console.error('❌ Error processing wallet order revenue:', revenueError);
            // Don't fail the status update if revenue processing fails
            // Will retry on confirmation if needed
          }
        }
      }
      
      // CARD PAYMENTS: Capture authorized payment to prevent expiration
      // Only attempt if payment is still in 'authorized' state (not already captured)
      if (updatedOrder.paymentStatus === 'authorized' && updatedOrder.paymentMethod !== 'wallet') {
        console.log('💳 CRITICAL: Order delivered/picked_up - capturing payment to prevent expiration');
        console.log('Payment hold expires:', updatedOrder.paymentHold?.expiresAt);
        
        // Check if Stripe is configured
        if (!stripe) {
          console.error('❌ CRITICAL: Stripe not configured - cannot capture payment!');
          console.error('❌ STRIPE_SECRET_KEY is missing from environment');
          console.error('❌ Order:', updatedOrder._id, 'payment will expire!');
          // Don't fail the status update, but log critical error
        } else {
          try {
            // Get artisan to use their commission rate
            const artisan = await artisansCollection.findOne({
              _id: new (require('mongodb')).ObjectId(updatedOrder.artisan)
            });
            
            // Calculate platform fee using artisan's individual commission rate
            const commissionRate = artisan?.financial?.commissionRate || 15; // Default to 15% if not set
            const subtotal = updatedOrder.subtotal || updatedOrder.totalAmount;
            const platformFee = parseFloat((subtotal * (commissionRate / 100)).toFixed(2));
            const artisanAmount = parseFloat((subtotal - platformFee).toFixed(2));
            
            console.log('💰 Platform fee calculation:', { 
              commissionRate: `${commissionRate}%`,
              platformFee, 
              artisanAmount, 
              total: updatedOrder.totalAmount 
            });
            
            // Capture the payment from Stripe
            console.log('🔄 Attempting to capture payment intent:', updatedOrder.paymentIntentId);
            const paymentIntent = await stripe.paymentIntents.capture(updatedOrder.paymentIntentId);
            
            if (paymentIntent.status === 'succeeded') {
              console.log('✅ Payment captured successfully on delivery');
              
              // Transfer to artisan's Connect account if set up
              let transferId = null;
              if (artisan && artisan.financial?.stripeConnectAccountId) {
                const transfer = await stripe.transfers.create({
                  amount: Math.round(artisanAmount * 100),
                  currency: 'cad',
                  destination: artisan.financial.stripeConnectAccountId,
                  metadata: {
                    orderId: updatedOrder._id.toString(),
                    platformFee: platformFee.toString(),
                    capturedOnDelivery: 'true'
                  }
                });
                transferId = transfer.id;
                console.log('✅ Transferred to artisan Connect account:', transferId);
              }
              
              // Update order with captured payment
              await ordersCollection.updateOne(
                { _id: updatedOrder._id },
                { 
                  $set: { 
                    paymentStatus: 'captured',
                    paymentCapturedAt: new Date(),
                    commissionRate: commissionRate, // Store artisan's commission rate
                    platformFee: platformFee,
                    artisanAmount: artisanAmount,
                    stripeTransferId: transferId,
                    'paymentHold.status': 'captured',
                    'paymentHold.capturedAt': new Date(),
                    capturedOnDelivery: true,
                    updatedAt: new Date()
                  }
                }
              );
              
              // Refresh order object
              updatedOrder = await ordersCollection.findOne({ 
                _id: new (require('mongodb')).ObjectId(req.params.id) 
              });
              
              console.log('✅ Payment captured on delivery - safe from expiration');
              
              // Process revenue recognition immediately when payment is captured
              // Don't wait for patron confirmation - artisan fulfilled their obligation
              try {
                console.log('💰 Processing revenue recognition on delivery...');
                
                const { createWalletService } = require('../../services');
                const walletService = await createWalletService();
                
                const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
                console.log('✅ Revenue recognized on delivery:', revenueResult.data);
              } catch (revenueError) {
                console.error('❌ Error processing revenue on delivery:', revenueError);
                // Don't fail the delivery status update if revenue processing fails
                // Auto-capture cron or confirmation will retry
              }
            }
          } catch (captureError) {
            console.error('❌ CRITICAL: Failed to capture payment on delivery');
            console.error('Error type:', captureError.constructor.name);
            console.error('Error message:', captureError.message);
            console.error('Error code:', captureError.code);
            console.error('Full error:', JSON.stringify(captureError, null, 2));
            console.error('Order ID:', updatedOrder._id);
            console.error('Payment Intent ID:', updatedOrder.paymentIntentId);
            // Don't fail status update, log for manual intervention
          }
        }
      }
    }
    
    // For guest orders, automatically complete them when marked as delivered
    // since guests don't have a way to confirm delivery
    if (updatedOrder.isGuestOrder && status === 'delivered') {
      console.log('🔄 Auto-completing guest order after delivery:', updatedOrder._id);
      
      const autoCompleteResult = await ordersCollection.updateOne(
        { _id: new (require('mongodb')).ObjectId(req.params.id) },
        { 
          $set: { 
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
            lastStatusUpdate: {
              status: 'completed',
              updatedAt: new Date(),
              updatedBy: decoded.userId,
              autoCompleted: true,
              previousStatus: 'delivered'
            }
          }
        }
      );
      
      if (autoCompleteResult.modifiedCount > 0) {
        // Update the order object to reflect the new status
        updatedOrder = await ordersCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(req.params.id) 
        });
        console.log('✅ Guest order auto-completed:', updatedOrder._id);
        
        // Release payment for guest orders when completed
        try {
          if (updatedOrder.paymentIntentId) {
            console.log('💰 Releasing payment for completed guest order:', updatedOrder._id);
            await capturePaymentAndTransfer({
              body: { 
                orderId: req.params.id,
                amount: updatedOrder.totalAmount,
                autoComplete: true
              },
              params: { id: req.params.id },
              db: db
            }, {
              json: (data) => console.log('✅ Payment released for guest order:', data),
              status: (code) => ({ json: (data) => console.log(`❌ Payment release error (${code}):`, data) })
            });
          }
        } catch (paymentError) {
          console.error('❌ Error releasing payment for guest order:', paymentError);
          // Don't fail the order completion if payment release fails
        }
        
        // Process revenue recognition for guest order completion
        try {
          if (updatedOrder.artisan && updatedOrder.paymentStatus === 'captured') {
            const artisan = await artisansCollection.findOne({ _id: updatedOrder.artisan });
            
            if (artisan && artisan.user) {
              const { createWalletService } = require('../../services');
              const walletService = await createWalletService();
              
              // Calculate platform fee using artisan's individual commission rate
              const commissionRate = artisan.financial?.commissionRate || 15; // Default to 15% if not set
              const subtotal = updatedOrder.subtotal || updatedOrder.totalAmount;
              const platformFee = parseFloat((subtotal * (commissionRate / 100)).toFixed(2));
              const artisanAmount = parseFloat((subtotal - platformFee).toFixed(2));
              
              // Credit seller's wallet
              await walletService.addFunds(
                artisan.user.toString(),
                artisanAmount,
                'order_completion',
                {
                  orderId: updatedOrder._id.toString(),
                  orderNumber: updatedOrder._id.toString().slice(-8),
                  totalAmount: updatedOrder.totalAmount,
                  platformFee: platformFee,
                  artisanAmount: artisanAmount,
                  guestOrder: true
                }
              );
              
              // Record revenue
              const revenuesCollection = db.collection('revenues');
              await revenuesCollection.insertOne({
                orderId: updatedOrder._id,
                artisanId: artisan._id,
                artisanUserId: artisan.user,
                totalAmount: updatedOrder.totalAmount,
                subtotal: updatedOrder.subtotal || updatedOrder.totalAmount,
                deliveryFee: updatedOrder.deliveryFee || 0,
                commissionRate: commissionRate, // Store artisan's commission rate
                platformFee: platformFee,
                artisanAmount: artisanAmount,
                paymentMethod: updatedOrder.paymentMethod,
                status: 'recognized',
                recognizedAt: new Date(),
                createdAt: new Date(),
                isGuestOrder: true
              });
              
              console.log(`✅ Guest order revenue recognized: $${artisanAmount} credited to seller's wallet`);
            }
          }
        } catch (revenueError) {
          console.error('❌ Error processing guest order revenue recognition:', revenueError);
        }
      }
    }
    
    // Send order status update notification
    try {
      const axios = require('axios');
      
      // Determine notification type based on status
      // Use the final status for guest orders that were auto-completed
      const finalStatus = updatedOrder.status;
      let notificationType = 'order_update';
      
      if (finalStatus === 'declined') {
        notificationType = 'order_declined';
      } else if (finalStatus === 'confirmed') {
        notificationType = 'order_confirmed';
      } else if (finalStatus === 'preparing') {
        notificationType = 'order_preparing';
      } else if (finalStatus === 'ready_for_pickup') {
        notificationType = 'order_ready_for_pickup';
      } else if (finalStatus === 'ready_for_delivery') {
        notificationType = 'order_ready_for_delivery';
      } else if (finalStatus === 'out_for_delivery') {
        notificationType = 'order_out_for_delivery';
      } else if (finalStatus === 'delivered' || finalStatus === 'picked_up' || finalStatus === 'completed') {
        notificationType = 'order_completed';
      }
      
      // Handle Uber Direct professional delivery when order is marked ready_for_delivery
      console.log('🔍 Checking Uber Direct trigger:', {
        finalStatus,
        deliveryMethod: updatedOrder.deliveryMethod,
        shouldTriggerUber: finalStatus === 'ready_for_delivery' && updatedOrder.deliveryMethod === 'professionalDelivery'
      });
      
      if (finalStatus === 'ready_for_delivery' && updatedOrder.deliveryMethod === 'professionalDelivery') {
        console.log('🚛 Order ready for delivery - processing Uber Direct request');
        
        try {
          const uberDirectService = require('../../services/uberDirectService');
          const result = await uberDirectService.processReadyForDelivery(updatedOrder, db);
          
          console.log('✅ Ready for delivery processing result:', result);
          
          // If action is 'awaiting_artisan_response', send notification about cost increase
          if (result.action === 'awaiting_artisan_response') {
            // Get artisan user information
            const artisan = await artisansCollection.findOne({ 
              _id: updatedOrder.artisan._id || updatedOrder.artisan 
            });
            const artisanUser = artisan ? await usersCollection.findOne({ _id: artisan.user }) : null;
            
            // Send notification to artisan about cost increase
            await sendNotificationDirect({
              userId: artisan?.user,
              type: 'delivery_cost_increase',
              title: 'Delivery Cost Increased',
              message: `The delivery cost for order #${updatedOrder._id.toString().slice(-8)} increased by $${result.excessAmount.toFixed(2)}. Please review and respond.`,
              priority: 'high',
              data: {
                orderId: updatedOrder._id,
                orderNumber: updatedOrder._id.toString().slice(-8),
                excessAmount: result.excessAmount,
                actualFee: result.actualFee,
                chargedAmount: updatedOrder.deliveryPricing?.chargedAmount || updatedOrder.deliveryFee
              },
              userEmail: artisanUser?.email,
              userInfo: {
                firstName: artisan?.artisanName || 'Artisan',
                email: artisanUser?.email
              }
            }, db);
          }
          
          // If refund was processed, notify buyer
          if (result.action === 'refund_processed') {
            const patronUser = updatedOrder.userId ? await usersCollection.findOne({ _id: updatedOrder.userId }) : null;
            
            await sendNotificationDirect({
              userId: updatedOrder.userId,
              type: 'delivery_refund',
              title: 'Delivery Refund',
              message: `You've been refunded $${result.refundAmount.toFixed(2)} because the delivery cost was lower than estimated.`,
              priority: 'medium',
              data: {
                orderId: updatedOrder._id,
                orderNumber: updatedOrder._id.toString().slice(-8),
                refundAmount: result.refundAmount,
                estimatedFee: updatedOrder.deliveryPricing?.estimatedFee,
                actualFee: result.actualFee
              },
              userEmail: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUser?.email || null),
              userInfo: {
                isGuest: updatedOrder.isGuestOrder || false,
                email: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUser?.email || null),
                firstName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.firstName : (patronUser?.firstName || null)
              }
            }, db);
          }
          
          // If delivery was created successfully, update status and notify both parties
          if (result.action === 'delivery_created' || result.action === 'refund_processed') {
            // Refresh the order object to get the updated status (now out_for_delivery)
            updatedOrder = await ordersCollection.findOne({ 
              _id: new (require('mongodb')).ObjectId(req.params.id) 
            });
            
            // Send tracking information to artisan
            if (updatedOrder.uberDelivery) {
              const artisan = await artisansCollection.findOne({ 
                _id: updatedOrder.artisan._id || updatedOrder.artisan 
              });
              const artisanUser = artisan ? await usersCollection.findOne({ _id: artisan.user }) : null;
              
              await sendNotificationDirect({
                userId: artisan?.user?.toString(),
                type: 'courier_on_way',
                title: 'Courier On The Way',
                message: `Uber courier is on the way to pick up order #${updatedOrder._id.toString().slice(-8)}`,
                priority: 'high',
                data: {
                  orderId: updatedOrder._id,
                  orderNumber: updatedOrder._id.toString().slice(-8),
                  trackingUrl: updatedOrder.uberDelivery.trackingUrl,
                  deliveryId: updatedOrder.uberDelivery.deliveryId,
                  pickupEta: updatedOrder.uberDelivery.pickupEta,
                  courierName: updatedOrder.uberDelivery.courier?.name,
                  courierPhone: updatedOrder.uberDelivery.courier?.phone,
                  courierVehicle: updatedOrder.uberDelivery.courier?.vehicle
                },
                uberDelivery: updatedOrder.uberDelivery,
                userEmail: artisanUser?.email,
                userInfo: {
                  firstName: artisan?.artisanName || 'Artisan',
                  email: artisanUser?.email
                }
              }, db);
              
              console.log('✅ Artisan tracking notification sent with ETA:', updatedOrder.uberDelivery.pickupEta);
            }
          }
          
        } catch (error) {
          console.error('❌ Error processing ready for delivery:', error);
          // Don't fail the status update, but log the error
          // The order will stay in ready_for_delivery status
          // Manual intervention may be needed
        }
      }
      
      // Calculate delivery distance and estimated time for "out for delivery" status
      let deliveryInfo = null;
      if (finalStatus === 'out_for_delivery' && updatedOrder.deliveryMethod !== 'pickup') {
        try {
          const { createGeocodingService } = require('../../services');
          const geocodingService = await createGeocodingService();
          
          // Get artisan coordinates
          const artisan = await artisansCollection.findOne({ 
            _id: updatedOrder.artisan._id || updatedOrder.artisan 
          });
          
          if (artisan && artisan.coordinates && updatedOrder.deliveryAddress) {
            // Try to get coordinates from delivery address
            let deliveryCoords = null;
            
            // Check if order already has geocoded coordinates
            if (updatedOrder.deliveryAddress.coordinates) {
              deliveryCoords = updatedOrder.deliveryAddress.coordinates;
            } else {
              // Geocode the delivery address
              const fullAddress = `${updatedOrder.deliveryAddress.street}, ${updatedOrder.deliveryAddress.city}, ${updatedOrder.deliveryAddress.state} ${updatedOrder.deliveryAddress.zipCode}`;
              try {
                const geocoded = await geocodingService.geocodeAddress(fullAddress);
                deliveryCoords = {
                  latitude: geocoded.latitude,
                  longitude: geocoded.longitude
                };
              } catch (geocodeError) {
                console.warn('⚠️ Could not geocode delivery address:', geocodeError.message);
              }
            }
            
            if (deliveryCoords) {
              // Calculate distance
              const distance = geocodingService.calculateDistance(
                artisan.coordinates.latitude,
                artisan.coordinates.longitude,
                deliveryCoords.latitude,
                deliveryCoords.longitude
              );
              
              // Estimate delivery time based on distance
              // Assume average speed of 30 km/h in city driving
              const averageSpeed = 30; // km/h
              const estimatedTimeHours = distance / averageSpeed;
              const estimatedTimeMinutes = Math.ceil(estimatedTimeHours * 60);
              
              // Calculate estimated arrival time
              const now = new Date();
              const estimatedArrival = new Date(now.getTime() + estimatedTimeMinutes * 60000);
              
              deliveryInfo = {
                distance: distance,
                formattedDistance: geocodingService.formatDistance(distance),
                estimatedTimeMinutes: estimatedTimeMinutes,
                estimatedArrivalTime: estimatedArrival,
                formattedEstimatedTime: estimatedTimeMinutes < 60 
                  ? `${estimatedTimeMinutes} minutes`
                  : `${Math.floor(estimatedTimeMinutes / 60)}h ${estimatedTimeMinutes % 60}m`
              };
              
              console.log('📍 Delivery info calculated:', deliveryInfo);
            }
          }
        } catch (deliveryCalcError) {
          console.error('❌ Error calculating delivery info:', deliveryCalcError);
          // Continue without delivery info if calculation fails
        }
      }
      
      // Get patron user information for notifications
      const usersCollection = db.collection('users');
      let patronUserInfo = null;
      
      if (updatedOrder.userId && !updatedOrder.isGuestOrder) {
        patronUserInfo = await usersCollection.findOne({ _id: updatedOrder.userId });
      }
      
      // Fallback for legacy orders with missing userId
      if (!patronUserInfo && !updatedOrder.isGuestOrder && !updatedOrder.userId) {
        console.log('⚠️ Legacy order with missing userId - attempting to find patron info');
        
        // Try to find user by email if patron field exists
        if (updatedOrder.patron?.email) {
          patronUserInfo = await usersCollection.findOne({ email: updatedOrder.patron.email });
          console.log(patronUserInfo ? '✅ Found patron by email' : '❌ Could not find patron');
        }
        
        // If still not found, use patron field directly if it exists
        if (!patronUserInfo && updatedOrder.patron) {
          console.log('ℹ️ Using patron field directly for customer info');
          patronUserInfo = updatedOrder.patron;
        }
      }
      
      // Get artisan information for email
      const artisanForEmail = await artisansCollection.findOne({ 
        _id: updatedOrder.artisan._id || updatedOrder.artisan 
      });
      
      // Extract contact info from contactInfo object if needed
      if (artisanForEmail) {
        if (!artisanForEmail.email && artisanForEmail.contactInfo?.email) {
          artisanForEmail.email = artisanForEmail.contactInfo.email;
        }
        if (!artisanForEmail.phone && artisanForEmail.contactInfo?.phone) {
          artisanForEmail.phone = artisanForEmail.contactInfo.phone;
        }
      }
      
      // Extract pickup address from fulfillment structure if needed
      if (artisanForEmail && !artisanForEmail.pickupAddress) {
        if (artisanForEmail.fulfillment?.methods?.pickup?.enabled) {
          if (artisanForEmail.fulfillment.methods.pickup.useBusinessAddress) {
            artisanForEmail.pickupAddress = artisanForEmail.address;
          } else if (artisanForEmail.fulfillment.methods.pickup.location) {
            artisanForEmail.pickupAddress = artisanForEmail.fulfillment.methods.pickup.location;
          }
        }
        // Fallback to address if still no pickup address
        artisanForEmail.pickupAddress = artisanForEmail.pickupAddress || artisanForEmail.address;
      }
      
      // Extract pickup instructions from fulfillment if needed
      if (artisanForEmail && !artisanForEmail.pickupInstructions) {
        artisanForEmail.pickupInstructions = artisanForEmail.fulfillment?.methods?.pickup?.instructions ||
                                            artisanForEmail.fulfillment?.pickupInstructions ||
                                            artisanForEmail.pickupInstructions;
      }
      
      // Enhance delivery info with Uber tracking data for out_for_delivery status
      let enhancedDeliveryInfo = deliveryInfo;
      if (finalStatus === 'out_for_delivery' && updatedOrder.deliveryMethod === 'professionalDelivery' && updatedOrder.uberDelivery) {
        enhancedDeliveryInfo = {
          ...deliveryInfo,
          trackingUrl: updatedOrder.uberDelivery.trackingUrl || null,
          deliveryId: updatedOrder.uberDelivery.deliveryId || null,
          courier: updatedOrder.uberDelivery.courier || null,
          pickupEta: updatedOrder.uberDelivery.pickupEta || null,
          dropoffEta: updatedOrder.uberDelivery.dropoffEta || null
        };
      }

      // Enhance orderData with artisan information for email templates
      const enhancedOrderData = {
        ...updatedOrder,
        orderId: updatedOrder._id.toString(), // Full ID as string
        orderNumber: updatedOrder._id.toString().slice(-8), // Last 8 chars for display
        artisanInfo: artisanForEmail ? {
          id: artisanForEmail._id,
          name: artisanForEmail.artisanName || artisanForEmail.businessName,
          email: artisanForEmail.email,
          phone: artisanForEmail.phone,
          pickupAddress: artisanForEmail.pickupAddress,  // Only pickup location, not business address
          businessHours: artisanForEmail.businessHours,
          pickupInstructions: artisanForEmail.pickupInstructions,
          deliveryInstructions: artisanForEmail.deliveryInstructions
        } : null,
        // Add patron/customer info for artisan emails (showing who the buyer is)
        patronInfo: patronUserInfo ? {
          firstName: patronUserInfo.firstName || 'Customer',
          lastName: patronUserInfo.lastName || '',
          email: patronUserInfo.email,
          phone: patronUserInfo.phone,
          isArtisan: patronUserInfo.isArtisan || false,
          businessName: patronUserInfo.businessName || patronUserInfo.artisanName
        } : updatedOrder.patron ? {
          // Fallback to patron field for legacy orders
          firstName: updatedOrder.patron.firstName || 'Customer',
          lastName: updatedOrder.patron.lastName || '',
          email: updatedOrder.patron.email,
          phone: updatedOrder.patron.phone
        } : null
      };
      
      console.log('📧 Enhanced orderData for notification:', {
        orderId: enhancedOrderData.orderId,
        orderNumber: enhancedOrderData.orderNumber,
        hasArtisanInfo: !!enhancedOrderData.artisanInfo,
        artisanName: enhancedOrderData.artisanInfo?.name,
        artisanEmail: enhancedOrderData.artisanInfo?.email,
        artisanPhone: enhancedOrderData.artisanInfo?.phone,
        hasPickupAddress: !!enhancedOrderData.artisanInfo?.pickupAddress,
        pickupAddressType: typeof enhancedOrderData.artisanInfo?.pickupAddress,
        pickupAddress: enhancedOrderData.artisanInfo?.pickupAddress,
        hasPatronInfo: !!enhancedOrderData.patronInfo,
        patronName: enhancedOrderData.patronInfo ? `${enhancedOrderData.patronInfo.firstName} ${enhancedOrderData.patronInfo.lastName}` : 'N/A',
        patronEmail: enhancedOrderData.patronInfo?.email
      });

      // Send notification to patron (customer)
      const patronNotificationData = {
        type: notificationType,
        userId: updatedOrder.userId ? updatedOrder.userId.toString() : null,
        orderId: updatedOrder._id,
        orderData: enhancedOrderData,
        userEmail: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUserInfo?.email || null),
        orderNumber: updatedOrder._id.toString().slice(-8),
        status: finalStatus,
        title: `Order ${getStatusDisplayText(finalStatus, updatedOrder.deliveryMethod)}`,
        message: `Your order #${updatedOrder._id.toString().slice(-8)} is now ${getStatusDisplayText(finalStatus, updatedOrder.deliveryMethod).toLowerCase()}`,
        updateType: finalStatus === 'declined' ? 'order_declined' : 'status_change',
        updateDetails: {
          newStatus: finalStatus,
          previousStatus: req.body.previousStatus || 'unknown',
          reason: finalStatus === 'declined' ? updateReason : null,
          statusDisplayText: getStatusDisplayText(finalStatus, updatedOrder.deliveryMethod),
          autoCompleted: updatedOrder.lastStatusUpdate?.autoCompleted || false
        },
        userInfo: {
          id: updatedOrder.userId ? updatedOrder.userId.toString() : null,
          isGuest: updatedOrder.isGuestOrder || false,
          email: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUserInfo?.email || updatedOrder.patron?.email || null),
          firstName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.firstName : (patronUserInfo?.firstName || updatedOrder.patron?.firstName || 'Customer'),
          lastName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.lastName : (patronUserInfo?.lastName || updatedOrder.patron?.lastName || '')
        },
        artisanInfo: artisanForEmail ? {
          id: artisanForEmail._id,
          name: artisanForEmail.artisanName || artisanForEmail.businessName,
          email: artisanForEmail.email,
          phone: artisanForEmail.phone,
          pickupAddress: artisanForEmail.pickupAddress,  // Only pickup location, not business address
          businessHours: artisanForEmail.businessHours,
          pickupInstructions: artisanForEmail.pickupInstructions,
          deliveryInstructions: artisanForEmail.deliveryInstructions
        } : null,
        deliveryInfo: enhancedDeliveryInfo,
        timestamp: new Date().toISOString()
      };

      console.log('📧 Sending patron notification for status update:', {
        buyerUserId: patronNotificationData.userId,
        buyerEmail: patronNotificationData.userEmail,
        sellerArtisanId: updatedOrder.artisan?.toString(),
        type: patronNotificationData.type,
        status: finalStatus
      });

      await sendNotificationDirect(patronNotificationData, db);
      console.log(`✅ Patron notification sent for order ${finalStatus}: ${updatedOrder._id}`);
      
      // Note: Artisan does NOT receive email when they update order status
      // Artisan only receives email when a NEW order is placed (type: 'new_order_pending')
    } catch (notificationError) {
      console.error('❌ Error sending order status update notification:', notificationError);
      // Don't fail the status update if notification fails
    }
    
    // Invalidate cache for the artisan when order status changes
    if (updatedOrder.artisan) {
      const artisanId = updatedOrder.artisan._id || updatedOrder.artisan;
      await invalidateArtisanCache(artisanId);
    }
    
    // Connection managed by middleware - no close needed
    
    // Determine the response message based on what happened
    let responseMessage = 'Order status updated successfully';
    if (updatedOrder.isGuestOrder && updatedOrder.lastStatusUpdate?.autoCompleted) {
      responseMessage = 'Order delivered and automatically completed for guest user';
    }
    
    res.json({
      success: true,
      message: responseMessage,
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get artisan orders
const getArtisanOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Use shared database connection from middleware
    const db = req.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    
    // Check query parameter for order type (sales, purchases, or all)
    const orderType = req.query.type || 'sales'; // Default to sales (existing behavior)
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    // If requesting purchases, return orders where this user is the buyer
    if (orderType === 'purchases') {
      console.log('🛒 PURCHASES: Fetching orders for artisan as buyer');
      
      const purchaseOrders = await ordersCollection
        .find({ userId: new (require('mongodb')).ObjectId(decoded.userId) })
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
      
      console.log(`✅ Found ${purchaseOrders.length} purchase orders`);
      
      // Populate artisan information for each purchase order
      const usersCollection = db.collection('users');
      const ordersWithArtisanInfo = await Promise.all(purchaseOrders.map(async (order) => {
        let artisan = null;
        let customerInfo = null;
        
        // Get customer info (the buyer - which is this artisan user)
        if (order.userId) {
          const customer = await usersCollection.findOne({ _id: order.userId });
          if (customer) {
            const customerArtisan = await artisansCollection.findOne({ user: order.userId });
            customerInfo = {
              _id: customer._id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              role: customer.role,
              artisanName: customerArtisan?.artisanName,
              businessName: customerArtisan?.businessName,
              isArtisan: !!customerArtisan
            };
          }
        }
        
        // Get artisan from order.artisan or items[0].artisanId (the seller)
        const artisanId = order.artisan || order.items?.[0]?.artisanId;
        
        if (artisanId) {
          const artisanDoc = await artisansCollection.findOne({ _id: artisanId });
          if (artisanDoc) {
            artisan = {
              _id: artisanDoc._id,
              artisanName: artisanDoc.artisanName,
              businessName: artisanDoc.businessName,
              email: artisanDoc.email,
              phone: artisanDoc.phone,
              address: artisanDoc.address,
              user: artisanDoc.user,
              fulfillment: artisanDoc.fulfillment,
              location: artisanDoc.location
            };
            
            // Populate user contact info
            if (artisan.user) {
              const artisanUser = await usersCollection.findOne({ _id: artisanDoc.user });
              if (artisanUser) {
                artisan.email = artisan.email || artisanUser.email;
                artisan.phone = artisan.phone || artisanUser.phone;
                artisan.firstName = artisanUser.firstName;
                artisan.lastName = artisanUser.lastName;
              }
            }
            
            // Map fulfillment data
            if (artisan.fulfillment?.methods?.pickup) {
              const pickup = artisan.fulfillment.methods.pickup;
              if (pickup.useBusinessAddress && artisan.address) {
                artisan.pickupAddress = artisan.address;
              } else if (pickup.location && typeof pickup.location === 'object') {
                artisan.pickupAddress = pickup.location;
              } else if (!artisan.pickupAddress && artisan.address) {
                artisan.pickupAddress = artisan.address;
              }
              if (pickup.instructions) artisan.pickupInstructions = pickup.instructions;
              if (pickup.schedule) artisan.pickupSchedule = pickup.schedule;
            }
            
            if (artisan.fulfillment?.methods?.delivery) {
              const delivery = artisan.fulfillment.methods.delivery;
              if (delivery.fee !== undefined) artisan.deliveryFee = delivery.fee;
              if (delivery.instructions) artisan.deliveryInstructions = delivery.instructions;
              if (delivery.radius !== undefined) artisan.deliveryRadius = delivery.radius;
            }
            
            console.log('✅ Populated artisan for purchase:', artisan.artisanName, 'pickup:', !!artisan.pickupAddress);
          }
        }
        
        console.log('✅ Populated customer for purchase:', customerInfo?.firstName, 'isArtisan:', customerInfo?.isArtisan, 'artisanName:', customerInfo?.artisanName);
        
        return { 
          ...order, 
          artisan,
          customer: customerInfo,
          patron: customerInfo // For backward compatibility
        };
      }));
      
      console.log(`📤 Returning ${ordersWithArtisanInfo.length} populated purchase orders`);
      
      return res.json({
        success: true,
        data: {
          orders: ordersWithArtisanInfo,
          count: ordersWithArtisanInfo.length,
          orderType: 'purchases'
        },
        orders: ordersWithArtisanInfo // Add for frontend compatibility
      });
    }
    
    console.log('🔍 Artisan found:', {
      artisanId: artisan._id,
      artisanIdType: typeof artisan._id,
      artisanIdString: artisan._id.toString()
    });
    
    // Verify database connection is working
    console.log('🔍 Database connection status:', {
      dbName: db.databaseName,
      isConnected: true // If we got here, connection is working
    });
    
    // First, let's check what orders exist in the database using shared connection
    const allOrders = await ordersCollection.find({}).limit(5).toArray();
    console.log('🔍 Sample orders in database:', allOrders.map(order => ({
      _id: order._id,
      userId: order.userId,
      itemsCount: order.items?.length || 0,
      items: order.items?.map(item => ({
        productId: item.productId,
        artisanId: item.artisanId,
        artisanIdType: typeof item.artisanId,
        artisanIdString: item.artisanId?.toString()
      })) || []
    })));
    
    // Let's also check what products exist for this artisan
    const productsCollection = db.collection('products');
    const artisanProducts = await productsCollection.find({ artisan: artisan._id }).limit(5).toArray();
    console.log('🔍 Artisan products:', artisanProducts.map(product => ({
      _id: product._id,
      name: product.name,
      artisan: product.artisan,
      artisanType: typeof product.artisan,
      artisanString: product.artisan?.toString()
    })));
    
    // Try multiple approaches to find orders for this artisan
    let orders = [];
    
    // Define active order statuses (orders that need action or are in progress)
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery'];
    const includeAllOrders = req.query.all === 'true' || req.query.includeAll === 'true';
    
    // Build query filter based on whether to include all orders or just active ones
    const baseQuery = {
      $or: [
        { 'artisan._id': artisan._id },  // Embedded object structure
        { 'artisan': artisan._id }       // Direct ObjectId structure
      ]
    };
    
    // Add status filter if not requesting all orders
    if (!includeAllOrders) {
      baseQuery.status = { $in: activeStatuses };
    }
    
    // Approach 1: Match with both artisan object structures
    console.log('🔍 Trying match on both artisan structures...', includeAllOrders ? '(ALL ORDERS)' : '(ACTIVE ORDERS ONLY)');
    orders = await ordersCollection
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    console.log('🔍 Direct ObjectId match on order.artisan found:', orders.length);
    
    // Approach 2: If no orders found, try string match on order.artisan._id
    if (orders.length === 0) {
      console.log('🔍 Trying string match on order.artisan._id...');
      const stringQuery = {
        'artisan._id': artisan._id.toString()
      };
      
      // Add status filter if not requesting all orders
      if (!includeAllOrders) {
        stringQuery.status = { $in: activeStatuses };
      }
      
      orders = await ordersCollection
        .find(stringQuery)
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
      
      console.log('🔍 String match on order.artisan found:', orders.length);
    }
    
    // Approach 3: Try items.artisanId as fallback (for older orders)
    if (orders.length === 0) {
      console.log('🔍 Trying items.artisanId as fallback...');
      const itemsQuery = {
        'items.artisanId': artisan._id
      };
      
      // Add status filter if not requesting all orders
      if (!includeAllOrders) {
        itemsQuery.status = { $in: activeStatuses };
      } else {
        // For all orders, exclude only delivered, completed, cancelled
        itemsQuery.status = { $nin: ['delivered', 'completed', 'cancelled'] };
      }
      
      orders = await ordersCollection
        .find(itemsQuery)
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
      
      console.log('🔍 items.artisanId fallback found:', orders.length);
    }
    
    // Approach 4: If still no orders, try to find any orders and filter manually
    if (orders.length === 0) {
      console.log('🔍 Trying manual filter approach...');
      const allOrdersForFilter = await ordersCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      
      console.log('🔍 All orders for manual filter:', allOrdersForFilter.length);
      
      orders = allOrdersForFilter.filter(order => {
        // First check if order status matches our criteria
        const statusMatches = includeAllOrders ? 
          !['delivered', 'completed', 'cancelled'].includes(order.status) :
          activeStatuses.includes(order.status);
        
        if (!statusMatches) return false;
        
        // Check order.artisan field first
        if (order.artisan) {
          const matches = (order.artisan._id && order.artisan._id.toString() === artisan._id.toString()) ||
                         (order.artisan.toString && order.artisan.toString() === artisan._id.toString()) ||
                         (order.artisan.equals && order.artisan.equals(artisan._id));
          
          if (matches) {
            console.log('🔍 Found matching order.artisan:', {
              orderId: order._id,
              orderArtisan: order.artisan._id ? order.artisan._id.toString() : order.artisan.toString(),
              artisanId: artisan._id.toString()
            });
            return true;
          }
        }
        
        // Check items.artisanId as fallback
        if (order.items) {
          const matchingItems = order.items.filter(item => {
            const itemArtisanId = item.artisanId;
            if (!itemArtisanId) return false;
            
            const matches = itemArtisanId.toString() === artisan._id.toString() ||
                           (itemArtisanId.equals && itemArtisanId.equals(artisan._id));
            
            if (matches) {
              console.log('🔍 Found matching item.artisanId:', {
                orderId: order._id,
                itemArtisanId: itemArtisanId.toString(),
                artisanId: artisan._id.toString(),
                productName: item.productName
              });
            }
            
            return matches;
          });
          
          return matchingItems.length > 0;
        }
        
        return false;
      });
      
      console.log('🔍 Manual filter found:', orders.length);
    }
    
    // Populate patron information for each order (artisans need to see who bought their products)
    const usersCollection = db.collection('users');
    const ordersWithPatronInfo = await Promise.all(orders.map(async (order) => {
      let patronInfo = null;
      
      // Get patron information if order has userId (not a guest order)
      if (order.userId && !order.isGuestOrder) {
        patronInfo = await usersCollection.findOne({ _id: order.userId });
        
        // Check if patron is also an artisan (artisan buying from another artisan)
        if (patronInfo) {
          const patronArtisan = await artisansCollection.findOne({ user: order.userId });
          if (patronArtisan) {
            patronInfo = {
              ...patronInfo,
              artisanName: patronArtisan.artisanName,
              businessName: patronArtisan.businessName,
              isArtisan: true
            };
          }
        }
        
        console.log('🔍 Looked up patron for order', order._id.toString().slice(-8), ':', patronInfo?.firstName || patronInfo?.artisanName || 'not found');
      }
      
      // Handle guest orders - use guestInfo if available
      if (!patronInfo && order.guestInfo) {
        patronInfo = {
          firstName: order.guestInfo.firstName,
          lastName: order.guestInfo.lastName,
          email: order.guestInfo.email,
          phone: order.guestInfo.phone,
          isGuest: true
        };
        console.log('🔍 Using guest info for order', order._id.toString().slice(-8), ':', patronInfo?.firstName || 'not found');
      }
      
      // Calculate subtotal and deliveryFee if missing (for older orders)
      let subtotal = order.subtotal;
      let deliveryFee = order.deliveryFee;
      
      if (subtotal === undefined || deliveryFee === undefined) {
        // For older orders, calculate deliveryFee based on deliveryMethod
        if (deliveryFee === undefined) {
          if (order.deliveryMethod === 'personalDelivery') {
            deliveryFee = 5; // Default personal delivery fee
          } else if (order.deliveryMethod === 'professionalDelivery') {
            deliveryFee = 10; // Default professional delivery fee
          } else {
            deliveryFee = 0; // Pickup has no delivery fee
          }
        }
        
        // Calculate subtotal if missing
        if (subtotal === undefined) {
          subtotal = (order.totalAmount || 0) - (deliveryFee || 0);
        }
      }
      
      // Return complete order structure with all necessary fields
      return {
        _id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveryMethod: order.deliveryMethod,
        deliveryAddress: order.deliveryAddress,
        deliveryInstructions: order.deliveryInstructions,
        pickupTime: order.pickupTime,
        pickupTimeWindows: order.pickupTimeWindows,
        deliveryMethodDetails: order.deliveryMethodDetails,
        paymentStatus: order.paymentStatus,
        isGuestOrder: order.isGuestOrder,
        guestInfo: order.guestInfo,
        items: await Promise.all((order.items || []).map(async (item) => {
          // Populate product information if productId exists
          let product = item.product;
          if (item.productId && !product) {
            product = await productsCollection.findOne({ _id: item.productId });
          }
          
          return {
            _id: item._id,
            productId: item.productId,
            product: product,
            name: item.name || item.productName || product?.name,
            price: item.price || item.unitPrice,
            unitPrice: item.unitPrice || item.price,
            quantity: item.quantity,
            totalPrice: item.totalPrice || item.itemTotal,
            productType: item.productType,
            artisanId: item.artisanId
          };
        })),
        // Use the fully populated artisan object with fulfillment data mapped
        artisan: (() => {
          if (!artisan) return artisan;
          
          // Map fulfillment data for this order's artisan
          if (artisan.fulfillment) {
            if (artisan.fulfillment.methods?.pickup) {
              const pickup = artisan.fulfillment.methods.pickup;
              if (pickup.useBusinessAddress && artisan.address) {
                artisan.pickupAddress = artisan.address;
              } else if (pickup.location && typeof pickup.location === 'object') {
                artisan.pickupAddress = pickup.location;
              } else if (!artisan.pickupAddress && artisan.address) {
                artisan.pickupAddress = artisan.address;
              }
              if (pickup.instructions) artisan.pickupInstructions = pickup.instructions;
              if (pickup.schedule) artisan.pickupSchedule = pickup.schedule;
            }
            
            if (artisan.fulfillment.methods?.delivery) {
              const delivery = artisan.fulfillment.methods.delivery;
              if (delivery.fee !== undefined) artisan.deliveryFee = delivery.fee;
              if (delivery.instructions) artisan.deliveryInstructions = delivery.instructions;
              if (delivery.radius !== undefined) artisan.deliveryRadius = delivery.radius;
            }
          }
          
          return artisan;
        })(),
        patron: patronInfo
      };
    }));
    
    // Fix nested deliveryAddress structure for all orders
    ordersWithPatronInfo.forEach(order => {
      if (order.deliveryAddress && order.deliveryAddress.deliveryAddress) {
        order.deliveryAddress = order.deliveryAddress.deliveryAddress;
      }
    });
    
    console.log('🔍 Final orders count:', ordersWithPatronInfo.length);
    console.log('🔍 Sample order structure:', ordersWithPatronInfo.length > 0 ? {
      _id: ordersWithPatronInfo[0]._id,
      status: ordersWithPatronInfo[0].status,
      totalAmount: ordersWithPatronInfo[0].totalAmount,
      subtotal: ordersWithPatronInfo[0].subtotal,
      deliveryFee: ordersWithPatronInfo[0].deliveryFee,
      deliveryAddress: ordersWithPatronInfo[0].deliveryAddress,
      itemsCount: ordersWithPatronInfo[0].items?.length || 0,
      items: ordersWithPatronInfo[0].items?.map(item => ({
        name: item.name,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        product: item.product?.name
      })) || [],
      createdAt: ordersWithPatronInfo[0].createdAt,
      hasPatron: !!ordersWithPatronInfo[0].patron
    } : 'No orders');
    
    
    res.json({
      success: true,
      data: ordersWithPatronInfo,
      orders: ordersWithPatronInfo, // Frontend compatibility
      count: ordersWithPatronInfo.length
    });
  } catch (error) {
    console.error('Get artisan orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan orders',
      error: error.message
    });
  }
};

// Get patron orders (buyer orders)
const getPatronOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    const productsCollection = db.collection('products');
    
    // Define active order statuses (orders that need action or are in progress)
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'picked_up'];
    const includeAllOrders = req.query.all === 'true' || req.query.includeAll === 'true';
    
    // Build query filter
    const query = { 
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    };
    
    // Add status filter if not requesting all orders
    if (!includeAllOrders) {
      query.status = { $in: activeStatuses };
    }
    
    console.log('🔍 Patron orders query:', includeAllOrders ? '(ALL ORDERS)' : '(ACTIVE ORDERS ONLY)', query);
    
    const orders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    console.log(`✅ Found ${orders.length} orders for patron`);
    
    // Populate artisan information for each order using artisanId from items
    const usersCollection = db.collection('users');
    const ordersWithArtisan = await Promise.all(orders.map(async (order) => {
      let artisan = null;
      
      // Use artisanId from order items to lookup artisan information from artisans collection
      if (order.items && order.items.length > 0 && order.items[0].artisanId) {
        const artisanDoc = await artisansCollection.findOne({ _id: order.items[0].artisanId });
        
        if (artisanDoc) {
          // Create plain object from MongoDB document
          artisan = {
            _id: artisanDoc._id,
            artisanName: artisanDoc.artisanName,
            businessName: artisanDoc.businessName,
            email: artisanDoc.email,
            phone: artisanDoc.phone,
            address: artisanDoc.address,
            user: artisanDoc.user,
            fulfillment: artisanDoc.fulfillment,
            location: artisanDoc.location
          };
          
          // Fetch associated user for email and phone
          if (artisan.user) {
            const artisanUser = await usersCollection.findOne({ _id: artisanDoc.user });
            if (artisanUser) {
              artisan.email = artisan.email || artisanUser.email;
              artisan.phone = artisan.phone || artisanUser.phone;
              artisan.firstName = artisanUser.firstName;
              artisan.lastName = artisanUser.lastName;
            }
          }
        }
        
        // Map fulfillment data to legacy fields for compatibility
        if (artisan && artisan.fulfillment) {
          // Pickup information
          if (artisan.fulfillment.methods?.pickup) {
            const pickup = artisan.fulfillment.methods.pickup;
            
            // Use business address if pickup uses business address
            if (pickup.useBusinessAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            // Or use custom pickup location from fulfillment
            else if (pickup.location && typeof pickup.location === 'object') {
              artisan.pickupAddress = pickup.location;
            }
            // Fallback to address
            else if (!artisan.pickupAddress && artisan.address) {
              artisan.pickupAddress = artisan.address;
            }
            
            // Pickup instructions
            if (pickup.instructions) {
              artisan.pickupInstructions = pickup.instructions;
            }
            
            // Pickup schedule/times
            if (pickup.schedule) {
              artisan.pickupSchedule = pickup.schedule;
            }
          }
          
          // Delivery information
          if (artisan.fulfillment.methods?.delivery) {
            const delivery = artisan.fulfillment.methods.delivery;
            
            if (delivery.fee !== undefined) {
              artisan.deliveryFee = delivery.fee;
            }
            if (delivery.instructions) {
              artisan.deliveryInstructions = delivery.instructions;
            }
            if (delivery.radius !== undefined) {
              artisan.deliveryRadius = delivery.radius;
            }
            if (delivery.estimatedTime) {
              artisan.deliveryEstimatedTime = delivery.estimatedTime;
            }
          }
        }
        
        console.log('🔍 Looked up artisan for order', order._id.toString().slice(-8), ':', artisan?.artisanName || 'not found');
      }
      
      // Calculate subtotal and deliveryFee if missing (for older orders)
      let subtotal = order.subtotal;
      let deliveryFee = order.deliveryFee;
      
      if (subtotal === undefined || deliveryFee === undefined) {
        // For older orders, calculate deliveryFee based on deliveryMethod
        if (deliveryFee === undefined) {
          if (order.deliveryMethod === 'personalDelivery') {
            deliveryFee = 5; // Default personal delivery fee
          } else if (order.deliveryMethod === 'professionalDelivery') {
            deliveryFee = 10; // Default professional delivery fee
          } else {
            deliveryFee = 0; // Pickup has no delivery fee
          }
        }
        
        // Calculate subtotal if missing
        if (subtotal === undefined) {
          subtotal = (order.totalAmount || 0) - (deliveryFee || 0);
        }
      }
      
      // Return complete order structure with all necessary fields
      return {
        _id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveryMethod: order.deliveryMethod,
        deliveryAddress: order.deliveryAddress,
        deliveryInstructions: order.deliveryInstructions,
        pickupTime: order.pickupTime,
        pickupTimeWindows: order.pickupTimeWindows,
        deliveryMethodDetails: order.deliveryMethodDetails,
        paymentStatus: order.paymentStatus,
        isGuestOrder: order.isGuestOrder,
        guestInfo: order.guestInfo,
        lastStatusUpdate: order.lastStatusUpdate,
        items: await Promise.all((order.items || []).map(async (item) => {
          // Populate product information if productId exists
          let product = item.product;
          if (item.productId && !product) {
            product = await productsCollection.findOne({ _id: item.productId });
          }
          
          return {
            _id: item._id,
            productId: item.productId,
            product: product,
            name: item.name || item.productName || product?.name,
            price: item.price || item.unitPrice,
            unitPrice: item.unitPrice || item.price,
            quantity: item.quantity,
            totalPrice: item.totalPrice || item.itemTotal,
            productType: item.productType,
            artisanId: item.artisanId
          };
        })),
        // Use the fully populated artisan object (includes pickup address)
        artisan: artisan
      };
    }));
    
    // Fix nested deliveryAddress structure for all orders
    ordersWithArtisan.forEach(order => {
      if (order.deliveryAddress && order.deliveryAddress.deliveryAddress) {
        order.deliveryAddress = order.deliveryAddress.deliveryAddress;
      }
    });
    
    
    res.json({
      success: true,
      data: { orders: ordersWithArtisan },
      orders: ordersWithArtisan, // Frontend compatibility
      count: ordersWithArtisan.length
    });
  } catch (error) {
    console.error('Get patron orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get patron orders',
      error: error.message
    });
  }
};

// Get artisan order statistics
const getArtisanStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    // Get orders where items contain artisan's products
    const orders = await ordersCollection
      .find({
        'items.artisanId': artisan._id
      })
      .toArray();
    
    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
      preparingOrders: orders.filter(o => o.status === 'preparing').length,
      readyOrders: orders.filter(o => o.status === 'ready').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totalAmount, 0)
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get artisan stats error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan stats',
      error: error.message
    });
  }
};

// Create guest order
const createGuestOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, notes, guestInfo, paymentDetails } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    // Calculate total and validate items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const product = await productsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(item.productId),
        status: 'active'
      });
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or inactive`
        });
      }
      
      // Check inventory availability based on product type
      let hasEnoughInventory = false;
      let availableQuantity = 0;
      
      if (product.productType === 'ready_to_ship') {
        availableQuantity = Math.min(product.stock || 0, product.availableQuantity || 0);
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'made_to_order') {
        availableQuantity = product.remainingCapacity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else if (product.productType === 'scheduled_order') {
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      } else {
        // Fallback for unknown types
        availableQuantity = product.availableQuantity || 0;
        hasEnoughInventory = availableQuantity >= item.quantity;
      }
      
      if (!hasEnoughInventory) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for product ${product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: product._id,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          description: product.description,
          images: product.images,
          category: product.category,
          productType: product.productType,
          artisan: product.artisan
        },
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
        unitPrice: product.price,
        productType: product.productType,
        // Legacy fields for backward compatibility
        productName: product.name,
        productPrice: product.price,
        itemTotal: itemTotal,
        artisanId: product.artisan
      });
      
      console.log('🔍 Guest order item created:', {
        productId: product._id,
        productName: product.name,
        artisanId: product.artisan,
        artisanIdType: typeof product.artisan,
        artisanIdString: product.artisan?.toString()
      });
    }
    
    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    const deliveryMethod = req.body.deliveryMethod || 'pickup';
    if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Get artisan delivery settings
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: validatedItems[0]?.artisanId });
      
      if (deliveryMethod === 'personalDelivery' && artisan?.deliveryOptions?.deliveryFee) {
        deliveryFee = artisan.deliveryOptions.deliveryFee;
      } else if (deliveryMethod === 'professionalDelivery' && artisan?.deliveryOptions?.professionalDeliveryFee) {
        deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
      }
    }

    const finalAmount = totalAmount + deliveryFee;

    // Create guest order using unified schema
    const order = createUnifiedOrderSchema({
      userId: null,
      items: validatedItems,
      totalAmount: finalAmount,
      subtotal: totalAmount,
      deliveryFee: deliveryFee,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || 'credit_card',
      paymentIntentId: null,
      deliveryAddress: deliveryAddress,
      deliveryInstructions: req.body.deliveryInstructions,
      deliveryMethod: deliveryMethod,
      pickupTimeWindows: req.body.pickupTimeWindows,
      deliveryMethodDetails: req.body.deliveryMethodDetails,
      paymentDetails: paymentDetails,
      notes: notes,
      artisan: validatedItems[0]?.artisanId,
      isGuestOrder: true,
      guestInfo: guestInfo
    });
    
    const result = await ordersCollection.insertOne(order);
    const orderId = result.insertedId;
    
    // Update product quantities based on product type
    const inventoryUpdates = [];
    for (const item of validatedItems) {
      try {
        const product = await productsCollection.findOne({ _id: item.productId });
        if (product) {
          // Prepare inventory update based on product type
          const updateFields = {
            soldCount: (product.soldCount || 0) + item.quantity,
            updatedAt: new Date()
          };
          
          // Update the appropriate inventory field based on product type
          if (product.productType === 'ready_to_ship') {
            updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else if (product.productType === 'made_to_order') {
            updateFields.remainingCapacity = Math.max(0, (product.remainingCapacity || 0) - item.quantity);
          } else if (product.productType === 'scheduled_order') {
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
          } else {
            // Fallback for unknown types
            updateFields.availableQuantity = Math.max(0, (product.availableQuantity || 0) - item.quantity);
            if (product.productType === 'ready_to_ship') {
              updateFields.stock = Math.max(0, (product.stock || 0) - item.quantity);
            }
          }
          
          // Update product status based on remaining inventory
          const remainingStock = product.productType === 'ready_to_ship' ? updateFields.stock : 
                                product.productType === 'made_to_order' ? updateFields.remainingCapacity :
                                product.productType === 'scheduled_order' ? updateFields.availableQuantity : 0;
          
          updateFields.status = remainingStock > 0 ? 'active' : 'out_of_stock';
          
          // Update the product
      await productsCollection.updateOne(
        { _id: item.productId },
            { $set: updateFields }
          );
          
          inventoryUpdates.push({
            productId: item.productId,
            productName: product.name,
            quantityReduced: item.quantity,
            remainingStock: remainingStock,
            newStatus: updateFields.status
          });
          
          console.log(`✅ Inventory reduced for product ${product.name}: -${item.quantity}, remaining: ${remainingStock}`);
        }
      } catch (inventoryError) {
        console.error(`❌ Error reducing inventory for product ${item.productId}:`, inventoryError);
      }
    }
    
    // Send order creation notifications
    try {
      const axios = require('axios');
      
      // Send notification to artisan about new pending guest order
      if (order.artisan) {
        const artisanNotificationData = {
          type: 'new_order_pending',
          userId: order.artisan,
          orderId: orderId,
          orderData: {
            _id: orderId,
            orderNumber: orderId,
            totalAmount: finalAmount,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            status: 'pending',
            items: order.items,
            deliveryAddress: order.deliveryAddress,
            deliveryMethod: order.deliveryMethod,
            deliveryInstructions: order.deliveryInstructions,
            pickupTimeWindows: order.pickupTimeWindows,
            deliveryMethodDetails: order.deliveryMethodDetails,
            notes: order.notes,
            isGuestOrder: true,
            guestInfo: order.guestInfo,
            createdAt: order.createdAt
          },
          userInfo: {
            id: null,
            isGuest: true,
            email: order.guestInfo?.email,
            firstName: order.guestInfo?.firstName,
            lastName: order.guestInfo?.lastName,
            phone: order.guestInfo?.phone
          },
          timestamp: new Date().toISOString()
        };

        await sendNotificationDirect(artisanNotificationData, db);
        console.log('✅ Artisan new guest order notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error sending guest order notifications:', notificationError);
      // Don't fail the order creation if notification fails
    }
    
    // Calculate initial order timeline for guest order (Phase 1 Implementation)
    try {
      const { createOrderTimelineService, createProductionQueueService } = require('../../services');
      const orderTimelineService = await createOrderTimelineService();
      
      console.log('🕐 Calculating initial timeline for new guest order:', orderId);
      
      // Get the created order with full data
      const createdOrder = await ordersCollection.findOne({ _id: orderId });
      
      // Calculate timeline for the order
      const timeline = await orderTimelineService.calculateOrderTimeline(createdOrder);
      
      // Update order with timeline
      await ordersCollection.updateOne(
        { _id: orderId },
        { 
          $set: { 
            timeline: timeline,
            'timeline.lastUpdated': new Date()
          }
        }
      );
      
      // Add order items to production queue for artisan
      if (order.artisan && timeline.productionRequirements.totalProductionTime > 0) {
        const productionQueueService = await createProductionQueueService();
        
        try {
          await productionQueueService.addOrderToQueue(
            orderId.toString(),
            order.artisan.toString(),
            timeline.overallTimeline.earliestStartDate || new Date(),
            'normal' // Default priority
          );
          
          console.log('✅ Guest order added to production queue');
        } catch (queueError) {
          console.warn('⚠️ Failed to add guest order to production queue:', queueError.message);
          // Don't fail order creation if queue addition fails
        }
      }
      
      console.log('✅ Timeline calculated and saved for guest order:', orderId);
      
    } catch (timelineError) {
      console.error('❌ Error calculating guest order timeline:', timelineError);
      // Don't fail order creation if timeline calculation fails
      // Timeline can be calculated later via API
    }
    
    // Populate artisan information for the guest order
    let orderWithArtisan = { ...order };
    if (order.artisan) {
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: order.artisan });
      orderWithArtisan.artisan = artisan;
    } else if (order.items && order.items.length > 0 && order.items[0].artisanId) {
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: order.items[0].artisanId });
      orderWithArtisan.artisan = artisan;
    }

    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: {
          _id: orderId,
          ...orderWithArtisan,
          totalAmount: finalAmount
        }
      }
    });
  } catch (error) {
    console.error('Guest order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest order',
      error: error.message
    });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    
    // Find the order
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be cancelled by patron
    // Patrons can only cancel orders that are in "pending" status (before artisan confirms)
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: ${order.status}. Orders can only be cancelled when they are in "pending" status (before artisan confirmation).`
      });
    }
    
    // Refund wallet if payment was already deducted
    if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
      try {
        const WalletService = require('../../services/WalletService');
        const walletService = new WalletService(db);
        
        await walletService.addFunds(
          decoded.userId,
          order.totalAmount,
          `Refund for cancelled order #${order._id.toString().slice(-8)}`,
          {
            orderId: order._id,
            orderNumber: order._id.toString().slice(-8),
            reason: 'order_cancelled_by_patron',
            refundAmount: order.totalAmount
          }
        );
        
        console.log(`💰 Wallet refunded to patron: $${order.totalAmount}`);
      } catch (refundError) {
        console.error('❌ Error refunding wallet:', refundError);
        // Continue with cancellation even if refund fails
      }
    }
    
    // Update order status
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'cancelled',
          paymentStatus: order.paymentMethod === 'wallet' && order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus,
          updatedAt: new Date()
        }
      }
    );
    
    // Restore product quantities based on product type
    for (const item of order.items) {
      try {
        const product = await productsCollection.findOne({ 
          _id: new (require('mongodb')).ObjectId(item.productId) 
        });
        
        if (product) {
          // Prepare inventory restoration based on product type
          const updateFields = {
            soldCount: Math.max(0, (product.soldCount || 0) - item.quantity),
            updatedAt: new Date()
          };
          
          // Restore the appropriate inventory field based on product type
          if (product.productType === 'ready_to_ship') {
            updateFields.stock = (product.stock || 0) + item.quantity;
            updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
          } else if (product.productType === 'made_to_order') {
            updateFields.remainingCapacity = (product.remainingCapacity || 0) + item.quantity;
          } else if (product.productType === 'scheduled_order') {
            updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
          } else {
            // Fallback for unknown types
            updateFields.availableQuantity = (product.availableQuantity || 0) + item.quantity;
          }
          
          await productsCollection.updateOne(
            { _id: new (require('mongodb')).ObjectId(item.productId) },
            { $set: updateFields }
          );
          
          console.log(`✅ Restored inventory for product ${product.name} (${product.productType}):`, {
            quantity: item.quantity,
            updatedFields: updateFields
          });
        } else {
          console.warn(`⚠️ Product not found for inventory restoration: ${item.productId}`);
        }
      } catch (error) {
        console.error(`❌ Error restoring inventory for product ${item.productId}:`, error);
        // Continue with other products even if one fails
      }
    }
    
    // Clear product caches after inventory restoration
    try {
      console.log('🗑️ Clearing product caches after order cancellation inventory restoration');
      
      for (const item of order.items) {
        // Clear individual product cache
        await redisCacheService.del(`product:${item.productId}`);
      }
      
      // Clear listing caches
      await redisCacheService.del('products:featured');
      await redisCacheService.del('products:popular');
      await redisCacheService.del('products:all');
      
      console.log('✅ Product caches cleared after inventory restoration');
    } catch (cacheError) {
      console.warn('⚠️ Error clearing product caches:', cacheError);
      // Don't fail the cancellation if cache clear fails
    }
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    // Send cancellation notification to customer (platform notification only - NO EMAIL)
    try {
      const usersCollection = db.collection('users');
      let customerEmail = null;
      let customerFirstName = null;
      
      if (order.userId && !order.isGuestOrder) {
        const customerUser = await usersCollection.findOne({ _id: order.userId });
        if (customerUser) {
          customerEmail = customerUser.email;
          customerFirstName = customerUser.firstName;
        }
      }
      
      const customerNotificationData = {
        type: 'order_cancelled',
        userId: order.userId,
        orderId: order._id,
        orderData: updatedOrder,
        userEmail: null, // Don't send email to customer
        orderNumber: order._id.toString().slice(-8),
        status: 'cancelled',
        updateType: 'cancellation',
        updateDetails: {
          newStatus: 'cancelled',
          previousStatus: order.status,
          reason: 'You cancelled this order',
          statusDisplayText: 'Cancelled'
        },
        userInfo: {
          id: order.userId,
          isGuest: order.isGuestOrder || false,
          email: customerEmail,
          firstName: customerFirstName
        },
        message: `Your order #${order._id.toString().slice(-8)} has been cancelled`,
        title: `Order Cancelled - #${order._id.toString().slice(-8)}`,
        timestamp: new Date().toISOString()
      };
      
      await sendNotificationDirect(customerNotificationData, db);
      console.log('✅ Customer cancellation notification sent (platform only)');
    } catch (notificationError) {
      console.error('Error sending customer notification:', notificationError);
    }
    
    // Send cancellation notification to artisan (WITH EMAIL)
    try {
      if (order.artisan) {
        const artisansCollection = db.collection('artisans');
        const usersCollection = db.collection('users');
        
        // Fetch artisan details
        const artisan = await artisansCollection.findOne({ _id: order.artisan });
        let artisanEmail = null;
        let artisanFirstName = null;
        let artisanUserId = null;
        
        if (artisan && artisan.user) {
          artisanUserId = artisan.user;
          const artisanUser = await usersCollection.findOne({ _id: artisan.user });
          if (artisanUser) {
            artisanEmail = artisanUser.email;
            artisanFirstName = artisanUser.firstName;
            console.log('📧 Artisan email found for cancellation:', artisanEmail);
          }
        }
        
        if (artisanUserId) {
          const artisanNotificationData = {
            type: 'order_cancelled',
            userId: artisanUserId,
            orderId: order._id,
            orderData: updatedOrder,
            userEmail: artisanEmail,
            orderNumber: order._id.toString().slice(-8),
            status: 'cancelled',
            updateType: 'cancellation',
            updateDetails: {
              newStatus: 'cancelled',
              previousStatus: order.status,
              reason: 'Order cancelled by customer',
              statusDisplayText: 'Cancelled'
            },
            userInfo: {
              id: artisanUserId,
              isGuest: false,
              email: artisanEmail,
              firstName: artisanFirstName
            },
            message: `Order #${order._id.toString().slice(-8)} has been cancelled by the customer`,
            title: `Order Cancelled - #${order._id.toString().slice(-8)}`,
            timestamp: new Date().toISOString()
          };
          
          await sendNotificationDirect(artisanNotificationData, db);
          console.log('✅ Artisan cancellation notification sent (with email)');
        } else {
          console.warn('⚠️ Artisan user ID not found for notification');
        }
      }
    } catch (notificationError) {
      console.error('Error sending artisan cancellation notification:', notificationError);
      // Don't fail the cancellation if notification fails
    }
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Capture payment and transfer to artisan (with platform fee)
const capturePaymentAndTransfer = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    
    // Find the order
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id)
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is ready for payment capture
    if (!['delivered', 'picked_up', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order must be completed before payment can be captured'
      });
    }
    
    if (order.paymentStatus !== 'authorized') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not in authorized state'
      });
    }
    
    // Find the artisan first to get their commission rate
    const artisan = await artisansCollection.findOne({
      _id: new (require('mongodb')).ObjectId(order.artisan)
    });
    
    if (!artisan || !artisan.financial?.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Artisan Stripe Connect account not found'
      });
    }
    
    // Calculate platform fee using artisan's individual commission rate
    const commissionRate = artisan.financial?.commissionRate || 15; // Default to 15% if not set
    const subtotal = order.subtotal || order.totalAmount;
    const platformFee = parseFloat((subtotal * (commissionRate / 100)).toFixed(2));
    const artisanAmount = parseFloat((subtotal - platformFee).toFixed(2));
    
    try {
      // Capture the payment
      const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'Payment capture failed'
        });
      }
      
      // Create transfer to artisan (with platform fee deduction)
      const transfer = await stripe.transfers.create({
        amount: Math.round(artisanAmount * 100), // Convert to cents
        currency: 'cad',
        destination: artisan.financial.stripeConnectAccountId,
        metadata: {
          orderId: order._id.toString(),
          platformFee: platformFee.toString(),
          artisanAmount: artisanAmount.toString()
        }
      });
      
      // Update order with captured payment status
      await ordersCollection.updateOne(
        { _id: new (require('mongodb')).ObjectId(req.params.id) },
        { 
          $set: { 
            paymentStatus: 'captured',
            paymentCapturedAt: new Date(),
            commissionRate: commissionRate, // Store artisan's commission rate
            platformFee: platformFee,
            artisanAmount: artisanAmount,
            stripeTransferId: transfer.id,
            'paymentHold.status': 'captured', // Update hold status
            'paymentHold.capturedAt': new Date(),
            updatedAt: new Date()
          }
        }
      );
      
      // Get updated order data for revenue recognition
      const updatedOrder = await ordersCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(req.params.id) 
      });
      
      // Process comprehensive revenue recognition and wallet crediting
      try {
        const { createWalletService } = require('../../services');
        const walletService = await createWalletService();
        
        const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
        console.log('✅ Payment capture revenue recognition completed:', revenueResult.data);
      } catch (revenueError) {
        console.error('❌ Error processing payment capture revenue recognition:', revenueError);
        // Continue with response even if revenue processing fails
      }
      
      res.json({
        success: true,
        message: 'Payment captured and transferred successfully',
        data: {
          orderId: order._id,
          capturedAmount: order.totalAmount,
          platformFee: platformFee,
          artisanAmount: artisanAmount,
          transferId: transfer.id,
          creditedAmount: artisanAmount
        }
      });
      
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: stripeError.message
      });
    }
    
  } catch (error) {
    console.error('Capture payment error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to capture payment',
      error: error.message
    });
  }
};

// Auto-capture payment after 48 hours (cron job endpoint)
const autoCapturePayment = async (req, res) => {
  try {
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    // Get auto-capture timing from platform settings
    const platformSettingsService = new PlatformSettingsService(db);
    const paymentSettings = await platformSettingsService.getPaymentSettings();
    const autoCaptureHours = paymentSettings.autoCaptureHours || 48;
    const autoCaptureTime = new Date(Date.now() - autoCaptureHours * 60 * 60 * 1000);
    
    const ordersToCapture = await ordersCollection.find({
      status: { $in: ['delivered', 'picked_up', 'completed'] },
      paymentStatus: 'authorized',
      updatedAt: { $lte: autoCaptureTime }
    }).toArray();
    
    let capturedCount = 0;
    let errors = [];
    
    for (const order of ordersToCapture) {
      try {
        // Calculate platform fee using platform settings
        const platformSettingsService = new PlatformSettingsService(db);
        const feeCalculation = await platformSettingsService.calculatePlatformFee(order.totalAmount, 'order');
        const { platformFee, artisanAmount } = feeCalculation;
        
        // Capture the payment
        const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          // Find the artisan
          const artisansCollection = db.collection('artisans');
          const artisan = await artisansCollection.findOne({
            _id: new (require('mongodb')).ObjectId(order.artisan)
          });
          
          if (artisan && artisan.financial?.stripeConnectAccountId) {
            // Create transfer to artisan
            const transfer = await stripe.transfers.create({
              amount: Math.round(artisanAmount * 100),
              currency: 'cad',
              destination: artisan.financial.stripeConnectAccountId,
              metadata: {
                orderId: order._id.toString(),
                platformFee: platformFee.toString(),
                artisanAmount: artisanAmount.toString(),
                autoCapture: 'true'
              }
            });
            
            // Update order
            await ordersCollection.updateOne(
              { _id: order._id },
              { 
                $set: { 
                  paymentStatus: 'captured',
                  paymentCapturedAt: new Date(),
                  platformFee: platformFee,
                  artisanAmount: artisanAmount,
                  stripeTransferId: transfer.id,
                  autoCaptured: true,
                  'paymentHold.status': 'captured', // Update hold status
                  'paymentHold.capturedAt': new Date(),
                  updatedAt: new Date()
                }
              }
            );
            
            // Get updated order data for revenue recognition
            const updatedOrder = await ordersCollection.findOne({ _id: order._id });
            
            // Process comprehensive revenue recognition and wallet crediting
            try {
              const { createWalletService } = require('../../services');
              const walletService = await createWalletService();
              
              const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
              console.log('✅ Auto-capture revenue recognition completed for order:', order._id);
            } catch (revenueError) {
              console.error('❌ Error processing auto-capture revenue recognition for order:', order._id, revenueError);
            }
            
            capturedCount++;
          }
        }
      } catch (error) {
        console.error(`Error auto-capturing payment for order ${order._id}:`, error);
        errors.push({ orderId: order._id, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Auto-capture completed. ${capturedCount} payments captured.`,
      data: {
        capturedCount,
        errors: errors.length > 0 ? errors : null
      }
    });
    
  } catch (error) {
    console.error('Auto-capture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-capture payments',
      error: error.message
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }
    
    const validStatuses = ['pending', 'authorized', 'captured', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          paymentStatus,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Confirm order receipt
const confirmOrderReceipt = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!(require('mongodb')).ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    // Find the order
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be confirmed as received
    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been confirmed',
        alreadyCompleted: true
      });
    }
    
    if (order.status !== 'delivered' && order.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: `Order must be delivered or picked up to confirm receipt. Current status: ${order.status}`
      });
    }
    
    // WALLET PAYMENTS: Ensure payment was deducted when marked delivered/picked_up
    if (order.paymentMethod === 'wallet' && order.paymentStatus === 'pending') {
      console.log('⚠️ WARNING: Wallet payment still pending on confirmation - processing now as fallback');
      
      try {
        const { createWalletService } = require('../../services');
        const walletService = await createWalletService();
        
        await walletService.deductFunds(
          order.userId.toString(),
          order.totalAmount,
          `Purchase - Order #${order._id.toString().slice(-8)}`,
          { 
            orderId: order._id.toString(), 
            orderNumber: order._id.toString().slice(-8), 
            paymentMethod: 'wallet',
            processedOn: 'confirmation_fallback'
          }
        );
        
        await ordersCollection.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentStatus: 'paid',
              paidAt: new Date(),
              paymentProcessedOnConfirmation: true
            }
          }
        );
        
        console.log('✅ Wallet payment processed on confirmation (fallback)');
      } catch (walletError) {
        console.error('❌ Failed to process wallet payment on confirmation:', walletError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process payment. Please contact support.',
          error: walletError.message
        });
      }
    }
    
    // Payment should ALREADY be captured when order was marked delivered/picked_up
    // But handle the edge case where it wasn't captured as a safety fallback
    if (order.paymentStatus === 'authorized' && order.paymentMethod !== 'wallet') {
      console.log('⚠️ WARNING: Payment still authorized - capturing now as fallback');
      console.log('⚠️ Ideally this should have been captured when order was marked delivered/picked_up');
      
      try {
        const artisansCollection = db.collection('artisans');
        const platformSettingsService = new PlatformSettingsService(db);
        const feeCalculation = await platformSettingsService.calculatePlatformFee(order.totalAmount, 'order');
        const { platformFee, artisanAmount } = feeCalculation;
        
        // Capture payment
        const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          console.log('✅ Payment captured successfully on confirmation (fallback)');
          
          // Transfer to artisan Connect account
          const artisan = await artisansCollection.findOne({ _id: order.artisan });
          let transferId = null;
          
          if (artisan && artisan.financial?.stripeConnectAccountId) {
            const transfer = await stripe.transfers.create({
              amount: Math.round(artisanAmount * 100),
              currency: 'cad',
              destination: artisan.financial.stripeConnectAccountId,
              metadata: {
                orderId: order._id.toString(),
                platformFee: platformFee.toString(),
                capturedOnConfirmation: 'true'
              }
            });
            transferId = transfer.id;
            console.log('✅ Transferred to artisan Connect account:', transferId);
          }
          
          // Update payment status
          await ordersCollection.updateOne(
            { _id: order._id },
            { 
              $set: { 
                paymentStatus: 'captured',
                paymentCapturedAt: new Date(),
                platformFee: platformFee,
                artisanAmount: artisanAmount,
                stripeTransferId: transferId,
                'paymentHold.status': 'captured',
                'paymentHold.capturedAt': new Date(),
                capturedOnConfirmation: true
              }
            }
          );
          
          console.log('✅ Payment captured on confirmation (safety fallback)');
        }
      } catch (captureError) {
        console.error('❌ Failed to capture payment on confirmation:', captureError);
        
        // Check if payment was already captured
        if (captureError.code === 'payment_intent_unexpected_state' || 
            captureError.message?.includes('already been captured')) {
          console.log('✅ Payment was already captured - proceeding with confirmation');
        } else {
          return res.status(500).json({
            success: false,
            message: 'Failed to capture payment. Please contact support.',
            error: captureError.message
          });
        }
      }
    } else if (order.paymentStatus === 'captured') {
      console.log('✅ Payment already captured - proceeding with receipt confirmation');
    } else {
      console.log('ℹ️ Payment status:', order.paymentStatus, '- proceeding with confirmation');
    }
    
    // Update order status to completed
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'completed',
          receiptConfirmedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    // Check if revenue was already processed (should be if payment captured on delivery)
    const revenuesCollection = db.collection('revenues');
    const existingRevenue = await revenuesCollection.findOne({ 
      orderId: updatedOrder._id 
    });
    
    if (!existingRevenue) {
      console.log('💰 Revenue not yet processed - processing now on confirmation');
      
      // Process revenue recognition and wallet crediting
      try {
        if (updatedOrder.artisan) {
          console.log('💰 Starting revenue processing for order:', {
            orderId: updatedOrder._id,
            artisanId: updatedOrder.artisan,
            totalAmount: updatedOrder.totalAmount,
            subtotal: updatedOrder.subtotal,
            deliveryFee: updatedOrder.deliveryFee,
            paymentStatus: updatedOrder.paymentStatus,
            paymentMethod: updatedOrder.paymentMethod
          });
          
          // Only process revenue if payment was completed
          if (updatedOrder.paymentStatus === 'paid' || updatedOrder.paymentStatus === 'captured') {
            const artisan = await artisansCollection.findOne({ _id: updatedOrder.artisan });
            
            if (artisan && artisan.user) {
              const { createWalletService } = require('../../services');
              const walletService = await createWalletService();
              
              // Calculate platform fee
              const PlatformSettingsService = require('../../services/platformSettingsService');
              const platformSettingsService = new PlatformSettingsService(db);
              const feeCalculation = await platformSettingsService.calculatePlatformFee(
                updatedOrder.subtotal || updatedOrder.totalAmount,
                'order'
              );
              
              const { platformFee, artisanAmount } = feeCalculation;
              
              // Credit seller's wallet
              await walletService.addFunds(
                artisan.user.toString(),
                artisanAmount,
                'order_completion',
                {
                  orderId: updatedOrder._id.toString(),
                  orderNumber: updatedOrder._id.toString().slice(-8),
                  totalAmount: updatedOrder.totalAmount,
                  platformFee: platformFee,
                  artisanAmount: artisanAmount
                }
              );
              
              // Record revenue
              await revenuesCollection.insertOne({
                orderId: updatedOrder._id,
                artisanId: artisan._id,
                artisanUserId: artisan.user,
                totalAmount: updatedOrder.totalAmount,
                subtotal: updatedOrder.subtotal || updatedOrder.totalAmount,
                deliveryFee: updatedOrder.deliveryFee || 0,
                platformFee: platformFee,
                artisanAmount: artisanAmount,
                paymentMethod: updatedOrder.paymentMethod,
                status: 'recognized',
                recognizedAt: new Date(),
                createdAt: new Date()
              });
              
              console.log(`✅ Revenue recognized on confirmation: $${artisanAmount} credited to seller's wallet`);
            }
          } else {
            console.warn(`⚠️ Payment not completed (status: ${updatedOrder.paymentStatus}), skipping revenue processing`);
          }
        } else {
          console.warn('⚠️ No artisan found on order - skipping revenue processing');
        }
      } catch (revenueError) {
        console.error('❌ Error processing revenue recognition:', revenueError);
        console.error('❌ Revenue error stack:', revenueError.stack);
        // Don't fail the receipt confirmation if revenue processing fails
      }
    } else {
      console.log('✅ Revenue already processed on delivery - skipping duplicate processing');
    }
    
    // Send notification to artisan that order receipt has been confirmed
    try {
      if (updatedOrder.artisan) {
        // Fetch artisan user email
        let artisanEmail = null;
        let artisanFirstName = null;
        
        try {
          const artisansCollection = db.collection('artisans');
          const usersCollection = db.collection('users');
          
          const artisan = await artisansCollection.findOne({ _id: updatedOrder.artisan });
          if (artisan && artisan.user) {
            const artisanUser = await usersCollection.findOne({ _id: artisan.user });
            if (artisanUser) {
              artisanEmail = artisanUser.email;
              artisanFirstName = artisanUser.firstName;
            }
          }
        } catch (artisanFetchError) {
          console.error('❌ Error fetching artisan user for notification:', artisanFetchError);
        }
        
        // Get artisan user ID for notification
        const artisan = await artisansCollection.findOne({ _id: updatedOrder.artisan });
        const artisanUserId = artisan?.user?.toString();
        
        if (artisanUserId) {
          const artisanNotificationData = {
            type: 'order_receipt_confirmed',
            userId: artisanUserId, // Fixed: Use artisan.user, not artisan._id
            orderId: updatedOrder._id,
            orderData: updatedOrder,
            userEmail: artisanEmail, // ✅ Now includes actual email
            orderNumber: updatedOrder._id.toString().slice(-8),
            status: 'completed',
            updateType: 'receipt_confirmed',
            updateDetails: {
              newStatus: 'completed',
              previousStatus: updatedOrder.status,
              reason: 'Order receipt confirmed by customer',
              statusDisplayText: 'Completed',
              receiptConfirmed: true
            },
            userInfo: {
              id: artisanUserId, // Fixed: Use artisan.user
              isGuest: false,
              email: artisanEmail, // ✅ Now includes actual email
              firstName: artisanFirstName // ✅ Now includes actual name
            },
            message: `Order #${updatedOrder._id.toString().slice(-8)} receipt has been confirmed by the customer`,
            title: `Order Receipt Confirmed - #${updatedOrder._id.toString().slice(-8)}`,
            timestamp: new Date().toISOString()
          };
          
          await sendNotificationDirect(artisanNotificationData, db);
        } else {
          console.warn('⚠️ Could not find artisan user ID for receipt confirmation notification');
        }
        console.log('✅ Artisan order receipt confirmation notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error sending receipt confirmation notification:', notificationError);
      // Don't fail the receipt confirmation if notification fails
    }
    
    res.json({
      success: true,
      message: 'Order receipt confirmed successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Confirm order receipt error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to confirm order receipt',
      error: error.message
    });
  }
};

// Debug endpoint to check database contents
const debugOrders = async (req, res) => {
  try {
    // Use shared database connection from middleware
    const db = req.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    const productsCollection = db.collection('products');
    
    // Get all orders
    const allOrders = await ordersCollection.find({}).limit(10).toArray();
    
    // Get all artisans
    const allArtisans = await artisansCollection.find({}).limit(10).toArray();
    
    // Get all products
    const allProducts = await productsCollection.find({}).limit(10).toArray();
    
    res.json({
      success: true,
      debug: {
        totalOrders: await ordersCollection.countDocuments({}),
        totalArtisans: await artisansCollection.countDocuments({}),
        totalProducts: await productsCollection.countDocuments({}),
        sampleOrders: allOrders.map(order => ({
          _id: order._id,
          userId: order.userId,
          status: order.status,
          totalAmount: order.totalAmount,
          artisan: order.artisan,
          artisanType: typeof order.artisan,
          artisanString: order.artisan?.toString(),
          itemsCount: order.items?.length || 0,
          items: order.items?.map(item => ({
            productId: item.productId,
            artisanId: item.artisanId,
            artisanIdType: typeof item.artisanId,
            artisanIdString: item.artisanId?.toString(),
            productName: item.productName,
            quantity: item.quantity
          })) || [],
          createdAt: order.createdAt
        })),
        sampleArtisans: allArtisans.map(artisan => ({
          _id: artisan._id,
          user: artisan.user,
          businessName: artisan.businessName,
          artisanType: typeof artisan._id,
          artisanString: artisan._id.toString()
        })),
        sampleProducts: allProducts.map(product => ({
          _id: product._id,
          name: product.name,
          artisan: product.artisan,
          artisanType: typeof product.artisan,
          artisanString: product.artisan?.toString(),
          status: product.status
        }))
      }
    });
  } catch (error) {
    console.error('Debug orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
};

// Routes
// Get patron completed orders (delivered, completed, cancelled)
const getPatronCompletedOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    
    const orders = await ordersCollection
      .find({ 
        userId: new (require('mongodb')).ObjectId(decoded.userId),
        status: { $in: ['delivered', 'completed', 'cancelled'] }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    // Populate artisan information for each order using artisanId from items
    const ordersWithArtisan = await Promise.all(orders.map(async (order) => {
      let artisan = null;
      
      // Use artisanId from order items to lookup artisan information from artisans collection
      if (order.items && order.items.length > 0 && order.items[0].artisanId) {
        artisan = await artisansCollection.findOne({ _id: order.items[0].artisanId });
        console.log('🔍 Looked up artisan for completed order', order._id.toString().slice(-8), ':', artisan?.artisanName || 'not found');
      }
      
      return {
        ...order,
        artisan: artisan
      };
    }));
    
    res.json({
      success: true,
      data: { orders: ordersWithArtisan },
      orders: ordersWithArtisan, // Frontend compatibility
      count: ordersWithArtisan.length
    });
  } catch (error) {
    console.error('Get patron completed orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get artisan completed orders (delivered, completed, cancelled)
const getArtisanCompletedOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
      });
    }
    
    // Check Redis cache first for completed orders
    const cacheKey = getCacheKey(artisan._id.toString());
    const cachedOrders = await redisCacheService.get(cacheKey);
    if (cachedOrders) {
      console.log('📦 Returning Redis cached completed orders for artisan:', artisan._id.toString());
      return res.json({
        success: true,
        data: { orders: cachedOrders },
        orders: cachedOrders,
        count: cachedOrders.length,
        cached: true
      });
    }
    
    // Find completed orders for this artisan using multiple approaches
    let orders = [];
    
    // Try different approaches to find orders
    orders = await ordersCollection
      .find({
        $or: [
          { 'artisan._id': artisan._id },  // Embedded object structure
          { 'artisan': artisan._id }       // Direct ObjectId structure
        ]
        // Return ALL orders, let frontend handle filtering
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    // If no orders found with direct match, try string match
    if (orders.length === 0) {
      orders = await ordersCollection
        .find({
          'artisan._id': artisan._id.toString()
          // Return ALL orders, let frontend handle filtering
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
    }
    
    // If still no orders, try items.artisanId as fallback
    if (orders.length === 0) {
      orders = await ordersCollection
        .find({
          'items.artisanId': artisan._id
          // Return ALL orders, let frontend handle filtering
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
    }
    
    // Populate patron information for each order (artisans need to see who bought their products)
    const usersCollection = db.collection('users');
    const ordersWithPatronInfo = await Promise.all(orders.map(async (order) => {
      let patronInfo = null;
      
      // Get patron information if order has userId (not a guest order)
      if (order.userId && !order.isGuestOrder) {
        patronInfo = await usersCollection.findOne({ _id: order.userId });
        console.log('🔍 Looked up patron for completed order', order._id.toString().slice(-8), ':', patronInfo?.firstName || 'not found');
      }
      
      // Handle guest orders - use guestInfo if available
      if (!patronInfo && order.guestInfo) {
        patronInfo = {
          firstName: order.guestInfo.firstName,
          lastName: order.guestInfo.lastName,
          email: order.guestInfo.email,
          phone: order.guestInfo.phone
        };
        console.log('🔍 Using guest info for completed order', order._id.toString().slice(-8), ':', patronInfo?.firstName || 'not found');
      }
      
      return {
        ...order,
        // Preserve the original artisan data for frontend compatibility
        artisan: order.artisan || artisan,
        patron: patronInfo
      };
    }));
    
    // Cache the completed orders in Redis for future requests
    await redisCacheService.set(cacheKey, ordersWithPatronInfo, CACHE_TTL);
    console.log('💾 Cached completed orders in Redis for artisan:', artisan._id.toString());
    
    res.json({
      success: true,
      data: { orders: ordersWithPatronInfo },
      orders: ordersWithPatronInfo, // Frontend compatibility
      count: ordersWithPatronInfo.length,
      cached: false
    });
  } catch (error) {
    console.error('Get artisan completed orders error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Handle artisan response to delivery cost absorption
 * POST /api/orders/:id/artisan-cost-response
 */
const handleArtisanCostResponse = async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'declined'
    
    if (!response || !['accepted', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be "accepted" or "declined"'
      });
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db;
    const ObjectId = require('mongodb').ObjectId;
    
    // Get order and verify artisan ownership
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Verify user is the artisan for this order
    const artisan = await db.collection('artisans').findOne({ _id: order.artisan });
    
    if (!artisan || artisan.user.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - not the artisan for this order'
      });
    }
    
    // Verify there's a pending cost absorption
    if (!order.costAbsorption || !order.costAbsorption.required || order.costAbsorption.artisanResponse !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending cost absorption for this order'
      });
    }
    
    // Process the response
    const uberDirectService = require('../../services/uberDirectService');
    const result = await uberDirectService.handleArtisanCostResponse(
      new ObjectId(req.params.id),
      response,
      db
    );
    
    // Send notification to buyer
    const usersCollection = db.collection('users');
    
    if (result.action === 'order_cancelled') {
      const patronUser = order.userId ? await usersCollection.findOne({ _id: order.userId }) : null;
      
      await sendNotificationDirect({
        userId: order.userId,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${order._id.toString().slice(-8)} has been cancelled due to delivery cost increase. You have been fully refunded $${result.refundAmount.toFixed(2)}.`,
        priority: 'high',
        data: {
          orderId: order._id,
          orderNumber: order._id.toString().slice(-8),
          refundAmount: result.refundAmount,
          reason: 'Artisan declined to absorb delivery cost increase'
        },
        userEmail: order.isGuestOrder ? order.guestInfo?.email : (patronUser?.email || null),
        userInfo: {
          isGuest: order.isGuestOrder || false,
          email: order.isGuestOrder ? order.guestInfo?.email : (patronUser?.email || null),
          firstName: order.isGuestOrder ? order.guestInfo?.firstName : (patronUser?.firstName || null)
        }
      }, db);
    } else if (result.action === 'cost_absorbed') {
      const patronUser = order.userId ? await usersCollection.findOne({ _id: order.userId }) : null;
      
      await sendNotificationDirect({
        userId: order.userId,
        type: 'order_out_for_delivery',
        title: 'Order Out for Delivery',
        message: `Your order #${order._id.toString().slice(-8)} is now out for delivery!`,
        priority: 'high',
        data: {
          orderId: order._id,
          orderNumber: order._id.toString().slice(-8),
          trackingUrl: result.delivery.trackingUrl,
          deliveryId: result.delivery.deliveryId
        },
        userEmail: order.isGuestOrder ? order.guestInfo?.email : (patronUser?.email || null),
        userInfo: {
          isGuest: order.isGuestOrder || false,
          email: order.isGuestOrder ? order.guestInfo?.email : (patronUser?.email || null),
          firstName: order.isGuestOrder ? order.guestInfo?.firstName : (patronUser?.firstName || null)
        }
      }, db);
    }
    
    // Invalidate cache
    await invalidateArtisanCache(order.artisan);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (error) {
    console.error('❌ Error handling artisan cost response:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process artisan response',
      error: error.message
    });
  }
};

// Helper function to complete Uber delivery and mark order as delivered
const completeUberDelivery = async (order, db) => {
  const ordersCollection = db.collection('orders');
  const artisansCollection = db.collection('artisans');
  const usersCollection = db.collection('users');
  
  console.log('✅ Completing Uber delivery for order:', order._id);
  
  // Update order status to delivered
  await ordersCollection.updateOne(
    { _id: order._id },
    {
      $set: {
        status: 'delivered',
        'uberDelivery.status': 'delivered',
        'uberDelivery.deliveredAt': new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
        // For professional delivery, skip patron confirmation - courier confirmed
        autoCompleted: false  // Will auto-complete after a grace period
      }
    }
  );
  
  console.log('✅ Order marked as delivered by Uber courier');
  
  // Get updated order
  let updatedOrder = await ordersCollection.findOne({ _id: order._id });
  
  // CRITICAL: Capture payment when Uber marks order as delivered
  // This was the missing piece causing payments to not be captured!
  if (updatedOrder.paymentStatus === 'authorized' && updatedOrder.paymentMethod !== 'wallet') {
    console.log('💳 CRITICAL: Uber delivery completed - capturing payment');
    
    if (!stripe) {
      console.error('❌ CRITICAL: Stripe not configured - cannot capture payment!');
    } else {
      try {
        const platformSettingsService = new PlatformSettingsService(db);
        const feeCalculation = await platformSettingsService.calculatePlatformFee(updatedOrder.totalAmount, 'order');
        const { platformFee, artisanAmount } = feeCalculation;
        
        console.log('💰 Capturing payment for Uber delivery:', {
          paymentIntentId: updatedOrder.paymentIntentId,
          totalAmount: updatedOrder.totalAmount,
          platformFee,
          artisanAmount
        });
        
        // Capture payment from Stripe
        const paymentIntent = await stripe.paymentIntents.capture(updatedOrder.paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          console.log('✅ Payment captured successfully via Uber delivery');
          
          // Transfer to artisan
          const artisan = await artisansCollection.findOne({ _id: updatedOrder.artisan });
          let transferId = null;
          
          if (artisan && artisan.financial?.stripeConnectAccountId) {
            const transfer = await stripe.transfers.create({
              amount: Math.round(artisanAmount * 100),
              currency: 'cad',
              destination: artisan.financial.stripeConnectAccountId,
              metadata: {
                orderId: updatedOrder._id.toString(),
                platformFee: platformFee.toString(),
                capturedOnUberDelivery: 'true'
              }
            });
            transferId = transfer.id;
            console.log('✅ Transferred to artisan via Uber delivery:', transferId);
          }
          
          // Update order with payment capture info
          await ordersCollection.updateOne(
            { _id: updatedOrder._id },
            {
              $set: {
                paymentStatus: 'captured',
                paymentCapturedAt: new Date(),
                platformFee: platformFee,
                artisanAmount: artisanAmount,
                stripeTransferId: transferId,
                'paymentHold.status': 'captured',
                'paymentHold.capturedAt': new Date(),
                capturedOnUberDelivery: true
              }
            }
          );
          
          // Refresh order
          updatedOrder = await ordersCollection.findOne({ _id: updatedOrder._id });
          
          console.log('✅ Payment captured and transferred via Uber delivery');
          
          // Process revenue recognition immediately
          try {
            const { createWalletService } = require('../../services');
            const walletService = await createWalletService();
            const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
            console.log('✅ Revenue recognized on Uber delivery:', revenueResult.data);
          } catch (revenueError) {
            console.error('❌ Error processing revenue on Uber delivery:', revenueError);
          }
        }
      } catch (captureError) {
        console.error('❌ CRITICAL: Failed to capture payment on Uber delivery');
        console.error('Error:', captureError.message);
        console.error('Order ID:', updatedOrder._id);
        // Don't fail the delivery completion, but log critical error
      }
    }
  } else if (updatedOrder.paymentMethod === 'wallet' && updatedOrder.paymentStatus === 'paid') {
    console.log('💰 Wallet order delivered via Uber - processing revenue');
    try {
      const { createWalletService } = require('../../services');
      const walletService = await createWalletService();
      const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
      console.log('✅ Wallet revenue recognized on Uber delivery:', revenueResult.data);
    } catch (revenueError) {
      console.error('❌ Error processing wallet revenue on Uber delivery:', revenueError);
    }
  } else {
    console.log('ℹ️ Payment already captured or different payment method:', updatedOrder.paymentStatus);
  }
  
  // Send notification to patron
  try {
    const patronUser = updatedOrder.userId ? await usersCollection.findOne({ _id: updatedOrder.userId }) : null;
    const artisanForEmail = await artisansCollection.findOne({ 
      _id: updatedOrder.artisan._id || updatedOrder.artisan 
    });
    
    const enhancedOrderData = {
      ...updatedOrder,
      artisanInfo: artisanForEmail ? {
        id: artisanForEmail._id,
        name: artisanForEmail.artisanName || artisanForEmail.businessName,
        email: artisanForEmail.email,
        phone: artisanForEmail.phone,
        pickupAddress: artisanForEmail.pickupAddress
      } : null
    };
    
    await sendNotificationDirect({
      type: 'order_delivered',
      userId: updatedOrder.userId ? updatedOrder.userId.toString() : null,
      orderId: updatedOrder._id,
      orderData: enhancedOrderData,
      userEmail: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUser?.email || null),
      orderNumber: updatedOrder._id.toString().slice(-8),
      status: 'delivered',
      title: 'Order Delivered',
      message: `Your order #${updatedOrder._id.toString().slice(-8)} has been delivered by courier`,
      userInfo: {
        id: updatedOrder.userId ? updatedOrder.userId.toString() : null,
        isGuest: updatedOrder.isGuestOrder || false,
        email: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (patronUser?.email || null),
        firstName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.firstName : (patronUser?.firstName || null)
      },
      timestamp: new Date().toISOString()
    }, db);
    
    console.log('📧 Patron notified: Order delivered');
  } catch (notificationError) {
    console.error('❌ Error sending delivery notification:', notificationError);
  }
  
  // Auto-complete the order immediately for professional delivery
  // Since courier confirmed delivery, no patron confirmation needed
  console.log('🔄 Auto-completing professional delivery order immediately');
  
  await ordersCollection.updateOne(
    { _id: order._id },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        autoCompletedBySystem: true,
        autoCompletionReason: 'professional_delivery_courier_confirmed',
        updatedAt: new Date()
      }
    }
  );
  
  const completedOrder = await ordersCollection.findOne({ _id: order._id });
  
  // Process revenue recognition and payment transfer
  try {
    if (completedOrder.artisan) {
      console.log('💰 Processing revenue for auto-completed professional delivery order');
      
      const { createWalletService } = require('../../services');
      const walletService = await createWalletService();
      
      const revenueResult = await walletService.processOrderCompletion(completedOrder, db);
      console.log('✅ Revenue processed for professional delivery:', revenueResult.data);
    }
  } catch (revenueError) {
    console.error('❌ Error processing revenue for professional delivery:', revenueError);
  }
  
  // Send completion notification to artisan
  try {
    const artisan = await artisansCollection.findOne({ 
      _id: completedOrder.artisan._id || completedOrder.artisan 
    });
    const artisanUser = artisan ? await usersCollection.findOne({ _id: artisan.user }) : null;
    
    await sendNotificationDirect({
      type: 'order_completed',
      userId: artisan?.user?.toString(),
      orderId: completedOrder._id,
      orderData: completedOrder,
      userEmail: artisanUser?.email,
      orderNumber: completedOrder._id.toString().slice(-8),
      status: 'completed',
      title: 'Order Completed',
      message: `Order #${completedOrder._id.toString().slice(-8)} has been completed. Payment released.`,
      userInfo: {
        firstName: artisan?.artisanName || 'Artisan',
        email: artisanUser?.email
      },
      timestamp: new Date().toISOString()
    }, db);
    
    console.log('📧 Artisan notified: Order completed, payment released');
  } catch (notificationError) {
    console.error('❌ Error sending completion notification to artisan:', notificationError);
  }
  
  return completedOrder;
};

// Handle Uber Direct delivery webhook updates
const handleUberDeliveryWebhook = async (req, res) => {
  try {
    const { delivery_id, status, event_type } = req.body;
    
    console.log('🚛 Uber webhook received:', {
      deliveryId: delivery_id,
      status,
      eventType: event_type
    });
    
    // Verify webhook authenticity (you may want to add signature verification)
    // For now, we'll trust the webhook
    
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    // Find order by delivery ID
    const order = await ordersCollection.findOne({
      'uberDelivery.deliveryId': delivery_id
    });
    
    if (!order) {
      console.warn('⚠️ Order not found for delivery ID:', delivery_id);
      return res.status(404).json({
        success: false,
        message: 'Order not found for this delivery'
      });
    }
    
    console.log('📦 Found order for delivery update:', order._id);
    
    // Handle delivery completion
    if (status === 'delivered' || event_type === 'delivery.completed') {
      await completeUberDelivery(order, db);
      
      return res.json({
        success: true,
        message: 'Delivery completion processed'
      });
    }
    
    // Update delivery status in order for other events
    await ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: {
          'uberDelivery.status': status,
          'uberDelivery.lastWebhookUpdate': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    console.error('❌ Error handling Uber webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// Manually check Uber delivery status (can be called by system or admin)
const checkUberDeliveryStatus = async (req, res) => {
  try {
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    // Get order
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id)
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (!order.uberDelivery || !order.uberDelivery.deliveryId) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have Uber delivery'
      });
    }
    
    // Get delivery status from Uber
    const uberDirectService = require('../../services/uberDirectService');
    const deliveryStatus = await uberDirectService.getDeliveryStatus(order.uberDelivery.deliveryId);
    
    console.log('📊 Uber delivery status check:', {
      orderId: order._id,
      deliveryId: order.uberDelivery.deliveryId,
      currentStatus: deliveryStatus.status
    });
    
    // If delivery is completed, mark order as delivered
    if (deliveryStatus.status === 'delivered' || deliveryStatus.status === 'completed') {
      await completeUberDelivery(order, db);
      
      return res.json({
        success: true,
        message: 'Delivery completed. Order marked as delivered.',
        data: deliveryStatus
      });
    }
    
    // Update delivery status in order
    await ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: {
          'uberDelivery.status': deliveryStatus.status,
          'uberDelivery.lastStatusCheck': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Delivery status updated',
      data: deliveryStatus
    });
  } catch (error) {
    console.error('❌ Error checking delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check delivery status',
      error: error.message
    });
  }
};

// Auto-complete delivered professional delivery orders (cron job endpoint)
const autoCompleteDeliveredOrders = async (req, res) => {
  try {
    const db = req.db;
    const ordersCollection = db.collection('orders');
    
    // Find all professional delivery orders that are delivered but not completed
    const deliveredOrders = await ordersCollection.find({
      deliveryMethod: 'professionalDelivery',
      status: 'delivered',
      autoCompletedBySystem: { $ne: true }
    }).toArray();
    
    console.log(`🔄 Auto-completing ${deliveredOrders.length} professional delivery orders`);
    
    const results = [];
    
    for (const order of deliveredOrders) {
      try {
        const completedOrder = await completeUberDelivery(order, db);
        results.push({
          orderId: order._id,
          success: true
        });
      } catch (error) {
        console.error(`❌ Error auto-completing order ${order._id}:`, error);
        results.push({
          orderId: order._id,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${deliveredOrders.length} orders`,
      results
    });
  } catch (error) {
    console.error('❌ Error in auto-complete job:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-complete job failed',
      error: error.message
    });
  }
};

// Routes
router.post('/payment-intent', createPaymentIntent);
router.post('/guest/payment-intent', createGuestPaymentIntent);
router.post('/confirm-payment', confirmPaymentAndCreateOrder);
router.post('/wallet-payment', walletPaymentAndCreateOrder);
router.post('/', createOrder);
router.post('/guest', createGuestOrder);
router.get('/', getUserOrders);
router.get('/buyer', getPatronOrders);
router.get('/buyer/completed', getPatronCompletedOrders);
router.get('/artisan', getArtisanOrders);
router.get('/artisan/completed', getArtisanCompletedOrders);
router.get('/artisan/stats', getArtisanStats);
router.get('/debug', debugOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/payment', updatePaymentStatus);
router.post('/:id/capture-payment', capturePaymentAndTransfer);
router.post('/auto-capture-payments', autoCapturePayment);
router.post('/:id/confirm-receipt', confirmOrderReceipt);
router.post('/:id/artisan-cost-response', handleArtisanCostResponse);
router.post('/uber-delivery-webhook', handleUberDeliveryWebhook);
router.post('/:id/check-delivery-status', checkUberDeliveryStatus);
router.post('/auto-complete-deliveries', autoCompleteDeliveredOrders);

module.exports = router;
