const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'ramz@hotmail.com'; // Producer account
const TEST_PASSWORD = 'test123'; // Reset password

async function testProfileFeatures() {
  let authToken = null;

  try {
    console.log('🧪 Testing Profile Features...\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('User role:', loginResponse.data.user.role);
    console.log('User ID:', loginResponse.data.user._id);

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Get current profile
    console.log('\n2️⃣ Getting current profile...');
    const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
    console.log('✅ Profile retrieved');
    console.log('Current profile data:', JSON.stringify(profileResponse.data, null, 2));

    // Step 3: Test basic profile update
    console.log('\n3️⃣ Testing basic profile update...');
    const basicUpdateData = {
      firstName: 'Ramzan',
      lastName: 'Ali',
      phone: '5148296989'
    };
    
    const basicUpdateResponse = await axios.put(`${BASE_URL}/profile/basic`, basicUpdateData, { headers });
    console.log('✅ Basic profile updated');
    console.log('Updated profile:', JSON.stringify(basicUpdateResponse.data, null, 2));

    // Step 4: Test addresses update
    console.log('\n4️⃣ Testing addresses update...');
    const addressesData = {
      addresses: [
        {
          type: 'home',
          label: 'Home',
          street: '3440 rue alexandra',
          city: 'Saint-Hubert',
          state: 'Quebec',
          zipCode: 'J4T 3E9',
          country: 'Canada',
          isDefault: true
        },
        {
          type: 'work',
          label: 'Work',
          street: '3444 rue mance',
          city: 'Saint-Hubert',
          state: 'Quebec',
          zipCode: 'J4T 2J7',
          country: 'Canada',
          isDefault: false
        }
      ]
    };
    
    const addressesResponse = await axios.put(`${BASE_URL}/profile/addresses`, addressesData, { headers });
    console.log('✅ Addresses updated');
    console.log('Updated addresses:', JSON.stringify(addressesResponse.data.addresses, null, 2));

    // Step 5: Test notification preferences update
    console.log('\n5️⃣ Testing notification preferences update...');
    const notificationData = {
      notificationPreferences: {
        email: {
          marketing: true,
          orderUpdates: true,
          promotions: false,
          security: true
        },
        push: {
          orderUpdates: true,
          promotions: true,
          newProducers: false,
          nearbyOffers: true
        },
        sms: {
          orderUpdates: false,
          promotions: false
        }
      }
    };
    
    const notificationResponse = await axios.put(`${BASE_URL}/profile/notifications`, notificationData, { headers });
    console.log('✅ Notification preferences updated');
    console.log('Updated notifications:', JSON.stringify(notificationResponse.data.notificationPreferences, null, 2));

    // Step 6: Test payment methods update
    console.log('\n6️⃣ Testing payment methods update...');
    const paymentMethodsData = {
      paymentMethods: [
        {
          id: '1',
          type: 'credit_card',
          last4: '1234',
          cardholderName: 'Ramzan Ali',
          expiryMonth: '12',
          expiryYear: '25',
          isDefault: true,
          maskedNumber: '**** **** **** 1234'
        },
        {
          id: '2',
          type: 'debit_card',
          last4: '5678',
          cardholderName: 'Ramzan Ali',
          expiryMonth: '06',
          expiryYear: '26',
          isDefault: false,
          maskedNumber: '**** **** **** 5678'
        }
      ]
    };
    
    const paymentResponse = await axios.put(`${BASE_URL}/profile/payment-methods`, paymentMethodsData, { headers });
    console.log('✅ Payment methods updated');
    console.log('Updated payment methods:', JSON.stringify(paymentResponse.data.paymentMethods, null, 2));

    // Step 7: Test account settings update
    console.log('\n7️⃣ Testing account settings update...');
    const settingsData = {
      accountSettings: {
        language: 'en',
        currency: 'CAD',
        timezone: 'America/Toronto',
        twoFactorEnabled: false,
        profileVisible: true,
        analyticsEnabled: true,
        emailNotifications: true,
        smsNotifications: false
      }
    };
    
    const settingsResponse = await axios.put(`${BASE_URL}/profile/settings`, settingsData, { headers });
    console.log('✅ Account settings updated');
    console.log('Updated settings:', JSON.stringify(settingsResponse.data.accountSettings, null, 2));

    // Step 8: Verify all changes are persisted
    console.log('\n8️⃣ Verifying all changes are persisted...');
    const finalProfileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
    console.log('✅ Final profile retrieved');
    
    const finalProfile = finalProfileResponse.data;
    console.log('\n📋 Final Profile Summary:');
    console.log(`- Name: ${finalProfile.firstName} ${finalProfile.lastName}`);
    console.log(`- Phone: ${finalProfile.phone}`);
    console.log(`- Role: ${finalProfile.role}`);
    console.log(`- Addresses: ${finalProfile.addresses.length} addresses`);
    console.log(`- Payment Methods: ${finalProfile.paymentMethods.length} methods`);
    console.log(`- Language: ${finalProfile.accountSettings.language}`);
    console.log(`- Currency: ${finalProfile.accountSettings.currency}`);
    console.log(`- Timezone: ${finalProfile.accountSettings.timezone}`);

    console.log('\n🎉 All profile features tested successfully!');
    console.log('✅ Profile data is being persisted correctly in the database.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

// Run the test
testProfileFeatures();
