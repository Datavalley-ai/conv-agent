const express = require('express');
const axios = require('axios');
const config = require('../../../config');
const { asyncHandler, AppError } = require('../../../middleware/error');
const { requireInternalAuth } = require('../../../middleware/auth'); // Bearer token auth
const contextManager = require('../../../services/contextManager');
const logger = require('../../../utils/logger');

const router = express.Router();

// @route   POST /api/v1/conversation/completions
// @desc    AI-driven conversation for speech-first interviews
// @access  Private (bearer token)
router.post('/completions',
  requireInternalAuth,
  asyncHandler(async (req, res) => {
    const { messages, sessionId, speechUsed = false, confidence = 1.0 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AppError('Messages array is required', 400);
    }

    const currentSessionId = sessionId || `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = messages[messages.length - 1];
    const startTime = Date.now();

    try {
      // Save user message to conversation history
      await contextManager.saveMessage(
        currentSessionId,
        userMessage.role,
        userMessage.content,
        {
          speechUsed: speechUsed,
          confidence: confidence,
          timestamp: new Date()
        }
      );

      // Get full conversation context for AI
      const contextMessages = await contextManager.getContextForAI(currentSessionId, true);

      // Call Ollama via wrapper service (reusing your existing pattern)
      const response = await axios.post(`${config.wrapper.url}/chat`, {
        model: process.env.MODEL || 'llama3.1:8b-instruct-q5_K_M',
        messages: contextMessages,
        stream: false,
        options: {
          max_tokens: parseInt(process.env.MAX_TOKENS) || 512,
          temperature: 0.7,
          timeout: parseInt(process.env.TIMEOUT_MS) || 30000
        }
      }, {
        headers: {
          'Authorization': `Bearer ${config.wrapper.internalKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 35000
      });

      const aiResponse = response.data.message?.content || response.data.response || response.data.text;
      const latency = Date.now() - startTime;

      if (!aiResponse) {
        throw new AppError('Invalid response from AI service', 500);
      }

      // Save AI response to conversation history
      await contextManager.saveMessage(
        currentSessionId,
        'assistant',
        aiResponse,
        {
          responseTime: latency,
          model: process.env.MODEL || 'llama3.1',
          timestamp: new Date()
        }
      );

      logger.info(`Conversation response generated - Session: ${currentSessionId}, Latency: ${latency}ms, Speech: ${speechUsed}`);

      // Return in OpenAI-compatible format
      res.json({
        id: `chatcmpl-${currentSessionId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: process.env.MODEL || 'llama3.1',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: aiResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: contextMessages.length * 50, // Rough estimate
          completion_tokens: aiResponse.length / 4,    // Rough estimate
          total_tokens: (contextMessages.length * 50) + (aiResponse.length / 4)
        },
        sessionId: currentSessionId,
        metadata: {
          speechUsed: speechUsed,
          confidence: confidence,
          latency: latency
        }
      });

    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`Conversation failed - Session: ${currentSessionId}, Latency: ${latency}ms, Error: ${error.message}`);

      // Fallback response for continuity
      const fallbackResponse = getFallbackResponse(userMessage.content);
      
      // Still save the fallback response
      await contextManager.saveMessage(
        currentSessionId,
        'assistant',
        fallbackResponse,
        {
          responseTime: latency,
          fallback: true,
          error: error.message,
          timestamp: new Date()
        }
      );

      res.json({
        id: `chatcmpl-${currentSessionId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'fallback',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: fallbackResponse
          },
          finish_reason: 'stop'
        }],
        sessionId: currentSessionId,
        metadata: {
          fallback: true,
          latency: latency,
          speechUsed: speechUsed
        }
      });
    }
  })
);

// @route   GET /api/v1/conversation/:sessionId/history
// @desc    Get conversation history for a session
// @access  Private (bearer token)
router.get('/:sessionId/history',
  requireInternalAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new AppError('SessionId is required', 400);
    }

    const conversation = await contextManager.getConversationForAssessment(sessionId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    res.json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        messages: conversation.messages,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        status: conversation.status,
        metadata: conversation.metadata,
        messageCount: conversation.messages.length
      }
    });
  })
);

// @route   POST /api/v1/conversation/:sessionId/end
// @desc    End a conversation session
// @access  Private (bearer token)
router.post('/:sessionId/end',
  requireInternalAuth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { assessment } = req.body;

    if (!sessionId) {
      throw new AppError('SessionId is required', 400);
    }

    const conversation = await contextManager.endConversation(sessionId, assessment);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    logger.info(`Conversation ended - Session: ${sessionId}, Duration: ${conversation.endedAt - conversation.startedAt}ms`);

    res.json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        endedAt: conversation.endedAt,
        status: conversation.status,
        assessment: conversation.assessment,
        totalMessages: conversation.metadata.totalMessages,
        duration: conversation.endedAt - conversation.startedAt
      }
    });
  })
);

// @route   GET /api/v1/conversation/health
// @desc    Health check for conversation service
// @access  Private (bearer token)
router.get('/health',
  requireInternalAuth,
  asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      // Test wrapper service connection
      const wrapperHealth = await axios.get(`${config.wrapper.url}/health`, {
        headers: { 'Authorization': `Bearer ${config.wrapper.internalKey}` },
        timeout: 5000
      });

      const latency = Date.now() - startTime;

      res.json({
        status: 'healthy',
        service: 'conversation',
        timestamp: new Date().toISOString(),
        latency: latency,
        dependencies: {
          wrapper: wrapperHealth.status === 200 ? 'healthy' : 'unhealthy',
          database: 'healthy', // Assume healthy if we got here
          ollama: wrapperHealth.data?.ollama || 'unknown'
        },
        version: process.env.npm_package_version || '1.0.0'
      });

    } catch (error) {
      logger.error('Conversation health check failed:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        service: 'conversation',
        timestamp: new Date().toISOString(),
        error: error.message,
        latency: Date.now() - startTime
      });
    }
  })
);

// Helper Functions
function getFallbackResponse(userMessage) {
  const fallbackResponses = {
    greeting: [
      "Hello! I'm your AI interviewer. Let's start with your background - could you tell me about your professional experience?",
      "Welcome! I'm here to conduct your interview. Let's begin - what interests you most about this role?"
    ],
    experience: [
      "That's interesting. Can you tell me more about a specific project you worked on?",
      "I see. What challenges did you face in your previous role, and how did you overcome them?"
    ],
    technical: [
      "Thank you for sharing that. Can you walk me through your problem-solving approach?",
      "That's valuable experience. How do you stay updated with new technologies in your field?"
    ],
    default: [
      "I apologize, but I'm experiencing some technical difficulties. Could you please rephrase your response?",
      "Thank you for that response. Let's continue - what would you say is your greatest professional strength?"
    ]
  };

  // Simple keyword-based fallback selection
  const message = userMessage.toLowerCase();
  
  if (message.includes('hello') || message.includes('hi') || message.includes('start')) {
    return getRandomResponse(fallbackResponses.greeting);
  } else if (message.includes('experience') || message.includes('worked') || message.includes('job')) {
    return getRandomResponse(fallbackResponses.experience);
  } else if (message.includes('technical') || message.includes('code') || message.includes('programming')) {
    return getRandomResponse(fallbackResponses.technical);
  } else {
    return getRandomResponse(fallbackResponses.default);
  }
}

function getRandomResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = router;
