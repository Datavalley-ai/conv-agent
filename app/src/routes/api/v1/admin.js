// /app/src/routes/api/v1/admin.js (Updated with Group Routes)

const express = require('express');
const router = express.Router();

// --- Middleware Imports ---
const auth = require('../../../middleware/auth');
const requireRole = require('../../../middleware/role');

// --- Sub-Router Imports ---
const interviewAdminRoutes = require('./admin/interviewRoutes');
const userAdminRoutes = require('./admin/userRoutes');
const groupAdminRoutes = require('./admin/groupRoutes'); // <-- Import group routes

// ----------------------------------------------------------------
// GATEKEEPER: All routes registered below are now protected.
router.use(auth, requireRole('admin', 'interviewer'));
// ----------------------------------------------------------------

// --- Sub-Router Mounting ---
router.use('/interviews', interviewAdminRoutes);
router.use('/users', userAdminRoutes);
router.use('/groups', groupAdminRoutes); // <-- Use group routes

// A secure healthcheck for admins to verify their access
router.get('/healthcheck', (req, res) => {
    res.json({
        message: 'Admin endpoint is secure and working.',
        user: req.user.firstName,
        role: req.user.role
    });
});

module.exports = router;