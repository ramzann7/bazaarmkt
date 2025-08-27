const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestBuyer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user');

    // Check if test buyer already exists
    const existingBuyer = await User.findOne({ email: 'testbuyer@example.com' });
    
    if (existingBuyer) {
      console.log('✅ Test buyer already exists');
      console.log('Email: testbuyer@example.com');
      console.log('Password: test123');
      console.log('Role: buyer');
      return;
    }

    // Create test buyer
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testBuyer = new User({
      firstName: 'Test',
      lastName: 'Buyer',
      email: 'testbuyer@example.com',
      password: hashedPassword,
      phone: '1234567890',
      role: 'buyer',
      addresses: [
        {
          type: 'home',
          label: 'Home',
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Canada',
          isDefault: true
        }
      ],
      paymentMethods: [
        {
          type: 'credit_card',
          last4: '1234',
          expiryMonth: 12,
          expiryYear: 25,
          isDefault: true,
          cardholderName: 'Test Buyer'
        }
      ],
      notificationPreferences: {
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
      },
      accountSettings: {
        language: 'en',
        currency: 'CAD',
        timezone: 'America/Toronto',
        twoFactorEnabled: false
      }
    });

    await testBuyer.save();
    
    console.log('✅ Test buyer created successfully');
    console.log('Email: testbuyer@example.com');
    console.log('Password: test123');
    console.log('Role: buyer');

  } catch (error) {
    console.error('Error creating test buyer:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestBuyer();
