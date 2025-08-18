/**
 * @fileoverview Extended User Model (V1.2 - Future Ready)
 * @description Switched to `bcryptjs` for cross-platform compatibility and extended
 * with fields for account status, password reset, social auth, and user preferences.
 */

const mongoose = require('mongoose');
const crypto = require('crypto'); // Native Node.js module for token generation
const bcrypt = require('bcryptjs'); // Using the pure JavaScript version

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'A valid email address is required.'],
        index: true,
    },
    password: {
        type: String,
        // Password is not required if a social provider is used
        required: [
            function() { return !this.googleId && !this.linkedinId; },
            'Password is required.'
        ],
        select: false, // Don't send password in query results by default
    },
    firstName: {
        type: String,
        required: [true, 'First name is required.'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required.'],
        trim: true,
    },
    role: {
        type: String,
        enum: ['candidate', 'interviewer', 'admin'],
        default: 'candidate',
    },
    professionalTitle: {
        type: String,
        trim: true,
        maxLength: 100,
    },
    portfolioUrl: {
        type: String,
        trim: true,
        match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please enter a valid URL.'],
    },
    bio: {
        type: String,
        trim: true,
        maxLength: 500,
    },
    lastLogin: {
        type: Date,
    },

    // --- NEW: Account Status & Management ---
    accountStatus: {
        type: String,
        enum: ['active', 'pending_verification', 'deactivated', 'banned'],
        default: 'active',
    },
    profilePictureUrl: {
        type: String,
        trim: true,
        default: 'https://example.com/default-avatar.png', // A default placeholder
    },

    // --- NEW: Security & Password Reset ---
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorSecret: String,
    isTwoFactorEnabled: {
        type: Boolean,
        default: false,
    },

    // --- NEW: Social Authentication ---
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values, but unique if a value exists
    },
    linkedinId: {
        type: String,
        unique: true,
        sparse: true,
    },

    // --- NEW: User Preferences ---
    preferences: {
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: false },
        },
        timezone: { type: String, default: 'UTC' },
    },

}, {
    timestamps: true,
});

// --- HOOKS ---
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// --- METHODS ---
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// NEW: Method to generate a password reset token
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken; // Return the unhashed token to be sent via email
};


// --- VIRTUALS ---
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// --- TRANSFORMS ---
userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        // Also remove new sensitive fields
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.twoFactorSecret;
        return ret;
    },
});

module.exports = mongoose.model('User', userSchema);