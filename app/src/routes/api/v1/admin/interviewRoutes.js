// /app/src/routes/api/v1/admin/interviewRoutes.js

const express = require('express');
const router = express.Router();

// Import the specific admin controller function
const { scheduleInterview } = require('../../../../controllers/adminController');
/**
 * @route   POST /api/v1/admin/interviews/schedule
 * @desc    Schedule a new interview for a candidate.
 * @access  Private (Admin, Interviewer)
 */
router.post('/schedule', scheduleInterview);


// We will add other admin routes for interviews here later, such as:
// router.get('/', getAllScheduledInterviews);
// router.put('/:sessionId', modifyScheduledInterview);

module.exports = router;