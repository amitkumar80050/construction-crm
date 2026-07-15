const { body } = require('express-validator');

const exportRequestValidator = [
  body('module').isString().notEmpty().withMessage('Module is required'),
  body('scope').optional().isIn(['all', 'filtered', 'selected', 'currentPage', 'assigned', 'search', 'single']),
  body('columns').optional().isArray(),
  body('filters').optional().isObject(),
  body('selectedIds').optional().isArray(),
];

const templateValidator = [
  body('name').isString().trim().notEmpty().withMessage('Template name is required'),
  body('module').isString().notEmpty(),
  body('columns').isArray(),
];

module.exports = { exportRequestValidator, templateValidator };