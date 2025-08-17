// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  // Allow candidate, admin, and interviewer roles
  role: {
  type: String,
  enum: ['candidate', 'interviewer', 'admin', 'super-admin'], // ✅ Added 'interviewer'
  default: 'candidate'
},
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  interviewsRemaining: {
    type: Number,
    default: 3 // Free tier limit
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
  type: Date,
  default: null
}
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
