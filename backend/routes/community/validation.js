/**
 * Community Routes Validation
 * Validation rules for community endpoints
 */

const { body, param, query } = require('express-validator');
const { validateObjectId, validatePagination, handleValidationErrors } = require('../../middleware/validation');

/**
 * Validate community post creation
 */
const validateCreatePost = [
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
    .isIn(['story', 'recipe', 'event', 'product_showcase', 'poll', 'tip', 'question'])
    .withMessage('Invalid post type'),
  body('category')
    .optional()
    .isIn(['community', 'recipes', 'events', 'products', 'general'])
    .withMessage('Invalid post category'),
  handleValidationErrors
];

/**
 * Validate community post update
 */
const validateUpdatePost = [
  param('id').custom((value) => {
    if (!require('mongodb').ObjectId.isValid(value)) {
      throw new Error('Invalid post ID format');
    }
    return true;
  }),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be less than 5000 characters'),
  handleValidationErrors
];

/**
 * Validate comment creation
 */
const validateCreateComment = [
  param('id').custom((value) => {
    if (!require('mongodb').ObjectId.isValid(value)) {
      throw new Error('Invalid post ID format');
    }
    return true;
  }),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content is required and must be less than 1000 characters'),
  handleValidationErrors
];

/**
 * Validate poll vote
 */
const validatePollVote = [
  param('id').custom((value) => {
    if (!require('mongodb').ObjectId.isValid(value)) {
      throw new Error('Invalid post ID format');
    }
    return true;
  }),
  body('option')
    .notEmpty()
    .withMessage('Poll option is required'),
  handleValidationErrors
];

/**
 * Validate incentive redemption
 */
const validateRedeemIncentive = [
  body('rewardId')
    .notEmpty()
    .withMessage('Reward ID is required'),
  handleValidationErrors
];

/**
 * Validate posts query parameters
 */
const validatePostsQuery = [
  query('type')
    .optional()
    .isIn(['story', 'recipe', 'event', 'product_showcase', 'poll', 'tip', 'question', 'all'])
    .withMessage('Invalid post type filter'),
  query('category')
    .optional()
    .isIn(['community', 'recipes', 'events', 'products', 'general'])
    .withMessage('Invalid post category filter'),
  query('populate')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const validPopulate = ['likes', 'comments', 'artisan'];
        const populateArray = value.split(',');
        const invalid = populateArray.filter(p => !validPopulate.includes(p));
        if (invalid.length > 0) {
          throw new Error(`Invalid populate options: ${invalid.join(', ')}`);
        }
      }
      return true;
    }),
  validatePagination(),
  handleValidationErrors
];

/**
 * Validate leaderboard query parameters
 */
const validateLeaderboardQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('period')
    .optional()
    .isIn(['all', 'week', 'month', 'year'])
    .withMessage('Invalid period filter'),
  handleValidationErrors
];

module.exports = {
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validatePollVote,
  validateRedeemIncentive,
  validatePostsQuery,
  validateLeaderboardQuery,
  validateObjectId
};
