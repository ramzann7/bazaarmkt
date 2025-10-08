/**
 * Inventory Routes Validation
 * Validation rules for inventory endpoints
 */

const { param } = require('express-validator');
const { validateObjectId, handleValidationErrors } = require('../../middleware/validation');

/**
 * Validate product ID parameter
 */
const validateProductId = [
  param('productId').custom((value) => {
    if (!require('mongodb').ObjectId.isValid(value)) {
      throw new Error('Invalid product ID format');
    }
    return true;
  }),
  handleValidationErrors
];

module.exports = {
  validateProductId
};
