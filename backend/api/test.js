// Simple test serverless function
module.exports = (req, res) => {
  res.json({
    success: true,
    message: 'Serverless function is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
