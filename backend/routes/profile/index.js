/**
 * Profile Management Feature Module
 * Handles user profile management functionality
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// Update profile
const updateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { firstName, lastName, phone, bio, profileImage, notificationPreferences, accountSettings } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const updateData = { updatedAt: new Date() };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    // Validate and ensure complete notification preferences structure
    if (notificationPreferences !== undefined) {
      const completePreferences = {
        email: {
          marketing: notificationPreferences.email?.marketing ?? true,
          orderUpdates: notificationPreferences.email?.orderUpdates ?? true,
          promotions: notificationPreferences.email?.promotions ?? true,
          security: notificationPreferences.email?.security ?? true
        },
        push: {
          orderUpdates: notificationPreferences.push?.orderUpdates ?? true,
          promotions: notificationPreferences.push?.promotions ?? true,
          newArtisans: notificationPreferences.push?.newArtisans ?? true,
          nearbyOffers: notificationPreferences.push?.nearbyOffers ?? true
        }
      };
      updateData.notificationPreferences = completePreferences;
      console.log('✅ Ensured complete notification preferences structure');
    }
    
    if (accountSettings !== undefined) updateData.accountSettings = accountSettings;
    
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updatedUser = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Update addresses
const updateAddresses = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { addresses } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    console.log(`📍 Updating addresses for user ${decoded.userId}:`, addresses?.length || 0, 'address(es)');
    
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { $set: { addresses, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated user with ALL fields to return to frontend
    const updatedUser = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    // Connection managed by middleware - no close needed
    
    console.log(`✅ Addresses updated successfully. User now has ${updatedUser.addresses?.length || 0} address(es)`);
    
    res.json({
      success: true,
      message: 'Addresses updated successfully',
      data: { 
        user: updatedUser // Return complete user data for cache update
      }
    });
  } catch (error) {
    console.error('Update addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update addresses',
      error: error.message
    });
  }
};

// Add address
const addAddress = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { address } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { 
        $push: { addresses: address },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Connection managed by middleware - no close needed
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Address added successfully'
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: error.message
    });
  }
};

// Check email
const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      exists: !!user,
      message: user ? 'Email already exists' : 'Email available'
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email',
      error: error.message
    });
  }
};

// Create guest profile
const createGuestProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const guestUsersCollection = db.collection('guestUsers');
    
    const guestUser = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      isGuest: true,
      createdAt: new Date()
    };
    
    const result = await guestUsersCollection.insertOne(guestUser);
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Guest profile created successfully',
      data: {
        guestId: result.insertedId,
        guestUser
      }
    });
  } catch (error) {
    console.error('Create guest profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest profile',
      error: error.message
    });
  }
};

// Get guest profile
const getGuestProfile = async (req, res) => {
  try {
    const { guestId } = req.params;
    
    const db = req.db; // Use shared connection from middleware
    const guestUsersCollection = db.collection('guestUsers');
    
    const guestUser = await guestUsersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(guestId)
    });
    // Connection managed by middleware - no close needed
    
    if (!guestUser) {
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }
    
    res.json({
      success: true,
      data: guestUser
    });
  } catch (error) {
    console.error('Get guest profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get guest profile',
      error: error.message
    });
  }
};

// Update guest profile
const updateGuestProfile = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { firstName, lastName, email, phone } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const guestUsersCollection = db.collection('guestUsers');
    
    const updateData = { updatedAt: new Date() };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    
    const result = await guestUsersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(guestId) },
      { $set: updateData }
    );
    
    // Connection managed by middleware - no close needed
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Guest profile updated successfully'
    });
  } catch (error) {
    console.error('Update guest profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update guest profile',
      error: error.message
    });
  }
};

// Convert guest to user
const convertGuestToUser = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to convert guest to user'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const guestUsersCollection = db.collection('guestUsers');
    const usersCollection = db.collection('users');
    
    // Get guest user
    const guestUser = await guestUsersCollection.findOne({
      _id: new (require('mongodb')).ObjectId(guestId)
    });
    
    if (!guestUser) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      email: guestUser.email
    });
    
    if (existingUser) {
      // Connection managed by middleware - no close needed
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = {
      firstName: guestUser.firstName,
      lastName: guestUser.lastName,
      email: guestUser.email,
      phone: guestUser.phone,
      password: hashedPassword,
      role: 'customer',
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(user);
    
    // Delete guest user
    await guestUsersCollection.deleteOne({
      _id: new (require('mongodb')).ObjectId(guestId)
    });
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Guest profile converted to user successfully',
      data: {
        userId: result.insertedId,
        user: {
          _id: result.insertedId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          userType: user.role
        }
      }
    });
  } catch (error) {
    console.error('Convert guest to user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert guest to user',
      error: error.message
    });
  }
};

// Get buyer orders
const getBuyerOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
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
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get buyer orders',
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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const ordersCollection = db.collection('orders');
    
    // Get orders where items contain artisan's products
    const orders = await ordersCollection
      .find({
        'items.artisanId': new (require('mongodb')).ObjectId(decoded.userId)
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
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan orders',
      error: error.message
    });
  }
};

// Create guest order
const createGuestOrder = async (req, res) => {
  try {
    const { guestId, items, shippingAddress, paymentMethod, notes } = req.body;
    
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
      guestId: new (require('mongodb')).ObjectId(guestId),
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
    console.error('Create guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest order',
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    // Get current user
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    if (!user) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      // Connection managed by middleware - no close needed
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Connection managed by middleware - no close needed
    
    console.log(`✅ Password changed successfully for user ${decoded.userId}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Get payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    }, {
      projection: { paymentMethods: 1 }
    });
    
    // Connection managed by middleware - no close needed
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.paymentMethods || []
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
      error: error.message
    });
  }
};

// Update payment methods
const updatePaymentMethods = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { paymentMethods } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    console.log(`💳 Updating payment methods for user ${decoded.userId}:`, paymentMethods?.length || 0, 'method(s)');
    
    const result = await usersCollection.updateOne(
      { _id: new (require('mongodb')).ObjectId(decoded.userId) },
      { $set: { paymentMethods, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated user with ALL fields to return to frontend
    const updatedUser = await usersCollection.findOne({ 
      _id: new (require('mongodb')).ObjectId(decoded.userId) 
    });
    
    // Connection managed by middleware - no close needed
    
    console.log(`✅ Payment methods updated successfully. User now has ${updatedUser.paymentMethods?.length || 0} method(s)`);
    
    res.json({
      success: true,
      message: 'Payment methods updated successfully',
      data: { 
        user: updatedUser // Return complete user data for cache update
      }
    });
  } catch (error) {
    console.error('Update payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment methods',
      error: error.message
    });
  }
};

// Routes
router.put('/', updateProfile);
router.put('/addresses', updateAddresses);
router.post('/addresses', addAddress);
router.get('/payment-methods', getPaymentMethods);
router.put('/payment-methods', updatePaymentMethods);
router.put('/password', changePassword);
router.get('/check-email', checkEmail);
router.post('/guest', createGuestProfile);
router.get('/guest/:id', getGuestProfile);
router.put('/guest/:id', updateGuestProfile);
router.post('/guest/convert', convertGuestToUser);
router.get('/orders/buyer', getBuyerOrders);
router.get('/orders/artisan', getArtisanOrders);
router.post('/orders/guest', createGuestOrder);

module.exports = router;
