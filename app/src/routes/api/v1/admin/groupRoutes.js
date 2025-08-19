// /app/src/routes/api/v1/admin/groupRoutes.js (Complete Version)

const express = require('express');
const router = express.Router();

// Import all the necessary functions from the admin controller
const {
    createGroup,
    getAllGroups,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup
} = require('../../../../controllers/adminController');

// --- Group Routes ---
// POST /api/v1/admin/groups (Create a new group)
// GET  /api/v1/admin/groups (Get all groups)
router.route('/')
    .post(createGroup)
    .get(getAllGroups);

// --- Single Group Routes ---
// PUT    /api/v1/admin/groups/:groupId (Update a group's details)
// DELETE /api/v1/admin/groups/:groupId (Delete a group)
router.route('/:groupId')
    .put(updateGroup)
    .delete(deleteGroup);
    
// --- Group Member Management Routes ---
// POST /api/v1/admin/groups/:groupId/members (Add a member to a group)
router.route('/:groupId/members')
    .post(addMemberToGroup);

// DELETE /api/v1/admin/groups/:groupId/members/:userId (Remove a member from a group)
router.route('/:groupId/members/:userId')
    .delete(removeMemberFromGroup);
    
module.exports = router;