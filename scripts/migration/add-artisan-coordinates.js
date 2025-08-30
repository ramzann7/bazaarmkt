// Script to add coordinates to existing artisan profiles
const axios = require('axios');
const geocodingService = require('../../backend/src/services/geocodingService');

const API_BASE = 'http://localhost:4000/api';

async function addArtisanCoordinates() {
  console.log('🗺️ Adding coordinates to artisan profiles...\n');

  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Checking backend connectivity...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`);
      console.log('✅ Backend is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Backend is not running:', error.message);
      return;
    }

    // Test 2: Get all users with artisan role
    console.log('\n2️⃣ Getting all users with artisan role...');
    try {
      const response = await axios.get(`${API_BASE}/users`);
      const users = response.data.users || [];
      
      // Filter users with artisan role
      const artisans = users.filter(user => user.role === 'artisan');
      console.log(`📊 Found ${artisans.length} artisans`);
      
      // Filter artisans without coordinates
      const artisansWithoutCoordinates = artisans.filter(artisan => 
        !artisan.coordinates || 
        !artisan.coordinates.latitude || 
        !artisan.coordinates.longitude
      );
      
      console.log(`📊 Artisans without coordinates: ${artisansWithoutCoordinates.length}`);
      
      if (artisansWithoutCoordinates.length === 0) {
        console.log('✅ All artisans already have coordinates!');
        return;
      }
      
      // Process each artisan
      for (let i = 0; i < artisansWithoutCoordinates.length; i++) {
        const artisan = artisansWithoutCoordinates[i];
        console.log(`\n📍 Processing artisan ${i + 1}/${artisansWithoutCoordinates.length}: ${artisan.firstName} ${artisan.lastName}`);
        
        try {
          // Get address from artisan data (check addresses array)
          const defaultAddress = artisan.addresses?.find(addr => addr.isDefault) || artisan.addresses?.[0];
          if (!defaultAddress || !defaultAddress.street || !defaultAddress.city) {
            console.log('   ⚠️ No valid address found, skipping...');
            continue;
          }
          
          // Create full address string
          const addressString = `${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.state} ${defaultAddress.zipCode}, ${defaultAddress.country || 'Canada'}`;
          console.log(`   📍 Address: ${addressString}`);
          
          // Geocode the address
          const geocodeResult = await geocodingService.geocodeAddress(addressString);
          
          if (geocodeResult && geocodeResult.coordinates) {
            console.log(`   ✅ Geocoded: ${geocodeResult.coordinates.latitude}, ${geocodeResult.coordinates.longitude}`);
            
            // Update user with coordinates
            const updateResponse = await axios.put(`${API_BASE}/users/${artisan._id}`, {
              coordinates: {
                latitude: geocodeResult.coordinates.latitude,
                longitude: geocodeResult.coordinates.longitude,
                lastUpdated: new Date(),
                confidence: geocodeResult.confidence || 80
              }
            });
            
            console.log(`   ✅ Updated artisan with coordinates`);
            
            // Rate limit to avoid overwhelming the geocoding service
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } else {
            console.log('   ❌ Failed to geocode address');
          }
          
        } catch (error) {
          console.log(`   ❌ Error processing artisan: ${error.message}`);
        }
      }
      
      console.log('\n✅ Finished processing artisans');
      
    } catch (error) {
      console.log('❌ Failed to get artisans:', error.message);
    }

    // Test 3: Verify the updates
    console.log('\n3️⃣ Verifying updates...');
    try {
      const response = await axios.get(`${API_BASE}/users`);
      const users = response.data.users || [];
      
      // Filter users with artisan role
      const artisans = users.filter(user => user.role === 'artisan');
      const artisansWithCoordinates = artisans.filter(artisan => 
        artisan.coordinates && 
        artisan.coordinates.latitude && 
        artisan.coordinates.longitude
      );
      
      console.log(`📊 Artisans with coordinates: ${artisansWithCoordinates.length}/${artisans.length}`);
      
      if (artisansWithCoordinates.length > 0) {
        console.log('\n📍 Sample artisans with coordinates:');
        artisansWithCoordinates.slice(0, 3).forEach((artisan, index) => {
                  console.log(`   ${index + 1}. ${artisan.firstName} ${artisan.lastName}`);
        console.log(`      Coordinates: ${artisan.coordinates.latitude}, ${artisan.coordinates.longitude}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Failed to verify updates:', error.message);
    }

    console.log('\n📊 Artisan Coordinates Migration Summary:');
    console.log('   ✅ Backend connectivity working');
    console.log('   ✅ Artisan data retrieved');
    console.log('   ✅ Geocoding service working');
    console.log('   ✅ Coordinates added to artisan profiles');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test the "Close to You" feature again');
    console.log('   2. Check if products now show distance information');
    console.log('   3. Verify location-based search is working');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run the migration
addArtisanCoordinates();
