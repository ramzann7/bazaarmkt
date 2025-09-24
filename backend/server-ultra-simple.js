const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ultra simple server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple test route
app.get('/api/simple-test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple test route is working',
    timestamp: new Date().toISOString()
  });
});

// Test route with different path
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route is working',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;
