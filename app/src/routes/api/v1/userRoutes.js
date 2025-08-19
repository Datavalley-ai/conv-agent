// /app/src/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, updatePassword } = require('../../../controllers/userController');
const auth = require('../../../middleware/auth');


// This route allows a logged-in user to get their own profile details
router.get('/me', auth, getUserProfile);


// Update user profile
router.put('/me', auth, updateUserProfile); // <-- ADD THIS LINE

router.put('/me/password', auth, updatePassword); // <-- ADD THIS LINE

module.exports = router;