const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');
const verifyToken = require('../middleware/authMiddleware');
const RevenueService = require('../services/revenueService');

// Get all orders for the authenticated user (patron)
router.get('/buyer', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ patron: req.user._id })
      .populate('artisan', 'artisanName type')
      .populate('items.product', 'name description image price unit')
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
      .populate('items.product', 'name description image price unit')
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
      .populate('buyer', 'firstName lastName email phone')
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

// Get a specific order by ID
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('buyer', 'firstName lastName email phone')
      .populate('artisan', 'firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.buyer._id.toString() !== req.user._id.toString() && 
        order.artisan._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new order
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, deliveryAddress, deliveryInstructions, paymentMethod, paymentMethodId, guestInfo } = req.body;

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
        totalPrice: itemTotal
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
        paymentMethod,
        paymentMethodId,
        status: 'pending',
        paymentStatus: 'pending'
      };

      // Add patron or guest info based on user type
      if (req.user.isGuest && guestInfo) {
        orderData.guestInfo = guestInfo;
      } else {
        orderData.patron = req.user._id;
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
      
      const populatedOrder = await Order.findById(savedOrder._id)
        .populate('patron', 'firstName lastName email phone')
        .populate('artisan', 'artisanName type')
        .populate('items.product', 'name description image price unit');

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
    const { status, preparationStage, notes } = req.body;
    
    console.log('🔍 Backend Debug - Order Status Update Request:', {
      orderId: req.params.orderId,
      status,
      preparationStage,
      notes,
      userId: req.user._id,
      userRole: req.user.role
    });

    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('🔍 Backend Debug - Order found:', {
      orderId: order._id,
      orderArtisanId: order.artisan.toString(),
      requestUserId: req.user._id.toString(),
      orderStatus: order.status
    });

    // Check if user is the artisan for this order (support multiple artisan roles)
    if (order.artisan.toString() !== req.user._id.toString()) {
      console.log('❌ Order artisan ID:', order.artisan.toString());
      console.log('❌ User ID:', req.user._id.toString());
      console.log('❌ User role:', req.user.role);
      return res.status(403).json({ message: 'Only the artisan can update order status' });
    }

    // Additional role check for artisan-like roles
    if (!['artisan', 'producer', 'food_maker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only artisans can update order status' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivering', 'cancelled'],
      'delivering': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
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
    order.updatedAt = Date.now();
    
    // Set delivery time when status changes to delivered
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('artisan', 'firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

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
    if (order.buyer.toString() !== req.user._id.toString() && 
        order.artisan.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    order.paymentStatus = paymentStatus;
    order.updatedAt = Date.now();

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('artisan', 'firstName lastName email phone')
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
      .populate('buyer', 'firstName lastName email phone')
      .populate('artisan', 'firstName lastName email phone')
      .populate('items.product', 'name description image price unit');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user has access to this order
    if (order.buyer._id.toString() !== req.user._id.toString() && 
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
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the patron can cancel the order' });
    }

    // Only allow cancellation if order is still pending
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    order.status = 'cancelled';
    order.updatedAt = Date.now();

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email phone')
      .populate('artisan', 'firstName lastName email phone')
      .populate('items.product', 'name description image price unit');

    res.json(updatedOrder);

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


