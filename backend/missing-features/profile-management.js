/**
 * Profile Management System - Serverless Implementation
 * Handles user profiles, addresses, settings, and guest users
 */

const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const updateData = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    // Prepare update data
    const update = {
      updatedAt: new Date()
    };

    // Basic profile fields
    if (updateData.firstName) update.firstName = updateData.firstName;
    if (updateData.lastName) update.lastName = updateData.lastName;
    if (updateData.phone !== undefined) update.phone = updateData.phone;
    if (updateData.bio) update.bio = updateData.bio;
    if (updateData.profileImage) update.profileImage = updateData.profileImage;

    // Nested objects
    if (updateData.notificationPreferences) {
      update.notificationPreferences = updateData.notificationPreferences;
    }
    if (updateData.accountSettings) {
      update.accountSettings = updateData.accountSettings;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    await client.close();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { addresses } = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $set: { 
          addresses: addresses,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      message: 'Addresses updated successfully'
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

// Add new address
const addAddress = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const addressData = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    // Add ID to new address
    const newAddress = {
      id: new ObjectId().toString(),
      ...addressData,
      createdAt: new Date()
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { 
        $push: { addresses: newAddress },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { address: newAddress }
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

// ============================================================================
// GUEST USER ENDPOINTS
// ============================================================================

// Check if email exists
const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne(
      { email: email.toLowerCase() },
      { projection: { password: 0 } }
    );

    await client.close();

    if (user) {
      res.json({
        success: true,
        user: user
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
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
    const guestData = req.body;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const guestsCollection = db.collection('guest_users');

    const guest = {
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      email: guestData.email.toLowerCase(),
      phone: guestData.phone || '',
      shippingAddress: guestData.shippingAddress || {},
      orderHistory: [],
      isGuest: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await guestsCollection.insertOne(guest);
    await client.close();

    res.status(201).json({
      success: true,
      message: 'Guest profile created successfully',
      data: {
        guestId: result.insertedId,
        ...guest
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

    if (!ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const guestsCollection = db.collection('guest_users');

    const guest = await guestsCollection.findOne({ _id: new ObjectId(guestId) });

    if (!guest) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }

    await client.close();

    res.json({
      success: true,
      data: guest
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
    const updateData = req.body;

    if (!ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const guestsCollection = db.collection('guest_users');

    const update = {
      ...updateData,
      updatedAt: new Date()
    };

    const result = await guestsCollection.updateOne(
      { _id: new ObjectId(guestId) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }

    await client.close();

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

// Convert guest to regular user
const convertGuestToUser = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { password } = req.body;

    if (!ObjectId.isValid(guestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest ID'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const guestsCollection = db.collection('guest_users');
    const usersCollection = db.collection('users');

    // Get guest data
    const guest = await guestsCollection.findOne({ _id: new ObjectId(guestId) });
    if (!guest) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Guest profile not found'
      });
    }

    // Check if email already exists in users
    const existingUser = await usersCollection.findOne({ email: guest.email });
    if (existingUser) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user account
    const user = {
      email: guest.email,
      password: hashedPassword,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      userType: 'customer',
      isActive: true,
      isVerified: false,
      addresses: guest.shippingAddress ? [guest.shippingAddress] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      convertedFromGuest: true,
      originalGuestId: guest._id
    };

    const result = await usersCollection.insertOne(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Delete guest profile
    await guestsCollection.deleteOne({ _id: new ObjectId(guestId) });

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Guest converted to user successfully',
      data: {
        user: {
          _id: result.insertedId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.userType,
          isActive: user.isActive,
          isVerified: user.isVerified
        },
        token
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

// ============================================================================
// USER ORDERS ENDPOINTS
// ============================================================================

// Get orders for buyer (patron)
const getBuyerOrders = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const limit = parseInt(req.query.limit) || 20;

    // Validate userId format
    if (!decoded.userId || !ObjectId.isValid(decoded.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');

    const orders = await ordersCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    await client.close();

    res.json({
      success: true,
      data: { orders },
      count: orders.length
    });
  } catch (error) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get orders for artisan
const getArtisanOrders = async (req, res) => {
  try {
    console.log('🔍 getArtisanOrders: Starting request');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.log('❌ getArtisanOrders: No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    console.log('🔍 getArtisanOrders: Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 getArtisanOrders: Token decoded, userId:', decoded.userId);
    const limit = parseInt(req.query.limit) || 20;

    // Validate userId format
    console.log('🔍 getArtisanOrders: User ID from token:', decoded.userId);
    console.log('🔍 getArtisanOrders: User ID type:', typeof decoded.userId);
    console.log('🔍 getArtisanOrders: User ID valid ObjectId:', ObjectId.isValid(decoded.userId));
    
    if (!decoded.userId) {
      console.log('❌ getArtisanOrders: No user ID in token');
      return res.status(400).json({
        success: false,
        message: 'No user ID in token'
      });
    }
    
    // Try to create ObjectId and let the database handle validation
    let userObjectId;
    try {
      userObjectId = new ObjectId(decoded.userId);
      console.log('🔍 getArtisanOrders: ObjectId created successfully:', userObjectId);
    } catch (objectIdError) {
      console.log('❌ getArtisanOrders: ObjectId creation failed:', objectIdError.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        details: {
          userId: decoded.userId,
          type: typeof decoded.userId,
          length: decoded.userId?.length,
          objectIdError: objectIdError.message
        }
      });
    }

    console.log('🔍 getArtisanOrders: Connecting to database...');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const artisansCollection = db.collection('artisans');

    // Get artisan profile
    console.log('🔍 getArtisanOrders: Looking for artisan with user ID:', decoded.userId);
    console.log('🔍 getArtisanOrders: Using ObjectId:', userObjectId);
    
    let artisan;
    try {
      artisan = await artisansCollection.findOne({
        user: userObjectId
      });

      console.log('🔍 getArtisanOrders: Found artisan:', artisan ? 'Yes' : 'No');
      if (artisan) {
        console.log('🔍 getArtisanOrders: Artisan ID:', artisan._id);
        console.log('🔍 getArtisanOrders: Artisan name:', artisan.artisanName);
      }
      
      if (!artisan) {
        console.log('❌ getArtisanOrders: Artisan profile not found');
        await client.close();
        return res.status(404).json({
          success: false,
          message: 'Artisan profile not found'
        });
      }
    } catch (dbError) {
      console.error('❌ getArtisanOrders: Database error:', dbError);
      await client.close();
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: dbError.message
      });
    }

    // Get orders for this artisan (orders have items with artisanId field)
    console.log('🔍 getArtisanOrders: Querying orders for artisan ID:', artisan._id);
    console.log('🔍 getArtisanOrders: Artisan ID type:', typeof artisan._id);
    console.log('🔍 getArtisanOrders: Artisan ID string:', artisan._id.toString());
    
    // Try different query approaches
    const query1 = { 'items.artisanId': artisan._id };
    const query2 = { 'items.artisanId': artisan._id.toString() };
    const query3 = { 'items.artisanId': new ObjectId(artisan._id) };
    
    console.log('🔍 getArtisanOrders: Query 1 (ObjectId):', query1);
    console.log('🔍 getArtisanOrders: Query 2 (String):', query2);
    console.log('🔍 getArtisanOrders: Query 3 (New ObjectId):', query3);
    
    // First, let's see what orders exist
    const allOrders = await ordersCollection.find({}).limit(5).toArray();
    console.log('🔍 getArtisanOrders: Sample orders structure:', allOrders.map(o => ({
      _id: o._id,
      items: o.items?.map(item => ({
        productId: item.productId,
        artisanId: item.artisanId,
        artisanIdType: typeof item.artisanId
      }))
    })));
    
    const orders = await ordersCollection
      .find({ 
        'items.artisanId': artisan._id 
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log('🔍 getArtisanOrders: Found orders:', orders.length);
    await client.close();

    res.json({
      success: true,
      data: { orders },
      count: orders.length
    });
  } catch (error) {
    console.error('❌ getArtisanOrders: Error caught:', error);
    console.error('❌ getArtisanOrders: Error name:', error.name);
    console.error('❌ getArtisanOrders: Error message:', error.message);
    console.error('❌ getArtisanOrders: Error stack:', error.stack);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'CastError' || error.message.includes('ObjectId')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan orders',
      error: error.message
    });
  }
};

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate userId format
    if (!decoded.userId) {
      return res.status(400).json({
        success: false,
        message: 'No user ID in token'
      });
    }

    // Try to create ObjectId and let the database handle validation
    let userObjectId;
    try {
      userObjectId = new ObjectId(decoded.userId);
      console.log('🔍 getArtisanProfile: ObjectId created successfully:', userObjectId);
    } catch (objectIdError) {
      console.log('❌ getArtisanProfile: ObjectId creation failed:', objectIdError.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        details: {
          userId: decoded.userId,
          type: typeof decoded.userId,
          length: decoded.userId?.length,
          objectIdError: objectIdError.message
        }
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const artisansCollection = db.collection('artisans');

    // Get artisan profile by user ID to find the artisan ID
    console.log('Looking for artisan profile with user ID:', decoded.userId);
    const artisan = await artisansCollection.findOne({
      user: userObjectId
    });

    console.log('Found artisan profile:', artisan ? 'Yes' : 'No');
    if (!artisan) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found'
      });
    }

    console.log('Artisan profile data:', {
      _id: artisan._id,
      artisanName: artisan.artisanName,
      businessImage: artisan.businessImage ? 'Present' : 'Missing',
      description: artisan.description,
      category: artisan.category,
      specialties: artisan.specialties,
      address: artisan.address,
      contactInfo: artisan.contactInfo,
      phone: artisan.phone,
      email: artisan.email,
      type: artisan.type
    });

    await client.close();

    res.json({
      success: true,
      data: artisan
    });
  } catch (error) {
    console.error('Get artisan profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get artisan profile',
      error: error.message
    });
  }
};

// Create guest order
const createGuestOrder = async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');

    // Calculate total and validate items
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of orderData.items) {
      const product = await productsCollection.findOne({
        _id: new ObjectId(item.productId),
        status: 'active'
      });

      if (!product) {
        await client.close();
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or inactive`
        });
      }

      if (product.availableQuantity < item.quantity) {
        await client.close();
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
        artisanId: new ObjectId(product.artisan)
      });
    }

    // Create order
    const order = {
      guestId: orderData.guestInfo ? new ObjectId(orderData.guestInfo.guestId) : null,
      guestInfo: orderData.guestInfo || {},
      items: validatedItems,
      totalAmount,
      status: 'pending',
      shippingAddress: orderData.shippingAddress || {},
      paymentMethod: orderData.paymentMethod || 'cash',
      notes: orderData.notes || '',
      isGuestOrder: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await ordersCollection.insertOne(order);

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

    await client.close();

    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: {
          _id: result.insertedId,
          ...order
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

module.exports = {
  updateProfile,
  updateAddresses,
  addAddress,
  checkEmail,
  createGuestProfile,
  getGuestProfile,
  updateGuestProfile,
  convertGuestToUser,
  getBuyerOrders,
  getArtisanOrders,
  getArtisanProfile,
  createGuestOrder
};
