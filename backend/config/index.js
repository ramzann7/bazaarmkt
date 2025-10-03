/**
 * Configuration Module Index
 * Centralized exports for all configuration modules
 */

const database = require('./database');
const environment = require('./environment');
const constants = require('./constants');

module.exports = {
  database,
  environment,
  constants
};
