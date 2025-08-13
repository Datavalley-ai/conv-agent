const express = require('express');
const axios = require('axios');
const config = require('../../../config');
const { asyncHandler, AppError } = require('../../../middleware/error');
const { requireAuth } = require('../../../middleware/auth');
const InterviewSession = require('../../../models/InterviewSession');
const logger = require('../../../utils/logger');

const router = express.Router();

// @route   POST /api/v1/chat/question
// @desc    Generate interview question using Ollama
// @access  Private (interviewer, admin)
router.post('/question',
  requireAuth(['interviewer', 'admin']),
  asyncHandler(async (req, res) => {
    const { sessionId, context } = req.body;

    if (!sessionId) {
      throw new AppError('sessionId is required', 400);
    }

    // Verify session exists and user has access
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.interviewerId.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Unauthorized access to session', 403);
    }

    const startTime = Date.now();

    try {
      // Use wrapper service for question generation
      const response = await axios.post(`${config.wrapper.url}/generate`, {
        prompt: buildInterviewPrompt(context || {}),
        max_tokens: 200,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${config.wrapper.internalKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const latency = Date.now() - startTime;

      // Update session metrics
      session.metrics.llmLatencyP95Ms = Math.max(
        session.metrics.llmLatencyP95Ms || 0,
        latency
      );
      await session.save();

      logger.info(`Question generated for session ${sessionId} - Latency: ${latency}ms`);

      res.json({
        success: true,
        data: {
          question: response.data.response || response.data.text,
          latency: latency,
          sessionId: sessionId
        }
      });

    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`Question generation failed - Session: ${sessionId}, Latency: ${latency}ms`, error);

      // Fallback to cached questions
      const fallbackQuestion = getFallbackQuestion(context);
      
      res.json({
        success: true,
        data: {
          question: fallbackQuestion,
          latency: latency,
          sessionId: sessionId,
          fallback: true
        }
      });
    }
  })
);

// @route   POST /api/v1/chat/analyze
// @desc    Analyze candidate answer using Ollama
// @access  Private (interviewer, admin)
router.post('/analyze',
  requireAuth(['interviewer', 'admin']),
  asyncHandler(async (req, res) => {
    const { sessionId, question, answer, context } = req.body;

    if (!sessionId || !question || !answer) {
      throw new AppError('sessionId, question, and answer are required', 400);
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const startTime = Date.now();

    try {
      const analysisPrompt = buildAnalysisPrompt(question, answer, context || {});

      const response = await axios.post(`${config.wrapper.url}/generate`, {
        prompt: analysisPrompt,
        max_tokens: 300,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${config.wrapper.internalKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const latency = Date.now() - startTime;
      const analysisText = response.data.response || response.data.text;

      // Update session metrics
      session.metrics.llmLatencyP95Ms = Math.max(
        session.metrics.llmLatencyP95Ms || 0,
        latency
      );
      await session.save();

      logger.info(`Answer analyzed for session ${sessionId} - Latency: ${latency}ms`);

      res.json({
        success: true,
        data: {
          analysis: analysisText,
          score: extractScore(analysisText),
          feedback: extractFeedback(analysisText),
          latency: latency,
          sessionId: sessionId
        }
      });

    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(`Answer analysis failed - Session: ${sessionId}, Latency: ${latency}ms`, error);
      throw new AppError('Failed to analyze answer', 500);
    }
  })
);

// Helper functions
function buildInterviewPrompt(context) {
  return `You are a professional AI interviewer conducting a ${context.role || 'software engineering'} interview.

Candidate Profile: ${context.candidateLevel || 'Mid-level'} ${context.role || 'Software Engineer'}
Company: ${context.company || 'Technology Company'}
Previous Questions: ${context.previousQuestions?.slice(-2).join(', ') || 'None'}

Generate ONE concise, relevant interview question. Be professional, direct, and focused on ${context.technicalStack || 'the role requirements'}.

Question:`;
}

function buildAnalysisPrompt(question, answer, context) {
  return `As an expert interviewer, analyze this candidate's response:

Question: "${question}"
Answer: "${answer}"
Role: ${context.role || 'Software Engineer'}
Experience Level: ${context.candidateLevel || 'Mid-level'}

Provide:
1. SCORE: [1-10]
2. FEEDBACK: [Brief professional feedback]
3. ANALYSIS: [Technical accuracy, communication skills, relevance]

Response:`;
}

function extractScore(response) {
  const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
  return scoreMatch ? parseInt(scoreMatch[1]) : 5;
}

function extractFeedback(response) {
  const feedbackMatch = response.match(/FEEDBACK:\s*([^\n]+)/i);
  return feedbackMatch ? feedbackMatch[1].trim() : 'Response analyzed.';
}

function getFallbackQuestion(context) {
  const fallbackQuestions = {
    'software-engineer': [
      'Tell me about a challenging technical problem you solved recently.',
      'How do you approach debugging complex issues?',
      'Describe your experience with version control systems.'
    ],
    'default': [
      'Tell me about yourself and your experience.',
      'What interests you most about this role?',
      'Describe a project you are proud of.'
    ]
  };

  const questions = fallbackQuestions[context.role] || fallbackQuestions.default;
  return questions[Math.floor(Math.random() * questions.length)];
}

module.exports = router;
