/**
 * Middleware Module Index
 * Centralized exports for all middleware modules
 */

const databaseMiddleware = require('./database');
const auth = require('./auth');
const validation = require('./validation');
const errorHandler = require('./errorHandler');
const rateLimiter = require('./rateLimiter');

module.exports = {
  databaseMiddleware,
  auth,
  validation,
  errorHandler,
  rateLimiter
};
