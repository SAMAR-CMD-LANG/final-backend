const passport = require('passport');
const { verifyToken } = require('../utils/auth');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({ error: 'Authentication error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
        }

        req.user = user;
        next();
    })(req, res, next);
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (!err && user) {
            req.user = user;
        }
        next();
    })(req, res, next);
};

module.exports = {
    authenticateToken,
    optionalAuth
};