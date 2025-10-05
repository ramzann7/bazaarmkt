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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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
    const { ObjectId } = require('mongodb');
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

// Update artisan profile
const updateArtisanProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    // Get the user to verify they are an artisan
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user || user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Only artisans can update artisan profiles'
      });
    }
    
    // Get the artisan record
    const artisan = await artisansCollection.findOne({ user: user._id });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Prepare update data
    const updateData = { updatedAt: new Date() };
    
    // Handle bank information with encryption
    if (req.body.bankInfo) {
      const { encryptBankInfo } = require('../../utils/encryption');
      updateData.bankInfo = {
        ...encryptBankInfo(req.body.bankInfo),
        lastUpdated: new Date()
      };
    }
    
    // Handle other artisan profile fields
    const allowedFields = [
      'artisanName', 'businessName', 'description', 'category', 'specialties',
      'address', 'contactInfo', 'businessImage', 'profileImage', 'photos',
      'type', 'status', 'isActive', 'deliveryOptions', 'pickupSchedule',
      'artisanHours', 'operationDetails', 'operations'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Update the artisan record
    const result = await artisansCollection.updateOne(
      { _id: artisan._id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Get the updated artisan record
    const updatedArtisan = await artisansCollection.findOne({ _id: artisan._id });
    
    res.json({
      success: true,
      message: 'Artisan profile updated successfully',
      data: updatedArtisan
    });
  } catch (error) {
    console.error('Update artisan profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update artisan profile',
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
router.put('/artisan', updateArtisanProfile);

// Stripe Connect endpoints for bank account setup
const setupStripeConnect = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    // Get user and artisan data
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user || user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Only artisans can setup Stripe Connect'
      });
    }
    
    const artisan = await artisansCollection.findOne({ user: user._id });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }
    
    // Check if bank info is available
    if (!artisan.bankInfo) {
      return res.status(400).json({
        success: false,
        message: 'Bank information is required before setting up Stripe Connect'
      });
    }
    
    // Decrypt bank info
    const { decryptBankInfo } = require('../../utils/encryption');
    const decryptedBankInfo = decryptBankInfo(artisan.bankInfo);
    
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    
    // Create Stripe Connect account
    const connectAccount = await stripeService.createConnectAccount(user, artisan);
    
    // Add bank account to Connect account
    const externalAccount = await stripeService.addBankAccount(connectAccount.id, decryptedBankInfo);
    
    // Update artisan with Stripe Connect account ID
    await artisansCollection.updateOne(
      { _id: artisan._id },
      { 
        $set: { 
          stripeConnectAccountId: connectAccount.id,
          stripeExternalAccountId: externalAccount.id,
          stripeConnectStatus: 'active',
          updatedAt: new Date()
        } 
      }
    );
    
    
    res.json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: {
        connectAccountId: connectAccount.id,
        externalAccountId: externalAccount.id,
        status: 'pending_verification'
      }
    });
  } catch (error) {
    console.error('Setup Stripe Connect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup Stripe Connect',
      error: error.message
    });
  }
};

// Get Stripe Connect account status
const getStripeConnectStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    // Get user and artisan data
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user || user.role !== 'artisan') {
      return res.status(403).json({
        success: false,
        message: 'Only artisans can access Stripe Connect status'
      });
    }
    
    const artisan = await artisansCollection.findOne({ user: user._id });
    if (!artisan || !artisan.stripeConnectAccountId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: 'Stripe Connect not set up'
        }
      });
    }
    
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    
    // Get account status from Stripe
    const accountStatus = await stripeService.getAccountStatus(artisan.stripeConnectAccountId);
    
    res.json({
      success: true,
      data: {
        connected: true,
        accountId: artisan.stripeConnectAccountId,
        status: accountStatus,
        payoutsEnabled: accountStatus.payouts_enabled,
        chargesEnabled: accountStatus.charges_enabled
      }
    });
  } catch (error) {
    console.error('Get Stripe Connect status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Stripe Connect status',
      error: error.message
    });
  }
};

router.post('/artisan/stripe-connect', setupStripeConnect);
router.get('/artisan/stripe-connect', getStripeConnectStatus);

// Get artisan profile
const getArtisanProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    res.json({
      success: true,
      data: artisan
    });
  } catch (error) {
    console.error('Error getting artisan profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update artisan operations
const updateArtisanOperations = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    const updateData = { updatedAt: new Date() };
    
    // Handle operations data
    if (req.body.operations) {
      updateData.operations = req.body.operations;
    }
    
    // Handle pickup schedule
    if (req.body.pickupSchedule) {
      updateData.pickupSchedule = req.body.pickupSchedule;
    }

    await artisansCollection.updateOne(
      { _id: artisan._id },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Artisan operations updated successfully'
    });
  } catch (error) {
    console.error('Error updating artisan operations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update artisan hours
const updateArtisanHours = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    const updateData = { updatedAt: new Date() };
    
    // Handle artisan hours
    if (req.body.artisanHours) {
      updateData.artisanHours = req.body.artisanHours;
    }

    await artisansCollection.updateOne(
      { _id: artisan._id },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Artisan hours updated successfully'
    });
  } catch (error) {
    console.error('Error updating artisan hours:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update artisan delivery options
const updateArtisanDelivery = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    const updateData = { updatedAt: new Date() };
    
    // Handle delivery options
    if (req.body.deliveryOptions) {
      updateData.deliveryOptions = req.body.deliveryOptions;
    }

    await artisansCollection.updateOne(
      { _id: artisan._id },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Artisan delivery options updated successfully'
    });
  } catch (error) {
    console.error('Error updating artisan delivery options:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update artisan photos and contact
const updateArtisanPhotosContact = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    
    const artisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    const updateData = { updatedAt: new Date() };
    
    // Handle photos
    if (req.body.photos) {
      updateData.photos = req.body.photos;
    }
    
    // Handle contact info
    if (req.body.contactInfo) {
      updateData.contactInfo = req.body.contactInfo;
    }
    
    // Handle business image
    if (req.body.businessImage) {
      updateData.businessImage = req.body.businessImage;
    }
    
    // Handle profile image
    if (req.body.profileImage) {
      updateData.profileImage = req.body.profileImage;
    }

    await artisansCollection.updateOne(
      { _id: artisan._id },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Artisan photos and contact updated successfully'
    });
  } catch (error) {
    console.error('Error updating artisan photos and contact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add payment method
const addPaymentMethod = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method data is required'
      });
    }

    // Add payment method to user's payment methods array
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $push: { paymentMethods: paymentMethod },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to add payment method'
      });
    }

    res.json({
      success: true,
      message: 'Payment method added successfully'
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { paymentMethodId } = req.params;
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID is required'
      });
    }

    // First, get the user to find the payment method
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user || !user.paymentMethods) {
      return res.status(404).json({
        success: false,
        message: 'User or payment methods not found'
      });
    }

    // Find the payment method to remove (try different ID fields)
    const paymentMethodToRemove = user.paymentMethods.find(pm => 
      pm.id === paymentMethodId || 
      pm._id === paymentMethodId || 
      pm.stripePaymentMethodId === paymentMethodId
    );

    if (!paymentMethodToRemove) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Remove the payment method from the array
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $pull: { paymentMethods: paymentMethodToRemove },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment method not found or already removed'
      });
    }

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create artisan profile
const createArtisanProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = require('jsonwebtoken');
    const { ObjectId } = require('mongodb');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const db = req.db;
    const artisansCollection = db.collection('artisans');
    const usersCollection = db.collection('users');
    
    // Check if artisan profile already exists
    const existingArtisan = await artisansCollection.findOne({ user: new ObjectId(decoded.userId) });
    if (existingArtisan) {
      return res.status(400).json({
        success: false,
        message: 'Artisan profile already exists'
      });
    }

    // Create new artisan profile
    const artisanData = {
      user: new ObjectId(decoded.userId),
      artisanName: req.body.artisanName || '',
      businessName: req.body.businessName || '',
      description: req.body.description || '',
      category: req.body.category || '',
      specialties: req.body.specialties || [],
      address: req.body.address || {},
      contactInfo: req.body.contactInfo || {},
      businessImage: req.body.businessImage || '',
      profileImage: req.body.profileImage || '',
      photos: req.body.photos || [],
      artisanHours: req.body.artisanHours || {},
      deliveryOptions: req.body.deliveryOptions || {},
      pickupSchedule: req.body.pickupSchedule || {},
      operations: req.body.operations || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await artisansCollection.insertOne(artisanData);
    
    // Update user role to artisan
    await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { 
          role: 'artisan',
          userType: 'artisan',
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Artisan profile created successfully',
      data: { _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating artisan profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add the new routes
router.get('/artisan', getArtisanProfile);
router.post('/artisan', createArtisanProfile);
router.put('/artisan/operations', updateArtisanOperations);
router.put('/artisan/hours', updateArtisanHours);
router.put('/artisan/delivery', updateArtisanDelivery);
router.put('/artisan/photos-contact', updateArtisanPhotosContact);
router.post('/payment-methods', addPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', deletePaymentMethod);

module.exports = router;
