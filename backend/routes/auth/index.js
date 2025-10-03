/**
 * Authentication Routes
 * Handles user authentication, registration, and profile management
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User registration
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, userType = 'customer' } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Connection managed by middleware - no close needed
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      role: userType, // Database uses 'role' field
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(user);
    const userId = result.insertedId;
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userId.toString(), email: user.email, userType: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Connection managed by middleware - no close needed
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.role, // Frontend expects userType
          isActive: user.isActive,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Connection managed by middleware - no close needed
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      // Connection managed by middleware - no close needed
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Connection managed by middleware - no close needed
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, userType: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.role, // Frontend expects userType
          isActive: user.isActive,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
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
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          userType: user.role, // Frontend expects userType
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

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
    const { firstName, lastName, phone } = req.body;
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    
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
    
    const updatedUser = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          userType: updatedUser.role, // Frontend expects userType
          isActive: updatedUser.isActive,
          isVerified: updatedUser.isVerified,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
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

// Routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
