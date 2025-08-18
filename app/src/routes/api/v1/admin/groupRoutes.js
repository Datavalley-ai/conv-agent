// /app/src/routes/api/v1/admin/groupRoutes.js

const express = require('express');
const router = express.Router();

// Import the group management functions from the admin controller
const {
    createGroup,
    getAllGroups
} = require('../../../../controllers/adminController');

/**
 * @route   GET /api/v1/admin/groups
 * @desc    Get all groups.
 * @access  Private (Admin, Interviewer)
 */
router.get('/', getAllGroups);

/**
 * @route   POST /api/v1/admin/groups
 * @desc    Create a new group.
 * @access  Private (Admin, Interviewer)
 */
router.post('/', createGroup);

// We will add other routes here later for updating, deleting,
// and managing members of a group.

module.exports = router;