if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
  globalThis.Headers = fetch.Headers;
  globalThis.Request = fetch.Request;
  globalThis.Response = fetch.Response;
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const config = require('./config');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const { requireAuth } = require('./middleware/auth');
const conversationRoutes = require('./routes/api/v1/conversation');
const adminUserRoutes = require('./routes/api/v1/adminUsers');
const { requireRole } = require('./middleware/roles');
const interviewRoutes = require('./routes/api/v1/interview');


// Import speech service
const speechService = require('./services/speechService');

let modelReady = false;

// Configure multer for speech uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Import routes
const healthRoutes = require('./routes/api/v1/health');
const authRoutes = require('./routes/api/v1/auth');
const chatRoutes = require('./routes/api/v1/chat');
const wrapperRoutes = require('./routes/api/v1/wrapper');

const app = express();

// Connect database first
connectDB();

// Trust proxy for proper IP detection (Phase 1 requirement)
app.set('trust proxy', true);

// Security middleware with proper configuration
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://interviewer.datavalley.ai'] 
    : [
    'http://localhost:3000',
    'http://localhost:8081', 
    'https://interviewer.datavalley.ai',  // Add your real URL here
    'https://8081-cs-e41dade3-eb9a-494e-9e22-0605151c81f0.cs-europe-west1-xedi.cloudshell.dev',
    /https:\/\/.*\.cloudshell\.dev$/,  
    /https:\/\/.*\.cloud\.google\.com$/  
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-goog-iap-jwt-assertion']
}));
app.options('*', cors());


// Request ID middleware for tracing
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Health endpoints (before other middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interviewer',
    requestId: req.requestId
  });
});

app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interviewer',
    requestId: req.requestId
  });
});

app.get('/v1/healthz', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-interviewer-wrapper',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Parse middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId
    });
  });
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Pretty URL Routes - Frontend Pages (no auth needed for static files)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signin.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/interview', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/interview.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
});

// Mount wrapper routes FIRST (for /v1/chat/completions)
app.use('/v1', wrapperRoutes);

// API routes with proper error handling
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interview', interviewRoutes);

app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/conversation', conversationRoutes);
app.use('/api/v1/admin/users',
  requireAuth(['admin', 'super-admin']),
  requireRole('super-admin', 'admin'),
  adminUserRoutes
);

// Speech-to-Text endpoint with proper error handling
app.post('/v1/speech/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_KEY}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        requestId: req.requestId 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        requestId: req.requestId 
      });
    }

    // Validate file size and type
    if (req.file.size > 25 * 1024 * 1024) {
      return res.status(413).json({
        error: 'File too large. Maximum size is 25MB',
        requestId: req.requestId
      });
    }

    // Use main transcribe method with timeout
    const transcribePromise = speechService.transcribe(req.file.buffer);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transcription timeout')), 30000)
    );

    const result = await Promise.race([transcribePromise, timeoutPromise]);
    
    if (result.success) {
      logger.info('Speech transcription successful', {
        provider: result.provider,
        confidence: result.confidence,
        length: result.transcript.length,
        cost: result.cost,
        requestId: req.requestId
      });
      
      res.json({
        transcript: result.transcript,
        confidence: result.confidence,
        provider: result.provider,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else {
      logger.error('Speech transcription failed:', {
        error: result.error,
        requestId: req.requestId
      });
      res.status(500).json({ 
        error: result.error || 'Transcription failed',
        provider: result.provider,
        requestId: req.requestId
      });
    }
  } catch (error) {
    logger.error('Speech transcription error:', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    res.status(500).json({ 
      error: error.message === 'Transcription timeout' 
        ? 'Transcription service timeout' 
        : 'Transcription service error',
      requestId: req.requestId
    });
  }
});

// Text-to-Speech endpoint with proper error handling
app.post('/v1/speech/synthesize', async (req, res) => {
  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_KEY}`) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        requestId: req.requestId 
      });
    }

    const { text, voice = 'alloy' } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        error: 'No text provided',
        requestId: req.requestId 
      });
    }

    if (text.length > 4096) {
      return res.status(400).json({
        error: 'Text too long. Maximum length is 4096 characters',
        requestId: req.requestId
      });
    }

    // Enhance text for more natural speech
    const enhancedText = enhanceTextForSpeech(text);
    
    // Use main synthesize method with timeout
    const synthesizePromise = speechService.synthesize(enhancedText, { voice });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Synthesis timeout')), 30000)
    );

    const result = await Promise.race([synthesizePromise, timeoutPromise]);
    
    if (result.success) {
      logger.info('Speech synthesis successful', {
        provider: result.provider,
        voice: result.voice,
        textLength: text.length,
        cost: result.cost,
        requestId: req.requestId
      });
      
      res.set({
        'Content-Type': result.mimeType || 'audio/mpeg',
        'Content-Length': result.audioBuffer.length,
        'X-Speech-Provider': result.provider,
        'X-Voice-Used': result.voice,
        'X-Request-Id': req.requestId
      });
      
      res.send(result.audioBuffer);
    } else {
      logger.error('Speech synthesis failed:', {
        error: result.error,
        requestId: req.requestId
      });
      res.status(500).json({ 
        error: result.error || 'Speech synthesis failed',
        provider: result.provider,
        requestId: req.requestId
      });
    }
  } catch (error) {
    logger.error('Speech synthesis error:', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    res.status(500).json({ 
      error: error.message === 'Synthesis timeout' 
        ? 'Speech synthesis timeout' 
        : 'Speech synthesis service error',
      requestId: req.requestId
    });
  }
});

// Speech health check endpoint
app.get('/v1/speech/health', async (req, res) => {
  try {
    const healthPromise = speechService.healthCheck();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), 10000)
    );

    const health = await Promise.race([healthPromise, timeoutPromise]);
    
    res.json({
      ...health,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Speech health check error:', {
      error: error.message,
      requestId: req.requestId
    });
    res.status(500).json({ 
      error: 'Health check failed',
      requestId: req.requestId 
    });
  }
});

// Enhanced text for more natural speech
function enhanceTextForSpeech(text) {
  return text
    // Add natural pauses
    .replace(/\. /g, '... ')
    .replace(/\? /g, '? ')
    .replace(/! /g, '! ')
    
    // Add conversational elements for interview context
    .replace(/^(That's interesting)/i, 'Hmm, that\'s interesting')
    .replace(/^(Can you tell me)/i, 'So, can you tell me')
    .replace(/^(What about)/i, 'And what about')
    .replace(/^(I see)/i, 'I see, I see')
    .replace(/^(Tell me about)/i, 'Now, tell me about')
    .replace(/^(How would you)/i, 'How would you')
    
    // Professional interview transitions
    .replace(/Great\./g, 'Great!')
    .replace(/Good\./g, 'Very good.')
    .replace(/Excellent\./g, 'Excellent, excellent.')
    .replace(/Perfect\./g, 'Perfect!')
    
    // Add interview-specific enhancements
    .replace(/next question/gi, 'next question then')
    .replace(/follow up/gi, 'follow-up question')
    .replace(/can you elaborate/gi, 'can you elaborate on that a bit more');
}

// Model warmup endpoint with proper timeout
app.post('/v1/warmup', async (req, res) => {
  if (modelReady) {
    return res.json({ 
      status: 'ready',
      requestId: req.requestId 
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

    const r = await fetch(`${process.env.OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.MODEL,
        prompt: 'ping',
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(errorText);
    }

    modelReady = true;
    res.json({ 
      status: 'ready',
      requestId: req.requestId 
    });
  } catch (err) {
    logger.error('Model warmup error:', {
      error: err.message,
      requestId: req.requestId
    });
    res.status(202).json({ 
      status: 'warming', 
      detail: String(err),
      requestId: req.requestId 
    });
  }
});

// Debug route (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(function(r){
      if (r.route && r.route.path){
        routes.push(`${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
      }
    });
    res.json({ routes, requestId: req.requestId });
  });
}

// Global error handler (must be last)
app.use((error, req, res, next) => {
  logger.error('Unhandled application error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: req.requestId,
    ip: req.ip
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFound);

// Last resort error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8081;

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 AI Interviewer Gateway running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🔐 Auth endpoints available at http://localhost:${PORT}/api/v1/auth/`);
  logger.info(`📋 Interview endpoints available at http://localhost:${PORT}/api/v1/interview/`);
  logger.info(`🤖 Chat endpoints available at http://localhost:${PORT}/api/v1/chat/`);
  logger.info(`🎤 Speech endpoints available at http://localhost:${PORT}/v1/speech/`);
  logger.info(`🔄 Wrapper endpoint available at http://localhost:${PORT}/v1/chat/completions`);
  logger.info(`✅ Enhanced error handling and monitoring active!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.stack || reason
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

server.setTimeout(120000); // 2 minutes timeout

module.exports = app;
