// /app/src/routes/api/v1/admin/userRoutes.js (Final Version)

const express = require('express');
const router = express.Router();

// Import all user management functions from the admin controller
const {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../../../../controllers/adminController');

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all user accounts.
 */
router.get('/', getAllUsers);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a new user account.
 */
router.post('/', createUser);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update a specific user's details.
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Deactivate (soft delete) a specific user.
 */
router.delete('/:id', deleteUser);

module.exports = router;