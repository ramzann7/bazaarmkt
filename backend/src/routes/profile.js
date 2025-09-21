const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Artisan = require('../models/artisan');
const verifyToken = require('../middleware/authMiddleware');
// const { geocodeAddress } = require('../services/geocodingService');

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const User = require('../models/user');
    const userCount = await User.countDocuments();
    res.json({ 
      message: 'Database connection working',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: error.message 
    });
  }
});

// Get user profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update entire profile
router.put('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'addresses', 
      'notificationPreferences', 'accountSettings', 'paymentMethods'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update basic profile information
router.put('/basic', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;

    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating basic profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update addresses
router.put('/addresses', verifyToken, async (req, res) => {
  try {
    const { addresses } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.addresses = addresses;
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating addresses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new address
router.post('/addresses', verifyToken, async (req, res) => {
  try {
    const newAddress = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If this is the first address, make it default
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update notification preferences
router.put('/notifications', verifyToken, async (req, res) => {
  try {
    const { notificationPreferences } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure we have the complete notification preferences structure
    const updatedPreferences = {
      email: {
        ...user.notificationPreferences.email,
        ...notificationPreferences.email
      },
      push: {
        ...user.notificationPreferences.push,
        ...notificationPreferences.push
      },
      sms: {
        ...user.notificationPreferences.sms,
        ...notificationPreferences.sms
      }
    };

    user.notificationPreferences = updatedPreferences;
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update account settings
router.put('/settings', verifyToken, async (req, res) => {
  try {
    const { accountSettings } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.accountSettings = {
      ...user.accountSettings,
      ...accountSettings
    };
    
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating account settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile picture
router.put('/picture', verifyToken, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = profilePicture;
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Payment methods management
router.get('/payment-methods', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('paymentMethods');
    res.json(user.paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/payment-methods', verifyToken, async (req, res) => {
  try {
    const newPaymentMethod = req.body;
    console.log('Adding payment method:', newPaymentMethod);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Current user payment methods:', user.paymentMethods);

    // If this is the first payment method, make it default
    if (user.paymentMethods.length === 0) {
      newPaymentMethod.isDefault = true;
    }

    user.paymentMethods.push(newPaymentMethod);
    console.log('Before save - payment methods:', user.paymentMethods);
    
    await user.save();
    
    console.log('After save - payment methods:', user.paymentMethods);
    console.log('User document saved successfully');
    
    res.json(user.paymentMethods);
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/payment-methods/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.paymentMethods = user.paymentMethods.filter(
      method => method._id.toString() !== req.params.id
    );
    
    await user.save();
    
    res.json(user.paymentMethods);
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set default payment method
router.patch('/payment-methods/:id/default', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reset all payment methods to not default
    user.paymentMethods.forEach(method => {
      method.isDefault = false;
    });

    // Set the specified payment method as default
    const paymentMethod = user.paymentMethods.find(
      method => method._id.toString() === req.params.id
    );
    
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    paymentMethod.isDefault = true;
    await user.save();
    
    res.json(user.paymentMethods);
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Producer profile routes
router.get('/producer', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can access producer profile' });
    }

    const producer = await Producer.findOne({ user: req.user._id });
    if (!producer) {
      return res.status(404).json({ message: 'Producer profile not found' });
    }

    res.json(producer);
  } catch (error) {
    console.error('Error fetching producer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update producer profile
router.post('/producer', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can create producer profiles' });
    }

    let producer = await Producer.findOne({ user: req.user._id });
    
    // Geocode address if provided
    // if (req.body.address && !req.body.address.lat && !req.body.address.lng) {
    //   const coordinates = await geocodeAddress(req.body.address);
    //   if (coordinates) {
    //     req.body.address.lat = coordinates.lat;
    //     req.body.address.lng = coordinates.lng;
    //   }
    // }
    
    if (producer) {
      // Update existing producer
      Object.assign(producer, req.body);
      await producer.save();
    } else {
      // Create new producer
      producer = new Producer({
        ...req.body,
        user: req.user._id
      });
      await producer.save();
    }

    res.json(producer);
  } catch (error) {
    console.error('Error creating/updating producer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update producer profile
router.put('/producer', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can update producer profiles' });
    }

    const producer = await Producer.findOne({ user: req.user._id });
    if (!producer) {
      return res.status(404).json({ message: 'Producer profile not found' });
    }

    // Geocode address if provided and coordinates are missing
    // if (req.body.address && !req.body.address.lat && !req.body.address.lng) {
    //   const coordinates = await geocodeAddress(req.body.address);
    //   if (coordinates) {
    //     req.body.address.lat = coordinates.lat;
    //     req.body.address.lng = coordinates.lng;
    //   }
    // }

    Object.assign(producer, req.body);
    await producer.save();

    res.json(producer);
  } catch (error) {
    console.error('Error updating producer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update producer operation details
router.put('/producer/operations', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can update operation details' });
    }

    const producer = await Producer.findOne({ user: req.user._id });
    if (!producer) {
      return res.status(404).json({ message: 'Producer profile not found' });
    }

    producer.operationDetails = { ...producer.operationDetails, ...req.body };
    await producer.save();

    res.json(producer);
  } catch (error) {
    console.error('Error updating producer operations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update producer business hours
router.put('/producer/hours', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can update business hours' });
    }

    const producer = await Producer.findOne({ user: req.user._id });
    if (!producer) {
      return res.status(404).json({ message: 'Producer profile not found' });
    }

    producer.businessHours = { ...producer.businessHours, ...req.body };
    await producer.save();

    res.json(producer);
  } catch (error) {
    console.error('Error updating producer business hours:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update producer delivery options
router.put('/producer/delivery', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ message: 'Only producers can update delivery options' });
    }

    const producer = await Producer.findOne({ user: req.user._id });
    if (!producer) {
      return res.status(404).json({ message: 'Producer profile not found' });
    }

    producer.deliveryOptions = { ...producer.deliveryOptions, ...req.body };
    await producer.save();

    res.json(producer);
  } catch (error) {
    console.error('Error updating producer delivery options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment methods
router.put('/payment-methods', verifyToken, async (req, res) => {
  try {
    console.log('=== Payment Methods Update Request ===');
    console.log('User ID:', req.user._id);
    console.log('Request body:', req.body);
    
    const { paymentMethods } = req.body;
    console.log('Payment methods to update:', paymentMethods);
    
    if (!paymentMethods || !Array.isArray(paymentMethods)) {
      console.error('Invalid payment methods data:', paymentMethods);
      return res.status(400).json({ message: 'Invalid payment methods data' });
    }
    
    console.log('Looking for user with ID:', req.user._id);
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('User not found:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('User found:', user._id, user.email);

    console.log('Current user payment methods:', user.paymentMethods);
    console.log('User document before update:', user);
    
    user.paymentMethods = paymentMethods;
    console.log('New payment methods to save:', user.paymentMethods);
    
    console.log('About to save user...');
    await user.save();
    console.log('User saved successfully');
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    console.log('Sending response with payment methods:', userResponse.paymentMethods);
    res.json(userResponse);
  } catch (error) {
    console.error('=== Error updating payment methods ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update security settings
router.put('/security', verifyToken, async (req, res) => {
  try {
    const { securitySettings } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.accountSettings = { ...user.accountSettings, ...securitySettings };
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating security settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get artisan profile
router.get('/artisan', verifyToken, async (req, res) => {
  try {
    console.log('🔄 GET /artisan - User ID:', req.user._id);
    console.log('🔄 User role:', req.user.role);
    
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      console.log('❌ Access denied - User role:', req.user.role);
      return res.status(403).json({ message: 'Only artisans can access business profile' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    console.log('🔄 Found artisan profile:', !!artisan);
    
    if (!artisan) {
      console.log('❌ Artisan profile not found for user:', req.user._id);
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    console.log('✅ Artisan profile data:', {
      id: artisan._id,
      artisanName: artisan.artisanName,
      type: artisan.type,
      description: artisan.description,
      user: artisan.user
    });
    console.log('✅ Returning artisan profile for user:', req.user._id);
    res.json(artisan);
  } catch (error) {
    console.error('❌ Error fetching artisan profile:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Create or update artisan profile
router.post('/artisan', verifyToken, async (req, res) => {
  try {
    console.log('🔄 POST /artisan - User ID:', req.user._id);
    console.log('🔄 User role:', req.user.role);
    console.log('🔄 Request body:', req.body);
    
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      console.log('❌ Access denied - User role:', req.user.role);
      return res.status(403).json({ message: 'Only artisans can create artisan profile' });
    }

    let artisan = await Artisan.findOne({ user: req.user._id });
    console.log('🔄 Found existing artisan profile:', !!artisan);
    
    if (artisan) {
      // Update existing artisan profile
      console.log('🔄 Updating existing artisan profile');
      Object.assign(artisan, req.body);
      await artisan.save();
      console.log('✅ Existing artisan profile updated');
    } else {
      // Create new artisan profile
      console.log('🔄 Creating new artisan profile');
      artisan = new Artisan({
        ...req.body,
        user: req.user._id
      });
      await artisan.save();
      console.log('✅ New artisan profile created');
    }

    res.json(artisan);
  } catch (error) {
    console.error('❌ Error creating/updating artisan profile:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update artisan profile
router.put('/artisan', verifyToken, async (req, res) => {
  try {
    console.log('🔄 PUT /artisan - User ID:', req.user._id);
    console.log('🔄 User role:', req.user.role);
    console.log('🔄 Request body:', req.body);
    
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      console.log('❌ Access denied - User role:', req.user.role);
      return res.status(403).json({ message: 'Only artisans can update artisan profile' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    console.log('🔄 Found artisan profile:', !!artisan);
    
    if (!artisan) {
      console.log('❌ Artisan profile not found for user:', req.user._id);
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    console.log('🔄 Updating artisan profile with data:', req.body);
    console.log('🔄 Business image type:', typeof req.body.businessImage);
    console.log('🔄 Business image value:', req.body.businessImage ? 'present' : 'not present');
    
    // Filter out empty artisanName to prevent validation errors
    const updateData = { ...req.body };
    if (updateData.artisanName === '' || updateData.artisanName === null || updateData.artisanName === undefined) {
      delete updateData.artisanName;
      console.log('🔄 Removed empty artisanName from update data');
    }
    
    Object.assign(artisan, updateData);
    await artisan.save();
    console.log('✅ Artisan profile updated successfully');

    res.json(artisan);
  } catch (error) {
    console.error('❌ Error updating artisan profile:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update artisan hours
router.put('/artisan/hours', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      return res.status(403).json({ message: 'Only artisans can update artisan hours' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const { artisanHours } = req.body;
    artisan.artisanHours = artisanHours;
    await artisan.save();

    res.json(artisan);
  } catch (error) {
    console.error('❌ Error updating artisan hours:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery options
router.put('/artisan/delivery', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      return res.status(403).json({ message: 'Only artisans can update delivery options' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const { deliveryOptions } = req.body;
    
    console.log('🔄 Received delivery options update request:', {
      userId: req.user._id,
      userEmail: req.user.email,
      deliveryOptions: deliveryOptions,
      professionalDelivery: deliveryOptions?.professionalDelivery
    });
    
    // Update delivery options
    if (deliveryOptions) {
      // Update main delivery options
      artisan.deliveryOptions = {
        ...artisan.deliveryOptions,
        pickup: deliveryOptions.pickup,
        delivery: deliveryOptions.delivery,
        deliveryRadius: deliveryOptions.deliveryRadius,
        deliveryFee: deliveryOptions.deliveryFee,
        freeDeliveryThreshold: deliveryOptions.freeDeliveryThreshold
      };
      
      // Update pickup details
      if (deliveryOptions.pickupLocation !== undefined) {
        artisan.pickupLocation = deliveryOptions.pickupLocation;
      }
      if (deliveryOptions.pickupInstructions !== undefined) {
        artisan.pickupInstructions = deliveryOptions.pickupInstructions;
      }
      if (deliveryOptions.pickupHours !== undefined) {
        artisan.pickupHours = deliveryOptions.pickupHours;
      }
      if (deliveryOptions.pickupUseBusinessAddress !== undefined) {
        artisan.pickupUseBusinessAddress = deliveryOptions.pickupUseBusinessAddress;
      }
      if (deliveryOptions.pickupAddress !== undefined) {
        artisan.pickupAddress = deliveryOptions.pickupAddress;
      }
      if (deliveryOptions.pickupSchedule !== undefined) {
        artisan.pickupSchedule = deliveryOptions.pickupSchedule;
      }
      
      // Update personal delivery details
      if (deliveryOptions.deliveryInstructions !== undefined) {
        artisan.deliveryInstructions = deliveryOptions.deliveryInstructions;
      }
      
      // Update professional delivery options
      if (deliveryOptions.professionalDelivery) {
        console.log('🔄 Updating professional delivery options:', deliveryOptions.professionalDelivery);
        artisan.professionalDelivery = {
          enabled: deliveryOptions.professionalDelivery.enabled || false,
          uberDirectEnabled: deliveryOptions.professionalDelivery.uberDirectEnabled || false,
          serviceRadius: deliveryOptions.professionalDelivery.serviceRadius || 25,
          regions: deliveryOptions.professionalDelivery.regions || [],
          packaging: deliveryOptions.professionalDelivery.packaging || '',
          restrictions: deliveryOptions.professionalDelivery.restrictions || ''
        };
        console.log('✅ Professional delivery options set to:', artisan.professionalDelivery);
      } else {
        console.log('⚠️ No professional delivery options in request');
      }
    }
    
    await artisan.save();
    console.log('✅ Delivery options updated successfully:', {
      deliveryOptions: artisan.deliveryOptions,
      pickupLocation: artisan.pickupLocation,
      pickupInstructions: artisan.pickupInstructions,
      pickupHours: artisan.pickupHours,
      pickupUseBusinessAddress: artisan.pickupUseBusinessAddress,
      pickupAddress: artisan.pickupAddress,
      pickupSchedule: artisan.pickupSchedule,
      deliveryInstructions: artisan.deliveryInstructions,
      professionalDelivery: artisan.professionalDelivery
    });

    res.json(artisan);
  } catch (error) {
    console.error('❌ Error updating delivery options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update artisan operations
router.put('/artisan/operations', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      return res.status(403).json({ message: 'Only artisans can update artisan operations' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    // Update operation details
    artisan.operationDetails = {
      ...artisan.operationDetails,
      ...req.body
    };
    
    await artisan.save();

    res.json(artisan);
  } catch (error) {
    console.error('❌ Error updating artisan operations:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update artisan photos and contact information
router.put('/artisan/photos-contact', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan' && req.user.role !== 'producer' && req.user.role !== 'food_maker') {
      return res.status(403).json({ message: 'Only artisans can update artisan photos and contact' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const { photos, contactInfo } = req.body;
    
    // Update photos
    if (photos) {
      artisan.photos = photos;
    }
    
    // Update contact information
    if (contactInfo) {
      artisan.contactInfo = {
        ...artisan.contactInfo,
        ...contactInfo
      };
    }
    
    await artisan.save();

    res.json(artisan);
  } catch (error) {
    console.error('Error updating artisan photos and contact:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
