const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import the serverless implementation (server-vercel.js)
const serverlessApp = require('./server-vercel.js'); // Serverless server for Vercel

// For development, we'll use the same serverless architecture
// This ensures consistency between development and production

// Health check endpoint
console.log('🚀 Development server starting with serverless architecture...');
console.log('📡 Using same implementation as production (server-vercel.js)');

// For local development, start the server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  serverlessApp.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    console.log(`📦 Payload limit: 4.5MB`);
    console.log(`🖼️ Static files served from: ${path.join(__dirname, 'public/uploads')}`);
    console.log(`🔧 Development mode with serverless architecture`);
    console.log(`✅ All endpoints available from server-vercel.js`);
  });
}

// Export the app for testing and other uses
module.exports = serverlessApp;