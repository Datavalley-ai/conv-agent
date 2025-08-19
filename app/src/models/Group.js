// /app/src/models/Group.js (Future-Ready Version)

const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Group name is required.'],
        trim: true,
        unique: true,
        index: true, // Index for faster searching on name
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    
    // --- NEW: Fields for Lifecycle Management & Analytics ---
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true, // Index for quickly finding active/archived groups
    },

    // --- NEW: Fields for Categorization & Metadata ---
    tags: {
        type: [String], // An array of strings for easy filtering
        trim: true,
    },
    
    metadata: {
        type: Map, // A flexible key-value store for future data
        of: String, // e.g., { "source": "LinkedIn Campaign", "hiringManager": "Jane Doe" }
    },

}, {
    timestamps: true // Keeps createdAt and updatedAt
});

// --- VIRTUALS ---
// A virtual property to easily get the number of members
groupSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

// --- TRANSFORMS ---
// Ensure virtuals are included when converting to JSON
groupSchema.set('toJSON', {
    virtuals: true,
});


module.exports = mongoose.model('Group', groupSchema);