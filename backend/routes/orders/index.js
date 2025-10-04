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
    
    const db = req.db; // Use shared connection from middleware
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
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
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

// Routes
router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/artisan', getArtisanOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
