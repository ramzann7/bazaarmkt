const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the serverless implementation
const serverlessApp = require('./server-vercel.js');

// For development, we'll use the same serverless architecture
// This ensures consistency between development and production

console.log('🚀 Development server starting with serverless architecture...');
console.log('📡 Using same implementation as production (server-vercel.js)');

// For local development, start the server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  
  // Add error handling
  const server = serverlessApp.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    console.log(`🔧 Development mode with serverless architecture`);
    console.log(`✅ All endpoints available from server-vercel.js`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.log('💡 Port is already in use. Trying port 4001...');
      server.listen(4001);
    }
  });
}

// Export the app for testing and other uses
module.exports = serverlessApp;

