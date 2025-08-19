// /app/src/routes/api/v1/interview.js

const express = require('express');
const router = express.Router();

// Import the controller functions
const {
    startInterview,
    getInterviewSession,
    submitAnswer,
    endInterview,
    getMyScheduledInterviews,
    startScheduledInterview,
    getInterviewHistory // <-- Add this new function // <-- Import the new function
    
} = require('../../../controllers/interviewController');

const auth = require('../../../middleware/auth');

// Import the authentication middleware
router.get('/my-sessions', auth, getMyScheduledInterviews);
router.get('/history', auth, getInterviewHistory);
router.get('/:sessionId', auth, getInterviewSession);
router.post('/:sessionId/start-scheduled', auth, startScheduledInterview);
router.post('/:sessionId/answer', auth, submitAnswer);
router.post('/:sessionId/end', auth, endInterview);

router.post('/start', auth, startInterview);


module.exports = router;