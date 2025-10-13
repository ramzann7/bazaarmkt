/**
 * Platform Settings Service
 * Manages platform-wide configuration settings including fees, limits, and policies
 */

const { COLLECTIONS } = require('../config/constants');

class PlatformSettingsService {
  constructor(db) {
    this.db = db;
    this.settingsCollection = db.collection('platformsettings');
  }

  /**
   * Get platform settings with defaults
   * @returns {Object} Platform settings
   */
  async getPlatformSettings() {
    try {
      let settings = await this.settingsCollection.findOne({});
      
      if (!settings) {
        // Create default settings if none exist
        settings = await this.createDefaultSettings();
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting platform settings:', error);
      // Return default settings if database error
      return this.getDefaultSettings();
    }
  }

  /**
   * Update platform settings
   * @param {Object} updates - Settings to update
   * @returns {Object} Updated settings
   */
  async updatePlatformSettings(updates) {
    try {
      // Remove _id and other MongoDB internal fields from updates
      const { _id, __v, createdAt, ...cleanUpdates } = updates;
      
      // Encrypt platform bank info if provided
      if (cleanUpdates.platformBankInfo && cleanUpdates.platformBankInfo.accountNumber) {
        const { encryptBankInfo } = require('../utils/encryption');
        cleanUpdates.platformBankInfo = encryptBankInfo(cleanUpdates.platformBankInfo);
        cleanUpdates.platformBankInfo.lastUpdated = new Date();
      }
      
      const result = await this.settingsCollection.updateOne(
        {},
        { 
          $set: { 
            ...cleanUpdates,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      // If payout settings were updated, sync all wallets
      if (cleanUpdates.payoutSettings) {
        console.log('🔄 Payout settings updated, syncing all wallets...');
        await this.syncWalletPayoutSettings(cleanUpdates.payoutSettings);
      }

      return await this.getPlatformSettings();
    } catch (error) {
      console.error('Error updating platform settings:', error);
      throw error;
    }
  }
  
  /**
   * Sync wallet payout settings with platform settings
   * Updates all wallets to use the latest platform payout configuration
   * @param {Object} payoutSettings - New payout settings from platform
   */
  async syncWalletPayoutSettings(payoutSettings) {
    try {
      const walletsCollection = this.db.collection('wallets');
      
      // Update all wallets that don't have custom payout settings
      const updateData = {
        'payoutSettings.schedule': payoutSettings.payoutFrequency || 'weekly',
        'payoutSettings.minimumPayout': payoutSettings.minimumPayoutAmount || 25,
        'payoutSettings.payoutDelay': payoutSettings.payoutDelay || 7,
        updatedAt: new Date()
      };
      
      const result = await walletsCollection.updateMany(
        {
          isActive: true,
          // Only update wallets that haven't customized their settings
          'payoutSettings.customized': { $ne: true }
        },
        { $set: updateData }
      );
      
      console.log(`✅ Synced ${result.modifiedCount} wallets with new payout settings:`, {
        schedule: payoutSettings.payoutFrequency,
        minimumPayout: payoutSettings.minimumPayoutAmount,
        delay: payoutSettings.payoutDelay
      });
      
      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error syncing wallet payout settings:', error);
      throw error;
    }
  }

  /**
   * Get platform fee rate
   * @param {string} feeType - Type of fee (e.g., 'order', 'transaction')
   * @returns {number} Fee rate as decimal (e.g., 0.10 for 10%)
   */
  async getPlatformFeeRate(feeType = 'order') {
    try {
      const settings = await this.getPlatformSettings();
      // Use existing platformFeePercentage field (convert from percentage to decimal)
      return (settings.platformFeePercentage || 10) / 100; // Default 10%
    } catch (error) {
      console.error('Error getting platform fee rate:', error);
      return 0.10; // Default 10%
    }
  }

  /**
   * Calculate platform fee amount
   * @param {number} amount - Base amount
   * @param {string} feeType - Type of fee
   * @returns {Object} Fee calculation result
   */
  async calculatePlatformFee(amount, feeType = 'order') {
    try {
      const settings = await this.getPlatformSettings();
      
      // Use existing platformFeePercentage field from the collection
      const feeRate = (settings.platformFeePercentage || 10) / 100; // Convert percentage to decimal
      const platformFee = amount * feeRate;
      
      // Calculate Stripe payment processing fee: 2.9% + $0.30 per transaction
      const stripeFeeRate = (settings.paymentProcessingFee || 2.9) / 100;
      const stripeFeeFixed = settings.paymentProcessingFeeFixed || 0.30;
      const stripeFee = (amount * stripeFeeRate) + stripeFeeFixed;
      
      // Calculate artisan amount (total - platform fee - stripe fee)
      const artisanAmount = amount - platformFee - stripeFee;

      return {
        totalAmount: amount,
        platformFee: Math.round(platformFee * 100) / 100, // Round to 2 decimal places
        stripeFee: Math.round(stripeFee * 100) / 100,
        artisanAmount: Math.round(artisanAmount * 100) / 100,
        feeRate: feeRate,
        feeType: 'percentage',
        feeCategory: feeType
      };
    } catch (error) {
      console.error('Error calculating platform fee:', error);
      // Fallback to simple calculation
      const platformFee = amount * 0.10;
      const stripeFee = (amount * 0.029) + 0.30;
      return {
        totalAmount: amount,
        platformFee: Math.round(platformFee * 100) / 100,
        stripeFee: Math.round(stripeFee * 100) / 100,
        artisanAmount: Math.round((amount - platformFee - stripeFee) * 100) / 100,
        feeRate: 0.10,
        feeType: 'percentage',
        feeCategory: feeType
      };
    }
  }

  /**
   * Calculate tiered fee based on amount ranges
   * @param {number} amount - Base amount
   * @param {Array} tiers - Tier configuration
   * @returns {number} Calculated fee
   */
  calculateTieredFee(amount, tiers) {
    let totalFee = 0;
    let remainingAmount = amount;

    // Sort tiers by min amount
    const sortedTiers = tiers.sort((a, b) => a.min - b.min);

    for (const tier of sortedTiers) {
      if (remainingAmount <= 0) break;

      const tierAmount = Math.min(remainingAmount, tier.max - tier.min);
      if (tierAmount > 0) {
        totalFee += tierAmount * tier.rate;
        remainingAmount -= tierAmount;
      }
    }

    return totalFee;
  }

  /**
   * Create default platform settings
   * @returns {Object} Default settings
   */
  async createDefaultSettings() {
    const defaultSettings = this.getDefaultSettings();
    
    await this.settingsCollection.insertOne({
      ...defaultSettings,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return defaultSettings;
  }

  /**
   * Get default platform settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      platformFeePercentage: 10, // 10% platform fee
      currency: 'CAD',
      paymentProcessingFee: 2.9, // Stripe percentage fee
      paymentProcessingFeeFixed: 0.30, // Stripe fixed fee per transaction (CAD)
      minimumOrderAmount: 5,
      autoCaptureHours: 48, // Auto-capture after 48 hours
      payoutSettings: {
        minimumPayoutAmount: 25,
        payoutFrequency: 'weekly',
        payoutDelay: 7
      },
      platformInfo: {
        name: 'bazaarMKT',
        supportEmail: 'support@thebazaar.com',
        description: 'Connecting local artisans with customers',
        currency: 'CAD',
        timezone: 'America/Toronto'
      },
      features: {
        promotionalFeatures: true,
        spotlights: true,
        wallet: true,
        reviews: true,
        guestCheckout: true,
        communityPosts: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get payment settings
   * @returns {Object} Payment-specific settings
   */
  async getPaymentSettings() {
    try {
      const settings = await this.getPlatformSettings();
      return {
        platformFeeRate: (settings.platformFeePercentage || 10) / 100,
        autoCaptureHours: settings.autoCaptureHours || 48,
        currency: settings.currency || 'CAD',
        minOrderAmount: settings.minimumOrderAmount || 5,
        maxOrderAmount: 10000
      };
    } catch (error) {
      console.error('Error getting payment settings:', error);
      return {
        platformFeeRate: 0.10,
        autoCaptureHours: 48,
        currency: 'CAD',
        minOrderAmount: 5,
        maxOrderAmount: 10000
      };
    }
  }

  /**
   * Validate settings update
   * @param {Object} updates - Settings to validate
   * @returns {Object} Validation result
   */
  validateSettings(updates) {
    const errors = [];

    // Validate fee rates
    if (updates.fees) {
      for (const [feeType, feeConfig] of Object.entries(updates.fees)) {
        if (feeConfig.rate && (feeConfig.rate < 0 || feeConfig.rate > 1)) {
          errors.push(`${feeType} fee rate must be between 0 and 1`);
        }
        if (feeConfig.min && feeConfig.min < 0) {
          errors.push(`${feeType} minimum fee must be positive`);
        }
        if (feeConfig.max && feeConfig.min && feeConfig.max < feeConfig.min) {
          errors.push(`${feeType} maximum fee must be greater than minimum`);
        }
      }
    }

    // Validate payment settings
    if (updates.payment) {
      if (updates.payment.autoCaptureHours && (updates.payment.autoCaptureHours < 1 || updates.payment.autoCaptureHours > 168)) {
        errors.push('Auto-capture hours must be between 1 and 168 (1 week)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = PlatformSettingsService;
