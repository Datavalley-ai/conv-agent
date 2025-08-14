const express = require('express');
const router = express.Router();
const InterviewSession = require('../../../models/InterviewSession');
const { requireAuth } = require('../../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Start new interview session
router.post('/start', requireAuth(), async (req, res) => {
  try {
    const { type = 'general' } = req.body;
    
    const jobRoleMap = {
      'technical': 'Software Engineer',
      'behavioral': 'General Role',
      'general': 'General Role'
    };
    
    const session = new InterviewSession({
      candidateId: req.user.id,
      jobRole: jobRoleMap[type] || 'General Role',
      difficulty: 'mid',
      status: 'active',
      startedAt: new Date(),
      sessionBinding: uuidv4(),
      questionPlan: [],
      timingConfig: {
        maxAnswerSeconds: 120,
        maxSessionMinutes: 20,
        warningAtSeconds: 90
      }
    });

    await session.save();

    res.json({
      success: true,
      data: {
        id: session._id,
        type: type,
        jobRole: session.jobRole,
        status: session.status,
        startTime: session.startedAt
      }
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview session'
    });
  }
});

// Chat endpoint for interview conversation
router.post('/:sessionId/chat', requireAuth(), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, type } = req.body;
    
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Interview session not found' 
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'Interview session is not active' 
      });
    }

    if (type === 'system' && message === 'START_INTERVIEW') {
      const welcomeMessage = `Hello! Welcome to your ${session.jobRole} interview. I'm your AI interviewer today. Let's begin with a simple question: Can you tell me a bit about yourself and your background?`;
      
      if (!session.messages) {
        session.messages = [];
      }
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

    if (!session.messages) {
      session.messages = [];
    }
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Generate AI response using Ollama
    const aiService = require("../../../services/aiService");
    const aiResponse = await aiService.generateInterviewResponse(message, {
      jobRole: session.jobRole,
      messages: session.messages || []
    });
    
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    await session.save();
    
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process chat message' 
    });
  }
});

// Get user interview stats
router.get('/stats', requireAuth(), async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ candidateId: req.user.id });
    
    const completed = sessions.filter(s => s.status === 'completed').length;
    const totalScore = 0;
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
        averageScore,
        totalTime
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.json({
      success: true,
      data: {
        completed: 0,
        averageScore: 0,
        totalTime: 0
      }
    });
  }
});

// Get recent interview sessions
router.get('/recent', requireAuth(), async (req, res) => {
  try {
    const sessions = await InterviewSession
      .find({ candidateId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('jobRole status startedAt endedAt createdAt');

    const formattedSessions = sessions.map(session => ({
      type: session.jobRole,
      status: session.status,
      score: 0,
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
    res.json({
      success: true,
      data: []
    });
  }
});

module.exports = router;
