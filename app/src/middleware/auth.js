// /app/src/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// This file now exports a single function directly, which is what Express expects.
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Authentication required: No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find the user by the ID encoded in the token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Authentication failed: User not found.' });
        }

        // Attach the user object to the request for the next function to use
        req.user = user;
        req.token = token;
        
        next(); // Proceed to the controller function

    } catch (error) {
        logger.error('Authentication error:', error.message);
        res.status(401).json({ message: 'Authentication failed: Invalid token.' });
    }
};

module.exports = authMiddleware;