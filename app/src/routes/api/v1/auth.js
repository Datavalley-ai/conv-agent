// /app/src/routes/api/v1/authRoutes.js

const express = require('express');
const router = express.Router();

// Import the controller functions we just fixed.
// The path goes up three levels from /routes/api/v1 to the /src directory.
const { register, login } = require('../../../controllers/authController');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', login);

module.exports = router;