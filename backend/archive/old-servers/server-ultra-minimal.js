const express = require('express');

const app = express();
const PORT = 4000;

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    success: true,
    message: 'Ultra minimal server working',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Ultra minimal server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

module.exports = app;

