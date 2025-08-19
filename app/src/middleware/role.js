// /app/src/middleware/role.js

/**
 * Middleware factory that creates a middleware to check for user roles.
 * @param {...string} allowedRoles - A list of role strings that are allowed access.
 * @returns {function} An Express middleware function.
 */const logger = require('../utils/logger'); 

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // This middleware must run *after* the main auth middleware,
        // so we can expect `req.user` to exist.
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Forbidden: No user role found.' });
        }

        const userRole = req.user.role;
        logger.info(`ROLE CHECK: User ID [${req.user.id}] with role [${userRole}] is trying to access a route that requires one of [${allowedRoles.join(', ')}]`);

        // Check if the user's role is in the list of allowed roles for this route.
        if (allowedRoles.includes(userRole)) {
            logger.info(`ROLE CHECK: Access GRANTED for user [${req.user.id}].`);
            next(); // Role is allowed, proceed to the next handler.
        } else {
            logger.warn(`ROLE CHECK: Access DENIED for user [${req.user.id}]. Role [${userRole}] is not in [${allowedRoles.join(', ')}].`);
            // Role is not allowed, send a 'Forbidden' error.
            res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
        }
    };
};

module.exports = requireRole;