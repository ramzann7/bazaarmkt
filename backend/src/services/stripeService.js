const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  /**
   * Create a Stripe Connect account for an artisan
   * @param {Object} artisanData - Artisan information
   * @returns {Promise<Object>} Stripe account information
   */
  static async createConnectAccount(artisanData) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA', // Canada
        email: artisanData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: artisanData.firstName,
          last_name: artisanData.lastName,
          email: artisanData.email,
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'friday',
            },
          },
        },
      });

      console.log(`✅ Created Stripe Connect account for artisan ${artisanData.artisanName}: ${account.id}`);
      return account;
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Create an account link for onboarding
   * @param {string} accountId - Stripe account ID
   * @param {string} refreshUrl - URL to redirect to after refresh
   * @param {string} returnUrl - URL to redirect to after completion
   * @returns {Promise<Object>} Account link information
   */
  static async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  /**
   * Get account information
   * @param {string} accountId - Stripe account ID
   * @returns {Promise<Object>} Account information
   */
  static async getAccount(accountId) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      return account;
    } catch (error) {
      console.error('Error retrieving account:', error);
      throw error;
    }
  }

  /**
   * Check if account is ready for payouts
   * @param {string} accountId - Stripe account ID
   * @returns {Promise<boolean>} True if ready for payouts
   */
  static async isAccountReadyForPayouts(accountId) {
    try {
      const account = await this.getAccount(accountId);
      
      // Check if account is enabled for payouts
      const isEnabled = account.payouts_enabled;
      const hasRequirements = !account.requirements || 
        (account.requirements.currently_due.length === 0 && 
         account.requirements.past_due.length === 0);
      
      return isEnabled && hasRequirements;
    } catch (error) {
      console.error('Error checking account payout readiness:', error);
      return false;
    }
  }

  /**
   * Create a payout to an artisan
   * @param {string} accountId - Stripe account ID
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (default: 'cad')
   * @param {string} description - Payout description
   * @returns {Promise<Object>} Payout information
   */
  static async createPayout(accountId, amount, currency = 'cad', description = 'Artisan earnings payout') {
    try {
      // Check if account is ready for payouts
      const isReady = await this.isAccountReadyForPayouts(accountId);
      if (!isReady) {
        throw new Error('Account is not ready for payouts');
      }

      const payout = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        destination: accountId,
        description: description,
      });

      console.log(`✅ Created payout of ${amount} ${currency.toUpperCase()} to account ${accountId}`);
      return payout;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  /**
   * Get payout history for an account
   * @param {string} accountId - Stripe account ID
   * @param {number} limit - Number of payouts to retrieve
   * @returns {Promise<Array>} Payout history
   */
  static async getPayoutHistory(accountId, limit = 10) {
    try {
      const payouts = await stripe.payouts.list({
        limit: limit,
      });

      return payouts.data;
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent for platform fees
   * @param {number} amount - Amount in dollars
   * @param {string} currency - Currency code
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Payment intent
   */
  static async createPaymentIntent(amount, currency = 'cad', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        metadata: metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a customer for wallet top-ups
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Customer information
   */
  static async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: `${customerData.firstName} ${customerData.lastName}`,
        metadata: {
          artisanId: customerData.artisanId,
          userId: customerData.userId,
        },
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Create a setup intent for saving payment methods
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Setup intent
   */
  static async createSetupIntent(customerId) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for a customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Array>} Payment methods
   */
  static async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Create a charge for wallet top-up
   * @param {number} amount - Amount in dollars
   * @param {string} customerId - Stripe customer ID
   * @param {string} paymentMethodId - Payment method ID
   * @param {string} description - Charge description
   * @returns {Promise<Object>} Charge information
   */
  static async createCharge(amount, customerId, paymentMethodId, description = 'Wallet top-up') {
    try {
      const charge = await stripe.charges.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'cad',
        customer: customerId,
        payment_method: paymentMethodId,
        description: description,
        confirm: true,
      });

      return charge;
    } catch (error) {
      console.error('Error creating charge:', error);
      throw error;
    }
  }
}

module.exports = StripeService;
