const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Artisan = require('../models/artisan');
const verifyToken = require('../middleware/authMiddleware');
// const { geocodeAddress } = require('../services/geocodingService');

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
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If this is the first payment method, make it default
    if (user.paymentMethods.length === 0) {
      newPaymentMethod.isDefault = true;
    }

    user.paymentMethods.push(newPaymentMethod);
    await user.save();
    
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
    const { paymentMethods } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.paymentMethods = paymentMethods;
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating payment methods:', error);
    res.status(500).json({ message: 'Server error' });
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
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can access business profile' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    res.json(artisan);
  } catch (error) {
    console.error('Error fetching artisan profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update artisan profile
router.post('/artisan', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can create artisan profile' });
    }

    let artisan = await Artisan.findOne({ user: req.user._id });
    
    if (artisan) {
      // Update existing artisan profile
      Object.assign(artisan, req.body);
      await artisan.save();
    } else {
      // Create new artisan profile
      artisan = new Artisan({
        ...req.body,
        user: req.user._id
      });
      await artisan.save();
    }

    res.json(artisan);
  } catch (error) {
    console.error('Error creating/updating artisan profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update artisan profile
router.put('/artisan', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can update artisan profile' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    Object.assign(artisan, req.body);
    await artisan.save();

    res.json(artisan);
  } catch (error) {
    console.error('Error updating artisan profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update artisan hours
router.put('/artisan/hours', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
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
    console.error('Error updating artisan hours:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update delivery options
router.put('/artisan/delivery', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can update delivery options' });
    }

    const artisan = await Artisan.findOne({ user: req.user._id });
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan profile not found' });
    }

    const { deliveryOptions } = req.body;
    artisan.deliveryOptions = deliveryOptions;
    await artisan.save();

    res.json(artisan);
  } catch (error) {
    console.error('Error updating delivery options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update artisan operations
router.put('/artisan/operations', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
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
    console.error('Error updating artisan operations:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update artisan photos and contact information
router.put('/artisan/photos-contact', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'artisan') {
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
