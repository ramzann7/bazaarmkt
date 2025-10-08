/**
 * Data Validation Utilities for Serverless Architecture
 */

const { ObjectId } = require('mongodb');

/**
 * Validate ObjectId format
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, missingFields: Array }
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    return !data[field] || (typeof data[field] === 'string' && data[field].trim() === '');
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Validate user data for registration
 * @param {Object} userData - User data to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
const validateUserRegistration = (userData) => {
  const errors = [];
  const { email, password, firstName, lastName } = userData;

  // Required fields
  const required = validateRequiredFields(userData, ['email', 'password', 'firstName', 'lastName']);
  if (!required.isValid) {
    errors.push(`Missing required fields: ${required.missingFields.join(', ')}`);
  }

  // Email format
  if (email && !isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  // Password strength
  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate product data
 * @param {Object} productData - Product data to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
const validateProductData = (productData) => {
  const errors = [];
  const { name, description, price, category } = productData;

  // Required fields
  const required = validateRequiredFields(productData, ['name', 'description', 'price', 'category']);
  if (!required.isValid) {
    errors.push(`Missing required fields: ${required.missingFields.join(', ')}`);
  }

  // Price validation
  if (price !== undefined && (isNaN(price) || price <= 0)) {
    errors.push('Price must be a positive number');
  }

  // Name length
  if (name && name.length > 100) {
    errors.push('Product name must be less than 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate order data
 * @param {Object} orderData - Order data to validate
 * @returns {Object} - { isValid: boolean, errors: Array }
 */
const validateOrderData = (orderData) => {
  const errors = [];
  const { items } = orderData;

  // Required fields
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate each item
  if (items && Array.isArray(items)) {
    items.forEach((item, index) => {
      if (!item.productId || !isValidObjectId(item.productId)) {
        errors.push(`Item ${index + 1}: Invalid product ID`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be a positive number`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

/**
 * Sanitize object data
 * @param {Object} data - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeData = (data) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  validateRequiredFields,
  validateUserRegistration,
  validateProductData,
  validateOrderData,
  sanitizeString,
  sanitizeData
};
