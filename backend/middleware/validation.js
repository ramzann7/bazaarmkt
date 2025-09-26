/**
 * Validation Middleware
 * Provides Joi-based validation for request data
 */

const Joi = require('joi');

/**
 * Create validation middleware for a specific schema
 */
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    req.validatedData = value;
    next();
  };
};

/**
 * Predefined validation schemas
 */
const schemas = {
  // User schemas
  user: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  
  // Artisan schemas
  artisan: Joi.object({
    artisanName: Joi.string().min(2).max(100).required(),
    businessName: Joi.string().min(2).max(100).required(),
    category: Joi.string().valid(
      'food', 'crafts', 'art', 'jewelry', 'clothing', 'home', 'beauty', 'other'
    ).required(),
    type: Joi.string().valid(
      'producer', 'artisan', 'food_maker', 'craftsperson'
    ).required(),
    description: Joi.string().max(1000).optional(),
    address: Joi.object({
      street: Joi.string().max(200).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      zipCode: Joi.string().max(20).optional(),
      country: Joi.string().max(100).optional()
    }).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    email: Joi.string().email().optional()
  })
};

module.exports = {
  create: createValidationMiddleware,
  schemas
};
