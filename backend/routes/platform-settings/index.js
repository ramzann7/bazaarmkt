/**
 * Platform Settings Routes
 * Manages platform-wide configuration settings
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PlatformSettingsService = require('../../services/platformSettingsService');

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    if (decoded.role !== 'admin' && decoded.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get platform settings
const getPlatformSettings = async (req, res) => {
  try {
    const platformSettingsService = new PlatformSettingsService(req.db);
    const settings = await platformSettingsService.getPlatformSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform settings',
      error: error.message
    });
  }
};

// Update platform settings
const updatePlatformSettings = async (req, res) => {
  try {
    const platformSettingsService = new PlatformSettingsService(req.db);
    
    // Validate the settings update
    const validation = platformSettingsService.validateSettings(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings',
        errors: validation.errors
      });
    }
    
    const updatedSettings = await platformSettingsService.updatePlatformSettings(req.body);
    
    res.json({
      success: true,
      message: 'Platform settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update platform settings',
      error: error.message
    });
  }
};

// Get platform fee calculation for testing
const calculatePlatformFee = async (req, res) => {
  try {
    const { amount, feeType = 'order' } = req.query;
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    const platformSettingsService = new PlatformSettingsService(req.db);
    const feeCalculation = await platformSettingsService.calculatePlatformFee(parseFloat(amount), feeType);
    
    res.json({
      success: true,
      data: feeCalculation
    });
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate platform fee',
      error: error.message
    });
  }
};

// Get payment settings
const getPaymentSettings = async (req, res) => {
  try {
    const platformSettingsService = new PlatformSettingsService(req.db);
    const paymentSettings = await platformSettingsService.getPaymentSettings();
    
    res.json({
      success: true,
      data: paymentSettings
    });
  } catch (error) {
    console.error('Error getting payment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment settings',
      error: error.message
    });
  }
};

// Update payment settings
const updatePaymentSettings = async (req, res) => {
  try {
    const platformSettingsService = new PlatformSettingsService(req.db);
    
    // Validate payment settings
    const validation = platformSettingsService.validateSettings({ payment: req.body });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment settings',
        errors: validation.errors
      });
    }
    
    const updatedSettings = await platformSettingsService.updatePlatformSettings({
      payment: req.body
    });
    
    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: updatedSettings.payment
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment settings',
      error: error.message
    });
  }
};

// Reset platform settings to defaults
const resetPlatformSettings = async (req, res) => {
  try {
    const platformSettingsService = new PlatformSettingsService(req.db);
    const defaultSettings = await platformSettingsService.createDefaultSettings();
    
    res.json({
      success: true,
      message: 'Platform settings reset to defaults',
      data: defaultSettings
    });
  } catch (error) {
    console.error('Error resetting platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset platform settings',
      error: error.message
    });
  }
};

// Routes
router.get('/', getPlatformSettings);
router.put('/', verifyAdmin, updatePlatformSettings);
router.get('/calculate-fee', calculatePlatformFee);
router.get('/payment', getPaymentSettings);
router.put('/payment', verifyAdmin, updatePaymentSettings);
router.post('/reset', verifyAdmin, resetPlatformSettings);

module.exports = router;
