const geographicSettingsService = require('../services/geographicSettingsService');

/**
 * Middleware to check geographic restrictions for user registration
 */
const checkGeographicRestrictions = async (req, res, next) => {
  try {
    // Get location data from request body
    const { latitude, longitude, country, region, address } = req.body;
    
    // If no location data is provided, we'll allow registration but log it
    if (latitude === undefined && longitude === undefined && !country && !address) {
      console.log('⚠️ No location data provided for registration - allowing but logging');
      return next();
    }

    // Extract location data from address if provided
    let locationData = {
      latitude,
      longitude,
      country,
      region
    };

    // If address is provided, try to extract country and region
    if (address && address.country) {
      locationData.country = address.country;
      locationData.region = address.state || address.province || address.region;
    }

    // Check if location is allowed
    const result = await geographicSettingsService.checkLocationAccess(
      locationData.latitude,
      locationData.longitude,
      locationData.country,
      locationData.region
    );

    if (result.success && result.data.isAllowed) {
      // Location is allowed, continue
      req.geographicCheck = {
        allowed: true,
        message: result.data.settings.message
      };
      return next();
    } else {
      // Location is not allowed
      const message = result.success ? result.data.settings.message : 'Registration is not available in your region.';
      
      return res.status(403).json({
        success: false,
        error: 'Geographic restriction',
        message: message,
        code: 'GEOGRAPHIC_RESTRICTION',
        details: {
          restrictionType: result.success ? result.data.settings.restrictionType : 'unknown',
          isEnabled: result.success ? result.data.settings.isEnabled : false
        }
      });
    }
  } catch (error) {
    console.error('Error checking geographic restrictions:', error);
    
    // On error, allow registration but log the issue
    console.log('⚠️ Error checking geographic restrictions - allowing registration but logging error');
    req.geographicCheck = {
      allowed: true,
      error: error.message
    };
    return next();
  }
};

/**
 * Middleware to check geographic restrictions for artisan registration
 */
const checkArtisanGeographicRestrictions = async (req, res, next) => {
  try {
    // For artisans, we need to check both their personal location and business address
    const { 
      latitude, 
      longitude, 
      country, 
      region, 
      address,
      businessAddress 
    } = req.body;
    
    // Check personal location
    let personalLocationData = {
      latitude,
      longitude,
      country,
      region
    };

    // Extract from address if provided
    if (address && address.country) {
      personalLocationData.country = address.country;
      personalLocationData.region = address.state || address.province || address.region;
    }

    // Check business location
    let businessLocationData = null;
    if (businessAddress && businessAddress.country) {
      businessLocationData = {
        latitude: businessAddress.latitude,
        longitude: businessAddress.longitude,
        country: businessAddress.country,
        region: businessAddress.state || businessAddress.province || businessAddress.region
      };
    }

    // Check personal location access
    const personalResult = await geographicSettingsService.checkLocationAccess(
      personalLocationData.latitude,
      personalLocationData.longitude,
      personalLocationData.country,
      personalLocationData.region
    );

    // Check business location access if provided
    let businessResult = null;
    if (businessLocationData) {
      businessResult = await geographicSettingsService.checkLocationAccess(
        businessLocationData.latitude,
        businessLocationData.longitude,
        businessLocationData.country,
        businessLocationData.region
      );
    }

    // Both locations must be allowed (if business address is provided)
    const personalAllowed = personalResult.success && personalResult.data.isAllowed;
    const businessAllowed = businessResult ? (businessResult.success && businessResult.data.isAllowed) : true;

    if (personalAllowed && businessAllowed) {
      // Both locations are allowed
      req.geographicCheck = {
        allowed: true,
        personalLocation: personalLocationData,
        businessLocation: businessLocationData,
        message: personalResult.data.settings.message
      };
      return next();
    } else {
      // At least one location is not allowed
      let message = 'Artisan registration is not available in your region.';
      let restrictionType = 'unknown';
      
      if (!personalAllowed && personalResult.success) {
        message = personalResult.data.settings.message;
        restrictionType = personalResult.data.settings.restrictionType;
      } else if (!businessAllowed && businessResult && businessResult.success) {
        message = businessResult.data.settings.message;
        restrictionType = businessResult.data.settings.restrictionType;
      }

      return res.status(403).json({
        success: false,
        error: 'Geographic restriction',
        message: message,
        code: 'GEOGRAPHIC_RESTRICTION',
        details: {
          restrictionType,
          personalLocationAllowed: personalAllowed,
          businessLocationAllowed: businessAllowed,
          personalLocation: personalLocationData,
          businessLocation: businessLocationData
        }
      });
    }
  } catch (error) {
    console.error('Error checking artisan geographic restrictions:', error);
    
    // On error, allow registration but log the issue
    console.log('⚠️ Error checking artisan geographic restrictions - allowing registration but logging error');
    req.geographicCheck = {
      allowed: true,
      error: error.message
    };
    return next();
  }
};

/**
 * Middleware to check geographic restrictions for product listing
 */
const checkProductGeographicRestrictions = async (req, res, next) => {
  try {
    // For products, we check the artisan's location
    const { artisanId } = req.body;
    
    if (!artisanId) {
      return next(); // Let other validation handle this
    }

    // Get artisan's location from their profile
    const Artisan = require('../models/artisan');
    const artisan = await Artisan.findById(artisanId).select('address coordinates');
    
    if (!artisan) {
      return res.status(404).json({
        success: false,
        error: 'Artisan not found'
      });
    }

    // Check artisan's location
    const locationData = {
      latitude: artisan.coordinates?.latitude,
      longitude: artisan.coordinates?.longitude,
      country: artisan.address?.country,
      region: artisan.address?.state || artisan.address?.province
    };

    const result = await geographicSettingsService.checkLocationAccess(
      locationData.latitude,
      locationData.longitude,
      locationData.country,
      locationData.region
    );

    if (result.success && result.data.isAllowed) {
      req.geographicCheck = {
        allowed: true,
        artisanLocation: locationData,
        message: result.data.settings.message
      };
      return next();
    } else {
      const message = result.success ? result.data.settings.message : 'Product listing is not available in your region.';
      
      return res.status(403).json({
        success: false,
        error: 'Geographic restriction',
        message: message,
        code: 'GEOGRAPHIC_RESTRICTION',
        details: {
          restrictionType: result.success ? result.data.settings.restrictionType : 'unknown',
          artisanLocation: locationData
        }
      });
    }
  } catch (error) {
    console.error('Error checking product geographic restrictions:', error);
    
    // On error, allow but log
    console.log('⚠️ Error checking product geographic restrictions - allowing but logging error');
    req.geographicCheck = {
      allowed: true,
      error: error.message
    };
    return next();
  }
};

module.exports = {
  checkGeographicRestrictions,
  checkArtisanGeographicRestrictions,
  checkProductGeographicRestrictions
};
