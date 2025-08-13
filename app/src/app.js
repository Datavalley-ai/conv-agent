const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
//const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');


// Import middleware
const { errorHandler, notFound } = require('./middleware/error');
const { requireAuth, bindSession } = require('./middleware/auth');

// Import routes
const healthRoutes = require('./routes/api/v1/health');
const authRoutes = require('./routes/api/v1/auth');
const interviewRoutes = require('./routes/api/v1/interview');
const chatRoutes = require('./routes/api/v1/chat');

// Connect to database
connectDB();

const app = express();

// Trust proxy for session binding
app.set('trust proxy', true);

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
//app.use('/api/v1/auth', authLimiter);
//app.use('/api/v1', apiLimiter);


// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/v1/chat', chatRoutes);

// Protected route example
app.get('/api/v1/protected', requireAuth(['admin']), (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user
  });
});

// Basic route for frontend
// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interviewer-gateway',
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// Error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// ✅ FIX: Declare server variable properly
const server = app.listen(PORT, () => {
  logger.info(`🚀 AI Interviewer Gateway running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/api/v1/healthz`);
  logger.info(`🔐 Auth endpoints available at http://localhost:${PORT}/api/v1/auth/`);
  logger.info(`📋 Interview endpoints available at http://localhost:${PORT}/api/v1/interview/`);
  logger.info(`🤖 Chat endpoints available at http://localhost:${PORT}/api/v1/chat/`);
  logger.info(`🔗 Ollama integration: ${config.ollama.url}`);
  logger.info(`🔗 Wrapper integration: ${config.wrapper.url}`);
  logger.info(`✅ Phase 2 - Ollama Integration Complete!`);
});

// Set server timeout to prevent Cloud Run connection errors
server.setTimeout(0); // Unlimited timeout

module.exports = app;
