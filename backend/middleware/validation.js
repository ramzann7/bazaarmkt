/**
 * Request Validation Middleware
 * 
 * Provides validation for common request patterns and data types.
 * Ensures data integrity and consistency across all endpoints.
 */

const { ObjectId } = require("../utils/database");
const { AppError } = require("./errorHandler");

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
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        "MISSING_REQUIRED_FIELDS",
        "VAL_001"
      );
    }

    // Name validation
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError("Product name must be a non-empty string", 400, "INVALID_NAME", "VAL_002");
    }
    
    if (name.trim().length > 100) {
      throw new AppError("Product name must be 100 characters or less", 400, "NAME_TOO_LONG", "VAL_003");
    }

    // Description validation
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new AppError("Product description must be a non-empty string", 400, "INVALID_DESCRIPTION", "VAL_004");
    }
    
    if (description.trim().length > 1000) {
      throw new AppError("Product description must be 1000 characters or less", 400, "DESCRIPTION_TOO_LONG", "VAL_005");
    }

    // Price validation
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new AppError("Price must be a positive number", 400, "INVALID_PRICE", "VAL_006");
    }
    
    if (numericPrice > 10000) {
      throw new AppError("Price cannot exceed $10,000", 400, "PRICE_TOO_HIGH", "VAL_007");
    }

    // Product type validation
    const validProductTypes = ['ready_to_ship', 'made_to_order', 'scheduled_order'];
    if (!validProductTypes.includes(productType)) {
      throw new AppError(
        `Invalid product type. Must be one of: ${validProductTypes.join(', ')}`,
        400,
        "INVALID_PRODUCT_TYPE",
        "VAL_008"
      );
    }

    // Product type specific validations
    if (productType === 'ready_to_ship' && req.body.stock !== undefined) {
      const stock = parseInt(req.body.stock);
      if (isNaN(stock) || stock < 0) {
        throw new AppError("Stock must be a non-negative integer", 400, "INVALID_STOCK", "VAL_009");
      }
    }

    if (productType === 'made_to_order') {
      if (req.body.leadTime !== undefined) {
        const leadTime = parseInt(req.body.leadTime);
        if (isNaN(leadTime) || leadTime < 1) {
          throw new AppError("Lead time must be at least 1", 400, "INVALID_LEAD_TIME", "VAL_010");
        }
      }
    }

    // Weight validation (optional)
    if (req.body.weight !== undefined && req.body.weight !== null) {
      const weight = parseFloat(req.body.weight);
      if (isNaN(weight) || weight <= 0) {
        throw new AppError("Weight must be a positive number", 400, "INVALID_WEIGHT", "VAL_011");
      }
    }

    // Sanitize and normalize data
    req.body.name = name.trim();
    req.body.description = description.trim();
    req.body.price = numericPrice;
    req.body.category = category.trim();
    req.body.subcategory = subcategory.trim();

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate ObjectId parameters
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  try {
    const id = req.params[paramName];
    
    if (!id) {
      throw new AppError(`${paramName} parameter is required`, 400, "MISSING_ID_PARAM", "VAL_012");
    }
    
    if (!ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${paramName} format`, 400, "INVALID_ID_FORMAT", "VAL_013");
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  try {
    const { page, limit, offset } = req.query;
    
    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new AppError("Page must be a positive integer", 400, "INVALID_PAGE", "VAL_014");
      }
      req.query.page = pageNum;
    }
    
    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new AppError("Limit must be between 1 and 100", 400, "INVALID_LIMIT", "VAL_015");
      }
      req.query.limit = limitNum;
    }
    
    if (offset !== undefined) {
      const offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new AppError("Offset must be a non-negative integer", 400, "INVALID_OFFSET", "VAL_016");
      }
      req.query.offset = offsetNum;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate order data
 */
const validateOrder = (req, res, next) => {
  try {
    const { items, deliveryType, deliveryAddress } = req.body;
    
    // Items validation
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Order must contain at least one item", 400, "EMPTY_ORDER", "VAL_017");
    }
    
    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.productId || !ObjectId.isValid(item.productId)) {
        throw new AppError(`Invalid product ID for item ${i + 1}`, 400, "INVALID_PRODUCT_ID", "VAL_018");
      }
      
      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity < 1) {
        throw new AppError(`Invalid quantity for item ${i + 1}`, 400, "INVALID_QUANTITY", "VAL_019");
      }
      
      item.quantity = quantity;
    }
    
    // Delivery type validation
    const validDeliveryTypes = ['pickup', 'delivery'];
    if (deliveryType && !validDeliveryTypes.includes(deliveryType)) {
      throw new AppError(
        `Invalid delivery type. Must be one of: ${validDeliveryTypes.join(', ')}`,
        400,
        "INVALID_DELIVERY_TYPE",
        "VAL_020"
      );
    }
    
    // Delivery address validation for delivery orders
    if (deliveryType === 'delivery' && !deliveryAddress) {
      throw new AppError("Delivery address is required for delivery orders", 400, "MISSING_DELIVERY_ADDRESS", "VAL_021");
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate user profile update data
 */
const validateProfileUpdate = (req, res, next) => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    
    // Name validation
    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0) {
        throw new AppError("First name must be a non-empty string", 400, "INVALID_FIRST_NAME", "VAL_022");
      }
      if (firstName.trim().length > 50) {
        throw new AppError("First name must be 50 characters or less", 400, "FIRST_NAME_TOO_LONG", "VAL_023");
      }
      req.body.firstName = firstName.trim();
    }
    
    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0) {
        throw new AppError("Last name must be a non-empty string", 400, "INVALID_LAST_NAME", "VAL_024");
      }
      if (lastName.trim().length > 50) {
        throw new AppError("Last name must be 50 characters or less", 400, "LAST_NAME_TOO_LONG", "VAL_025");
      }
      req.body.lastName = lastName.trim();
    }
    
    // Phone validation
    if (phone !== undefined) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        throw new AppError("Invalid phone number format", 400, "INVALID_PHONE", "VAL_026");
      }
      if (phone.length > 20) {
        throw new AppError("Phone number must be 20 characters or less", 400, "PHONE_TOO_LONG", "VAL_027");
      }
    }
    
    // Email validation (basic)
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Invalid email format", 400, "INVALID_EMAIL", "VAL_028");
      }
      if (email.length > 255) {
        throw new AppError("Email must be 255 characters or less", 400, "EMAIL_TOO_LONG", "VAL_029");
      }
      req.body.email = email.toLowerCase().trim();
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate search parameters
 */
const validateSearch = (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, sortBy, order } = req.query;
    
    // Search query validation
    if (q !== undefined) {
      if (typeof q !== 'string' || q.trim().length === 0) {
        throw new AppError("Search query must be a non-empty string", 400, "INVALID_SEARCH_QUERY", "VAL_030");
      }
      if (q.length > 100) {
        throw new AppError("Search query must be 100 characters or less", 400, "SEARCH_QUERY_TOO_LONG", "VAL_031");
      }
      req.query.q = q.trim();
    }
    
    // Price range validation
    if (minPrice !== undefined) {
      const min = parseFloat(minPrice);
      if (isNaN(min) || min < 0) {
        throw new AppError("Minimum price must be a non-negative number", 400, "INVALID_MIN_PRICE", "VAL_032");
      }
      req.query.minPrice = min;
    }
    
    if (maxPrice !== undefined) {
      const max = parseFloat(maxPrice);
      if (isNaN(max) || max < 0) {
        throw new AppError("Maximum price must be a non-negative number", 400, "INVALID_MAX_PRICE", "VAL_033");
      }
      req.query.maxPrice = max;
    }
    
    if (req.query.minPrice !== undefined && req.query.maxPrice !== undefined) {
      if (req.query.minPrice > req.query.maxPrice) {
        throw new AppError("Minimum price cannot be greater than maximum price", 400, "INVALID_PRICE_RANGE", "VAL_034");
      }
    }
    
    // Sort validation
    if (sortBy !== undefined) {
      const validSortFields = ['name', 'price', 'createdAt', 'rating'];
      if (!validSortFields.includes(sortBy)) {
        throw new AppError(
          `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`,
          400,
          "INVALID_SORT_FIELD",
          "VAL_035"
        );
      }
    }
    
    if (order !== undefined) {
      const validOrders = ['asc', 'desc'];
      if (!validOrders.includes(order.toLowerCase())) {
        throw new AppError(
          `Invalid sort order. Must be one of: ${validOrders.join(', ')}`,
          400,
          "INVALID_SORT_ORDER",
          "VAL_036"
        );
      }
      req.query.order = order.toLowerCase();
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateProduct,
  validateObjectId,
  validatePagination,
  validateOrder,
  validateProfileUpdate,
  validateSearch
};
