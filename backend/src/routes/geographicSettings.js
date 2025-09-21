const express = require('express');
const router = express.Router();
const geographicSettingsService = require('../services/geographicSettingsService');
const authenticateToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminAuth');
const { logAdminAction } = require('../utils/adminAuditLogger');

// Get current geographic settings (public endpoint for frontend)
router.get('/current', async (req, res) => {
  try {
    const result = await geographicSettingsService.getCurrentSettings();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in GET /geographic-settings/current:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check location access (public endpoint)
router.post('/check-access', async (req, res) => {
  try {
    const { latitude, longitude, country, region } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const result = await geographicSettingsService.checkLocationAccess(
      latitude, longitude, country, region
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in POST /geographic-settings/check-access:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get address validation rules for a country (public endpoint)
router.get('/address-validation/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    if (!country) {
      return res.status(400).json({
        success: false,
        error: 'Country is required'
      });
    }

    const result = await geographicSettingsService.getAddressValidationRules(country);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in GET /geographic-settings/address-validation/:country:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin routes - require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all geographic settings (admin only)
router.get('/', async (req, res) => {
  try {
    const result = await geographicSettingsService.getCurrentSettings();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in GET /geographic-settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update geographic settings (admin only)
router.put('/', async (req, res) => {
  try {
    const adminUser = req.user;
    const settingsData = req.body;

    // Get current settings for audit trail
    const currentSettings = await geographicSettingsService.getCurrentSettings();

    const result = await geographicSettingsService.updateSettings(settingsData, adminUser._id);
    
    if (result.success) {
      // Log admin action
      await logAdminAction({
        adminUser,
        action: 'geographic_settings_updated',
        targetType: 'geographic_settings',
        targetId: result.data._id,
        targetName: 'Geographic Settings',
        changes: {
          field: 'geographic_settings',
          oldValue: currentSettings.data,
          newValue: result.data
        },
        description: `Updated geographic settings - Restrictions: ${settingsData.restrictions?.type || 'none'}, Enabled: ${settingsData.isEnabled || false}`,
        req
      });

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in PUT /geographic-settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get settings history (admin only)
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await geographicSettingsService.getSettingsHistory(limit);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in GET /geographic-settings/history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Test geographic settings (admin only)
router.post('/test', async (req, res) => {
  try {
    const testData = req.body;
    
    if (!testData.latitude || !testData.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required for testing'
      });
    }

    const result = await geographicSettingsService.testSettings(testData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in POST /geographic-settings/test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get default settings template (admin only)
router.get('/defaults', async (req, res) => {
  try {
    const GeographicSettings = require('../models/geographicSettings');
    const defaultSettings = GeographicSettings.getDefaultSettings();
    
    res.json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    console.error('Error in GET /geographic-settings/defaults:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
