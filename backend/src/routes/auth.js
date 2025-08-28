const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const verifyToken = require('../middleware/authMiddleware');

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'patron' } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role 
    });
    await user.save();

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
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
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

// ✅ Profile route (requires JWT)
router.get('/profile', verifyToken, (req, res) => {
  res.json({ user: req.user });
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
