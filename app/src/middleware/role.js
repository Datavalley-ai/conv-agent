// /app/src/middleware/role.js

/**
 * Middleware factory that creates a middleware to check for user roles.
 * @param {...string} allowedRoles - A list of role strings that are allowed access.
 * @returns {function} An Express middleware function.
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // This middleware must run *after* the main auth middleware,
        // so we can expect `req.user` to exist.
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Forbidden: No user role found.' });
        }

        const userRole = req.user.role;

        // Check if the user's role is in the list of allowed roles for this route.
        if (allowedRoles.includes(userRole)) {
            next(); // Role is allowed, proceed to the next handler.
        } else {
            // Role is not allowed, send a 'Forbidden' error.
            res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
        }
    };
};

module.exports = requireRole;