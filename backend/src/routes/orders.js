const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');
const Artisan = require('../models/artisan');
const verifyToken = require('../middleware/authMiddleware');
const RevenueService = require('../services/revenueService');

// Helper function to send order status notifications
async function sendOrderStatusNotification(order, newStatus, previousStatus) {
  try {
    // Determine notification type based on status
    const notificationType = `order_${newStatus}`;
    
    // Get customer information (patron or guest)
    let customerEmail, customerPhone, customerName, customerId, isGuest;
    
    if (order.patron) {
      // Authenticated user (patron)
      customerEmail = order.patron.email;
      customerPhone = order.patron.phone;
      customerName = `${order.patron.firstName} ${order.patron.lastName}`;
      customerId = order.patron._id;
      isGuest = false;
    } else if (order.guestInfo) {
      // Guest user
      customerEmail = order.guestInfo.email;
      customerPhone = order.guestInfo.phone;
      customerName = `${order.guestInfo.firstName} ${order.guestInfo.lastName}`;
      customerId = null; // No user ID for guests
      isGuest = true;
    } else {
      console.log('⚠️ No customer information found for order:', order._id);
      return;
    }

    // For patrons (authenticated users), only send order completion notification
    // They can track their orders on their profile
    if (!isGuest && newStatus !== 'confirmed') {
      console.log('📧 Skipping notification for patron - only order completion notifications are sent to authenticated users');
      return;
    }
    
    // Prepare order details for notification
    const orderDetails = {
      orderNumber: order.orderNumber || `#${order._id.toString().slice(-8).toUpperCase()}`,
      orderStatus: newStatus,
      deliveryMethod: order.deliveryMethod,
      customerName: customerName,
      artisanName: order.artisan?.artisanName || 'Your artisan',
      orderTotal: order.totalAmount,
      orderDate: order.orderDate,
      estimatedDelivery: order.estimatedDeliveryTime ? 
        new Date(order.estimatedDeliveryTime).toLocaleDateString() : '2-3 business days',
      deliveryInstructions: order.deliveryInstructions,
      deliveryAddress: order.deliveryAddress,
      orderItems: order.items.map(item => ({
        productName: item.product?.name || 'Product',
        quantity: item.quantity,
        totalPrice: item.totalPrice
      }))
    };
    
    console.log('📧 Sending order status notification:', {
      type: notificationType,
      orderId: order._id,
      customerEmail,
      customerPhone,
      newStatus,
      previousStatus
    });
    
    // Send notification via the notifications API
    const axios = require('axios');
    const notificationPayload = {
      type: notificationType,
      userId: customerId,
      orderId: order._id,
      userEmail: customerEmail,
      userPhone: customerPhone,
      orderDetails: orderDetails,
      timestamp: new Date().toISOString()
    };
    
    // Make internal API call to notifications endpoint
    const response = await axios.post('http://localhost:4000/api/notifications/send', notificationPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order status notification sent successfully:', response.data);
    
  } catch (error) {
    console.error('❌ Error in sendOrderStatusNotification:', error);
    throw error;
  }
}

// Get all orders for the authenticated user (patron)
router.get('/buyer', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ patron: req.user._id })
      .populate('artisan', 'artisanName type businessType description address pickupAddress deliveryOptions email phone')
      .populate('items.product', 'name description image price unit category subcategory')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching patron orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders for the authenticated artisan
router.get('/artisan', verifyToken, async (req, res) => {
  try {
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can access artisan orders' });
    }

    // Find the artisan profile for this user
    const Artisan = require('../models/artisan');
    const artisanProfile = await Artisan.findOne({ user: req.user._id });
    
    if (!artisanProfile) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const orders = await Order.find({ artisan: artisanProfile._id })
      .populate('patron', 'firstName lastName email phone')
      .populate('guestInfo')
      .populate('items.product', 'name description image price unit category subcategory')
      .populate('artisan', 'artisanName address pickupAddress deliveryOptions')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching artisan orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders for the authenticated business
router.get('/business', verifyToken, async (req, res) => {
  try {
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only business owners can access business orders' });
    }

    const orders = await Order.find({ artisan: req.user._id })
      .populate('patron', 'firstName lastName email phone')
      .populate('items.product', 'name description image price unit')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching business orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order statistics for artisan
router.get('/artisan/stats', verifyToken, async (req, res) => {
  try {
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can access statistics' });
    }

    const stats = await Order.aggregate([
      { $match: { artisan: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments({ artisan: req.user._id });
    const totalRevenue = await Order.aggregate([
      { $match: { artisan: req.user._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusBreakdown: stats
    });

  } catch (error) {
    console.error('Error fetching artisan stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test route to verify the file is loading (must be before parameterized routes)
router.get('/test', (req, res) => {
  res.json({ message: 'Orders route is working' });
});

// Simple test POST route
router.post('/test-post', (req, res) => {
  res.json({ message: 'POST test route is working', body: req.body });
});

// Get a specific order by ID
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type address pickupAddress deliveryOptions firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.patron._id.toString() !== req.user._id.toString() && 
        order.artisan._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a guest order (no authentication required)
router.post('/guest', async (req, res) => {
  try {
    console.log('🚀🚀🚀 GUEST ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('🚀🚀🚀 GUEST ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('🚀🚀🚀 GUEST ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('Creating guest order with data:', req.body);
    
    const { items, deliveryAddress, deliveryInstructions, deliveryMethod, pickupTimeWindows, paymentMethod, paymentDetails, guestInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Validate guest info
    if (!guestInfo || !guestInfo.firstName || !guestInfo.lastName || !guestInfo.email) {
      return res.status(400).json({ message: 'Guest orders require firstName, lastName, and email' });
    }

    // Validate delivery address (only required for delivery orders, not pickup)
    const isPickupOrder = deliveryMethod === 'pickup';
    if (!isPickupOrder && (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city)) {
      return res.status(400).json({ message: 'Delivery orders require complete delivery address' });
    }

    // Validate payment method and details
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    if (paymentMethod === 'credit_card' && (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv)) {
      return res.status(400).json({ message: 'Credit card details are required for credit card payment' });
    }

    if (paymentMethod === 'debit_card' && (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv)) {
      return res.status(400).json({ message: 'Debit card details are required for debit card payment' });
    }

    // Group items by artisan
    const ordersByArtisan = {};
    
    for (const item of items) {
      const productId = item.productId || item.product;
      
      const product = await Product.findById(productId).populate('artisan');
      
      if (!product) {
        return res.status(400).json({ message: `Product ${productId} not found` });
      }

      if (!product.artisan) {
        return res.status(400).json({ message: `Product ${product.name} has no artisan information` });
      }

      // Check product availability before creating order
      if (product.productType === 'ready_to_ship') {
        const availableStock = product.stock || 0;
        if (availableStock <= 0) {
          return res.status(400).json({ 
            message: `Product "${product.name}" is out of stock` 
          });
        }
        if (availableStock < item.quantity) {
          return res.status(400).json({ 
            message: `Only ${availableStock} items available for "${product.name}". Requested: ${item.quantity}` 
          });
        }
      } else if (product.productType === 'scheduled_order') {
        const availableQuantity = product.availableQuantity || 0;
        if (availableQuantity <= 0) {
          return res.status(400).json({ 
            message: `Product "${product.name}" is not available for the selected date` 
          });
        }
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            message: `Only ${availableQuantity} items available for "${product.name}" on the selected date. Requested: ${item.quantity}` 
          });
        }
      }

      const artisanId = product.artisan._id.toString();
      
      if (!ordersByArtisan[artisanId]) {
        ordersByArtisan[artisanId] = {
          artisan: product.artisan._id,
          items: [],
          totalAmount: 0
        };
      }

      const itemTotal = product.price * item.quantity;
      ordersByArtisan[artisanId].items.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
        productType: item.productType || 'ready_to_ship' // Add required productType field
      });
      ordersByArtisan[artisanId].totalAmount += itemTotal;
    }

    // Create separate orders for each artisan
    const createdOrders = [];
    
    
    for (const [artisanId, artisanOrderData] of Object.entries(ordersByArtisan)) {
      
      const orderData = {
        artisan: artisanOrderData.artisan,
        items: artisanOrderData.items,
        totalAmount: artisanOrderData.totalAmount,
        deliveryAddress: isPickupOrder ? {
          pickupLocation: 'Artisan Location',
          city: 'Local Pickup',
          state: 'Pickup Available',
          country: 'Canada'
        } : deliveryAddress,
        deliveryInstructions: isPickupOrder ? 'Customer will pickup at artisan location' : deliveryInstructions,
        deliveryMethod: deliveryMethod || 'pickup',
        pickupTimeWindow: pickupTimeWindows?.[artisanId] ? {
          selectedDate: pickupTimeWindows[artisanId].date,
          selectedTimeSlot: pickupTimeWindows[artisanId].timeSlot?.value || pickupTimeWindows[artisanId].timeSlot,
          timeSlotLabel: pickupTimeWindows[artisanId].timeSlot?.label || pickupTimeWindows[artisanId].fullLabel,
          artisanAvailableSlots: [] // This will be populated by the artisan
        } : null,
        paymentMethod,
        paymentDetails: paymentDetails ? {
          method: paymentMethod,
          last4: paymentDetails.cardNumber ? paymentDetails.cardNumber.slice(-4) : undefined,
          cardType: paymentDetails.cardType || 'unknown'
        } : undefined,
        status: 'pending',
        paymentStatus: 'pending',
        guestInfo: {
          ...guestInfo,
          guestId: guestInfo.guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };
      
      const order = new Order(orderData);

      const savedOrder = await order.save();
      
      // Calculate revenue for this order
      try {
        await RevenueService.calculateOrderRevenue(savedOrder._id);
      } catch (revenueError) {
        console.error('Error calculating revenue for order:', savedOrder._id, revenueError);
        // Don't fail the order creation if revenue calculation fails
      }

      // Update product inventory immediately when order is placed
      console.log('📦 Updating inventory for new order:', savedOrder._id);
      for (const item of savedOrder.items) {
        try {
          const product = await Product.findById(item.product);
          if (product) {
            // Only update inventory for ready_to_ship products
            if (product.productType === 'ready_to_ship') {
              const newStock = Math.max(0, product.stock - item.quantity);
              product.stock = newStock;
              
              // Update product status if stock is low or out
              if (newStock === 0) {
                product.status = 'out_of_stock';
              } else if (newStock <= product.lowStockThreshold) {
                product.status = 'active'; // Keep active but low stock
              }
              
              await product.save();
              console.log(`✅ Updated inventory for product ${product.name}: stock=${newStock}`);
            } else {
              console.log(`ℹ️ Skipping inventory update for ${product.productType} product: ${product.name}`);
            }
          } else {
            console.error(`❌ Product not found: ${item.product}`);
          }
        } catch (productError) {
          console.error(`❌ Error updating inventory for product ${item.product}:`, productError);
          // Don't fail the order creation if inventory update fails
        }
      }
      
      const populatedOrder = await Order.findById(savedOrder._id)
        .populate('artisan', 'artisanName type pickupAddress email phone')
        .populate('items.product', 'name description image price unit');
      
      
      // Send pickup time notification if this is a pickup order with time window
      if (savedOrder.deliveryMethod === 'pickup' && savedOrder.pickupTimeWindow) {
        try {
          const axios = require('axios');
          const pickupNotificationData = {
            type: 'pickup_order_with_time',
            userId: savedOrder.artisan,
            orderId: savedOrder._id,
            userEmail: populatedOrder.artisan?.email,
            userPhone: populatedOrder.artisan?.phone,
            orderDetails: {
              orderId: savedOrder._id,
              pickupTime: savedOrder.pickupTimeWindow.timeSlotLabel,
              pickupDate: new Date(savedOrder.pickupTimeWindow.selectedDate).toLocaleDateString(),
              customerName: `${savedOrder.guestInfo?.firstName} ${savedOrder.guestInfo?.lastName} (Guest)`,
              customerEmail: savedOrder.guestInfo?.email
            },
            timestamp: new Date().toISOString()
          };

          await axios.post(`${process.env.API_URL || 'http://localhost:4000'}/api/notifications/send`, pickupNotificationData);
          console.log('✅ Pickup time notification sent to artisan');
        } catch (notificationError) {
          console.error('❌ Error sending pickup time notification:', notificationError);
        }
      }
      
      createdOrders.push(populatedOrder);
    }

    // Calculate total amount across all orders
    const totalOrderAmount = createdOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Generate order summary
    const orderSummary = {
      totalOrders: createdOrders.length,
      totalAmount: totalOrderAmount,
      estimatedDeliveryTime: '2-3 business days',
      orderNumbers: createdOrders.map(order => order._id.toString().slice(-8).toUpperCase()),
      createdAt: new Date().toISOString()
    };

    // Generate follow-up information to encourage account creation
    const followUpInfo = {
      benefits: [
        'Track your orders in real-time',
        'Save delivery addresses for faster checkout',
        'Earn loyalty points on every purchase',
        'Get exclusive artisan offers and discounts',
        'Manage your payment methods securely',
        'Receive order updates and notifications'
      ],
      nextSteps: [
        'Check your email for order confirmation',
        'Track your order status using the order numbers above',
        'Create an account to unlock all benefits',
        'Follow your favorite artisans for updates'
      ],
      contactInfo: {
        supportEmail: 'support@bazaarmkt.ca',
        supportPhone: '+1-800-BAZAR-MKT',
        helpCenter: 'https://help.bazaarmkt.ca'
      }
    };

    res.status(201).json({
      success: true,
      message: '🎉 Your guest order has been placed successfully!',
      orderSummary,
      orders: createdOrders.map(order => {
        return {
          orderId: order._id,
          orderNumber: order._id.toString().slice(-8).toUpperCase(),
          artisan: order.artisan, // Return full artisan data
          items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        estimatedDelivery: orderSummary.estimatedDeliveryTime,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          state: order.deliveryAddress.state,
          zipCode: order.deliveryAddress.zipCode
        },
        deliveryMethod: order.deliveryMethod,
        pickupTimeWindow: order.pickupTimeWindow
        };
      }),
      guestInfo: {
        firstName: guestInfo.firstName,
        lastName: guestInfo.lastName,
        email: guestInfo.email,
        guestId: guestInfo.guestId
      },
      followUpInfo,
      accountCreation: {
        message: '🌟 Ready to unlock the full bazaarMKT experience?',
        benefits: followUpInfo.benefits,
        cta: 'Create your free account now and start earning rewards!',
        registrationUrl: '/register',
        loginUrl: '/login'
      }
    });

  } catch (error) {
    console.error('Error creating guest order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new order (authenticated users)
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('🚀🚀🚀 AUTHENTICATED ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('🚀🚀🚀 AUTHENTICATED ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('🚀🚀🚀 AUTHENTICATED ORDER ENDPOINT CALLED 🚀🚀🚀');
    console.log('Creating order for user:', {
      userId: req.user._id,
      isGuest: req.user.isGuest,
      role: req.user.role,
      guestInfo: req.body.guestInfo
    });
    
    const { items, deliveryAddress, deliveryInstructions, deliveryMethod, pickupTimeWindows, paymentMethod, paymentMethodId, guestInfo } = req.body;
    

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Validate guest info if provided
    if (guestInfo && (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email)) {
      return res.status(400).json({ message: 'Guest orders require firstName, lastName, and email' });
    }

    // Group items by artisan
    const ordersByArtisan = {};
    
    for (const item of items) {
      const productId = item.productId || item.product;
      
      const product = await Product.findById(productId).populate('artisan');
      
      if (!product) {
        return res.status(400).json({ message: `Product ${productId} not found` });
      }

      if (!product.artisan) {
        return res.status(400).json({ message: `Product ${product.name} has no artisan information` });
      }

      // Check if user is an artisan trying to order from themselves
      if (['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
        const Artisan = require('../models/artisan');
        const userArtisanProfile = await Artisan.findOne({ user: req.user._id });
        
        if (userArtisanProfile && userArtisanProfile._id.toString() === product.artisan._id.toString()) {
          return res.status(400).json({ 
            message: 'You cannot order from yourself. Artisans cannot purchase their own products.' 
          });
        }
      }

      // Check product availability before creating order
      if (product.productType === 'ready_to_ship') {
        const availableStock = product.stock || 0;
        if (availableStock <= 0) {
          return res.status(400).json({ 
            message: `Product "${product.name}" is out of stock` 
          });
        }
        if (availableStock < item.quantity) {
          return res.status(400).json({ 
            message: `Only ${availableStock} items available for "${product.name}". Requested: ${item.quantity}` 
          });
        }
      } else if (product.productType === 'scheduled_order') {
        const availableQuantity = product.availableQuantity || 0;
        if (availableQuantity <= 0) {
          return res.status(400).json({ 
            message: `Product "${product.name}" is not available for the selected date` 
          });
        }
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            message: `Only ${availableQuantity} items available for "${product.name}" on the selected date. Requested: ${item.quantity}` 
          });
        }
      }

      const artisanId = product.artisan._id.toString();
      
      if (!ordersByArtisan[artisanId]) {
        ordersByArtisan[artisanId] = {
          artisan: product.artisan._id,
          items: [],
          totalAmount: 0
        };
      }

      const itemTotal = product.price * item.quantity;
      ordersByArtisan[artisanId].items.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
        productType: item.productType || 'ready_to_ship' // Add required productType field
      });
      ordersByArtisan[artisanId].totalAmount += itemTotal;
    }

    // Create separate orders for each artisan
    const createdOrders = [];
    
    for (const [artisanId, artisanOrderData] of Object.entries(ordersByArtisan)) {
      
      const orderData = {
        artisan: artisanOrderData.artisan,
        items: artisanOrderData.items,
        totalAmount: artisanOrderData.totalAmount,
        deliveryAddress,
        deliveryInstructions,
        deliveryMethod: deliveryMethod || 'pickup',
        pickupTimeWindow: pickupTimeWindows?.[artisanId] ? {
          selectedDate: pickupTimeWindows[artisanId].date,
          selectedTimeSlot: pickupTimeWindows[artisanId].timeSlot?.value || pickupTimeWindows[artisanId].timeSlot,
          timeSlotLabel: pickupTimeWindows[artisanId].timeSlot?.label || pickupTimeWindows[artisanId].fullLabel,
          artisanAvailableSlots: [] // This will be populated by the artisan
        } : null,
        paymentMethod,
        paymentMethodId,
        status: 'pending',
        paymentStatus: 'pending'
      };

      // Add patron or guest info based on user type
      if (req.user.isGuest === true && guestInfo) {
        orderData.guestInfo = guestInfo;
        // Ensure patron is not set for guest users
        delete orderData.patron;
      } else {
        orderData.patron = req.user._id;
        // Ensure guestInfo is completely removed for authenticated users
        delete orderData.guestInfo;
        // Also set guestInfo to undefined explicitly to prevent Mongoose from setting defaults
        orderData.guestInfo = undefined;
      }
      
      const order = new Order(orderData);

      const savedOrder = await order.save();
      
      // Calculate revenue for this order
      try {
        await RevenueService.calculateOrderRevenue(savedOrder._id);
      } catch (revenueError) {
        console.error('Error calculating revenue for order:', savedOrder._id, revenueError);
        // Don't fail the order creation if revenue calculation fails
      }

      // Update product inventory immediately when order is placed
      console.log('📦 Updating inventory for new authenticated order:', savedOrder._id);
      for (const item of savedOrder.items) {
        try {
          const product = await Product.findById(item.product);
          if (product) {
            // Only update inventory for ready_to_ship products
            if (product.productType === 'ready_to_ship') {
              const newStock = Math.max(0, product.stock - item.quantity);
              product.stock = newStock;
              
              // Update product status if stock is low or out
              if (newStock === 0) {
                product.status = 'out_of_stock';
              } else if (newStock <= product.lowStockThreshold) {
                product.status = 'active'; // Keep active but low stock
              }
              
              await product.save();
              console.log(`✅ Updated inventory for product ${product.name}: stock=${newStock}`);
            } else {
              console.log(`ℹ️ Skipping inventory update for ${product.productType} product: ${product.name}`);
            }
          } else {
            console.error(`❌ Product not found: ${item.product}`);
          }
        } catch (productError) {
          console.error(`❌ Error updating inventory for product ${item.product}:`, productError);
          // Don't fail the order creation if inventory update fails
        }
      }
      
      const populatedOrder = await Order.findById(savedOrder._id)
        .populate('patron', 'firstName lastName email phone')
        .populate('artisan', 'artisanName type pickupAddress email phone')
        .populate('items.product', 'name description image price unit');
      
      
      // Send pickup time notification if this is a pickup order with time window
      if (savedOrder.deliveryMethod === 'pickup' && savedOrder.pickupTimeWindow) {
        try {
          const axios = require('axios');
          const pickupNotificationData = {
            type: 'pickup_order_with_time',
            userId: savedOrder.artisan,
            orderId: savedOrder._id,
            userEmail: populatedOrder.artisan?.email,
            userPhone: populatedOrder.artisan?.phone,
            orderDetails: {
              orderId: savedOrder._id,
              pickupTime: savedOrder.pickupTimeWindow.timeSlotLabel,
              pickupDate: new Date(savedOrder.pickupTimeWindow.selectedDate).toLocaleDateString(),
              customerName: populatedOrder.patron 
                ? `${populatedOrder.patron.firstName} ${populatedOrder.patron.lastName}`
                : `${populatedOrder.guestInfo?.firstName} ${populatedOrder.guestInfo?.lastName} (Guest)`,
              customerEmail: populatedOrder.patron?.email || populatedOrder.guestInfo?.email
            },
            timestamp: new Date().toISOString()
          };

          await axios.post(`${process.env.API_URL || 'http://localhost:4000'}/api/notifications/send`, pickupNotificationData);
          console.log('✅ Pickup time notification sent to artisan');
        } catch (notificationError) {
          console.error('❌ Error sending pickup time notification:', notificationError);
        }
      }
      
      createdOrders.push(populatedOrder);
    }

    res.status(201).json({
      message: 'Orders created successfully',
      orders: createdOrders
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (artisan only)
router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { status, preparationStage, notes, estimatedDeliveryTime, deliveryDistance } = req.body;
    

    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }


    // Additional role check for artisan-like roles
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can update order status' });
    }

    // Check if user is the artisan for this order by finding their artisan profile
    let artisanProfile;
    try {
      artisanProfile = await Artisan.findOne({ user: req.user._id });
    } catch (error) {
      console.error('❌ Backend Debug - Error finding artisan profile:', error);
      return res.status(500).json({ message: 'Error finding artisan profile' });
    }
    
    if (!artisanProfile) {
      console.log('❌ No artisan profile found for user:', req.user._id);
      return res.status(403).json({ message: 'Artisan profile not found' });
    }

    if (order.artisan.toString() !== artisanProfile._id.toString()) {
      console.log('❌ Order artisan ID:', order.artisan.toString());
      console.log('❌ User artisan profile ID:', artisanProfile._id.toString());
      console.log('❌ User ID:', req.user._id.toString());
      console.log('❌ User role:', req.user.role);
      return res.status(403).json({ message: 'Only the artisan can update order status' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivering', 'ready_for_pickup', 'out_for_delivery', 'cancelled'],
      'ready_for_pickup': ['picked_up', 'cancelled'],
      'out_for_delivery': ['delivered', 'cancelled'],
      'delivering': ['delivered', 'cancelled'],
      'delivered': [],
      'picked_up': [],
      'cancelled': [],
      'declined': []
    };

    const currentStatus = order.status;
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    // Update order
    order.status = status;
    if (preparationStage) order.preparationStage = preparationStage;
    if (notes) {
      order.notes = {
        ...order.notes,
        artisan: notes
      };
    }
    
    // Update delivery time and distance for delivery orders
    if (estimatedDeliveryTime && order.deliveryMethod !== 'pickup') {
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }
    
    // Store delivery distance for artisan reference
    if (deliveryDistance && order.deliveryMethod !== 'pickup') {
      order.deliveryDistance = deliveryDistance;
    }
    
    order.updatedAt = Date.now();
    
    // Set delivery/pickup time when status changes to delivered or picked_up
    if (status === 'delivered' || status === 'picked_up') {
      order.actualDeliveryTime = new Date();
    }

    // Update sold count when order is confirmed (inventory already updated when order was placed)
    if (status === 'confirmed' && currentStatus === 'pending') {
      console.log('📦 Updating sold count for confirmed order:', order._id);
      
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.product);
          if (product) {
            // Update sold count for all product types
            product.soldCount = (product.soldCount || 0) + item.quantity;
            await product.save();
            console.log(`✅ Updated sold count for product ${product.name}: sold=${product.soldCount}`);
          } else {
            console.error(`❌ Product not found: ${item.product}`);
          }
        } catch (productError) {
          console.error(`❌ Error updating sold count for product ${item.product}:`, productError);
          // Don't fail the order update if sold count update fails
        }
      }
    }

    // Restore product inventory when order is cancelled or declined
    if ((status === 'cancelled' || status === 'declined') && (currentStatus === 'pending' || currentStatus === 'confirmed')) {
      console.log('🔄 Restoring inventory for cancelled/declined order:', order._id);
      
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.product);
          if (product) {
            // Only restore inventory for ready_to_ship products
            if (product.productType === 'ready_to_ship') {
              const newStock = product.stock + item.quantity;
              product.stock = newStock;
              
              // Update product status
              if (newStock > 0) {
                product.status = 'active';
              }
              
              // Decrease sold count
              product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
              
              await product.save();
              console.log(`✅ Restored inventory for product ${product.name}: stock=${newStock}, sold=${product.soldCount}`);
            } else {
              console.log(`ℹ️ Skipping inventory restoration for ${product.productType} product: ${product.name}`);
            }
          } else {
            console.error(`❌ Product not found: ${item.product}`);
          }
        } catch (productError) {
          console.error(`❌ Error restoring inventory for product ${item.product}:`, productError);
          // Don't fail the order update if inventory restoration fails
        }
      }
    }

    // Update order without triggering full validation
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: order.status,
          preparationStage: order.preparationStage,
          notes: order.notes,
          updatedAt: new Date()
        }
      }
    );

    // Credit wallet when order is delivered or picked up
    if ((status === 'delivered' || status === 'picked_up') && 
        (currentStatus !== 'delivered' && currentStatus !== 'picked_up')) {
      try {
        const WalletService = require('../services/walletService');
        
        // Credit the wallet with order revenue (10% platform fee)
        const result = await WalletService.creditOrderRevenue(order._id, 0.10);
        
        console.log(`🎉 Successfully credited wallet for order ${order._id} (${status}):`);
        console.log(`  Wallet ID: ${result.walletId}`);
        console.log(`  Transaction ID: ${result.transactionId}`);
        console.log(`  Net amount: ${result.netAmount} CAD`);
        console.log(`  New balance: ${result.balanceAfter} CAD`);
      } catch (walletError) {
        console.error('❌ Error crediting wallet:', walletError);
        console.error('❌ Wallet error stack:', walletError.stack);
        // Don't fail the order update if wallet crediting fails
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type pickupAddress firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    // Send notification for status change
    try {
      await sendOrderStatusNotification(updatedOrder, status, currentStatus);
    } catch (notificationError) {
      console.error('❌ Error sending status notification:', notificationError);
      // Don't fail the order update if notification fails
    }

    res.json(updatedOrder);

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status
router.put('/:orderId/payment', verifyToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.patron.toString() !== req.user._id.toString() && 
        order.artisan.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update order without triggering full validation
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentStatus: paymentStatus,
          updatedAt: new Date()
        }
      }
    );

    const updatedOrder = await Order.findById(order._id)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type pickupAddress firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    res.json(updatedOrder);

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get real-time order updates (for WebSocket integration)
router.get('/:orderId/updates', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type address pickupAddress deliveryOptions firstName lastName email phone')
      .populate('items.product', 'name description image price unit');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user has access to this order
    if (order.patron._id.toString() !== req.user._id.toString() && 
        order.artisan._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      orderId: order._id,
      status: order.status,
      preparationStage: order.preparationStage,
      paymentStatus: order.paymentStatus,
      updatedAt: order.updatedAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime
    });
  } catch (error) {
    console.error('Error fetching order updates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel order (patron only, if order is still pending)
router.put('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is the patron for this order
    if (order.patron.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patron can cancel the order' });
    }

    // Only allow cancellation if order is still pending
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Update order without triggering full validation
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      }
    );

    const updatedOrder = await Order.findById(order._id)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type pickupAddress firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    res.json(updatedOrder);

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline order (artisan only)
router.put('/:orderId/decline', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    
    if (!reason || reason.trim().length === 0) {
      console.log('❌ Backend Debug - No reason provided');
      return res.status(400).json({ message: 'Decline reason is required' });
    }

    // Check if user is an artisan
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      console.log('❌ Backend Debug - User is not an artisan:', req.user.role);
      return res.status(403).json({ message: 'Only artisans can decline orders' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      console.log('❌ Backend Debug - Order not found:', req.params.orderId);
      return res.status(404).json({ message: 'Order not found' });
    }


    // Check if order can be declined
    if (!['pending', 'confirmed'].includes(order.status)) {
      console.log('❌ Backend Debug - Order cannot be declined, current status:', order.status);
      return res.status(400).json({ message: 'Order cannot be declined in its current status' });
    }

    // Verify the artisan owns this order
    let artisanProfile;
    try {
      artisanProfile = await Artisan.findOne({ user: req.user._id });
    } catch (error) {
      console.error('❌ Backend Debug - Decline: Error finding artisan profile:', error);
      return res.status(500).json({ message: 'Error finding artisan profile' });
    }
    
    
    if (!artisanProfile || order.artisan.toString() !== artisanProfile._id.toString()) {
      console.log('❌ Backend Debug - Not authorized to decline this order');
      return res.status(403).json({ message: 'Not authorized to decline this order' });
    }

    // Update order without triggering full validation
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          status: 'declined',
          declineReason: reason.trim(),
          declinedAt: new Date(),
          declinedBy: req.user._id,
          updatedAt: new Date()
        }
      },
      { 
        new: true,
        runValidators: false // Explicitly disable validation
      }
    );
    console.log('✅ Backend Debug - Order declined successfully');

    // Populate the updated order with related data
    const populatedOrder = await Order.findById(order._id)
      .populate('patron', 'firstName lastName email phone')
      .populate('artisan', 'artisanName type pickupAddress firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    // Send notification to patron/guest about order decline
    try {
      const axios = require('axios');
      
      // Determine customer information (patron or guest)
      const customerInfo = order.patron ? {
        id: order.patron._id,
        name: `${order.patron.firstName} ${order.patron.lastName}`,
        email: order.patron.email,
        phone: order.patron.phone,
        type: 'patron'
      } : {
        id: null,
        name: `${order.guestInfo?.firstName || 'Guest'} ${order.guestInfo?.lastName || 'User'}`,
        email: order.guestInfo?.email,
        phone: order.guestInfo?.phone,
        type: 'guest'
      };

      // Prepare detailed order information for notification
      const orderItems = populatedOrder.items.map(item => ({
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        productType: item.productType
      }));

      const notificationData = {
        type: 'order_declined',
        userId: customerInfo.id,
        orderId: order._id,
        userEmail: customerInfo.email,
        userPhone: customerInfo.phone,
        orderDetails: {
          orderId: order._id,
          orderNumber: `#${order._id.toString().slice(-8).toUpperCase()}`,
          customerName: customerInfo.name,
          customerType: customerInfo.type,
          declineReason: reason.trim(),
          declinedAt: new Date(),
          declinedBy: req.user._id,
          artisanName: `${populatedOrder.artisan?.firstName || ''} ${populatedOrder.artisan?.lastName || ''}`.trim() || populatedOrder.artisan?.artisanName || 'Unknown Artisan',
          artisanEmail: populatedOrder.artisan?.email,
          orderTotal: order.totalAmount,
          orderItems: orderItems,
          orderDate: order.orderDate,
          deliveryMethod: order.deliveryMethod || 'pickup',
          deliveryAddress: order.deliveryAddress,
          pickupTimeWindow: order.pickupTimeWindow
        },
        timestamp: new Date().toISOString()
      };

      console.log('📧 Sending decline notification:', {
        customerType: customerInfo.type,
        customerEmail: customerInfo.email,
        orderId: order._id,
        declineReason: reason.trim()
      });

      // Send notification to customer (this will be handled by the notification service)
      await axios.post(`${process.env.API_URL || 'http://localhost:4000'}/api/notifications/send`, notificationData);
      console.log('✅ Decline notification sent successfully to:', customerInfo.email || customerInfo.phone || 'customer');

      // Also send a confirmation notification to the artisan
      const artisanNotificationData = {
        type: 'order_decline_confirmation',
        userId: req.user._id,
        orderId: order._id,
        userEmail: populatedOrder.artisan?.email,
        userPhone: populatedOrder.artisan?.phone,
        orderDetails: {
          orderId: order._id,
          orderNumber: `#${order._id.toString().slice(-8).toUpperCase()}`,
          customerName: customerInfo.name,
          customerType: customerInfo.type,
          declineReason: reason.trim(),
          declinedAt: new Date(),
          orderTotal: order.totalAmount,
          orderItems: orderItems
        },
        timestamp: new Date().toISOString()
      };

      await axios.post(`${process.env.API_URL || 'http://localhost:4000'}/api/notifications/send`, artisanNotificationData);
      console.log('✅ Artisan decline confirmation sent to:', populatedOrder.artisan?.email || 'artisan');
    } catch (notificationError) {
      console.error('❌ Error sending decline notification:', notificationError);
      console.error('❌ Notification error details:', notificationError.response?.data || notificationError.message);
      // Don't fail the order decline if notification fails
    }

    res.json({ 
      message: 'Order declined successfully', 
      order: populatedOrder
    });
  } catch (error) {
    console.error('❌ Backend Debug - Error declining order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


