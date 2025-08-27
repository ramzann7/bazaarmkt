// Test the search API from frontend perspective
const API_URL = 'http://localhost:4000/api/products';

async function testSearchAPI() {
  try {
    console.log('Testing search API...');
    
    // Test 1: Direct API call
    console.log('\n1. Testing direct API call...');
    const response = await fetch(`${API_URL}/search?q=eggs`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Search results:', data);
    console.log('Number of products:', data.products?.length || 0);
    
    // Test 2: Test with proxy URL (like frontend would use)
    console.log('\n2. Testing with proxy URL...');
    const proxyResponse = await fetch('/api/products/search?q=eggs');
    console.log('Proxy response status:', proxyResponse.status);
    
    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json();
      console.log('Proxy search results:', proxyData);
    } else {
      console.log('Proxy request failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSearchAPI();
