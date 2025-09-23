const PlatformSettings = require('../models/platformSettings');

class PlatformSettingsService {
  // Get current platform settings
  static async getSettings() {
    try {
      let settings = await PlatformSettings.findOne();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = await this.createDefaultSettings();
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting platform settings:', error);
      throw error;
    }
  }

  // Create default platform settings
  static async createDefaultSettings(adminUserId = null) {
    try {
      // If no admin user ID is provided, try to find the first admin user
      if (!adminUserId) {
        const User = require('../models/user');
        const adminUser = await User.findOne({ role: 'admin' });
        adminUserId = adminUser ? adminUser._id : null;
      }

      const defaultSettings = new PlatformSettings({
        platformFeePercentage: 10,
        currency: 'CAD',
        paymentProcessingFee: 2.9,
        minimumOrderAmount: 5.00,
        payoutSettings: {
          minimumPayoutAmount: 25.00,
          payoutFrequency: 'weekly',
          payoutDelay: 7
        },
        platformInfo: {
          name: 'bazaar',
          supportEmail: 'support@thebazaar.com'
        },
        features: {
          promotionalFeatures: true,
          spotlights: true,
          wallet: true,
          reviews: true
        },
        lastUpdatedBy: adminUserId
      });

      await defaultSettings.save();
      return defaultSettings;
    } catch (error) {
      console.error('Error creating default platform settings:', error);
      throw error;
    }
  }

  // Update platform settings
  static async updateSettings(settingsData, adminUserId) {
    try {
      let settings = await PlatformSettings.findOne();
      
      if (!settings) {
        // Create new settings if none exist
        settings = await this.createDefaultSettings(adminUserId);
      }

      // Update settings
      Object.keys(settingsData).forEach(key => {
        if (settingsData[key] !== undefined) {
          if (typeof settingsData[key] === 'object' && !Array.isArray(settingsData[key])) {
            // Handle nested objects
            settings[key] = { ...settings[key], ...settingsData[key] };
          } else {
            settings[key] = settingsData[key];
          }
        }
      });

      settings.lastUpdatedBy = adminUserId;
      await settings.save();
      
      return settings;
    } catch (error) {
      console.error('Error updating platform settings:', error);
      throw error;
    }
  }

  // Get platform fee percentage
  static async getPlatformFeePercentage() {
    try {
      const settings = await this.getSettings();
      return settings.platformFeePercentage;
    } catch (error) {
      console.error('Error getting platform fee percentage:', error);
      return 10; // Default fallback
    }
  }

  // Calculate platform fee for an order
  static async calculatePlatformFee(orderAmount) {
    try {
      const feePercentage = await this.getPlatformFeePercentage();
      const platformFee = (orderAmount * feePercentage) / 100;
      const artisanEarnings = orderAmount - platformFee;
      
      return {
        orderAmount,
        platformFeePercentage: feePercentage,
        platformFee: Math.round(platformFee * 100) / 100, // Round to 2 decimal places
        artisanEarnings: Math.round(artisanEarnings * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating platform fee:', error);
      throw error;
    }
  }

  // Get payout settings
  static async getPayoutSettings() {
    try {
      const settings = await this.getSettings();
      return settings.payoutSettings;
    } catch (error) {
      console.error('Error getting payout settings:', error);
      return {
        minimumPayoutAmount: 25.00,
        payoutFrequency: 'weekly',
        payoutDelay: 7
      };
    }
  }

  // Validate settings data
  static validateSettings(settingsData) {
    const errors = [];

    if (settingsData.platformFeePercentage !== undefined) {
      if (settingsData.platformFeePercentage < 0 || settingsData.platformFeePercentage > 50) {
        errors.push('Platform fee percentage must be between 0 and 50');
      }
    }

    if (settingsData.paymentProcessingFee !== undefined) {
      if (settingsData.paymentProcessingFee < 0 || settingsData.paymentProcessingFee > 10) {
        errors.push('Payment processing fee must be between 0 and 10');
      }
    }

    if (settingsData.minimumOrderAmount !== undefined) {
      if (settingsData.minimumOrderAmount < 0) {
        errors.push('Minimum order amount cannot be negative');
      }
    }

    if (settingsData.payoutSettings?.minimumPayoutAmount !== undefined) {
      if (settingsData.payoutSettings.minimumPayoutAmount < 0) {
        errors.push('Minimum payout amount cannot be negative');
      }
    }

    return errors;
  }
}

module.exports = PlatformSettingsService;

