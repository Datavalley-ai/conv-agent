// /app/src/controllers/interviewController.js

const InterviewSession = require('../models/InterviewSession'); 
// Import the real AI service we just created
const aiService = require('../services/aiService'); 

/**
 * @desc    Start a new interview session
 * @route   POST /api/v1/interview/start
 * @access  Private
 */
exports.startInterview = async (req, res, next) => {
    try {
        const { jobRole, interviewType, difficulty } = req.body;
        const candidateId = req.user.id; 

        if (!jobRole || !interviewType) {
            return res.status(400).json({ message: 'Job role and interview type are required.' });
        }

        await InterviewSession.updateMany(
            { candidateId, status: 'active' },
            { $set: { status: 'abandoned', endedAt: new Date() } }
        );

        const firstQuestion = await aiService.getInitialQuestion({ jobRole, interviewType });

        // --- THE FIX ---
        // 🛡️ This guard clause prevents the error by checking the AI's response.
        if (!firstQuestion || typeof firstQuestion !== 'string' || firstQuestion.trim() === '') {
            throw new Error('The AI service failed to generate an initial question. Please check the service configuration and logs.');
        }
        // --- END OF FIX ---

        const newSession = await InterviewSession.create({
            candidateId,
            jobRole,
            interviewType,
            difficulty: difficulty || 'mid',
            status: 'active',
            messages: [{ role: 'assistant', content: firstQuestion }],
            sessionBinding: require('crypto').randomUUID(), 
            candidateIPAddress: req.ip
        });

        res.status(201).json({
            message: 'Interview session started successfully.',
            sessionId: newSession._id,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get an existing interview session's state
 * @route   GET /api/v1/interview/:sessionId
 * @access  Private
 */
exports.getInterviewSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const candidateId = req.user.id;

        const session = await InterviewSession.findOne({ _id: sessionId, candidateId });

        if (!session) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }
        
        // Return the relevant session data to the frontend
        res.status(200).json({
            sessionId: session._id,
            jobRole: session.jobRole,
            status: session.status,
            messages: session.messages
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Submit an answer and get the next question
 * @route   POST /api/v1/interview/:sessionId/answer
 * @access  Private
 */
exports.submitAnswer = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { answer } = req.body;
        const candidateId = req.user.id;

        if (!answer) {
            return res.status(400).json({ message: 'Answer text is required.' });
        }

        const session = await InterviewSession.findOne({ _id: sessionId, candidateId, status: 'active' });

        if (!session) {
            return res.status(404).json({ message: 'Active interview session not found.' });
        }

        session.messages.push({ role: 'user', content: answer });
        
        // --- AI INTEGRATION ---
        // Call the AI service with the full conversation history to get a follow-up question
        const nextQuestion = await aiService.getNextQuestion(session.messages);
        
        session.messages.push({ role: 'assistant', content: nextQuestion });

        await session.save();

        res.status(200).json({ nextQuestion });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    End an interview session and generate feedback
 * @route   POST /api/v1/interview/:sessionId/end
 * @access  Private
 */
exports.endInterview = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const candidateId = req.user.id;

        const session = await InterviewSession.findOneAndUpdate(
            { _id: sessionId, candidateId, status: 'active' },
            { $set: { status: 'completed', endedAt: new Date() } },
            { new: true } 
        );

        if (!session) {
            return res.status(404).json({ message: 'Active interview session not found.' });
        }

        // --- AI INTEGRATION ---
        // After ending, call the AI service to generate structured feedback
        const feedback = await aiService.generateFeedback(session.messages);

        // Save the structured feedback to the session document
        session.feedback = feedback;
        await session.save();

        res.status(200).json({ 
            message: 'Interview session completed and feedback generated.',
            sessionId: session._id,
            feedback: feedback
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all interviews scheduled for the logged-in candidate
 * @route   GET /api/v1/interview/my-sessions
 * @access  Private
 */
exports.getMyScheduledInterviews = async (req, res, next) => {
    try {
        const candidateId = req.user.id;

        // Find all sessions for this user that are still in the 'scheduled' state
        const scheduledSessions = await InterviewSession.find({
            candidateId: candidateId,
            status: 'scheduled'
        }).sort({ createdAt: -1 }); // Show the most recently scheduled interviews first

        res.status(200).json(scheduledSessions);
    } catch (error) {
        next(error); // Pass errors to the global handler
    }
};