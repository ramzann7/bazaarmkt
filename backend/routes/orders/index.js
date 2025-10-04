/**
 * Orders Routes
 * Handles order creation, management, and status updates
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

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
      
      if (product.availableQuantity < item.quantity) {
        // Connection managed by middleware - no close needed
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for product ${product.name}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
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
    
    // Update product quantities
    for (const item of validatedItems) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: -item.quantity,
            soldCount: item.quantity
          }
        }
      );
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
    
    const order = await ordersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(req.params.id),
      userId: new (require('mongodb')).ObjectId(decoded.userId)
    });
    
    if (!order) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: { order }
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
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
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
    
    const result = await ordersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(req.params.id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
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
    
    // Approach 1: Direct match with ObjectId on order.artisan field
    console.log('🔍 Trying direct ObjectId match on order.artisan...');
    orders = await ordersCollection
      .find({
        artisan: artisan._id
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    console.log('🔍 Direct ObjectId match on order.artisan found:', orders.length);
    
    // Approach 2: If no orders found, try string match on order.artisan
    if (orders.length === 0) {
      console.log('🔍 Trying string match on order.artisan...');
      orders = await ordersCollection
        .find({
          artisan: artisan._id.toString()
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(req.query.limit) || 50)
        .toArray();
      
      console.log('🔍 String match on order.artisan found:', orders.length);
    }
    
    // Approach 3: Try items.artisanId as fallback (for older orders)
    if (orders.length === 0) {
      console.log('🔍 Trying items.artisanId as fallback...');
      orders = await ordersCollection
        .find({
          'items.artisanId': artisan._id
        })
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
        // Check order.artisan field first
        if (order.artisan) {
          const matches = order.artisan.toString() === artisan._id.toString() ||
                         (order.artisan.equals && order.artisan.equals(artisan._id));
          
          if (matches) {
            console.log('🔍 Found matching order.artisan:', {
              orderId: order._id,
              orderArtisan: order.artisan.toString(),
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
    
    // Add artisan info to orders
    const ordersWithArtisan = orders.map(order => ({
      ...order,
      artisanInfo: artisan
    }));
    
    console.log('🔍 Final orders count:', ordersWithArtisan.length);
    console.log('🔍 Sample order structure:', ordersWithArtisan.length > 0 ? {
      _id: ordersWithArtisan[0]._id,
      status: ordersWithArtisan[0].status,
      totalAmount: ordersWithArtisan[0].totalAmount,
      itemsCount: ordersWithArtisan[0].items?.length || 0,
      createdAt: ordersWithArtisan[0].createdAt
    } : 'No orders');
    
    res.json({
      success: true,
      data: ordersWithArtisan,
      orders: ordersWithArtisan, // Frontend compatibility
      count: ordersWithArtisan.length
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
    
    const orders = await ordersCollection
      .find({ userId: new (require('mongodb')).ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    res.json({
      success: true,
      data: { orders },
      orders: orders, // Frontend compatibility
      count: orders.length
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
      
      if (product.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for product ${product.name}`
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
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
    
    // Create guest order
    const order = {
      userId: null, // Guest order
      guestInfo: guestInfo || {},
      items: validatedItems,
      totalAmount,
      status: 'pending',
      deliveryAddress: deliveryAddress || {},
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
    
    // Update product quantities
    for (const item of validatedItems) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: -item.quantity,
            soldCount: item.quantity
          }
        }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: {
          _id: orderId,
          ...order,
          totalAmount
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
    
    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
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
    
    // Restore product quantities
    for (const item of order.items) {
      await productsCollection.updateOne(
        { _id: item.productId },
        { 
          $inc: { 
            availableQuantity: item.quantity,
            soldCount: -item.quantity
          }
        }
      );
    }
    
    const updatedOrder = await ordersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(req.params.id) 
    });
    
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
    
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
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
    if (order.status !== 'delivered' && order.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Order must be delivered or ready to confirm receipt'
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
router.post('/', createOrder);
router.post('/guest', createGuestOrder);
router.get('/', getUserOrders);
router.get('/buyer', getPatronOrders);
router.get('/artisan', getArtisanOrders);
router.get('/artisan/stats', getArtisanStats);
router.get('/debug', debugOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);
router.put('/:id/payment', updatePaymentStatus);
router.post('/:id/confirm-receipt', confirmOrderReceipt);

module.exports = router;
