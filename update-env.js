const fs = require('fs');
const path = require('path');

// Path to the .env file
const envPath = path.join(__dirname, 'backend', '.env');

// New Atlas connection string - updated with new credentials
const atlasUri = 'mongodb+srv://bazarmkt:QH4BRouxD5Sx383c@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority';

try {
  // Read the current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace the MONGODB_URI line
  envContent = envContent.replace(
    /MONGODB_URI=.*/,
    `MONGODB_URI=${atlasUri}`
  );
  
  // Write the updated content back
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Successfully updated .env file with Atlas connection string');
  console.log('🔗 New MONGODB_URI:', atlasUri.replace(/\/\/.*@/, '//***:***@'));
  
} catch (error) {
  console.error('❌ Failed to update .env file:', error.message);
}
