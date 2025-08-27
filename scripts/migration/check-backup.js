const fs = require('fs');
const path = require('path');

// Read the backup files
const backupDir = path.join(__dirname, 'backup');

try {
  console.log('🔍 Checking backup data structure...');
  
  // Check products
  const productsPath = path.join(backupDir, 'products.json');
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  
  console.log(`📦 Products backup: ${productsData.length} documents`);
  
  // Check first product
  const firstProduct = productsData[0];
  console.log('📋 First product structure:');
  console.log('  - _id:', firstProduct._id);
  console.log('  - name:', firstProduct.name);
  console.log('  - seller:', firstProduct.seller);
  console.log('  - seller type:', typeof firstProduct.seller);
  
  // Check if all products have seller
  const productsWithSeller = productsData.filter(p => p.seller);
  console.log(`✅ Products with seller field: ${productsWithSeller.length}/${productsData.length}`);
  
  // Check users
  const usersPath = path.join(backupDir, 'users.json');
  const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  
  console.log(`👥 Users backup: ${usersData.length} documents`);
  
  // Check first user
  const firstUser = usersData[0];
  console.log('📋 First user structure:');
  console.log('  - _id:', firstUser._id);
  console.log('  - firstName:', firstUser.firstName);
  console.log('  - lastName:', firstUser.lastName);
  
  // Check if seller ID exists in users
  const sellerId = firstProduct.seller;
  const sellerExists = usersData.some(u => u._id === sellerId);
  console.log(`🔗 Seller ID ${sellerId} exists in users: ${sellerExists}`);
  
} catch (error) {
  console.error('❌ Error checking backup:', error.message);
}
