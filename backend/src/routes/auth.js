const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const verifyToken = require('../middleware/authMiddleware');

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'patron', artisanData } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Create user
    user = new User({ 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role 
    });
    await user.save();

    // If registering as artisan, create artisan profile
    let artisan = null;
    if (role === 'artisan' && artisanData) {
      const Artisan = require('../models/artisan');
      artisan = new Artisan({
        user: user._id,
        type: artisanData.type || 'food_beverages',
        artisanName: artisanData.artisanName || `${firstName} ${lastName}`,
        description: artisanData.description || `Artisan profile for ${firstName} ${lastName}`,
        address: artisanData.address || {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        phone: phone || '',
        email: email || '',
        isActive: true,
        deliveryOptions: {
          pickup: true,
          delivery: false,
          deliveryRadius: 0,
          deliveryFee: 0,
          freeDeliveryThreshold: 0
        },
        pickupLocation: '',
        pickupInstructions: '',
        pickupHours: 'Business hours',
        pickupUseBusinessAddress: true
      });
      await artisan.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      },
      artisan: artisan ? {
        id: artisan._id,
        artisanName: artisan.artisanName,
        type: artisan.type
      } : null
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create guest profile
router.post('/guest', async (req, res) => {
  try {
    const { firstName, lastName, phone, email } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    // Generate unique guest ID
    const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create guest user
    const guestUser = new User({
      firstName,
      lastName,
      phone,
      email: email || `${guestId}@guest.local`, // Use guest email if none provided
      isGuest: true,
      guestId,
      role: 'patron'
    });

    await guestUser.save();

    // Create JWT token for guest
    const token = jwt.sign(
      { 
        userId: guestUser._id, 
        role: guestUser.role, 
        isGuest: true,
        guestId: guestUser.guestId 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '30d' } // Longer expiry for guests
    );

    res.status(201).json({
      message: 'Guest profile created successfully',
      token,
      user: {
        id: guestUser._id,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        fullName: `${guestUser.firstName} ${guestUser.lastName}`,
        guestId: guestUser.guestId,
        isGuest: true
      }
    });

  } catch (error) {
    console.error('Guest profile creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register artisan with business profile
router.post('/register/artisan', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      artisanName,
      type = 'food_beverages',
      description,
      address,
      deliveryOptions
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Create user with artisan role
    user = new User({ 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role: 'artisan'
    });
    await user.save();

    // Create artisan profile
    const Artisan = require('../models/artisan');
    const artisan = new Artisan({
      user: user._id,
      type,
      artisanName: artisanName || `${firstName} ${lastName}`,
      description: description || `Artisan profile for ${firstName} ${lastName}`,
      address: address || {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      phone: phone || '',
      email: email || '',
      isActive: true,
      deliveryOptions: deliveryOptions || {
        pickup: true,
        delivery: false,
        deliveryRadius: 0,
        deliveryFee: 0,
        freeDeliveryThreshold: 0
      },
      pickupLocation: '',
      pickupInstructions: '',
      pickupHours: 'Business hours',
      pickupUseBusinessAddress: true
    });
    await artisan.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Artisan registered successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      },
      artisan: {
        id: artisan._id,
        artisanName: artisan.artisanName,
        type: artisan.type,
        description: artisan.description
      }
    });

  } catch (error) {
    console.error('Artisan registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Profile route (requires JWT) - Optimized for performance
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // req.user is already the full user document from auth middleware
    const user = req.user;
    
    console.log('🔍 Profile requested for user:', user._id);
    console.log('🔍 User has addresses:', user.addresses?.length || 0);
    console.log('🔍 User has payment methods:', user.paymentMethods?.length || 0);
    
    res.json({ user });
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create guest user
router.post('/guest', async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    // Generate unique guest ID
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const guestUser = new User({
      firstName: firstName || 'Guest',
      lastName: lastName || 'User',
      email: email || `${guestId}@guest.local`,
      password: 'guest_password_' + Math.random().toString(36).substr(2, 9),
      phone: phone || '',
      role: 'patron',
      isGuest: true,
      guestId: guestId
    });
    
    await guestUser.save();
    
    const token = jwt.sign(
      { userId: guestUser._id, role: guestUser.role, isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Shorter expiration for guest users
    );
    
    res.status(201).json({
      message: 'Guest user created successfully',
      token,
      user: {
        id: guestUser._id,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        fullName: `${guestUser.firstName} ${guestUser.lastName}`,
        email: guestUser.email,
        role: guestUser.role,
        isGuest: true,
        guestId: guestUser.guestId
      }
    });
    
  } catch (error) {
    console.error('Guest user creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Convert guest to regular user
router.post('/guest/convert', verifyToken, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    if (!req.user.isGuest) {
      return res.status(400).json({ message: 'User is not a guest' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        email,
        password: hashedPassword,
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        phone: phone || req.user.phone,
        isGuest: false,
        guestId: null
      },
      { new: true }
    );
    
    const token = jwt.sign(
      { userId: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Guest user converted successfully',
      token,
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
    
  } catch (error) {
    console.error('Guest conversion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
