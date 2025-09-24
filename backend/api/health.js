// Simple health check serverless function
module.exports = (req, res) => {
  res.json({
    status: 'OK',
    message: 'bazaar API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};
