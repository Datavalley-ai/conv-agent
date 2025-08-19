// /app/src/controllers/interviewController.js (Refactored for Referencing)

const InterviewSession = require('../models/InterviewSession');
const Conversation = require('../models/Conversation'); // <-- IMPORT THE NEW MODEL
const aiService = require('../services/aiService');

/**
 * @desc    Kicks off the AI warm-up process in the background.
 * @route   POST /api/v1/interview/:sessionId/start
 */
exports.startInterviewInitialization = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { id: candidateId, name: candidateName } = req.user;

        const session = await InterviewSession.findOne({ _id: sessionId, candidateId, status: 'scheduled' });

        if (!session) {
            return res.status(404).json({ message: 'Scheduled interview not found.' });
        }

        // Set status to initializing and save
        session.status = 'initializing';
        await session.save();

        // Immediately respond to the client so it can start polling
        res.status(202).json({ message: 'Interview initialization process started.' });

        // --- Perform the slow AI task in the background (fire-and-forget) ---
        (async () => {
            try {
                const initialPromptData = {
                    candidateName: candidateName || 'the candidate',
                    jobRole: session.jobRole || 'the specified role',
                    interviewType: session.interviewType || 'technical'
                };
                const firstMessageContent = await aiService.getInitialQuestion(initialPromptData);

                await Conversation.create({
                    sessionId: session._id,
                    role: 'assistant',
                    content: firstMessageContent,
                });

                // Once done, update status to active
                session.status = 'active';
                session.startedAt = new Date();
                await session.save();
                console.log(`Session ${session._id} successfully activated.`);

            } catch (error) {
                console.error(`Failed to initialize session ${session._id}:`, error);
                // If AI fails, mark the session as failed
                session.status = 'failed';
                await session.save();
            }
        })();

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Checks the status of an initializing interview.
 * @route   GET /api/v1/interview/:sessionId/status
 */
exports.getInitializationStatus = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { id: candidateId } = req.user;

        const session = await InterviewSession.findOne({ _id: sessionId, candidateId });

        if (!session) {
            return res.status(404).json({ message: 'Interview session not found.' });
        }

        if (session.status === 'initializing') {
            return res.status(200).json({ status: 'initializing', message: 'AI model is loading...' });
        }
        
        if (session.status === 'active') {
            const messages = await Conversation.find({ sessionId: session._id }).sort({ createdAt: 1 });
            return res.status(200).json({ status: 'ready', session: { ...session.toObject(), messages } });
        }
        
        if (session.status === 'failed') {
            return res.status(500).json({ status: 'failed', message: 'The AI interviewer failed to start. Please try again later.' });
        }

        // For any other status, indicate that the request is invalid
        res.status(400).json({ status: 'error', message: 'This interview cannot be started.' });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Start a new ad-hoc interview session
 */
exports.startInterview = async (req, res, next) => {
    try {
        const { jobRole, interviewType, difficulty } = req.body;
        const { id: candidateId, name: candidateName } = req.user; // Get user's name

        // ... (validation remains the same)

        // Deactivate any other active sessions
        await InterviewSession.updateMany(
            { candidateId, status: 'active' },
            { $set: { status: 'abandoned', endedAt: new Date() } }
        );

        // --- CHANGED: Call AI service with new metadata ---
        const firstQuestion = await aiService.getInitialQuestion({
            candidateName,
            jobRole,
            interviewType,
            interviewDuration: '20 minutes', // Or make this dynamic
        });

        if (!firstQuestion || typeof firstQuestion !== 'string' || firstQuestion.trim() === '') {
            throw new Error('The AI service failed to generate an initial question.');
        }

        // --- CHANGED: Create session WITHOUT messages array ---
        const newSession = await InterviewSession.create({
            candidateId,
            jobRole,
            interviewType,
            difficulty: difficulty || 'mid',
            status: 'active',
        });

        // --- CHANGED: Create the first message in the Conversation collection ---
        await Conversation.create({
            sessionId: newSession._id,
            role: 'assistant',
            content: firstQuestion,
        });

        res.status(201).json({
            message: 'Interview session started successfully.',
            sessionId: newSession._id,
            firstQuestion: firstQuestion,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Activate a pre-scheduled interview session
 */
exports.startScheduledInterview = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { id: candidateId } = req.user;

        const session = await InterviewSession.findOneAndUpdate(
            { _id: sessionId, candidateId, status: 'scheduled' },
            { $set: { status: 'active', startedAt: new Date() } },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ message: 'Scheduled interview session not found or already started.' });
        }

        // --- CHANGED: Get the first message from the Conversation collection ---
        const firstMessage = await Conversation.findOne({ sessionId: session._id }).sort({ createdAt: 1 });

        res.status(200).json({
            message: 'Scheduled interview has been activated.',
            sessionId: session._id,
            firstQuestion: firstMessage ? firstMessage.content : "Welcome! Let's begin."
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc     Submit an answer and get the next question
 */
exports.submitAnswer = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { answer } = req.body;
        const { id: candidateId } = req.user;

        // --- THIS IS THE FIX ---
        // We must fetch the session details *first* to get the context.
        const session = await InterviewSession.findOne({ _id: sessionId, candidateId, status: 'active' });

        if (!session) {
            return res.status(404).json({ message: 'Active interview session not found.' });
        }

        // --- Create the user's answer ---
        await Conversation.create({
            sessionId: session._id,
            role: 'user',
            content: answer,
        });
        
        // --- Fetch the complete history AFTER adding the user's new answer ---
        const messageHistory = await Conversation.find({ sessionId: session._id }).sort({ createdAt: 1 });
        const historyForAI = messageHistory.map(msg => ({ role: msg.role, content: msg.content }));

        // --- CORRECTED: Pass the full context object to the AI service ---
        const nextQuestion = await aiService.getNextQuestion({
            jobRole: session.jobRole,
            interviewType: session.interviewType,
            difficulty: session.difficulty,
            messageHistory: historyForAI
        });
        
        // --- Create the assistant's new question ---
        await Conversation.create({
            sessionId: session._id,
            role: 'assistant',
            content: nextQuestion,
        });

        res.status(200).json({ nextQuestion });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    End an interview session and generate feedback
 */
exports.endInterview = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { id: candidateId } = req.user;

        const session = await InterviewSession.findOneAndUpdate(
            { _id: sessionId, candidateId, status: 'active' },
            { $set: { status: 'completed', endedAt: new Date() } },
            { new: true } 
        );

        if (!session) {
            return res.status(404).json({ message: 'Active interview session not found.' });
        }

        // --- CHANGED: Fetch the full history for feedback generation ---
        const messageHistory = await Conversation.find({ sessionId: session._id }).sort({ createdAt: 1 });
        const historyForAI = messageHistory.map(msg => ({ role: msg.role, content: msg.content }));

        const feedback = await aiService.generateFeedback(historyForAI);

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
 */
exports.getMyScheduledInterviews = async (req, res, next) => {
    // This function does not deal with conversations, so it remains unchanged.
    try {
        const { id: candidateId } = req.user;
        const scheduledSessions = await InterviewSession.find({
            candidateId: candidateId,
            status: 'scheduled'
        }).sort({ createdAt: -1 });
        res.status(200).json(scheduledSessions);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get the history of all completed interviews for the logged-in user
 * @route   GET /api/v1/interview/history
 * @access  Private
 */
exports.getInterviewHistory = async (req, res, next) => {
    try {
        const candidateId = req.user.id;

        // Find all sessions for this user that are completed, return the newest first
        const completedSessions = await InterviewSession.find({
            candidateId: candidateId,
            status: 'completed'
        }).sort({ endedAt: -1 });

        res.status(200).json(completedSessions);
    } catch (error) {
        next(error); // Pass errors to the global handler
    }
};