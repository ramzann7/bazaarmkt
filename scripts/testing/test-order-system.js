const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'ramz@hotmail.com'; // Producer account
const TEST_PASSWORD = 'test123';

async function testOrderSystem() {
  let authToken = null;
  let testProductId = null;

  try {
    console.log('🧪 Testing Complete Order System...\\n');

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

    // Step 2: Get available products
    console.log('\\n2️⃣ Getting available products...');
    const productsResponse = await axios.get(`${BASE_URL}/products`, { headers });
    const products = productsResponse.data;
    console.log(`✅ Found ${products.length} products`);
    
    if (products.length > 0) {
      testProductId = products[0]._id;
      console.log('Test product:', products[0].name);
    } else {
      console.log('❌ No products available for testing');
      return;
    }

    // Step 3: Test order creation
    console.log('\\n3️⃣ Testing order creation...');
    const orderData = {
      items: [
        {
          productId: testProductId,
          quantity: 2
        }
      ],
      deliveryAddress: {
        street: "3440 rue alexandra",
        city: "Saint-Hubert",
        state: "Quebec", 
        zipCode: "J4T 3E9",
        country: "Canada"
      },
      deliveryInstructions: "Please deliver in the morning",
      paymentMethod: "credit_card"
    };

    const createOrderResponse = await axios.post(`${BASE_URL}/orders`, orderData, { headers });
    console.log('✅ Order created successfully');
    console.log('Orders created:', createOrderResponse.data.orders.length);
    
    const createdOrder = createOrderResponse.data.orders[0];
    console.log('Order ID:', createdOrder._id);
    console.log('Order status:', createdOrder.status);
    console.log('Total amount:', createdOrder.totalAmount);

    // Step 4: Test getting buyer orders
    console.log('\\n4️⃣ Testing buyer orders retrieval...');
    const buyerOrdersResponse = await axios.get(`${BASE_URL}/orders/buyer`, { headers });
    console.log(`✅ Found ${buyerOrdersResponse.data.length} buyer orders`);

    // Step 5: Test getting specific order
    console.log('\\n5️⃣ Testing specific order retrieval...');
    const specificOrderResponse = await axios.get(`${BASE_URL}/orders/${createdOrder._id}`, { headers });
    console.log('✅ Specific order retrieved');
    console.log('Order details:', {
      id: specificOrderResponse.data._id,
      status: specificOrderResponse.data.status,
      buyer: specificOrderResponse.data.buyer.firstName,
      producer: specificOrderResponse.data.producer.firstName,
      items: specificOrderResponse.data.items.length
    });

    // Step 6: Test order status update (if user is producer)
    if (loginResponse.data.user.role === 'producer') {
      console.log('\\n6️⃣ Testing order status update (producer)...');
      const statusUpdateData = {
        status: 'confirmed',
        preparationStage: 'ingredients_gathered',
        notes: 'Order confirmed and ingredients gathered'
      };

      const statusUpdateResponse = await axios.put(
        `${BASE_URL}/orders/${createdOrder._id}/status`, 
        statusUpdateData, 
        { headers }
      );
      console.log('✅ Order status updated successfully');
      console.log('New status:', statusUpdateResponse.data.status);
      console.log('Preparation stage:', statusUpdateResponse.data.preparationStage);

      // Step 7: Test producer orders retrieval
      console.log('\\n7️⃣ Testing producer orders retrieval...');
      const producerOrdersResponse = await axios.get(`${BASE_URL}/orders/producer`, { headers });
      console.log(`✅ Found ${producerOrdersResponse.data.length} producer orders`);

      // Step 8: Test producer statistics
      console.log('\\n8️⃣ Testing producer statistics...');
      const statsResponse = await axios.get(`${BASE_URL}/orders/producer/stats`, { headers });
      console.log('✅ Producer statistics retrieved');
      console.log('Total orders:', statsResponse.data.totalOrders);
      console.log('Total revenue:', statsResponse.data.totalRevenue);
      console.log('Status breakdown:', statsResponse.data.statusBreakdown);
    }

    // Step 9: Test payment status update
    console.log('\\n9️⃣ Testing payment status update...');
    const paymentUpdateResponse = await axios.put(
      `${BASE_URL}/orders/${createdOrder._id}/payment`,
      { paymentStatus: 'paid' },
      { headers }
    );
    console.log('✅ Payment status updated successfully');
    console.log('Payment status:', paymentUpdateResponse.data.paymentStatus);

    // Step 10: Test order cancellation (only if order is still pending)
    if (specificOrderResponse.data.status === 'pending') {
      console.log('\\n🔟 Testing order cancellation...');
      const cancelResponse = await axios.put(
        `${BASE_URL}/orders/${createdOrder._id}/cancel`,
        {},
        { headers }
      );
      console.log('✅ Order cancelled successfully');
      console.log('Final status:', cancelResponse.data.status);
    } else {
      console.log('\\n🔟 Skipping order cancellation (order not in pending status)');
    }

    console.log('\\n🎉 All order system tests completed successfully!');

  } catch (error) {
    console.error('\\n❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testOrderSystem();
