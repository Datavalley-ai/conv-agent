const express = require('express');
const InterviewSession = require('../../../models/InterviewSession');
const { asyncHandler, AppError } = require('../../../middleware/error');
const { requireAuth, bindSession, generateSessionBinding } = require('../../../middleware/auth');
const logger = require('../../../utils/logger');

const router = express.Router();

// @route   POST /api/v1/interview/sessions
// @desc    Create new interview session
// @access  Private (interviewer, admin)
router.post('/sessions', 
  requireAuth(['interviewer', 'admin']), 
  asyncHandler(async (req, res) => {
    const { candidateId, jobId, configId } = req.body;

    // Basic validation
    if (!candidateId || !jobId) {
      throw new AppError('candidateId and jobId are required', 400);
    }

    // Generate session binding for the request
    const sessionBinding = generateSessionBinding(req);

    // Set session deadline (20 minutes from now)
    const sessionDeadline = new Date(Date.now() + 20 * 60 * 1000);

    // Create interview session
    const session = await InterviewSession.create({
      candidateId,
      jobId,
      interviewerId: req.user.id,
      sessionBinding,
      candidateIPAddress: req.ip,
      browserFingerprint: req.headers['user-agent'] || '',
      sessionDeadline,
      status: 'scheduled'
    });

    logger.info(`Interview session created: ${session._id}`);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        sessionDeadline: session.sessionDeadline
      }
    });
  })
);

// @route   POST /api/v1/interview/sessions/:id/attach
// @desc    Attach candidate to session (start interview)
// @access  Private (candidate)
router.post('/sessions/:id/attach',
  requireAuth(['candidate']),
  bindSession,
  asyncHandler(async (req, res) => {
    const session = await InterviewSession.findById(req.params.id);

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Verify candidate matches session
    if (session.candidateId.toString() !== req.user.id) {
      throw new AppError('Unauthorized access to session', 403);
    }

    // Check if session is still valid
    if (session.sessionDeadline < new Date()) {
      throw new AppError('Session has expired', 410);
    }

    // Verify session binding
    if (session.sessionBinding !== req.sessionBinding) {
      throw new AppError('Session binding mismatch', 403);
    }

    // Start the session
    session.status = 'active';
    session.startedAt = new Date();
    await session.save();

    logger.info(`Candidate attached to session: ${session._id}`);

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        timingConfig: session.timingConfig,
        questionPlan: session.questionPlan
      }
    });
  })
);

// @route   POST /api/v1/interview/sessions/:id/end
// @desc    End interview session
// @access  Private (interviewer, admin, or session candidate)
router.post('/sessions/:id/end',
  requireAuth(['candidate', 'interviewer', 'admin']),
  asyncHandler(async (req, res) => {
    const session = await InterviewSession.findById(req.params.id);

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Check permissions
    const isCandidate = session.candidateId.toString() === req.user.id;
    const isInterviewer = session.interviewerId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCandidate && !isInterviewer && !isAdmin) {
      throw new AppError('Unauthorized to end this session', 403);
    }

    // End the session
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    logger.info(`Interview session ended: ${session._id} by user: ${req.user.id}`);

    res.json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        duration: session.endedAt - session.startedAt
      }
    });
  })
);

// @route   GET /api/v1/interview/sessions/:id/report
// @desc    Get interview report
// @access  Private (interviewer, admin)
router.get('/sessions/:id/report',
  requireAuth(['interviewer', 'admin']),
  asyncHandler(async (req, res) => {
    const session = await InterviewSession.findById(req.params.id)
      .populate('candidateId', 'firstName lastName email')
      .populate('interviewerId', 'firstName lastName');

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Check permissions
    const isInterviewer = session.interviewerId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInterviewer && !isAdmin) {
      throw new AppError('Unauthorized to view this report', 403);
    }

    res.json({
      success: true,
      data: {
        session,
        reportUrl: session.driveFileId ? 
          `https://drive.google.com/file/d/${session.driveFileId}/view` : null
      }
    });
  })
);

// @route   GET /api/v1/interview/sessions
// @desc    Get user's interview sessions
// @access  Private
router.get('/sessions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    let query = {};

    // Filter based on user role
    if (req.user.role === 'candidate') {
      query.candidateId = req.user.id;
    } else if (req.user.role === 'interviewer') {
      query.interviewerId = req.user.id;
    }
    // Admin can see all sessions (no filter)

    const sessions = await InterviewSession.find(query)
      .populate('candidateId', 'firstName lastName email')
      .populate('interviewerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: sessions
    });
  })
);

module.exports = router;
