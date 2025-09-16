const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const PlatformSettingsService = require('../services/platformSettingsService');
const { logAdminAction } = require('../utils/adminAuditLogger');

// Admin middleware to check if user is admin
const requireAdmin = [auth, adminAuth];

// Get platform settings
router.get('/', requireAdmin, async (req, res) => {
  try {
    const settings = await PlatformSettingsService.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform settings'
    });
  }
});

// Update platform settings
router.put('/', requireAdmin, async (req, res) => {
  try {
    const adminUser = req.user;
    const settingsData = req.body;

    // Validate settings data
    const validationErrors = PlatformSettingsService.validateSettings(settingsData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Store old settings for audit
    const oldSettings = await PlatformSettingsService.getSettings();

    // Update settings
    const updatedSettings = await PlatformSettingsService.updateSettings(settingsData, adminUser._id);

    // Log admin action
    await logAdminAction({
      adminUser,
      action: 'platform_settings_updated',
      targetType: 'platform_settings',
      targetId: updatedSettings._id,
      targetName: 'Platform Settings',
      changes: {
        field: 'settings',
        oldValue: oldSettings,
        newValue: updatedSettings
      },
      description: `Updated platform settings - Platform Fee: ${updatedSettings.platformFeePercentage}%`,
      req
    });

    res.json({
      success: true,
      message: 'Platform settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating platform settings'
    });
  }
});

// Get platform fee percentage (public endpoint for calculations)
router.get('/fee-percentage', async (req, res) => {
  try {
    const feePercentage = await PlatformSettingsService.getPlatformFeePercentage();
    res.json({
      success: true,
      data: {
        platformFeePercentage: feePercentage
      }
    });
  } catch (error) {
    console.error('Error getting platform fee percentage:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform fee percentage'
    });
  }
});

// Calculate platform fee for an order (public endpoint)
router.post('/calculate-fee', async (req, res) => {
  try {
    const { orderAmount } = req.body;

    if (!orderAmount || orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required'
      });
    }

    const calculation = await PlatformSettingsService.calculatePlatformFee(orderAmount);
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating platform fee'
    });
  }
});

// Reset to default settings
router.post('/reset-defaults', requireAdmin, async (req, res) => {
  try {
    const adminUser = req.user;

    // Store old settings for audit
    const oldSettings = await PlatformSettingsService.getSettings();

    // Create default settings
    const defaultSettings = await PlatformSettingsService.createDefaultSettings(adminUser._id);

    // Log admin action
    await logAdminAction({
      adminUser,
      action: 'platform_settings_reset',
      targetType: 'platform_settings',
      targetId: defaultSettings._id,
      targetName: 'Platform Settings',
      changes: {
        field: 'settings',
        oldValue: oldSettings,
        newValue: defaultSettings
      },
      description: 'Reset platform settings to defaults',
      req
    });

    res.json({
      success: true,
      message: 'Platform settings reset to defaults',
      data: defaultSettings
    });
  } catch (error) {
    console.error('Error resetting platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting platform settings'
    });
  }
});

// Get payout settings
router.get('/payout-settings', async (req, res) => {
  try {
    const payoutSettings = await PlatformSettingsService.getPayoutSettings();
    res.json({
      success: true,
      data: payoutSettings
    });
  } catch (error) {
    console.error('Error getting payout settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout settings'
    });
  }
});

module.exports = router;

