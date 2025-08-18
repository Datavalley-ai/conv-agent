// /app/src/routes/api/v1/admin.js

const express = require('express');
const router = express.Router();

// Import our security middleware
const auth = require('../../../middleware/auth');
const requireRole = require('../../../middleware/role');
const interviewAdminRoutes = require('./admin/interviewRoutes');


// Import sub-routers for specific admin functionalities (we will create these next)
// const interviewAdminRoutes = require('./admin/interviewRoutes');
// const userAdminRoutes = require('./admin/userRoutes');
// const batchAdminRoutes = require('./admin/batchRoutes');

// --- Gatekeeper Middleware ---
// This is the most important part. Every single route defined below this line
// will first require a valid login (auth) and then check if the user's role
// is either 'admin' or 'interviewer'.
router.use(auth, requireRole('admin', 'interviewer'));


// --- Sub-Routers ---
// This structure is scalable. As we build out the admin panel, we add more routes here.

router.use('/interviews', interviewAdminRoutes);

// router.use('/users', userAdminRoutes);
// router.use('/batches', batchAdminRoutes);

// For now, we can add a simple test route to confirm it works.
router.get('/healthcheck', (req, res) => {
    res.json({ 
        message: 'Admin endpoint is secure and working.',
        user: req.user.firstName,
        role: req.user.role 
    });
});


module.exports = router;

// Import the specific router for admin interview actions

// --- Gatekeeper Middleware ---
// Protects all routes defined on this router




// --- Sub-Routers ---
// Delegate any request starting with /interviews to our specific interview router

// We can add other admin routers here in the future
// router.use('/users', userAdminRoutes);