/**
 * Validation Middleware
 * Request validation and sanitization
 */

const { body, param, query, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');
const { PAGINATION_DEFAULTS, FILE_UPLOAD_LIMITS } = require('../config/constants');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validate MongoDB ObjectId parameter
 */
const validateObjectId = (paramName = 'id') => {
  return [
    param(paramName).custom((value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(`Invalid ${paramName} format`);
      }
      return true;
    }),
    handleValidationErrors
  ];
};

/**
 * Validate pagination parameters
 */
const validatePagination = () => {
  return [
    query('limit')
      .optional()
      .isInt({ min: 1, max: PAGINATION_DEFAULTS.MAX_LIMIT })
      .withMessage(`Limit must be between 1 and ${PAGINATION_DEFAULTS.MAX_LIMIT}`),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
  ];
};

/**
 * Validate user registration
 */
const validateUserRegistration = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters'),
    handleValidationErrors
  ];
};

/**
 * Validate user login
 */
const validateUserLogin = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ];
};

/**
 * Validate product creation/update
 */
const validateProduct = () => {
  return [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Product name is required and must be less than 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Product description is required and must be less than 2000 characters'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category is required and must be less than 100 characters'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    handleValidationErrors
  ];
};

/**
 * Validate order creation
 */
const validateOrder = () => {
  return [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must contain at least one item'),
    body('items.*.productId')
      .custom((value) => {
        if (!ObjectId.isValid(value)) {
          throw new Error('Invalid product ID format');
        }
        return true;
      }),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    body('shippingAddress.street')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Street address is required'),
    body('shippingAddress.city')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('City is required'),
    body('shippingAddress.postalCode')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Postal code is required'),
    body('shippingAddress.country')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Country is required'),
    handleValidationErrors
  ];
};

/**
 * Validate community post creation
 */
const validateCommunityPost = () => {
  return [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must be less than 200 characters'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Content is required and must be less than 5000 characters'),
    body('type')
      .optional()
      .isIn(['story', 'recipe', 'event', 'product_showcase', 'poll'])
      .withMessage('Invalid post type'),
    body('category')
      .optional()
      .isIn(['community', 'recipes', 'events', 'products', 'general'])
      .withMessage('Invalid post category'),
    handleValidationErrors
  ];
};

/**
 * Validate comment creation
 */
const validateComment = () => {
  return [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content is required and must be less than 1000 characters'),
    handleValidationErrors
  ];
};

/**
 * Validate file upload
 */
const validateFileUpload = () => {
  return [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('File is required');
        }
        
        if (req.file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
          throw new Error(`File size must be less than ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        
        if (!FILE_UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
          throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
        }
        
        return true;
      }),
    handleValidationErrors
  ];
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateObjectId,
  validatePagination,
  validateUserRegistration,
  validateUserLogin,
  validateProduct,
  validateOrder,
  validateCommunityPost,
  validateComment,
  validateFileUpload,
  sanitizeInput
};
