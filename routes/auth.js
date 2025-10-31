const express = require('express');
const passport = require('passport');
const { generateToken } = require('../utils/auth');
const userService = require('../services/userService');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await userService.createUser({ name, email, password });

        // Generate JWT token
        const token = generateToken({ userId: user.id });

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userService.authenticateUser(email, password);

        // Generate JWT token
        const token = generateToken({ userId: user.id });

        res.json({
            message: 'Login successful',
            user,
            token
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});



/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);
        res.json({ user });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, display_name } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (display_name) updateData.display_name = display_name;

        const user = await userService.updateUser(req.user.id, updateData);

        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', authenticateToken, (req, res) => {
    // Clear session if it exists
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });
    }

    // Clear cookies
    res.clearCookie('connect.sid');

    res.json({
        message: 'Logout successful. Token invalidated.',
        success: true
    });
});

module.exports = router;