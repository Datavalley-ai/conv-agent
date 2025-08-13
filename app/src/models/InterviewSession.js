// models/InterviewSession.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: String,            // UUID of the prompt in your question bank
  question: String,              // Text sent to the candidate
  expectedDuration: Number,      // Seconds AI expects the answer to take
  category: String,              // “algorithms”, “system-design”, …
  answer: String,                // Candidate’s raw answer (optional)
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
      required: true
    },

    /* ——— Basic context ——— */
    jobRole: {                    // e.g. “Backend Engineer”
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
      enum: ['scheduled', 'active', 'completed', 'terminated', 'failed'],
      default: 'scheduled'
    },
    startedAt: Date,
    endedAt: Date,
    sessionDeadline: Date,        // UTC deadline for the candidate to start
    sessionBinding: {             // Random token → prevents URL guessing
      type: String,
      required: true,
      unique: true
    },

    /* ——— AI-driven content ——— */
    questionPlan: [questionSchema],
    evaluationRubric: {
      /* Arbitrary JSON for AI scoring weights, stored as mixed type */
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },

    /* ——— Timing rules (still useful) ——— */
    timingConfig: {
      maxAnswerSeconds: { type: Number, default: 120 },
      maxSessionMinutes: { type: Number, default: 20 },
      warningAtSeconds: { type: Number, default: 90 }
    },

    /* ——— AI / Audio metrics (keep for future analytics) ——— */
    audioQuality: {
      avgBitrate: Number,
      droppedPackets: Number,
      latencyP95: Number
    },
    metrics: {
      interrupts:      { type: Number, default: 0 },
      totalSpeakingSec:{ type: Number, default: 0 },
      sttLatencyP95Ms: Number,
      llmLatencyP95Ms: Number
    },

    /* ——— Retention policy ——— */
    dataRetentionPolicy: {
      transcriptRetentionDays: { type: Number, default: 30 },
      audioRetentionDays:      { type: Number, default: 30 },
      summaryRetentionDays:    { type: Number, default: 365 }
    },

    /* ——— Optional export linkage ——— */
    driveFileId: String
  },
  { timestamps: true }
);

/* ——— Indexes that still make sense ——— */
interviewSessionSchema.index({ candidateId: 1, jobRole: 1, startedAt: 1 });
interviewSessionSchema.index({ sessionBinding: 1 }, { unique: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
