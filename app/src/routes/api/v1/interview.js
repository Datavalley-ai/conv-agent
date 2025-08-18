// /app/src/routes/api/v1/interview.js

const express = require('express');
const router = express.Router();

// Import the controller functions
const {
    startInterview,
    getInterviewSession,
    submitAnswer,
    endInterview,
    getMyScheduledInterviews
} = require('../../../controllers/interviewController');

// Import the authentication middleware
const auth = require('../../../middleware/auth');

router.post('/start', auth, startInterview);
router.get('/:sessionId', auth, getInterviewSession);
router.post('/:sessionId/answer', auth, submitAnswer);
router.post('/:sessionId/end', auth, endInterview);
router.get('/my-sessions', auth, getMyScheduledInterviews);


module.exports = router;