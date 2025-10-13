/**
 * Stripe Connect Handlers
 * Handles artisan onboarding to Stripe Connect using existing bank information
 */

const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

/**
 * Setup Stripe Connect for artisan using existing bank info
 * POST /api/profile/stripe-connect/setup
 */
const setupStripeConnect = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db || req.app.locals.db; // Use shared connection from middleware
    
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const artisan = await artisansCollection.findOne({ user: user._id });
    if (!artisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan profile not found. Please create your artisan profile first.'
      });
    }
    
    // Check if bank info exists
    if (!artisan.bankInfo || !artisan.bankInfo.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Bank information is required. Please add your bank details in Profile > Setup > Bank Information first.'
      });
    }
    
    // Check if already set up
    if (artisan.stripeConnectAccountId) {
      // Verify account status
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const account = await stripe.accounts.retrieve(artisan.stripeConnectAccountId);
      
      return res.json({
        success: true,
        message: 'Stripe Connect already set up',
        data: {
          accountId: artisan.stripeConnectAccountId,
          payoutsEnabled: account.payouts_enabled,
          chargesEnabled: account.charges_enabled,
          status: artisan.stripeConnectStatus || 'active'
        }
      });
    }
    
    // Decrypt bank info
    const { decryptBankInfo } = require('../../utils/encryption');
    const decryptedBankInfo = decryptBankInfo(artisan.bankInfo);
    
    const StripeService = require('../../services/stripeService');
    const stripeService = new StripeService();
    
    // Prepare artisan data for Stripe
    const artisanData = {
      email: user.email,
      firstName: user.firstName || artisan.artisanName?.split(' ')[0] || 'Artisan',
      lastName: user.lastName || artisan.artisanName?.split(' ')[1] || 'User',
      phone: user.phone || artisan.contactInfo?.phone || '',
      businessName: artisan.businessName || artisan.artisanName,
      description: artisan.description || 'Artisan products marketplace',
      address: artisan.address
    };
    
    console.log('🔄 Creating Stripe Connect account for artisan:', artisan._id);
    
    // Create Stripe Connect account
    const connectAccount = await stripeService.createConnectAccount(artisanData, decryptedBankInfo);
    
    // Add bank account to Connect account
    console.log('🏦 Adding bank account to Stripe Connect:', connectAccount.id);
    const externalAccount = await stripeService.addBankAccount(connectAccount.id, decryptedBankInfo);
    
    // Update artisan with Stripe Connect IDs
    await artisansCollection.updateOne(
      { _id: artisan._id },
      { 
        $set: { 
          stripeConnectAccountId: connectAccount.id,
          stripeExternalAccountId: externalAccount.id,
          stripeConnectStatus: 'active',
          stripeConnectSetupAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    // Get platform settings for payout configuration
    const PlatformSettingsService = require('../../services/platformSettingsService');
    const platformSettingsService = new PlatformSettingsService(db);
    const platformSettings = await platformSettingsService.getPlatformSettings();
    
    // Calculate next payout date based on platform schedule
    const getNextPayoutDate = (schedule) => {
      const now = new Date();
      if (schedule === 'weekly') {
        // Next Friday
        const dayOfWeek = now.getDay();
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        nextFriday.setHours(13, 0, 0, 0); // 1 PM payout time
        return nextFriday;
      } else if (schedule === 'monthly') {
        // First day of next month
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 13, 0, 0, 0);
        return nextMonth;
      }
      return null;
    };
    
    // Update or create wallet with Stripe account information
    const walletsCollection = db.collection('wallets');
    const existingWallet = await walletsCollection.findOne({ userId: user._id });
    
    const payoutSchedule = platformSettings.payoutSettings?.payoutFrequency || 'weekly';
    const nextPayoutDate = getNextPayoutDate(payoutSchedule);
    
    if (existingWallet) {
      // Update existing wallet
      await walletsCollection.updateOne(
        { userId: user._id },
        {
          $set: {
            stripeAccountId: connectAccount.id,
            stripeCustomerId: externalAccount.customer || null,
            'payoutSettings.enabled': true, // Enable payouts when bank is connected
            'payoutSettings.method': 'bank_transfer',
            'payoutSettings.bankAccount': {
              bankName: decryptedBankInfo.bankName,
              last4: decryptedBankInfo.accountNumber?.slice(-4),
              accountId: externalAccount.id
            },
            'payoutSettings.schedule': payoutSchedule,
            'payoutSettings.minimumPayout': platformSettings.payoutSettings?.minimumPayoutAmount || 25,
            'payoutSettings.payoutDelay': platformSettings.payoutSettings?.payoutDelay || 7,
            'payoutSettings.nextPayoutDate': nextPayoutDate,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Updated existing wallet with Stripe Connect and platform payout settings');
    } else {
      // Create new wallet with Stripe info and platform settings
      await walletsCollection.insertOne({
        userId: user._id,
        balance: 0,
        currency: platformSettings.currency || 'CAD',
        stripeAccountId: connectAccount.id,
        stripeCustomerId: externalAccount.customer || null,
        payoutSettings: {
          enabled: true, // Enable payouts when bank is connected
          method: 'bank_transfer',
          bankAccount: {
            bankName: decryptedBankInfo.bankName,
            last4: decryptedBankInfo.accountNumber?.slice(-4),
            accountId: externalAccount.id
          },
          schedule: payoutSchedule,
          minimumPayout: platformSettings.payoutSettings?.minimumPayoutAmount || 25,
          payoutDelay: platformSettings.payoutSettings?.payoutDelay || 7,
          lastPayoutDate: null,
          nextPayoutDate: nextPayoutDate
        },
        metadata: {
          totalEarnings: 0,
          totalSpent: 0,
          totalPayouts: 0,
          platformFees: 0
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created new wallet with Stripe Connect and platform payout settings');
    }
    
    console.log('✅ Stripe Connect setup complete for artisan:', artisan._id);
    
    res.json({
      success: true,
      message: 'Stripe Connect account created successfully! You can now receive payouts to your bank account.',
      data: {
        accountId: connectAccount.id,
        externalAccountId: externalAccount.id,
        bankName: decryptedBankInfo.bankName,
        last4: decryptedBankInfo.accountNumber?.slice(-4),
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('❌ Error setting up Stripe Connect:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      type: error.type
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to setup Stripe Connect: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get Stripe Connect status for artisan
 * GET /api/profile/stripe-connect/status
 */
const getStripeConnectStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = req.db || req.app.locals.db; // Use shared connection from middleware
    
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const usersCollection = db.collection('users');
    const artisansCollection = db.collection('artisans');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    const artisan = await artisansCollection.findOne({ user: user._id });
    
    if (!artisan) {
      return res.status(404).json({ success: false, message: 'Artisan profile not found' });
    }
    
    if (!artisan.stripeConnectAccountId) {
      return res.json({
        success: true,
        data: {
          isSetup: false,
          hasBankInfo: !!(artisan.bankInfo && artisan.bankInfo.accountNumber),
          status: 'not_setup',
          message: artisan.bankInfo ? 
            'Bank info available. Ready to setup Stripe Connect.' :
            'Please add bank information first.'
        }
      });
    }
    
    // Get live status from Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.accounts.retrieve(artisan.stripeConnectAccountId);
    
    res.json({
      success: true,
      data: {
        isSetup: true,
        accountId: artisan.stripeConnectAccountId,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        status: artisan.stripeConnectStatus || 'active',
        setupAt: artisan.stripeConnectSetupAt,
        requirements: account.requirements,
        detailsSubmitted: account.details_submitted
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting Stripe Connect status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get Stripe Connect status: ' + error.message 
    });
  }
};

module.exports = {
  setupStripeConnect,
  getStripeConnectStatus
};


