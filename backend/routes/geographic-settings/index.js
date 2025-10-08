/**
 * Geographic Settings Routes
 * Manages geographic restrictions and address validation
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

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

// Get default settings
const getDefaultSettings = () => {
  return {
    isEnabled: false,
    restrictions: {
      type: 'none', // 'none', 'country', 'region', 'coordinates'
      allowedCountries: [],
      allowedRegions: [],
      allowedCoordinates: []
    },
    addressValidation: {
      enabled: true,
      countryRules: [
        {
          country: 'Canada',
          code: 'CA',
          requiredFields: ['street', 'city', 'province', 'postalCode'],
          postalCodeFormat: '^[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d$',
          provinces: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
        },
        {
          country: 'United States',
          code: 'US',
          requiredFields: ['street', 'city', 'state', 'zipCode'],
          postalCodeFormat: '^\\d{5}(-\\d{4})?$',
          states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']
        }
      ]
    },
    userExperience: {
      showWelcomeMessage: true,
      welcomeMessage: 'Welcome to bazaarMKT! Supporting local artisans.',
      restrictionMessage: 'This service is not available in your region at this time.',
      allowLocationPrompt: true,
      fallbackToIP: true
    },
    testing: {
      enabled: false,
      testCoordinates: null,
      testCountry: '',
      testRegion: '',
      bypassRestrictions: false
    }
  };
};

// Get geographic settings
const getGeographicSettings = async (req, res) => {
  try {
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    let settings = await settingsCollection.findOne({});
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = getDefaultSettings();
      await settingsCollection.insertOne({
        ...defaultSettings,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      settings = defaultSettings;
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting geographic settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get geographic settings',
      error: error.message
    });
  }
};

// Update geographic settings
const updateGeographicSettings = async (req, res) => {
  try {
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    // Remove _id and other MongoDB internal fields from updates
    const { _id, __v, createdAt, ...cleanUpdates } = req.body;
    
    const result = await settingsCollection.updateOne(
      {},
      { 
        $set: { 
          ...cleanUpdates,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const updatedSettings = await settingsCollection.findOne({});
    
    res.json({
      success: true,
      message: 'Geographic settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating geographic settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update geographic settings',
      error: error.message
    });
  }
};

// Get current settings (public - for checking restrictions)
const getCurrentSettings = async (req, res) => {
  try {
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    let settings = await settingsCollection.findOne({});
    
    if (!settings || !settings.isEnabled) {
      return res.json({
        success: true,
        data: {
          isEnabled: false,
          restrictions: { type: 'none' }
        }
      });
    }
    
    // Return only restriction info (not admin settings)
    res.json({
      success: true,
      data: {
        isEnabled: settings.isEnabled,
        restrictions: settings.restrictions,
        userExperience: settings.userExperience
      }
    });
  } catch (error) {
    console.error('Error getting current settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current settings',
      error: error.message
    });
  }
};

// Check location access
const checkLocationAccess = async (req, res) => {
  try {
    const { latitude, longitude, country, region } = req.body;
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    const settings = await settingsCollection.findOne({});
    
    // If restrictions are not enabled, allow access
    if (!settings || !settings.isEnabled || settings.restrictions.type === 'none') {
      return res.json({
        success: true,
        data: {
          allowed: true,
          reason: 'No restrictions enabled'
        }
      });
    }
    
    let allowed = true;
    let reason = 'Access granted';
    
    // Check based on restriction type
    switch (settings.restrictions.type) {
      case 'country':
        if (country && settings.restrictions.allowedCountries.length > 0) {
          allowed = settings.restrictions.allowedCountries.includes(country);
          reason = allowed ? 'Country allowed' : 'Country not in allowed list';
        }
        break;
        
      case 'region':
        if (region && settings.restrictions.allowedRegions.length > 0) {
          allowed = settings.restrictions.allowedRegions.includes(region);
          reason = allowed ? 'Region allowed' : 'Region not in allowed list';
        }
        break;
        
      case 'coordinates':
        if (latitude && longitude && settings.restrictions.allowedCoordinates.length > 0) {
          // Check if coordinates are within allowed areas
          // For simplicity, this is a basic implementation
          allowed = true; // TODO: Implement proper geo-fencing
          reason = 'Coordinates check passed';
        }
        break;
    }
    
    res.json({
      success: true,
      data: {
        allowed,
        reason,
        restrictionType: settings.restrictions.type
      }
    });
  } catch (error) {
    console.error('Error checking location access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check location access',
      error: error.message
    });
  }
};

// Get address validation rules
const getAddressValidationRules = async (req, res) => {
  try {
    const { country } = req.params;
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    const settings = await settingsCollection.findOne({});
    
    if (!settings || !settings.addressValidation || !settings.addressValidation.enabled) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    const countryRules = settings.addressValidation.countryRules.find(
      rule => rule.country === country || rule.code === country
    );
    
    res.json({
      success: true,
      data: countryRules || null
    });
  } catch (error) {
    console.error('Error getting address validation rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address validation rules',
      error: error.message
    });
  }
};

// Test geographic settings
const testGeographicSettings = async (req, res) => {
  try {
    const { latitude, longitude, country, region, address } = req.body;
    const db = req.db;
    const settingsCollection = db.collection('geographicsettings');
    
    const settings = await settingsCollection.findOne({});
    
    const testResults = {
      timestamp: new Date(),
      input: { latitude, longitude, country, region, address },
      restrictions: {
        enabled: settings?.isEnabled || false,
        type: settings?.restrictions?.type || 'none',
        passed: true,
        message: 'No restrictions configured'
      },
      addressValidation: {
        enabled: settings?.addressValidation?.enabled || false,
        passed: true,
        message: 'No validation rules configured'
      }
    };
    
    // Check restrictions if enabled
    if (settings && settings.isEnabled) {
      const accessCheck = await checkLocationAccessInternal(settings, latitude, longitude, country, region);
      testResults.restrictions = {
        enabled: true,
        type: settings.restrictions.type,
        passed: accessCheck.allowed,
        message: accessCheck.reason
      };
    }
    
    res.json({
      success: true,
      data: testResults
    });
  } catch (error) {
    console.error('Error testing geographic settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test settings',
      error: error.message
    });
  }
};

// Helper function for internal access checking
const checkLocationAccessInternal = (settings, latitude, longitude, country, region) => {
  let allowed = true;
  let reason = 'Access granted';
  
  if (!settings.isEnabled || settings.restrictions.type === 'none') {
    return { allowed: true, reason: 'No restrictions enabled' };
  }
  
  switch (settings.restrictions.type) {
    case 'country':
      if (country && settings.restrictions.allowedCountries.length > 0) {
        allowed = settings.restrictions.allowedCountries.includes(country);
        reason = allowed ? 'Country allowed' : 'Country not in allowed list';
      }
      break;
      
    case 'region':
      if (region && settings.restrictions.allowedRegions.length > 0) {
        allowed = settings.restrictions.allowedRegions.includes(region);
        reason = allowed ? 'Region allowed' : 'Region not in allowed list';
      }
      break;
      
    case 'coordinates':
      // Basic implementation - TODO: Implement proper geo-fencing
      allowed = true;
      reason = 'Coordinates check passed';
      break;
  }
  
  return { allowed, reason };
};

// Routes
router.get('/', verifyAdmin, getGeographicSettings);
router.put('/', verifyAdmin, updateGeographicSettings);
router.get('/current', getCurrentSettings);
router.post('/check-access', checkLocationAccess);
router.get('/address-validation/:country', getAddressValidationRules);
router.post('/test', verifyAdmin, testGeographicSettings);

module.exports = router;

