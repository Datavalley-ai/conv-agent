// /app/src/models/InterviewSession.js (Updated with Duration)

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
        scheduledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            index: true
        },

        /* ——— Basic context ——— */
        interviewType: {
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
        // --- THIS IS THE NEW FIELD ---
        durationMinutes: {
            type: Number,
            default: 20 // Default to a 20-minute interview
        },
        // --- END OF NEW FIELD ---

        /* ——— Lifecycle ——— */
        status: {
            type: String,
            enum: ['scheduled','initializing', 'active', 'completed', 'terminated', 'failed', 'expired', 'archived', 'review_pending'],
            default: 'scheduled',
            index: true
        },
        startedAt: { type: Date, index: true },
        endedAt: Date,
        sessionDeadline: Date,

        /* ——— Conversation History ——— */
        messages: [messageSchema],

        /* ——— AI-Generated Feedback ——— */
        feedback: {
            summary: String,
            score: { type: Number, min: 0, max: 100 },
            strengths: [String],
            areasForImprovement: [String],
            generatedAt: { type: Date, default: Date.now }
        },
        
        /* ——— Error Tracking ——— */
        errorLog: [{
            timestamp: { type: Date, default: Date.now },
            errorType: String,
            errorMessage: String,
            stackTrace: String
        }]
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