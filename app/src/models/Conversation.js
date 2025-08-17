const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    speechUsed: Boolean,
    confidence: Number,
    duration: Number,
    responseTime: Number
  }
});

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: String,
  messages: [messageSchema],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  assessment: {
    score: Number,
    feedback: String,
    strengths: [String],
    improvements: [String],
    evaluatedAt: Date
  },
  metadata: {
    totalMessages: { type: Number, default: 0 },
    speechUsageCount: { type: Number, default: 0 },
    averageResponseTime: Number
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);