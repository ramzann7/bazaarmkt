/**
 * Authentication Routes
 * Handles user authentication, registration, and profile management
 * Updated to use service layer
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createAuthService } = require('../../services');

// Rate limiters for different auth operations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// User registration
const register = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role = 'patron',
      addresses = [],
      artisanData = null,
      artisanName,
      type,
      description,
      location // Geographic location for validation
    } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }
    
    const db = req.db; // Use shared connection from middleware
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    // Check geographic restrictions if enabled
    const geographicSettingsCollection = db.collection('geographicsettings');
    const geoSettings = await geographicSettingsCollection.findOne({});
    
    if (geoSettings && geoSettings.isEnabled && geoSettings.restrictions.type !== 'none') {
      // Validate location based on restriction type
      let allowed = true;
      let reason = '';
      
      if (geoSettings.restrictions.type === 'country' && location?.country) {
        allowed = geoSettings.restrictions.allowedCountries.includes(location.country);
        reason = allowed ? '' : 'Registration is not available in your country';
      } else if (geoSettings.restrictions.type === 'region' && location?.region) {
        allowed = geoSettings.restrictions.allowedRegions.includes(location.region);
        reason = allowed ? '' : 'Registration is not available in your region';
      }
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: reason || geoSettings.userExperience?.restrictionMessage || 'Service not available in your region',
          restrictionType: geoSettings.restrictions.type
        });
      }
    }
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with all provided data
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || '',
      role: role, // Database uses 'role' field
      addresses: addresses || [],
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(user);
    const userId = result.insertedId;
    
    let artisan = null;
    
    // Create artisan profile if user is registering as artisan
    if (role === 'artisan') {
      const artisanProfile = {
        user: userId,
        artisanName: artisanName || artisanData?.artisanName || `${firstName} ${lastName}`,
        type: type || artisanData?.type || 'food_beverages',
        description: description || artisanData?.description || `Artisan profile for ${firstName} ${lastName}`,
        category: [type || artisanData?.type || 'food_beverages'],
        specialties: [],
        address: artisanData?.address || (addresses.length > 0 ? addresses[0] : {}),
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const artisanResult = await artisansCollection.insertOne(artisanProfile);
      artisan = {
        _id: artisanResult.insertedId,
        ...artisanProfile
      };
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userId.toString(), email: user.email, userType: role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Prepare response data
    const responseData = {
        user: {
          _id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: role, // Backend uses 'role'
          userType: role, // Frontend expects userType
          addresses: user.addresses,
          isActive: user.isActive,
          isVerified: user.isVerified
        },
      token
    };
    
    // Include artisan data if created
    if (artisan) {
      responseData.artisan = {
        _id: artisan._id,
        artisanName: artisan.artisanName,
        type: artisan.type,
        description: artisan.description,
        category: artisan.category,
        address: artisan.address
      };
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: responseData
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
    const artisansCollection = db.collection('artisans');
    
    const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(decoded.userId) });
    if (!user) {
      // Connection managed by middleware - no close needed
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Sync payment methods from Stripe if user has a customer ID
    let syncedPaymentMethods = user.paymentMethods || [];
    
    if (user.stripeCustomerId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Fetch payment methods from Stripe
        const stripePaymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card'
        });
        
        console.log(`💳 Profile sync: Found ${stripePaymentMethods.data.length} payment methods in Stripe`);
        
        // Convert Stripe payment methods to our format
        syncedPaymentMethods = stripePaymentMethods.data.map((pm, index) => ({
          stripePaymentMethodId: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          expiryMonth: pm.card.exp_month,
          expiryYear: pm.card.exp_year,
          cardholderName: pm.billing_details?.name || 'Cardholder',
          isDefault: index === 0,
          type: 'credit_card',
          createdAt: new Date(pm.created * 1000)
        }));
        
        // Update MongoDB with synced payment methods
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              paymentMethods: syncedPaymentMethods,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`✅ Profile sync: Synced ${syncedPaymentMethods.length} payment methods`);
      } catch (stripeError) {
        console.error('❌ Error syncing payment methods from Stripe:', stripeError);
        // Fall back to MongoDB data if Stripe sync fails
        syncedPaymentMethods = user.paymentMethods || [];
      }
    }
    
    // Build user profile object
    const userProfile = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      userType: user.role, // Frontend expects userType
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      addresses: user.addresses || [],
      notificationPreferences: user.notificationPreferences || {},
      accountSettings: user.accountSettings || {},
      paymentMethods: syncedPaymentMethods
    };
    
    // If user is an artisan, fetch artisan data
    if (user.role === 'artisan') {
      const artisan = await artisansCollection.findOne({ user: user._id });
      if (artisan) {
        // Decrypt bank information if present
        if (artisan.bankInfo) {
          try {
            const { decryptBankInfo } = require('../../utils/encryption');
            artisan.bankInfo = decryptBankInfo(artisan.bankInfo);
          } catch (error) {
            // Keep encrypted data if decryption fails
          }
        }
        userProfile.artisan = artisan;
        userProfile.artisanId = artisan._id;
      }
    }
    
    // Connection managed by middleware - no close needed
    
    res.json({
      success: true,
      data: {
        user: userProfile
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

// ============================================================================
// AUTH HELPER ENDPOINTS (Extracted from server-vercel.js)
// ============================================================================

// Check if email already exists
const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const authService = await createAuthService();
    const result = await authService.checkEmail(email);
    
    res.json({
      success: true,
      exists: result.exists,
      message: result.exists ? 'Email already registered' : 'Email is available'
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email',
      error: error.message
    });
  }
};

// Create guest profile
const createGuest = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for guest checkout'
      });
    }
    
    const authService = await createAuthService();
    const guestUser = await authService.createGuest({
      firstName: firstName || 'Guest',
      lastName: lastName || 'User',
      email,
      phone: phone || ''
    });
    
    const userId = guestUser._id;
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userId.toString(), email: guestUser.email, userType: 'guest' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Guest profile created successfully',
      user: {
        id: userId.toString(),
        _id: userId,
        email: guestUser.email,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        phone: guestUser.phone,
        role: 'guest',
        isGuest: true
      },
      token
    });
  } catch (error) {
    console.error('Guest profile creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest profile',
      error: error.message
    });
  }
};

// Check if email already exists (GET version with user role information)
const checkEmailGet = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const authService = await createAuthService();
    const result = await authService.checkEmail(email);
    
    if (!result.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }
    
    res.json({
      success: true,
      exists: true,
      user: {
        id: result.userId.toString(),
        email: email,
        // Note: Additional user details would need to be fetched separately
        // if needed, as checkEmail only returns existence and userId
      }
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email',
      error: error.message
    });
  }
};

// ============================================================================
// ROUTES
// ============================================================================

// Main auth routes
// Routes - with rate limiting
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Auth helper routes (extracted from server-vercel.js)
router.post('/check-email', checkEmail);
router.post('/guest', createGuest);
router.get('/check-email/:email', checkEmailGet);

module.exports = router;
