import Joi from 'joi';
import enhancedLogger from '../utils/logger.js';

// Common validation schemas
const commonSchemas = {
  // ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Email validation
  email: Joi.string().email().required(),
  
  // Phone validation (basic)
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).required(),
  
  // Password validation
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  
  // Name validation
  name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s\-']+$/).required(),
  
  // Price validation
  price: Joi.number().positive().precision(2).required(),
  
  // Quantity validation
  quantity: Joi.number().integer().positive().required(),
  
  // Coordinates validation
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }),
  
  // Address validation
  address: Joi.object({
    street: Joi.string().min(5).max(100).required(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().min(2).max(50).required(),
    zipCode: Joi.string().pattern(/^[A-Za-z0-9\s\-]{3,10}$/).required(),
    country: Joi.string().min(2).max(50).default('Canada')
  })
};

// User validation schemas
export const userValidation = {
  // Registration validation
  register: Joi.object({
    userName: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: commonSchemas.phone,
    role: Joi.string().valid('patron', 'artisan', 'producer', 'food_maker').default('patron'),
    address: commonSchemas.address.optional(),
    isGuest: Joi.boolean().default(false)
  }),

  // Login validation
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required()
  }),

  // Profile update validation
  updateProfile: Joi.object({
    userName: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    address: commonSchemas.address.optional(),
    preferences: Joi.object({
      emailNotifications: Joi.boolean().default(true),
      smsNotifications: Joi.boolean().default(false),
      pushNotifications: Joi.boolean().default(false)
    }).optional()
  }).min(1) // At least one field must be provided
};

// Product validation schemas
export const productValidation = {
  // Create product validation
  create: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    price: commonSchemas.price,
    category: Joi.string().valid('Food & Beverages', 'Handmade Goods', 'Art & Crafts', 'Home & Garden', 'Fashion & Beauty').required(),
    subcategory: Joi.string().min(2).max(50).required(),
    unit: Joi.string().min(1).max(20).required(),
    weight: Joi.number().positive().optional(),
    expiryDate: Joi.date().greater('now').optional(),
    image: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string().min(2).max(20)).max(10).optional(),
    isOrganic: Joi.boolean().default(false),
    isGlutenFree: Joi.boolean().default(false),
    isVegan: Joi.boolean().default(false),
    isHalal: Joi.boolean().default(false),
    isDairyFree: Joi.boolean().default(false),
    isKetoFriendly: Joi.boolean().default(false),
    isKosher: Joi.boolean().default(false),
    isLowCarb: Joi.boolean().default(false),
    isNutFree: Joi.boolean().default(false),
    isPaleo: Joi.boolean().default(false),
    isRaw: Joi.boolean().default(false),
    isSoyFree: Joi.boolean().default(false),
    isSugarFree: Joi.boolean().default(false),
    leadTimeHours: Joi.number().integer().min(1).max(168).default(24),
    productType: Joi.string().valid('ready_to_ship', 'scheduled_order', 'custom_order').default('ready_to_ship'),
    scheduleDetails: Joi.object({
      customSchedule: Joi.array().items(Joi.date()).optional(),
      orderCutoffHours: Joi.number().integer().min(1).max(168).default(48)
    }).optional(),
    scheduleType: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').optional()
  }),

  // Update product validation
  update: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().min(10).max(1000).optional(),
    price: commonSchemas.price.optional(),
    category: Joi.string().valid('Food & Beverages', 'Handmade Goods', 'Art & Crafts', 'Home & Garden', 'Fashion & Beauty').optional(),
    subcategory: Joi.string().min(2).max(50).optional(),
    unit: Joi.string().min(1).max(20).optional(),
    weight: Joi.number().positive().optional(),
    expiryDate: Joi.date().greater('now').optional(),
    image: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string().min(2).max(20)).max(10).optional(),
    isOrganic: Joi.boolean().optional(),
    isGlutenFree: Joi.boolean().optional(),
    isVegan: Joi.boolean().optional(),
    isHalal: Joi.boolean().optional(),
    isDairyFree: Joi.boolean().optional(),
    isKetoFriendly: Joi.boolean().optional(),
    isKosher: Joi.boolean().optional(),
    isLowCarb: Joi.boolean().optional(),
    isNutFree: Joi.boolean().optional(),
    isPaleo: Joi.boolean().optional(),
    isRaw: Joi.boolean().optional(),
    isSoyFree: Joi.boolean().optional(),
    isSugarFree: Joi.boolean().optional(),
    leadTimeHours: Joi.number().integer().min(1).max(168).optional(),
    productType: Joi.string().valid('ready_to_ship', 'scheduled_order', 'custom_order').optional(),
    scheduleDetails: Joi.object({
      customSchedule: Joi.array().items(Joi.date()).optional(),
      orderCutoffHours: Joi.number().integer().min(1).max(168).optional()
    }).optional(),
    scheduleType: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').optional()
  }).min(1) // At least one field must be provided
};

// Order validation schemas
export const orderValidation = {
  // Create order validation
  create: Joi.object({
    items: Joi.array().items(Joi.object({
      productId: commonSchemas.objectId,
      quantity: commonSchemas.quantity,
      unitPrice: commonSchemas.price,
      productType: Joi.string().valid('ready_to_ship', 'scheduled_order', 'custom_order').required()
    })).min(1).required(),
    deliveryAddress: commonSchemas.address.optional(),
    deliveryInstructions: Joi.string().max(500).optional(),
    deliveryMethod: Joi.string().valid('delivery', 'pickup').required(),
    paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'cash_on_delivery').required(),
    paymentMethodId: Joi.string().when('paymentMethod', {
      is: Joi.string().valid('credit_card', 'debit_card'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    estimatedDelivery: Joi.date().greater('now').optional(),
    specialRequests: Joi.string().max(1000).optional()
  }),

  // Update order validation
  update: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled').optional(),
    deliveryAddress: commonSchemas.address.optional(),
    deliveryInstructions: Joi.string().max(500).optional(),
    estimatedDelivery: Joi.date().greater('now').optional(),
    specialRequests: Joi.string().max(1000).optional(),
    notes: Joi.string().max(1000).optional()
  }).min(1)
};

// Review validation schemas
export const reviewValidation = {
  // Create review validation
  create: Joi.object({
    productId: commonSchemas.objectId,
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().min(5).max(100).required(),
    comment: Joi.string().min(10).max(1000).required(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional()
  }),

  // Update review validation
  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().min(5).max(100).optional(),
    comment: Joi.string().min(10).max(1000).optional(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional()
  }).min(1)
};

// Search validation schemas
export const searchValidation = {
  // Basic search validation
  basic: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    category: Joi.string().valid('Food & Beverages', 'Handmade Goods', 'Art & Crafts', 'Home & Garden', 'Fashion & Beauty').optional(),
    subcategory: Joi.string().min(2).max(50).optional(),
    minPrice: Joi.number().positive().optional(),
    maxPrice: Joi.number().positive().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1)
  }),

  // Enhanced search validation
  enhanced: Joi.object({
    query: Joi.string().min(1).max(100).optional(),
    category: Joi.string().valid('Food & Beverages', 'Handmade Goods', 'Art & Crafts', 'Home & Garden', 'Fashion & Beauty').optional(),
    subcategory: Joi.string().min(2).max(50).optional(),
    minPrice: Joi.number().positive().optional(),
    maxPrice: Joi.number().positive().optional(),
    userLat: Joi.number().min(-90).max(90).required(),
    userLng: Joi.number().min(-180).max(180).required(),
    proximityRadius: Joi.number().positive().max(100).default(25),
    enhancedRanking: Joi.boolean().default(true),
    includeDistance: Joi.boolean().default(true),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1)
  })
};

// File upload validation schemas
export const fileValidation = {
  // Image upload validation
  image: Joi.object({
    fieldname: Joi.string().valid('image').required(),
    originalname: Joi.string().pattern(/\.(jpg|jpeg|png|webp)$/i).required(),
    encoding: Joi.string().valid('7bit').required(),
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
    size: Joi.number().max(5 * 1024 * 1024).required() // 5MB max
  })
};

// Generic validation middleware
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      enhancedLogger.warn('Validation failed', {
        url: req.url,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        errors: errorDetails
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails,
        message: 'Please check your input and try again.'
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Sanitize input data
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential XSS and injection attempts
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

// Export all validation schemas
export const validationSchemas = {
  user: userValidation,
  product: productValidation,
  order: orderValidation,
  review: reviewValidation,
  search: searchValidation,
  file: fileValidation,
  common: commonSchemas
};

export default validate;
