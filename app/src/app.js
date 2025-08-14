require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const { requireAuth } = require('./middleware/auth');

// Import routes
const healthRoutes = require('./routes/api/v1/health');
const authRoutes = require('./routes/api/v1/auth');
const interviewRoutes = require('./routes/api/v1/interview');
const chatRoutes = require('./routes/api/v1/chat');

const app = express();

// Connect database first
connectDB();

// Middleware
app.use(cors());
// Handle Google Cloud Shell IAP headers
app.use((req, res, next) => {
  // Add CORS headers for IAP
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-goog-iap-jwt-assertion");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/v1/chat', chatRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interviewer-gateway'
  });
});

// Error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8081;

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 AI Interviewer Gateway running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/api/v1/healthz`);
  logger.info(`🔐 Auth endpoints available at http://localhost:${PORT}/api/v1/auth/`);
  logger.info(`📋 Interview endpoints available at http://localhost:${PORT}/api/v1/interview/`);
  logger.info(`🤖 Chat endpoints available at http://localhost:${PORT}/api/v1/chat/`);
  logger.info(`✅ Phase 2 - Ollama Integration Complete!`);
});

server.setTimeout(0);
module.exports = app;
app.use('/api/v1', require('./routes/api/v1/health'));
