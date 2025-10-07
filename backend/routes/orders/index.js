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

// Import notification service functions
const { sendNotification, sendEmailNotification } = require('../notifications/index');

// Helper function to send notifications directly
const sendNotificationDirect = async (notificationData, db) => {
  try {
    // Send platform notification
    const mockReq = { body: notificationData, db: db };
    const mockRes = { 
      json: (data) => console.log('✅ Notification response:', data),
      status: (code) => ({ json: (data) => console.log(`❌ Notification error (${code}):`, data) })
    };
    
    await sendNotification(mockReq, mockRes);
    
        // Send email notification if user has email and it's an order status update
        // For patrons, only send emails for specific statuses: confirmation, declined, out_for_delivery
        const patronEmailStatuses = ['confirmed', 'declined', 'out_for_delivery'];
        const isPatronEmailAllowed = notificationData.userInfo?.isGuest || 
                                   !notificationData.userId || 
                                   patronEmailStatuses.includes(notificationData.status);
        
        // Log email filtering for patrons
        console.log('📧 Email notification check:', {
          hasUserEmail: !!notificationData.userEmail,
          hasType: !!notificationData.type,
          typeIncludesOrder: notificationData.type?.includes('order'),
          isPatronEmailAllowed: isPatronEmailAllowed,
          status: notificationData.status,
          userEmail: notificationData.userEmail
        });
        
        if (notificationData.userEmail && notificationData.userId && !notificationData.userInfo?.isGuest) {
          if (!isPatronEmailAllowed) {
            console.log(`📧 Patron email filtered out for status: ${notificationData.status} (only emails sent for: ${patronEmailStatuses.join(', ')})`);
          } else {
            console.log(`📧 Patron email allowed for status: ${notificationData.status}`);
          }
        }
        
        if (notificationData.userEmail && notificationData.type && notificationData.type.includes('order') && isPatronEmailAllowed) {
          console.log('📧 Sending email notification for status update:', {
            to: notificationData.userEmail,
            status: notificationData.status,
            type: notificationData.type,
            orderNumber: notificationData.orderNumber
          });
          
          try {
            const emailReq = {
              body: {
                to: notificationData.userEmail,
                subject: `${notificationData.title || 'Order Update'}`,
                template: 'order_status_update',
                data: {
                  orderId: notificationData.orderId,
                  orderNumber: notificationData.orderNumber || notificationData.orderId,
                  status: notificationData.status || notificationData.orderData?.status,
                  newStatus: notificationData.status || notificationData.orderData?.status,
                  message: notificationData.message,
                  reason: notificationData.updateDetails?.reason,
                  userId: notificationData.userId,
                  userName: notificationData.userInfo?.firstName || notificationData.userInfo?.email || 'Customer',
                  isGuest: notificationData.userInfo?.isGuest || false,
                  totalAmount: notificationData.orderData?.totalAmount,
                  subtotal: notificationData.orderData?.subtotal,
                  deliveryFee: notificationData.orderData?.deliveryFee,
                  deliveryMethod: notificationData.orderData?.deliveryMethod,
                  deliveryAddress: notificationData.orderData?.deliveryAddress,
                  deliveryInstructions: notificationData.orderData?.deliveryInstructions,
                  pickupTimeWindows: notificationData.orderData?.pickupTimeWindows,
                  selectedPickupTimes: notificationData.orderData?.selectedPickupTimes,
                  artisan: notificationData.orderData?.artisan,
                  items: notificationData.orderData?.items,
                  createdAt: notificationData.orderData?.createdAt,
                  updatedAt: notificationData.orderData?.updatedAt
                }
              }
            };
            const emailRes = {
              json: (data) => console.log('✅ Email notification response:', data),
              status: (code) => ({ json: (data) => console.log(`❌ Email notification error (${code}):`, data) })
            };
            
            await sendEmailNotification(emailReq, emailRes);
            console.log('✅ Email notification sent to:', notificationData.userEmail);
          } catch (emailError) {
            console.error('❌ Error sending email notification:', emailError);
            // Don't fail the whole notification if email fails
          }
        }
    
    return true;
  } catch (error) {
    console.error('❌ Error sending notification directly:', error);
    return false;
  }
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
          message: `Product is not available: ${product.name}`
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
    let deliveryFee = 0;
    if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Get artisan delivery settings
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: validatedItems[0].artisanId });
      
      if (deliveryMethod === 'personalDelivery' && artisan?.deliveryOptions?.deliveryFee) {
        deliveryFee = artisan.deliveryOptions.deliveryFee;
      } else if (deliveryMethod === 'professionalDelivery' && artisan?.deliveryOptions?.professionalDeliveryFee) {
        deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
      }
    }

    const finalAmount = totalAmount + deliveryFee;

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
          message: `Product is not available: ${product.name}`
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
    let deliveryFee = 0;
    if (deliveryMethod === 'personalDelivery' || deliveryMethod === 'professionalDelivery') {
      // Get artisan delivery settings
      const artisansCollection = db.collection('artisans');
      const artisan = await artisansCollection.findOne({ _id: validatedItems[0].artisanId });
      
      if (deliveryMethod === 'personalDelivery' && artisan?.deliveryOptions?.deliveryFee) {
        deliveryFee = artisan.deliveryOptions.deliveryFee;
      } else if (deliveryMethod === 'professionalDelivery' && artisan?.deliveryOptions?.professionalDeliveryFee) {
        deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
      }
    }

    const finalAmount = totalAmount + deliveryFee;

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
      // Get artisan delivery settings
      const artisansCollection = db.collection('artisans');
      if (enrichedItems.length > 0 && enrichedItems[0].artisanId) {
        const artisan = await artisansCollection.findOne({ _id: enrichedItems[0].artisanId });
        
        if (deliveryMethod === 'personalDelivery' && artisan?.deliveryOptions?.deliveryFee) {
          deliveryFee = artisan.deliveryOptions.deliveryFee;
        } else if (deliveryMethod === 'professionalDelivery' && artisan?.deliveryOptions?.professionalDeliveryFee) {
          deliveryFee = artisan.deliveryOptions.professionalDeliveryFee;
        }
      }
    }

    const subtotal = totalAmount - deliveryFee;

    const order = {
      userId: userId ? new (require('mongodb')).ObjectId(userId) : null,
      items: enrichedItems,
      totalAmount: totalAmount,
      subtotal: subtotal, // Store subtotal without delivery fee
      deliveryFee: deliveryFee, // Store delivery fee separately
      status: 'pending', // Orders start as pending confirmation by artisan
      paymentStatus: !userId ? 'captured' : 'authorized', // Guest orders are captured immediately, authenticated orders are authorized
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntentId,
      deliveryAddress: orderData.deliveryAddress || {},
      deliveryInstructions: orderData.deliveryInstructions || '',
      deliveryMethod: orderData.deliveryMethod || 'pickup',
      pickupTimeWindows: orderData.pickupTimeWindows || {},
      deliveryMethodDetails: orderData.deliveryMethodDetails || [],
      isGuestOrder: !userId,
      guestInfo: orderData.guestInfo || {},
      artisan: enrichedItems.length > 0 ? enrichedItems[0].artisanId : null, // Set artisan from first item
      paymentDetails: {
        stripePaymentIntentId: paymentIntentId,
        stripeAmount: paymentIntent.amount,
        stripeCurrency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

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
        await recordWalletTransaction({
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
      
      // Send notification to customer about order placement
      const customerNotificationData = {
        type: 'order_placed',
        userId: userId,
        orderId: result.insertedId,
        orderData: {
          _id: result.insertedId,
          orderNumber: result.insertedId,
          totalAmount: totalAmount,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          status: 'pending',
          items: order.items,
          deliveryAddress: order.deliveryAddress,
          deliveryMethod: order.deliveryMethod,
          deliveryInstructions: order.deliveryInstructions,
          pickupTimeWindows: order.pickupTimeWindows,
          deliveryMethodDetails: order.deliveryMethodDetails,
          isGuestOrder: order.isGuestOrder,
          guestInfo: order.guestInfo,
          createdAt: order.createdAt
        },
        userInfo: {
          id: userId,
          isGuest: order.isGuestOrder,
          email: order.isGuestOrder ? order.guestInfo?.email : null,
          firstName: order.isGuestOrder ? order.guestInfo?.firstName : null,
          lastName: order.isGuestOrder ? order.guestInfo?.lastName : null,
          phone: order.isGuestOrder ? order.guestInfo?.phone : null
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
          orderId: result.insertedId,
          orderData: {
            _id: result.insertedId,
            orderNumber: result.insertedId,
            totalAmount: totalAmount,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            status: 'pending',
            items: order.items,
            deliveryAddress: order.deliveryAddress,
            deliveryMethod: order.deliveryMethod,
            deliveryInstructions: order.deliveryInstructions,
            pickupTimeWindows: order.pickupTimeWindows,
            deliveryMethodDetails: order.deliveryMethodDetails,
            isGuestOrder: order.isGuestOrder,
            guestInfo: order.guestInfo,
            createdAt: order.createdAt
          },
          userInfo: {
            id: userId,
            isGuest: order.isGuestOrder,
            email: order.isGuestOrder ? order.guestInfo?.email : null,
            firstName: order.isGuestOrder ? order.guestInfo?.firstName : null,
            lastName: order.isGuestOrder ? order.guestInfo?.lastName : null,
            phone: order.isGuestOrder ? order.guestInfo?.phone : null
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
    
    // Create order
    const order = {
      userId: new (require('mongodb')).ObjectId(decoded.userId),
      items: validatedItems,
      totalAmount,
      status: 'pending',
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      artisan: validatedItems[0]?.artisanId, // Set artisan from first item
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
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
    let order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    // If not found, check if user is the artisan for this order
    if (!order) {
      order = await ordersCollection.findOne({
        _id: new (require('mongodb')).ObjectId(req.params.id),
        artisan: new (require('mongodb')).ObjectId(decoded.userId)
      });
    }
    
    if (!order) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Populate artisan information
    let orderWithArtisan = { ...order };
    if (order.artisan) {
      const artisan = await artisansCollection.findOne({ _id: order.artisan });
      orderWithArtisan.artisan = artisan;
    } else if (order.items && order.items.length > 0 && order.items[0].artisanId) {
      const artisan = await artisansCollection.findOne({ _id: order.items[0].artisanId });
      orderWithArtisan.artisan = artisan;
    }
    
    // Populate customer information (for artisan view)
    if (order.userId) {
      const customer = await usersCollection.findOne({ _id: order.userId });
      if (customer) {
        orderWithArtisan.customer = {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone
        };
        // Also populate patron field for backward compatibility
        orderWithArtisan.patron = {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone
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
    // Note: Cancelled status can be set by admins or system, patrons use dedicated /cancel endpoint
    if (status === 'declined' || status === 'cancelled') {
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
    }
    
    let updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
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
          if (updatedOrder.artisan) {
            const { createWalletService } = require('../../services');
            const walletService = await createWalletService();
            
            const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
            console.log('✅ Guest order revenue recognition completed:', revenueResult.data);
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
      
      // Get user information for notifications
      const usersCollection = db.collection('users');
      let userInfo = null;
      
      if (updatedOrder.userId && !updatedOrder.isGuestOrder) {
        userInfo = await usersCollection.findOne({ _id: updatedOrder.userId });
      }
      
      const notificationData = {
        type: notificationType,
        userId: updatedOrder.userId,
        orderId: updatedOrder._id,
        orderData: updatedOrder,
        userEmail: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (userInfo?.email || null),
        orderNumber: updatedOrder._id.toString().slice(-8),
        status: finalStatus, // Use the final status (completed for auto-completed guest orders)
        updateType: finalStatus === 'declined' ? 'order_declined' : 'status_change',
        updateDetails: {
          newStatus: finalStatus,
          previousStatus: req.body.previousStatus || 'unknown',
          reason: finalStatus === 'declined' ? updateReason : null,
          statusDisplayText: getStatusDisplayText(finalStatus, updatedOrder.deliveryMethod),
          autoCompleted: updatedOrder.lastStatusUpdate?.autoCompleted || false
        },
        userInfo: {
          id: updatedOrder.userId,
          isGuest: updatedOrder.isGuestOrder || false,
          email: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.email : (userInfo?.email || null),
          firstName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.firstName : (userInfo?.firstName || null),
          lastName: updatedOrder.isGuestOrder ? updatedOrder.guestInfo?.lastName : (userInfo?.lastName || null)
        },
        timestamp: new Date().toISOString()
      };

      // Send notification directly using the notification service
      await sendNotificationDirect(notificationData, db);
      console.log(`✅ Order ${finalStatus} notification sent for order ${updatedOrder._id}`);
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
    
    // Get the artisan record for this user
    const artisan = await artisansCollection.findOne({ user: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(403).json({
        success: false,
        message: 'User is not an artisan'
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
        console.log('🔍 Looked up patron for order', order._id.toString().slice(-8), ':', patronInfo?.firstName || 'not found');
      }
      
      // Handle guest orders - use guestInfo if available
      if (!patronInfo && order.guestInfo) {
        patronInfo = {
          firstName: order.guestInfo.firstName,
          lastName: order.guestInfo.lastName,
          email: order.guestInfo.email,
          phone: order.guestInfo.phone
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
        // Use the fully populated artisan object (includes pickup address)
        artisan: artisan,
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
    
    // Populate artisan information for each order using artisanId from items
    const ordersWithArtisan = await Promise.all(orders.map(async (order) => {
      let artisan = null;
      
      // Use artisanId from order items to lookup artisan information from artisans collection
      if (order.items && order.items.length > 0 && order.items[0].artisanId) {
        artisan = await artisansCollection.findOne({ _id: order.items[0].artisanId });
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

    // Create guest order
    const order = {
      userId: null, // Guest order
      guestInfo: guestInfo || {},
      items: validatedItems,
      totalAmount: finalAmount,
      subtotal: totalAmount, // Store subtotal without delivery fee
      deliveryFee: deliveryFee, // Store delivery fee separately
      status: 'pending',
      deliveryAddress: deliveryAddress || {},
      deliveryMethod: deliveryMethod,
      deliveryInstructions: req.body.deliveryInstructions || '',
      pickupTimeWindows: req.body.pickupTimeWindows || {},
      deliveryMethodDetails: req.body.deliveryMethodDetails || [],
      paymentMethod: paymentMethod || 'credit_card',
      paymentDetails: paymentDetails || {},
      notes: notes || '',
      artisan: validatedItems[0]?.artisanId, // Set artisan from first item
      isGuestOrder: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
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
    
    // Update order status
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status: 'cancelled',
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
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    // Send cancellation notification to artisan
    try {
      const axios = require('axios');
      
      if (order.artisan) {
        const artisanNotificationData = {
          type: 'order_cancelled',
          userId: order.artisan,
          orderId: order._id,
          orderData: updatedOrder,
          userEmail: null, // Will be fetched from artisan profile
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
            id: order.artisan,
            isGuest: false,
            email: null, // Will be fetched from artisan profile
            firstName: null // Will be fetched from artisan profile
          },
          message: `Order #${order._id.toString().slice(-8)} has been cancelled by the customer`,
          title: `Order Cancelled - #${order._id.toString().slice(-8)}`,
          timestamp: new Date().toISOString()
        };
        
        await sendNotificationDirect(artisanNotificationData, db);
        console.log('✅ Artisan order cancellation notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error sending cancellation notification:', notificationError);
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
    
    // Calculate platform fee using platform settings
    const platformSettingsService = new PlatformSettingsService(db);
    const feeCalculation = await platformSettingsService.calculatePlatformFee(order.totalAmount, 'order');
    const { platformFee, artisanAmount } = feeCalculation;
    
    try {
      // Capture the payment
      const paymentIntent = await stripe.paymentIntents.capture(order.paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'Payment capture failed'
        });
      }
      
      // Find the artisan
      const artisan = await artisansCollection.findOne({
        _id: new (require('mongodb')).ObjectId(order.artisan)
      });
      
      if (!artisan || !artisan.stripeConnectAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Artisan Stripe Connect account not found'
        });
      }
      
      // Create transfer to artisan (with platform fee deduction)
      const transfer = await stripe.transfers.create({
        amount: Math.round(artisanAmount * 100), // Convert to cents
        currency: 'cad',
        destination: artisan.stripeConnectAccountId,
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
            platformFee: platformFee,
            artisanAmount: artisanAmount,
            stripeTransferId: transfer.id,
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
          
          if (artisan && artisan.stripeConnectAccountId) {
            // Create transfer to artisan
            const transfer = await stripe.transfers.create({
              amount: Math.round(artisanAmount * 100),
              currency: 'cad',
              destination: artisan.stripeConnectAccountId,
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
    if (order.status !== 'delivered' && order.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered or picked up to confirm receipt'
      });
    }
    
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
    
    // Process revenue recognition and wallet crediting
    try {
      if (updatedOrder.artisan) {
        const { createWalletService } = require('../../services');
        const walletService = await createWalletService();
        
        const revenueResult = await walletService.processOrderCompletion(updatedOrder, db);
        console.log('✅ Revenue recognition completed:', revenueResult.data);
      }
    } catch (revenueError) {
      console.error('❌ Error processing revenue recognition:', revenueError);
      // Don't fail the receipt confirmation if revenue processing fails
    }
    
    // Send notification to artisan that order receipt has been confirmed
    try {
      if (updatedOrder.artisan) {
        const artisanNotificationData = {
          type: 'order_receipt_confirmed',
          userId: updatedOrder.artisan,
          orderId: updatedOrder._id,
          orderData: updatedOrder,
          userEmail: null, // Will be fetched from artisan profile
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
            id: updatedOrder.artisan,
            isGuest: false,
            email: null, // Will be fetched from artisan profile
            firstName: null // Will be fetched from artisan profile
          },
          message: `Order #${updatedOrder._id.toString().slice(-8)} receipt has been confirmed by the customer`,
          title: `Order Receipt Confirmed - #${updatedOrder._id.toString().slice(-8)}`,
          timestamp: new Date().toISOString()
        };
        
        await sendNotificationDirect(artisanNotificationData, db);
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

// Routes
router.post('/payment-intent', createPaymentIntent);
router.post('/guest/payment-intent', createGuestPaymentIntent);
router.post('/confirm-payment', confirmPaymentAndCreateOrder);
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

module.exports = router;
