const mongoose = require('mongoose');
require('dotenv').config();

async function updateTestBuyer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    // Find the test buyer
    const testBuyer = await User.findOne({ email: 'testbuyer@example.com' });
    
    if (!testBuyer) {
      console.log('❌ Test buyer not found');
      return;
    }

    console.log('✅ Test buyer found, updating with addresses and payment methods...');

    // Update with addresses and payment methods
    testBuyer.addresses = [
      {
        type: 'home',
        label: 'Home',
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Canada',
        isDefault: true
      },
      {
        type: 'work',
        label: 'Work',
        street: '456 Business Ave',
        city: 'Business City',
        state: 'Business State',
        zipCode: '67890',
        country: 'Canada',
        isDefault: false
      }
    ];

    testBuyer.paymentMethods = [
      {
        type: 'credit_card',
        last4: '1234',
        expiryMonth: 12,
        expiryYear: 25,
        isDefault: true,
        cardholderName: 'Test Buyer'
      },
      {
        type: 'debit_card',
        last4: '5678',
        expiryMonth: 6,
        expiryYear: 26,
        isDefault: false,
        cardholderName: 'Test Buyer'
      }
    ];

    testBuyer.notificationPreferences = {
      email: {
        marketing: true,
        orderUpdates: true,
        promotions: true,
        security: true
      },
      push: {
        orderUpdates: true,
        promotions: true,
        newProducers: true,
        nearbyOffers: true
      },
      sms: { orderUpdates: false, promotions: false }
    };

    testBuyer.accountSettings = {
      language: 'en',
      currency: 'CAD',
      timezone: 'America/Toronto',
      twoFactorEnabled: false
    };

    await testBuyer.save();
    
    console.log('✅ Test buyer updated successfully');
    console.log('Email: testbuyer@example.com');
    console.log('Password: test123');
    console.log('Role: buyer');
    console.log('Addresses:', testBuyer.addresses.length);
    console.log('Payment Methods:', testBuyer.paymentMethods.length);

  } catch (error) {
    console.error('Error updating test buyer:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateTestBuyer();
