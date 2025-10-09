// Vercel serverless function entry point
// This file acts as a wrapper for the Express app

// Add the api directory to module paths so backend can find dependencies
const path = require('path');
const Module = require('module');

// Add api/node_modules to the module search paths
const apiNodeModules = path.join(__dirname, 'node_modules');
if (!Module.globalPaths.includes(apiNodeModules)) {
  Module.globalPaths.unshift(apiNodeModules);
}

// Also update NODE_PATH for good measure
process.env.NODE_PATH = process.env.NODE_PATH 
  ? `${apiNodeModules}:${process.env.NODE_PATH}`
  : apiNodeModules;

const app = require('../backend/server-working.js');

// Export the Express app as a serverless function handler
module.exports = app;

