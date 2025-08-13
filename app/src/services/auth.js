const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

module.exports = {
  async register({ email, password, firstName, lastName, role }) {
    // Check if user already exists
    if (await User.exists({ email })) {
      throw new Error('User already exists');
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({ 
      email, 
      password, // Will be hashed by User model pre-save hook
      firstName, 
      lastName, 
      role: role || 'candidate' 
    });

    const token = signToken(user);
    return { 
      token, 
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  },

  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Use bcrypt comparison method from User model
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user);
    return { 
      token, 
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  },

  async refreshToken(oldToken) {
    const payload = jwt.verify(oldToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) {
      throw new Error('User not found');
    }
    const token = signToken(user);
    return { token, user };
  }
};
