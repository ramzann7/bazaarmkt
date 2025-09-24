// Test file to verify Vercel deployment
module.exports = (req, res) => {
  res.json({
    success: true,
    message: 'Deployment test successful - this file was deployed!',
    timestamp: new Date().toISOString(),
    commit: 'bc15838'
  });
};
