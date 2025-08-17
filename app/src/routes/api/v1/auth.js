const express = require('express');
const jwt = require('jsonwebtoken');
const AuthService = require('../../../services/auth');
const { asyncHandler } = require('../../../middleware/asyncHandler');
const { requireAuth } = require('../../../middleware/auth');
const logger = require('../../../utils/logger');

const router = express.Router();

// @route   POST /api/v1/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  // Basic validation
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'Please provide all required fields'
    });
  }

  const result = await AuthService.register({
    email,
    password,
    firstName,
    lastName,
    role
  });

  logger.info(`User registered: ${email}`);

  res.status(201).json({
    success: true,
    data: result
  });
}));

// @route   POST /api/v1/auth/login  
// @desc    Login user
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide email and password'
    });
  }

  try {
    // Call AuthService.login to get user data
    const result = await AuthService.login(email, password, req);

    // Extract user from result
    if (!result || !result.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.user;
    console.log('Login successful for user:', user.email, 'ID:', user._id);

    // FIXED: Generate JWT with correct payload structure
    const token = jwt.sign(
      { 
        id: user._id.toString(), // Ensure string format
        sub: user._id.toString(), // Add 'sub' as backup
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    logger.info(`User logged in: ${email}`);

    // FIXED: Return proper response structure that frontend expects
    res.status(200).json({
      success: true,
      token: token, // Frontend expects this at root level
      user: {       // Frontend expects this at root level
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
}));

// @route   POST /api/v1/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', requireAuth(['candidate', 'interviewer', 'admin']), asyncHandler(async (req, res) => {
  const token = req.headers.authorization.substring(7);
  
  const result = await AuthService.refreshToken(token);

  res.status(200).json({
    success: true,
    data: result
  });
}));

// @route   GET /api/v1/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', requireAuth(['candidate', 'interviewer', 'admin']), asyncHandler(async (req, res) => {
  const User = require('../../../models/User');
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    }
  });
}));

// @route   GET /api/v1/auth/debug/schema
// @desc    Debug user schema
// @access  Public (for debugging)
router.get('/debug/schema', (req, res) => {
  const User = require('../../../models/User');
  const roleField = User.schema.paths.role;
  res.json({
    enumValues: roleField.enumValues || roleField.options?.enum,
    schemaOptions: roleField.options
  });
});

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', requireAuth(['candidate', 'interviewer', 'admin']), (req, res) => {
  logger.info(`User logged out: ${req.user.id}`);
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
