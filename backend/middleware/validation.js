/**
 * Simplified Request Validation for Serverless
 * Basic validation for essential endpoints
 */

/**
 * Validate product data for create/update operations
 */
const validateProduct = (req, res, next) => {
  try {
    const { name, description, price, category, subcategory, productType } = req.body;
    
    // Required fields validation
    const requiredFields = ['name', 'description', 'price', 'category', 'subcategory', 'productType'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Basic validation
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product name must be a non-empty string"
      });
    }
    
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number"
      });
    }

    // Product type validation
    const validProductTypes = ['ready_to_ship', 'made_to_order', 'scheduled_order'];
    if (!validProductTypes.includes(productType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product type. Must be one of: ${validProductTypes.join(', ')}`
      });
    }

    // Sanitize data
    req.body.name = name.trim();
    req.body.description = description.trim();
    req.body.price = numericPrice;
    req.body.category = category.trim();
    req.body.subcategory = subcategory.trim();

    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(400).json({
      success: false,
      message: 'Validation failed'
    });
  }
};

module.exports = {
  validateProduct
};