const mongoose = require('mongoose');
const WalletService = require('./walletService');
const StripeService = require('./stripeService');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const Artisan = require('../models/artisan');
const User = require('../models/user');

class PayoutService {
  /**
   * Process automatic payouts for artisans
   * @param {string} artisanId - Artisan profile ID
   * @returns {Promise<Object>} Payout result
   */
  static async processAutomaticPayout(artisanId) {
    try {
      console.log(`💰 Processing automatic payout for artisan ${artisanId}`);
      
      // Get wallet information
      const walletInfo = await WalletService.getWalletInfo(artisanId);
      const wallet = await Wallet.findOne({ artisanId: walletInfo.wallet.artisanId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if wallet has sufficient balance for payout
      const minimumPayout = wallet.payoutSettings?.minimumPayout || 50;
      if (wallet.balance < minimumPayout) {
        return {
          success: false,
          message: `Insufficient balance for payout. Minimum: ${minimumPayout} CAD, Current: ${wallet.balance} CAD`,
          balance: wallet.balance,
          minimumPayout
        };
      }

      // Check if Stripe account is set up
      if (!wallet.stripeAccountId) {
        return {
          success: false,
          message: 'Stripe account not set up for payouts',
          requiresStripeSetup: true
        };
      }

      // Check if Stripe account is ready for payouts
      const isReady = await StripeService.isAccountReadyForPayouts(wallet.stripeAccountId);
      if (!isReady) {
        return {
          success: false,
          message: 'Stripe account is not ready for payouts',
          requiresStripeVerification: true
        };
      }

      // Create payout via Stripe
      const payoutAmount = wallet.balance;
      const stripePayout = await StripeService.createPayout(
        wallet.stripeAccountId,
        payoutAmount,
        'cad',
        `Payout for ${walletInfo.wallet.id}`
      );

      // Deduct funds from wallet
      const result = await WalletService.deductFunds(
        artisanId,
        payoutAmount,
        'payout',
        `Automatic payout via Stripe - ${stripePayout.id}`,
        {
          stripePayoutId: stripePayout.id,
          stripeTransferId: stripePayout.id,
          payoutMethod: 'stripe'
        }
      );

      // Update wallet metadata
      wallet.metadata.totalPayouts += payoutAmount;
      wallet.payoutSettings.lastPayoutDate = new Date();
      await wallet.save();

      console.log(`✅ Successfully processed payout of ${payoutAmount} CAD for artisan ${artisanId}`);

      return {
        success: true,
        message: 'Payout processed successfully',
        payoutAmount,
        stripePayoutId: stripePayout.id,
        transactionId: result.transactionId,
        newBalance: result.balanceAfter
      };
    } catch (error) {
      console.error('Error processing automatic payout:', error);
      throw error;
    }
  }

  /**
   * Process manual payout request
   * @param {string} artisanId - Artisan profile ID
   * @param {number} amount - Amount to payout
   * @returns {Promise<Object>} Payout result
   */
  static async processManualPayout(artisanId, amount) {
    try {
      console.log(`💰 Processing manual payout of ${amount} CAD for artisan ${artisanId}`);
      
      // Get wallet information
      const walletInfo = await WalletService.getWalletInfo(artisanId);
      const wallet = await Wallet.findOne({ artisanId: walletInfo.wallet.artisanId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if wallet has sufficient balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Check if Stripe account is set up
      if (!wallet.stripeAccountId) {
        throw new Error('Stripe account not set up for payouts');
      }

      // Check if Stripe account is ready for payouts
      const isReady = await StripeService.isAccountReadyForPayouts(wallet.stripeAccountId);
      if (!isReady) {
        throw new Error('Stripe account is not ready for payouts');
      }

      // Create payout via Stripe
      const stripePayout = await StripeService.createPayout(
        wallet.stripeAccountId,
        amount,
        'cad',
        `Manual payout for ${walletInfo.wallet.id}`
      );

      // Deduct funds from wallet
      const result = await WalletService.deductFunds(
        artisanId,
        amount,
        'payout',
        `Manual payout via Stripe - ${stripePayout.id}`,
        {
          stripePayoutId: stripePayout.id,
          stripeTransferId: stripePayout.id,
          payoutMethod: 'stripe'
        }
      );

      // Update wallet metadata
      wallet.metadata.totalPayouts += amount;
      wallet.payoutSettings.lastPayoutDate = new Date();
      await wallet.save();

      console.log(`✅ Successfully processed manual payout of ${amount} CAD for artisan ${artisanId}`);

      return {
        success: true,
        message: 'Manual payout processed successfully',
        payoutAmount: amount,
        stripePayoutId: stripePayout.id,
        transactionId: result.transactionId,
        newBalance: result.balanceAfter
      };
    } catch (error) {
      console.error('Error processing manual payout:', error);
      throw error;
    }
  }

  /**
   * Set up Stripe Connect account for artisan
   * @param {string} artisanId - Artisan profile ID
   * @returns {Promise<Object>} Setup result
   */
  static async setupStripeAccount(artisanId) {
    try {
      console.log(`🔧 Setting up Stripe Connect account for artisan ${artisanId}`);
      
      // Get artisan information
      const artisan = await Artisan.findById(artisanId).populate('user');
      if (!artisan) {
        throw new Error('Artisan not found');
      }

      // Get or create wallet
      const wallet = await WalletService.getOrCreateWallet(artisanId);
      
      // Check if Stripe account already exists
      if (wallet.stripeAccountId) {
        return {
          success: true,
          message: 'Stripe account already exists',
          accountId: wallet.stripeAccountId,
          requiresOnboarding: false
        };
      }

      // Create Stripe Connect account
      const stripeAccount = await StripeService.createConnectAccount({
        artisanName: artisan.artisanName,
        firstName: artisan.user.firstName,
        lastName: artisan.user.lastName,
        email: artisan.user.email
      });

      // Update wallet with Stripe account ID
      wallet.stripeAccountId = stripeAccount.id;
      await wallet.save();

      // Create account link for onboarding
      const accountLink = await StripeService.createAccountLink(
        stripeAccount.id,
        `${process.env.FRONTEND_URL}/wallet/stripe/refresh`,
        `${process.env.FRONTEND_URL}/wallet/stripe/return`
      );

      console.log(`✅ Stripe Connect account created for artisan ${artisanId}: ${stripeAccount.id}`);

      return {
        success: true,
        message: 'Stripe account created successfully',
        accountId: stripeAccount.id,
        onboardingUrl: accountLink.url,
        requiresOnboarding: true
      };
    } catch (error) {
      console.error('Error setting up Stripe account:', error);
      throw error;
    }
  }

  /**
   * Get payout status and requirements
   * @param {string} artisanId - Artisan profile ID
   * @returns {Promise<Object>} Payout status
   */
  static async getPayoutStatus(artisanId) {
    try {
      const walletInfo = await WalletService.getWalletInfo(artisanId);
      const wallet = await Wallet.findOne({ artisanId: walletInfo.wallet.artisanId });
      
      if (!wallet) {
        // Create wallet if it doesn't exist
        const wallet = await WalletService.getOrCreateWallet(artisanId);
        return {
          hasStripeAccount: !!wallet.stripeAccountId,
          isReadyForPayouts: false,
          balance: wallet.balance,
          minimumPayout: wallet.payoutSettings?.minimumPayout || 50,
          canPayout: false,
          requirements: wallet.stripeAccountId ? ['Stripe account not verified'] : ['Stripe account not set up']
        };
      }

      const status = {
        hasStripeAccount: !!wallet.stripeAccountId,
        isReadyForPayouts: false,
        balance: wallet.balance,
        minimumPayout: wallet.payoutSettings?.minimumPayout || 50,
        canPayout: false,
        requirements: []
      };

      if (wallet.stripeAccountId) {
        try {
          const account = await StripeService.getAccount(wallet.stripeAccountId);
          status.isReadyForPayouts = account.payouts_enabled;
          status.canPayout = status.isReadyForPayouts && wallet.balance >= status.minimumPayout;
          
          if (account.requirements) {
            status.requirements = [
              ...account.requirements.currently_due,
              ...account.requirements.past_due
            ];
          }
        } catch (error) {
          console.error('Error checking Stripe account status:', error);
          status.requirements = ['Unable to verify Stripe account status'];
        }
      } else {
        status.requirements = ['Stripe account not set up'];
      }

      return status;
    } catch (error) {
      console.error('Error getting payout status:', error);
      throw error;
    }
  }

  /**
   * Get payout history for artisan
   * @param {string} artisanId - Artisan profile ID
   * @param {number} limit - Number of payouts to retrieve
   * @returns {Promise<Array>} Payout history
   */
  static async getPayoutHistory(artisanId, limit = 10) {
    try {
      const walletInfo = await WalletService.getWalletInfo(artisanId);
      const wallet = await Wallet.findOne({ artisanId: walletInfo.wallet.artisanId });
      
      if (!wallet || !wallet.stripeAccountId) {
        return [];
      }

      // Get Stripe payout history
      const stripePayouts = await StripeService.getPayoutHistory(wallet.stripeAccountId, limit);
      
      // Get wallet transaction history for payouts
      const walletPayouts = await WalletTransaction.find({
        walletId: wallet._id,
        type: 'payout'
      }).sort({ createdAt: -1 }).limit(limit);

      // Combine and format payout history
      const payoutHistory = walletPayouts.map(transaction => ({
        id: transaction._id,
        amount: Math.abs(transaction.amount),
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
        stripePayoutId: transaction.metadata?.stripePayoutId,
        balanceAfter: transaction.balanceAfter
      }));

      return payoutHistory;
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }
}

module.exports = PayoutService;
