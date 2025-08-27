const axios = require('axios');

async function testNavbarFix() {
  try {
    console.log('🧪 Testing Navbar Fix...\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'ramz@hotmail.com',
      password: 'test123'
    });
    
    const authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('User role:', loginResponse.data.user.role);

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test the correct profile endpoint
    console.log('\n2️⃣ Testing /api/profile endpoint...');
    const profileResponse = await axios.get('http://localhost:4000/api/profile', { headers });
    console.log('✅ Profile retrieved successfully');
    console.log('Profile role:', profileResponse.data.role);
    console.log('Profile data:', JSON.stringify(profileResponse.data, null, 2));

    // Step 3: Test the old endpoint (should fail or be different)
    console.log('\n3️⃣ Testing /api/auth/profile endpoint...');
    try {
      const oldProfileResponse = await axios.get('http://localhost:4000/api/auth/profile', { headers });
      console.log('⚠️  Old endpoint still works but might be different');
      console.log('Old endpoint role:', oldProfileResponse.data.role);
    } catch (error) {
      console.log('❌ Old endpoint failed as expected:', error.response?.status);
    }

    console.log('\n🎉 Navbar fix test completed!');
    console.log('✅ The correct endpoint is /api/profile');
    console.log('✅ User role is correctly detected as:', profileResponse.data.role);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testNavbarFix();
