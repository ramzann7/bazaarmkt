// Simple serverless function for testing
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Test endpoint
app.get('/api/simple-test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple serverless function is working',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get('/api/simple-health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Simple health check',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
