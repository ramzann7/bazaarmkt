/**
 * Spotlight Routes Validation
 * Validation rules for spotlight endpoints
 */

const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validation');

/**
 * Validate spotlight purchase request
 */
const validatePurchaseSpotlight = [
  body('days')
    .isInt({ min: 1, max: 30 })
    .withMessage('Days must be between 1 and 30'),
  body('paymentMethod')
    .optional()
    .isIn(['wallet', 'credit_card', 'paypal'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

module.exports = {
  validatePurchaseSpotlight
};
