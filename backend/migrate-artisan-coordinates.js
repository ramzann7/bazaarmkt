/**
 * Migration Script: Add Coordinates to Artisan Collection
 * Geocodes artisan addresses and adds coordinates field to artisan documents
 */

const { MongoClient, ObjectId } = require('mongodb');
const geocodingService = require('./services/geocodingService');
require('dotenv').config();

async function migrateArtisanCoordinates() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const artisansCollection = db.collection('artisans');
    
    // Get all artisans
    const artisans = await artisansCollection.find({}).toArray();
    console.log(`📊 Found ${artisans.length} artisans\n`);
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < artisans.length; i++) {
      const artisan = artisans[i];
      const artisanName = artisan.artisanName || artisan.businessName || `Artisan ${i + 1}`;
      
      console.log(`\n${i + 1}. Processing: ${artisanName}`);
      console.log(`   ID: ${artisan._id}`);
      
      // Check if coordinates already exist
      if (artisan.coordinates && artisan.coordinates.latitude && artisan.coordinates.longitude) {
        console.log(`   ✅ Already has coordinates: ${artisan.coordinates.latitude}, ${artisan.coordinates.longitude}`);
        skippedCount++;
        continue;
      }
      
      // Check if lat/lng exist inside address object
      if (artisan.address && artisan.address.lat && artisan.address.lng) {
        console.log(`   📍 Found coordinates in address object: ${artisan.address.lat}, ${artisan.address.lng}`);
        
        const coordinates = {
          latitude: parseFloat(artisan.address.lat),
          longitude: parseFloat(artisan.address.lng),
          lastUpdated: new Date(),
          confidence: 95, // High confidence since it was manually entered
          source: 'address_object'
        };
        
        await artisansCollection.updateOne(
          { _id: artisan._id },
          { $set: { coordinates } }
        );
        
        console.log(`   ✅ Migrated coordinates from address object`);
        successCount++;
        continue;
      }
      
      // Check if we have a valid address to geocode
      if (!artisan.address || !artisan.address.street || !artisan.address.city) {
        console.log(`   ⚠️  No valid address to geocode - skipping`);
        console.log(`      Address:`, artisan.address);
        skippedCount++;
        continue;
      }
      
      // Build address string
      const addressString = `${artisan.address.street}, ${artisan.address.city}, ${artisan.address.state} ${artisan.address.zipCode}`.trim();
      console.log(`   📍 Geocoding: ${addressString}`);
      
      try {
        // Geocode the address
        const geocodeResult = await geocodingService.geocodeAddress(addressString);
        
        if (!geocodeResult) {
          console.log(`   ❌ Geocoding failed - no results returned`);
          errorCount++;
          continue;
        }
        
        const coordinates = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          lastUpdated: new Date(),
          confidence: geocodeResult.confidence || 80,
          source: 'nominatim',
          display_name: geocodeResult.display_name
        };
        
        // Update artisan with coordinates
        await artisansCollection.updateOne(
          { _id: artisan._id },
          { $set: { coordinates } }
        );
        
        console.log(`   ✅ Added coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
        console.log(`      Confidence: ${coordinates.confidence}%`);
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Error geocoding: ${error.message}`);
        errorCount++;
      }
    }
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Successfully geocoded: ${successCount}`);
    console.log(`⏭️  Skipped (already had coordinates): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${artisans.length}`);
    
    // Verify results
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 VERIFICATION');
    console.log('═'.repeat(60));
    
    const updatedArtisans = await artisansCollection.find({}).toArray();
    const withCoordinates = updatedArtisans.filter(a => 
      a.coordinates && a.coordinates.latitude && a.coordinates.longitude
    );
    
    console.log(`\n✅ Artisans with coordinates: ${withCoordinates.length}/${updatedArtisans.length}`);
    
    if (withCoordinates.length > 0) {
      console.log('\n📍 Sample coordinates:');
      withCoordinates.slice(0, 3).forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.artisanName || a.businessName}`);
        console.log(`      Coordinates: ${a.coordinates.latitude}, ${a.coordinates.longitude}`);
        console.log(`      Confidence: ${a.coordinates.confidence}%`);
        console.log(`      Source: ${a.coordinates.source}`);
      });
    }
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration
console.log('🗺️  ARTISAN COORDINATES MIGRATION');
console.log('═'.repeat(60));
console.log('This script will add coordinates to all artisan profiles');
console.log('═'.repeat(60) + '\n');

migrateArtisanCoordinates();
