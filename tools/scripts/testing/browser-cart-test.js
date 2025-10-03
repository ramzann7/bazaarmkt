
// Run this in browser console to add test data to guest cart
const testCartData = [
  {
    "_id": "test-product-1",
    "name": "Test Product 1",
    "price": 15.99,
    "quantity": 2,
    "artisan": {
      "_id": "test-artisan-1",
      "artisanName": "Test Artisan 1",
      "type": "bakery"
    },
    "addedAt": "2025-08-30T03:26:54.453Z"
  },
  {
    "_id": "test-product-2",
    "name": "Test Product 2",
    "price": 12.5,
    "quantity": 1,
    "artisan": {
      "_id": "test-artisan-2",
      "artisanName": "Test Artisan 2",
      "type": "farm"
    },
    "addedAt": "2025-08-30T03:26:54.454Z"
  },
  {
    "_id": "test-product-3",
    "name": "Test Product 3",
    "price": 8.99,
    "quantity": 3,
    "artisan": {
      "_id": "test-artisan-1",
      "artisanName": "Test Artisan 1",
      "type": "bakery"
    },
    "addedAt": "2025-08-30T03:26:54.454Z"
  }
];
localStorage.setItem('food_finder_guest_cart', JSON.stringify(testCartData));
console.log('✅ Test cart data added to localStorage');
console.log('🛒 Cart items:', testCartData.length);
console.log('📦 Total quantity:', testCartData.reduce((total, item) => total + item.quantity, 0));
console.log('💰 Total value:', testCartData.reduce((total, item) => total + (item.price * item.quantity), 0));
