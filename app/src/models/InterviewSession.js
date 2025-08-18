// /app/src/models/InterviewSession.js (Final Version with Scheduling)

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
    }
}, { _id: true });

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
        // --- ADDED FOR SCHEDULING ---
        scheduledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // The admin or instructor who created this session
            required: true
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch', // The batch of users this interview might belong to
            index: true
        },
        // --- END ADDITIONS ---

        /* ——— Basic context ——— */
        interviewType: { // e.g., "Behavioral Round 1", "Technical Deep Dive"
             type: String,
             required: true
        },
        jobRole: {
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
            enum: ['scheduled', 'active', 'completed', 'terminated', 'failed', 'expired', 'archived', 'review_pending'],
            default: 'scheduled',
            index: true
        },
        startedAt: { type: Date, index: true },
        endedAt: Date,
        sessionDeadline: Date,

        /* ——— Conversation History ——— */
        messages: [messageSchema],

        // --- REFACTORED FOR CLARITY ---
        /* ——— AI-Generated Feedback ——— */
        feedback: {
            summary: String,
            score: { type: Number, min: 0, max: 100 },
            strengths: [String],
            areasForImprovement: [String],
            generatedAt: { type: Date, default: Date.now }
        },
        // --- END REFACTOR ---
        
        // --- RENAMED TO FIX WARNING ---
        /* ——— Error Tracking ——— */
        errorLog: [{
            timestamp: { type: Date, default: Date.now },
            errorType: String,
            errorMessage: String,
            stackTrace: String
        }]
        // --- END RENAME ---
    },
    { timestamps: true }
);

/* ——— Virtuals ——— */
interviewSessionSchema.virtual('duration').get(function() {
    if (this.startedAt && this.endedAt) {
        return Math.round((this.endedAt - this.startedAt) / 1000); // duration in seconds
    }
    return 0;
});

/* ——— Methods ——— */
interviewSessionSchema.methods.endSession = function(reason = 'completed') {
    this.status = reason;
    this.endedAt = new Date();
    return this.save();
};

/* ——— Static Methods ——— */
interviewSessionSchema.statics.findActiveByCandidate = function(candidateId) {
    return this.findOne({
        candidateId,
        status: 'active'
    });
};

interviewSessionSchema.set('toJSON', { virtuals: true });
interviewSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);