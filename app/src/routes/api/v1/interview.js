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
    startScheduledInterview // <-- Import the new function
    
} = require('../../../controllers/interviewController');

const auth = require('../../../middleware/auth');

// Import the authentication middleware
router.get('/my-sessions', auth, getMyScheduledInterviews);
router.post('/start', auth, startInterview);
router.post('/:sessionId/start-scheduled', auth, startScheduledInterview);
router.get('/:sessionId', auth, getInterviewSession);
router.post('/:sessionId/answer', auth, submitAnswer);
router.post('/:sessionId/end', auth, endInterview);


module.exports = router;