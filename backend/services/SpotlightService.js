/**
 * Spotlight Service
 * Handles spotlight subscription management for artisans
 */

const BaseService = require('./BaseService');

class SpotlightService extends BaseService {
  constructor(db) {
    super(db);
    this.artisansCollection = 'artisans';
    this.usersCollection = 'users';
    this.transactionsCollection = 'wallettransactions';
  }

  /**
   * Get spotlight status for artisan
   */
  async getSpotlightStatus(userId) {
    // Get artisan profile
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      return {
        hasActiveSpotlight: false,
        spotlight: null
      };
    }
    
    const now = new Date();
    const hasActiveSpotlight = artisan.spotlightEndDate && new Date(artisan.spotlightEndDate) > now;
    
    let spotlight = null;
    if (hasActiveSpotlight) {
      const endDate = new Date(artisan.spotlightEndDate);
      const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      spotlight = {
        startDate: artisan.spotlightStartDate,
        endDate: artisan.spotlightEndDate,
        remainingDays
      };
    }
    
    return {
      hasActiveSpotlight,
      spotlight
    };
  }

  /**
   * Purchase spotlight subscription
   */
  async purchaseSpotlight(userId, days, paymentMethod = 'wallet') {
    if (!days || days < 1 || days > 30) {
      throw new Error('Days must be between 1 and 30');
    }
    
    // Check if user already has an active spotlight
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (artisan && artisan.spotlightEndDate && new Date(artisan.spotlightEndDate) > new Date()) {
      throw new Error('You already have an active spotlight subscription');
    }
    
    // Calculate cost (simplified pricing)
    const costPerDay = 10; // $10 per day
    const totalCost = days * costPerDay;
    
    // Use WalletService for wallet operations
    const WalletService = require('./WalletService');
    const walletService = new WalletService(this.db);
    
    // Deduct funds from wallet (this will check balance automatically)
    const walletResult = await walletService.deductFunds(
      userId, 
      totalCost, 
      `Spotlight subscription for ${days} days`
    );
    
    // Set spotlight dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);
    
    // Update artisan with spotlight info
    await this.getCollection(this.artisansCollection).updateOne(
      { user: this.createObjectId(userId) },
      {
        $set: {
          isSpotlight: true,
          spotlightStartDate: startDate,
          spotlightEndDate: endDate,
          status: 'active'
        }
      }
    );
    
    return {
      days,
      totalCost,
      startDate,
      endDate,
      remainingBalance: walletResult.newBalance,
      transactionId: walletResult.transactionId
    };
  }

  /**
   * Get active public spotlights
   */
  async getActivePublicSpotlights() {
    // Get active spotlights from artisans collection
    const spotlights = await this.aggregate(this.artisansCollection, [
      {
        $match: {
          isSpotlight: true,
          status: 'active'
        }
      },
      {
        $lookup: {
          from: this.usersCollection,
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profilePicture: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$userData' },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'artisan',
          as: 'featuredProducts',
          pipeline: [
            { $match: { status: 'active' } },
            { $limit: 3 },
            { $project: { name: 1, price: 1, primaryImage: 1, category: 1 } }
          ]
        }
      },
      {
        $project: {
          artisanName: 1,
          businessName: 1,
          type: 1,
          description: 1,
          profileImage: 1,
          location: 1,
          user: '$userData',
          featuredProducts: 1,
          spotlightStartDate: 1,
          spotlightEndDate: 1,
          isSpotlight: 1
        }
      },
      { $sort: { spotlightStartDate: -1 } }
    ]);
    
    return { spotlights, count: spotlights.length };
  }

  /**
   * Cancel spotlight subscription
   */
  async cancelSpotlight(userId) {
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan || !artisan.isSpotlight) {
      throw new Error('No active spotlight subscription found');
    }
    
    // Calculate refund (pro-rated)
    const now = new Date();
    const endDate = new Date(artisan.spotlightEndDate);
    const remainingDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) {
      throw new Error('Spotlight subscription has already expired');
    }
    
    const costPerDay = 10;
    const refundAmount = remainingDays * costPerDay;
    
    // Use WalletService for wallet operations
    const WalletService = require('./WalletService');
    const walletService = new WalletService(this.db);
    
    // Add funds to wallet as refund
    const walletResult = await walletService.addFunds(
      userId,
      refundAmount,
      'refund',
      {
        description: `Spotlight subscription refund for ${remainingDays} remaining days`,
        remainingDays,
        costPerDay,
        originalEndDate: endDate
      }
    );
    
    // Remove spotlight status
    await this.getCollection(this.artisansCollection).updateOne(
      { user: this.createObjectId(userId) },
      {
        $unset: {
          isSpotlight: 1,
          spotlightStartDate: 1,
          spotlightEndDate: 1
        }
      }
    );
    
    return {
      refundAmount,
      remainingDays,
      message: 'Spotlight subscription cancelled and refunded',
      transactionId: walletResult.transactionId
    };
  }

  /**
   * Get spotlight pricing
   */
  getSpotlightPricing() {
    return {
      costPerDay: 10,
      minDays: 1,
      maxDays: 30,
      discounts: {
        weekly: { days: 7, discount: 0.1 }, // 10% off
        monthly: { days: 30, discount: 0.2 } // 20% off
      }
    };
  }

  /**
   * Calculate spotlight cost
   */
  calculateSpotlightCost(days) {
    const pricing = this.getSpotlightPricing();
    let cost = days * pricing.costPerDay;
    
    // Apply discounts
    if (days >= pricing.discounts.monthly.days) {
      cost *= (1 - pricing.discounts.monthly.discount);
    } else if (days >= pricing.discounts.weekly.days) {
      cost *= (1 - pricing.discounts.weekly.discount);
    }
    
    return {
      days,
      costPerDay: pricing.costPerDay,
      totalCost: Math.round(cost * 100) / 100,
      discount: days >= pricing.discounts.weekly.days ? 
        (days >= pricing.discounts.monthly.days ? 
          pricing.discounts.monthly.discount : 
          pricing.discounts.weekly.discount) : 0
    };
  }

  /**
   * Get spotlight analytics
   */
  async getSpotlightAnalytics() {
    const [totalSpotlights, activeSpotlights, expiredSpotlights] = await Promise.all([
      this.count(this.artisansCollection, { isSpotlight: true }),
      this.count(this.artisansCollection, { 
        isSpotlight: true, 
        spotlightEndDate: { $gt: new Date() } 
      }),
      this.count(this.artisansCollection, { 
        isSpotlight: true, 
        spotlightEndDate: { $lte: new Date() } 
      })
    ]);
    
    // Get revenue from spotlight transactions
    const revenue = await this.aggregate(this.transactionsCollection, [
      { $match: { type: 'spotlight_purchase' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
    ]);
    
    return {
      totalSpotlights,
      activeSpotlights,
      expiredSpotlights,
      totalRevenue: revenue[0]?.total || 0
    };
  }

  /**
   * Check if artisan is eligible for spotlight
   */
  async checkEligibility(userId) {
    const artisan = await this.findOne(this.artisansCollection, { 
      user: this.createObjectId(userId) 
    });
    
    if (!artisan) {
      return {
        eligible: false,
        reason: 'Artisan profile not found'
      };
    }
    
    if (artisan.status !== 'active') {
      return {
        eligible: false,
        reason: 'Artisan profile is not active'
      };
    }
    
    // Check if already has active spotlight
    if (artisan.isSpotlight && artisan.spotlightEndDate && new Date(artisan.spotlightEndDate) > new Date()) {
      return {
        eligible: false,
        reason: 'Already has active spotlight subscription'
      };
    }
    
    return {
      eligible: true,
      reason: 'Eligible for spotlight subscription'
    };
  }
}

module.exports = SpotlightService;
