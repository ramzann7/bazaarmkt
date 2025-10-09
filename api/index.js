// Vercel serverless function entry point
// This file acts as a wrapper for the Express app

const app = require('../backend/server-working.js');

// Export the Express app as a serverless function handler
module.exports = app;

