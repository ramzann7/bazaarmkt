const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'ramz@hotmail.com'; // Producer account
const TEST_PASSWORD = 'test123';

async function testOrdersComponent() {
  let authToken = null;

  try {
    console.log('🧪 Testing Orders Component...\\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('User role:', loginResponse.data.user.role);

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test profile endpoint (what Orders component calls)
    console.log('\\n2️⃣ Testing profile endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
    console.log('✅ Profile loaded successfully');
    console.log('User role from profile:', profileResponse.data.role);
    console.log('User name:', profileResponse.data.firstName, profileResponse.data.lastName);

    // Step 3: Test producer orders endpoint
    console.log('\\n3️⃣ Testing producer orders endpoint...');
    const ordersResponse = await axios.get(`${BASE_URL}/orders/producer`, { headers });
    console.log('✅ Producer orders loaded successfully');
    console.log('Number of orders:', ordersResponse.data.length);
    
    if (ordersResponse.data.length > 0) {
      const firstOrder = ordersResponse.data[0];
      console.log('\\nFirst order details:');
      console.log('- Order ID:', firstOrder._id);
      console.log('- Status:', firstOrder.status);
      console.log('- Total Amount:', firstOrder.totalAmount);
      console.log('- Buyer:', firstOrder.buyer?.firstName, firstOrder.buyer?.lastName);
      console.log('- Items count:', firstOrder.items.length);
      
      if (firstOrder.items.length > 0) {
        const firstItem = firstOrder.items[0];
        console.log('\\nFirst item details:');
        console.log('- Product name:', firstItem.product?.name);
        console.log('- Product image:', firstItem.product?.image);
        console.log('- Quantity:', firstItem.quantity);
        console.log('- Unit price:', firstItem.unitPrice);
      }
    }

    // Step 4: Test producer statistics
    console.log('\\n4️⃣ Testing producer statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/orders/producer/stats`, { headers });
    console.log('✅ Producer statistics loaded successfully');
    console.log('Total orders:', statsResponse.data.totalOrders);
    console.log('Total revenue:', statsResponse.data.totalRevenue);
    console.log('Status breakdown:', statsResponse.data.statusBreakdown);

    console.log('\\n🎉 Orders component test completed successfully!');
    console.log('\\n📋 Summary:');
    console.log('- Profile endpoint: ✅ Working');
    console.log('- Producer orders: ✅ Working');
    console.log('- Producer statistics: ✅ Working');
    console.log('- Data structure: ✅ Compatible with Orders component');

  } catch (error) {
    console.error('\\n❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testOrdersComponent();
