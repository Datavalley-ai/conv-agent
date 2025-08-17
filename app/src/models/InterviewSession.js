const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    confidence: Number,
    latency: Number,
    provider: String
  }
}, { _id: true });

const questionSchema = new mongoose.Schema({
  questionId: String,            // UUID of the prompt in your question bank
  question: String,              // Text sent to the candidate
  expectedDuration: Number,      // Seconds AI expects the answer to take
  category: String,              // "algorithms", "system-design", …
  answer: String,                // Candidate's raw answer (optional)
  aiAnalysis: String,            // AI feedback (optional)
  score: Number,                 // 0-100 (optional)
  createdAt: { type: Date, default: Date.now }
});

const interviewSessionSchema = new mongoose.Schema(
  {
    /* ——— Foreign keys ——— */
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      index: true
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /* ——— Basic context ——— */
    jobRole: {                    // e.g. "Backend Engineer"
      type: String,
      required: true,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['junior', 'mid', 'senior'],
      default: 'mid'
    },

    /* ——— Lifecycle ——— */
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'terminated', 'failed', 'expired'],
      default: 'scheduled',
      index: true
    },
    startedAt: {
      type: Date,
      index: true
    },
    endedAt: Date,
    sessionDeadline: Date,        // UTC deadline for the candidate to start
    
    /* ——— Phase 1 Security Requirements ——— */
    sessionBinding: {             // Phase 1: Hash of IP + User-Agent
      type: String,
      required: true,
      unique: true,
      sparse: true                // Allow null values but enforce uniqueness when present
    },
    recordingConsentGiven: {
      type: Boolean,
      default: false
    },
    recordingConsentTimestamp: Date,
    candidateIPAddress: {
      type: String,
      required: true
    },
    browserFingerprint: String,

    /* ——— Messages/Conversation History ——— */
    messages: [messageSchema],

    /* ——— AI-driven content ——— */
    questionPlan: [questionSchema],
    evaluationRubric: {
      /* Arbitrary JSON for AI scoring weights, stored as mixed type */
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map()
    },

    /* ——— Timing rules ——— */
    timingConfig: {
      maxAnswerSeconds: { type: Number, default: 120 },
      maxSessionMinutes: { type: Number, default: 20 },
      warningAtSeconds: { type: Number, default: 90 }
    },

    /* ——— Phase 1 Audio/Quality metrics ——— */
    audioQuality: {
      avgBitrate: { type: Number, default: 0 },
      droppedPackets: { type: Number, default: 0 },
      latencyP95: { type: Number, default: 0 }
    },
    
    /* ——— Phase 1 Performance metrics ——— */
    metrics: {
      interrupts: { type: Number, default: 0 },
      totalSpeakingSec: { type: Number, default: 0 },
      sttLatencyP95Ms: { type: Number, default: 0 },
      llmLatencyP95Ms: { type: Number, default: 0 },
      ttsLatencyP95Ms: { type: Number, default: 0 },
      wsDeliveryP95Ms: { type: Number, default: 0 }
    },

    /* ——— Phase 1 Data retention policy ——— */
    dataRetentionPolicy: {
      transcriptRetentionDays: { type: Number, default: 30 },
      audioRetentionDays: { type: Number, default: 30 },
      summaryRetentionDays: { type: Number, default: 365 }
    },

    /* ——— Phase 1 Export/Reporting ——— */
    driveFileId: String,
    
    /* ——— Additional Phase 1 fields ——— */
    finalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    aiSummary: String,
    feedbackGenerated: {
      type: Boolean,
      default: false
    },
    
    /* ——— Concurrency control ——— */
    maxConcurrentSessions: {
      type: Number,
      default: 1
    },
    
    /* ——— Error tracking ——— */
    errors: [{
      timestamp: { type: Date, default: Date.now },
      errorType: String,
      errorMessage: String,
      stackTrace: String
    }]
  },
  { 
    timestamps: true,
    // Optimize for read performance
    read: 'secondaryPreferred'
  }
);

/* ——— Phase 1 Required Indexes ——— */
// Primary compound index for candidate queries
interviewSessionSchema.index({ candidateId: 1, jobId: 1, startedAt: 1 });

// Unique session binding index (Phase 1 security requirement)
interviewSessionSchema.index({ sessionBinding: 1 }, { unique: true, sparse: true });

// Status-based queries for active sessions
interviewSessionSchema.index({ status: 1, startedAt: 1 });

// Cleanup/retention queries
interviewSessionSchema.index({ createdAt: 1 });
interviewSessionSchema.index({ endedAt: 1 });

// Performance monitoring queries
interviewSessionSchema.index({ 'metrics.llmLatencyP95Ms': 1 });
interviewSessionSchema.index({ 'metrics.sttLatencyP95Ms': 1 });

// Utterance messages optimization
interviewSessionSchema.index({ 'messages.timestamp': 1 });

/* ——— Phase 1 Virtual fields ——— */
interviewSessionSchema.virtual('duration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60)); // minutes
  }
  return 0;
});

interviewSessionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

interviewSessionSchema.virtual('isExpired').get(function() {
  if (!this.startedAt || !this.timingConfig) return false;
  const maxSessionMs = this.timingConfig.maxSessionMinutes * 60 * 1000;
  return Date.now() - new Date(this.startedAt).getTime() > maxSessionMs;
});

/* ——— Phase 1 Instance methods ——— */
interviewSessionSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  return this.save();
};

interviewSessionSchema.methods.updateMetrics = function(metricUpdates) {
  Object.assign(this.metrics, metricUpdates);
  return this.save();
};

interviewSessionSchema.methods.checkExpiry = function() {
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
    this.endedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

interviewSessionSchema.methods.endSession = function(reason = 'completed') {
  this.status = reason;
  this.endedAt = new Date();
  return this.save();
};

/* ——— Phase 1 Static methods ——— */
interviewSessionSchema.statics.findActiveByCandidate = function(candidateId) {
  return this.findOne({
    candidateId,
    status: 'active'
  });
};

interviewSessionSchema.statics.getSessionStats = function(candidateId) {
  return this.aggregate([
    { $match: { candidateId: mongoose.Types.ObjectId(candidateId) } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageScore: { $avg: '$finalScore' },
        totalTime: {
          $sum: {
            $cond: [
              { $and: ['$startedAt', '$endedAt'] },
              { $divide: [{ $subtract: ['$endedAt', '$startedAt'] }, 60000] },
              0
            ]
          }
        }
      }
    }
  ]);
};

/* ——— Phase 1 Pre-save middleware ——— */
interviewSessionSchema.pre('save', function(next) {
  // Auto-generate session deadline if not set
  if (!this.sessionDeadline && this.startedAt) {
    const maxSessionMs = this.timingConfig.maxSessionMinutes * 60 * 1000;
    this.sessionDeadline = new Date(this.startedAt.getTime() + maxSessionMs);
  }
  
  // Validate session binding format (should be hex hash)
  if (this.sessionBinding && !/^[a-f0-9]{64}$/i.test(this.sessionBinding)) {
    // Allow UUID format as fallback for existing sessions
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.sessionBinding)) {
      const crypto = require('crypto');
      this.sessionBinding = crypto.createHash('sha256')
        .update(this.candidateId + Date.now().toString())
        .digest('hex');
    }
  }
  
  next();
});

/* ——— Phase 1 TTL indexes for cleanup ——— */
// Auto-cleanup expired sessions after retention period
interviewSessionSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
    partialFilterExpression: { status: { $in: ['failed', 'terminated'] } }
  }
);

// Ensure virtual fields are included in JSON output
interviewSessionSchema.set('toJSON', { virtuals: true });
interviewSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
