const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Name must be between 2 and 255 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

/**
 * Validation rules for habit creation
 */
const validateHabit = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title is required and must be less than 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must be less than 100 characters'),
    body('is_archived')
        .optional()
        .isBoolean()
        .withMessage('is_archived must be a boolean value'),
    handleValidationErrors
];

/**
 * Validation rules for habit completion toggle
 */
const validateHabitCompletion = [
    body('date')
        .isISO8601()
        .toDate()
        .withMessage('Please provide a valid date in ISO format'),
    body('completed')
        .isBoolean()
        .withMessage('Completed must be a boolean value'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateHabit,
    validateHabitCompletion,
    handleValidationErrors
};