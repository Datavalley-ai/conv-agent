const express = require('express');
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

  const result = await AuthService.login(email, password, req);

  logger.info(`User logged in: ${email}`);

  res.status(200).json({
    success: true,
    data: result
  });
}));

// @route   POST /api/v1/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', requireAuth(), asyncHandler(async (req, res) => {
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
router.get('/me', requireAuth(), asyncHandler(async (req, res) => {
  const User = require('../../../models/User');
  const user = await User.findById(req.user.id);

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

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', requireAuth(), (req, res) => {
  logger.info(`User logged out: ${req.user.id}`);
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
