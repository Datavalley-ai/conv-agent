const express = require('express');
const router = express.Router();
const InterviewSession = require('../../../models/InterviewSession');
const { requireAuth, bindSession } = require('../../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Start new interview session
router.post('/start', requireAuth(['candidate', 'interviewer']), bindSession, async (req, res) => {
  console.log('DEBUG - req.user:', req.user);
  console.log('DEBUG - req.user.id:', req.user.id);
  console.log('DEBUG - req.user.sub:', req.user.sub);
  
  try {
    const { type = 'general' } = req.body;
    
    // FIXED: Use the correct user ID field from JWT token
    const candidateId = req.user.id || req.user.sub;
    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in authentication token'
      });
    }
    
    const jobRoleMap = {
      'technical': 'Software Engineer',
      'behavioral': 'General Role',
      'general': 'General Role'
    };
    
    // Generate unique session binding using Phase 1 spec
    const sessionBinding = req.sessionBinding || crypto.createHash('sha256')
      .update(candidateId + Date.now().toString())
      .digest('hex');
    
    // Check for existing active session to prevent duplicates
    const existingSession = await InterviewSession.findOne({
      candidateId: candidateId,
      status: 'active'
    });
    
    if (existingSession) {
      return res.status(409).json({
        success: false,
        error: 'You already have an active interview session',
        data: {
          existingSessionId: existingSession._id
        }
      });
    }
    
    const session = new InterviewSession({
      candidateId: candidateId, // FIXED: Use the correct candidateId
      jobRole: jobRoleMap[type] || 'General Role',
      difficulty: 'mid',
      status: 'active',
      startedAt: new Date(),
      sessionBinding: sessionBinding,
      questionPlan: [],
      recordingConsentGiven: false,
      candidateIPAddress: req.ip || req.connection.remoteAddress,
      browserFingerprint: req.headers['user-agent'] || 'unknown',
      timingConfig: {
        maxAnswerSeconds: 120,
        maxSessionMinutes: 20,
        warningAtSeconds: 90
      },
      metrics: {
        interrupts: 0,
        totalSpeakingSec: 0,
        sttLatencyP95Ms: 0,
        llmLatencyP95Ms: 0,
        ttsLatencyP95Ms: 0,
        wsDeliveryP95Ms: 0
      },
      dataRetentionPolicy: {
        transcriptRetentionDays: 30,
        audioRetentionDays: 30,
        summaryRetentionDays: 365
      }
    });

    await session.save();

    res.status(201).json({
      success: true,
      data: {
        id: session._id, // FIXED: Remove escaped underscore
        type: type,
        jobRole: session.jobRole,
        status: session.status,
        startTime: session.startedAt,
        sessionBinding: session.sessionBinding
      }
    });
    
  } catch (error) {
    console.error('Error starting interview:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate session detected. Please try again.'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid session data provided: ' + error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to start interview session',
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// Chat endpoint for interview conversation
router.post('/:sessionId/chat', requireAuth(['candidate', 'interviewer']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, type } = req.body;
    
    // FIXED: Use the correct user ID field
    const userId = req.user.id || req.user.sub;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in authentication token'
      });
    }
    
    // Validate input
    if (!message && type !== 'system') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }
    
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Interview session not found' 
      });
    }

    // Verify session ownership - FIXED: Use correct comparison
    if (session.candidateId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this session'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Interview session is not active' 
      });
    }

    // Check session timeout (Phase 1 requirement)
    const maxSessionMs = session.timingConfig.maxSessionMinutes * 60 * 1000;
    if (Date.now() - new Date(session.startedAt).getTime() > maxSessionMs) {
      session.status = 'expired';
      await session.save();
      
      return res.status(408).json({
        success: false,
        error: 'Interview session has expired'
      });
    }

    // Initialize messages array if not exists
    if (!session.messages) {
      session.messages = [];
    }

    if (type === 'system' && message === 'START_INTERVIEW') {
      const welcomeMessage = `Hello! Welcome to your ${session.jobRole} interview. I'm your AI interviewer today. Let's begin with a simple question: Can you tell me a bit about yourself and your background?`;
      
      session.messages.push({
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      });
      
      await session.save();
      
      return res.json({
        success: true,
        response: welcomeMessage,
        sessionId: sessionId
      });
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Generate AI response with timeout
    let aiResponse;
    try {
      const aiService = require("../../../services/aiService");
      
      // Set timeout for AI service call
      const aiPromise = aiService.generateInterviewResponse(message, {
        jobRole: session.jobRole,
        messages: session.messages || []
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI service timeout')), 10000)
      );
      
      aiResponse = await Promise.race([aiPromise, timeoutPromise]);
      
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback response
      aiResponse = "I apologize, but I'm experiencing some technical difficulties. Could you please repeat your response? Let's continue with the interview.";
    }
    
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    await session.save();
    
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId,
      messageCount: session.messages.length
    });
    
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process chat message',
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// End interview session
router.post('/:sessionId/end', requireAuth(['candidate', 'interviewer', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Interview session not found'
      });
    }
    
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: 'Interview session ended successfully',
      data: {
        sessionId: session._id, // FIXED: Remove escaped underscore
        duration: Math.round((session.endedAt - session.startedAt) / (1000 * 60))
      }
    });
    
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end interview session'
    });
  }
});

// Get user interview stats
router.get('/stats', requireAuth(['candidate', 'interviewer']), async (req, res) => {
  try {
    // FIXED: Use the correct user ID field
    const userId = req.user.id || req.user.sub;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in authentication token'
      });
    }
    
    const sessions = await InterviewSession.find({ candidateId: userId });
    
    const completed = sessions.filter(s => s.status === 'completed').length;
    const active = sessions.filter(s => s.status === 'active').length;
    const totalScore = 0; // TODO: Implement scoring
    const averageScore = 0;
    const totalTime = sessions.reduce((sum, s) => {
      if (s.startedAt && s.endedAt) {
        return sum + Math.round((s.endedAt - s.startedAt) / (1000 * 60));
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        completed,
        active,
        averageScore,
        totalTime,
        totalSessions: sessions.length
      }
    });
    
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      data: {
        completed: 0,
        active: 0,
        averageScore: 0,
        totalTime: 0,
        totalSessions: 0
      }
    });
  }
});

// Get recent interview sessions
router.get('/recent', requireAuth(['candidate', 'interviewer']), async (req, res) => {
  try {
    // FIXED: Use the correct user ID field
    const userId = req.user.id || req.user.sub;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found in authentication token'
      });
    }
    
    const sessions = await InterviewSession
      .find({ candidateId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('jobRole status startedAt endedAt createdAt');

    const formattedSessions = sessions.map(session => ({
      id: session._id, // FIXED: Remove escaped underscore
      type: session.jobRole,
      status: session.status,
      score: 0, // TODO: Implement scoring
      duration: session.startedAt && session.endedAt ? 
        Math.round((session.endedAt - session.startedAt) / (1000 * 60)) : 0,
      createdAt: session.createdAt
    }));

    res.json({
      success: true,
      data: formattedSessions
    });
    
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent sessions',
      data: []
    });
  }
});

module.exports = router;
