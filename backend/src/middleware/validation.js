const Joi = require('joi');

// Promotional pricing validation
const promotionalPricingSchema = Joi.object({
  featureType: Joi.string().valid('featured_product', 'sponsored_product', 'artisan_spotlight', 'category_promotion', 'search_boost', 'homepage_featured').required(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  basePrice: Joi.number().min(0).required(),
  pricePerDay: Joi.number().min(0).required(),
  benefits: Joi.array().items(Joi.string().min(5).max(200)).min(1).required()
});

// Product validation
const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  price: Joi.number().min(0).required(),
  category: Joi.string().required(),
  stock: Joi.number().min(0).default(0)
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  validate,
  promotionalPricingSchema,
  productSchema
};