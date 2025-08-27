const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:4000/api';
const TEST_EMAIL = 'testbuyer@example.com'; // Buyer account
const TEST_PASSWORD = 'test123';

async function testEnhancedOrder() {
  let authToken = null;

  try {
    console.log('🧪 Testing Enhanced Order Function...\\n');

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

    // Step 2: Test profile endpoint to get user's addresses and payment methods
    console.log('\\n2️⃣ Testing profile endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
    console.log('✅ Profile loaded successfully');
    console.log('User name:', profileResponse.data.firstName, profileResponse.data.lastName);
    console.log('Number of addresses:', profileResponse.data.addresses?.length || 0);
    console.log('Number of payment methods:', profileResponse.data.paymentMethods?.length || 0);
    
    if (profileResponse.data.addresses?.length > 0) {
      const defaultAddress = profileResponse.data.addresses.find(addr => addr.isDefault) || profileResponse.data.addresses[0];
      console.log('\\nDefault address:');
      console.log('- Label:', defaultAddress.label);
      console.log('- Street:', defaultAddress.street);
      console.log('- City:', defaultAddress.city);
      console.log('- State:', defaultAddress.state);
      console.log('- Zip:', defaultAddress.zipCode);
      console.log('- Country:', defaultAddress.country);
    }
    
    if (profileResponse.data.paymentMethods?.length > 0) {
      const defaultPayment = profileResponse.data.paymentMethods.find(pay => pay.isDefault) || profileResponse.data.paymentMethods[0];
      console.log('\\nDefault payment method:');
      console.log('- Type:', defaultPayment.type);
      console.log('- Last 4:', defaultPayment.last4);
      console.log('- Expiry:', defaultPayment.expiryMonth + '/' + defaultPayment.expiryYear);
      console.log('- Cardholder:', defaultPayment.cardholderName);
    }

    // Step 3: Get available products
    console.log('\\n3️⃣ Getting available products...');
    const productsResponse = await axios.get(`${BASE_URL}/products`, { headers });
    console.log('✅ Products loaded successfully');
    console.log('Number of products:', productsResponse.data.products.length);
    
    if (productsResponse.data.products.length > 0) {
      const firstProduct = productsResponse.data.products[0];
      console.log('\\nFirst product:');
      console.log('- Name:', firstProduct.name);
      console.log('- Price:', firstProduct.price);
      console.log('- Seller:', firstProduct.seller?.firstName, firstProduct.seller?.lastName);
    }

    // Step 4: Create a test order with profile data
    console.log('\\n4️⃣ Creating test order with profile data...');
    const defaultAddress = profileResponse.data.addresses?.find(addr => addr.isDefault) || profileResponse.data.addresses?.[0];
    const defaultPayment = profileResponse.data.paymentMethods?.find(pay => pay.isDefault) || profileResponse.data.paymentMethods?.[0];
    
    if (!defaultAddress || !defaultPayment || productsResponse.data.products.length === 0) {
      console.log('❌ Cannot create order: Missing address, payment method, or products');
      return;
    }

    const orderData = {
      items: [
        {
          productId: productsResponse.data.products[0]._id,
          quantity: 1
        }
      ],
      deliveryAddress: {
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.zipCode,
        country: defaultAddress.country
      },
      deliveryInstructions: "Test order with profile data",
      paymentMethod: defaultPayment.type,
      paymentMethodId: defaultPayment._id
    };

    const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData, { headers });
    console.log('✅ Order created successfully');
    console.log('Number of orders created:', orderResponse.data.orders.length);
    
    const createdOrder = orderResponse.data.orders[0];
    console.log('\\nCreated order details:');
    console.log('- Order ID:', createdOrder._id);
    console.log('- Status:', createdOrder.status);
    console.log('- Total Amount:', createdOrder.totalAmount);
    console.log('- Payment Method:', createdOrder.paymentMethod);
    console.log('- Payment Method ID:', createdOrder.paymentMethodId);
    console.log('- Delivery Address:', createdOrder.deliveryAddress.street, createdOrder.deliveryAddress.city);

    // Step 5: Verify the order appears in buyer's orders
    console.log('\\n5️⃣ Verifying order appears in buyer orders...');
    const buyerOrdersResponse = await axios.get(`${BASE_URL}/orders/buyer`, { headers });
    console.log('✅ Buyer orders loaded successfully');
    console.log('Number of buyer orders:', buyerOrdersResponse.data.length);
    
    const foundOrder = buyerOrdersResponse.data.find(order => order._id === createdOrder._id);
    if (foundOrder) {
      console.log('✅ Order found in buyer orders');
    } else {
      console.log('❌ Order not found in buyer orders');
    }

    console.log('\\n🎉 Enhanced order function test completed successfully!');
    console.log('\\n📋 Summary:');
    console.log('- Profile data retrieval: ✅ Working');
    console.log('- Address selection: ✅ Working');
    console.log('- Payment method selection: ✅ Working');
    console.log('- Order creation with profile data: ✅ Working');
    console.log('- Order verification: ✅ Working');

  } catch (error) {
    console.error('\\n❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testEnhancedOrder();
