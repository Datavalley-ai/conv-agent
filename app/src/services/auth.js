const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ 
    id: user._id, 
    sub: user._id, // Add 'sub' for compatibility
    role: user.role 
  }, process.env.JWT_SECRET, { expiresIn: '12h' });

module.exports = {
  async register({ email, password, firstName, lastName, role }) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return null; // Return null instead of throwing
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
          id: user._id,        // FIXED: removed escaped underscore
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  },

  async login(email, password) {
    try {
      console.log('AuthService.login called with email:', email);
      
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        console.log('User not found for email:', email);
        return null; // FIXED: Return null instead of throwing
      }

      console.log('User found:', user.email, 'ID:', user._id);

      // Use bcrypt comparison method from User model
      const isValidPassword = await user.comparePassword(password);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', email);
        return null; // FIXED: Return null instead of throwing
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      console.log('Login successful for user:', email);

      // Return user data (token generation handled in auth route)
      return { 
        user: {
          _id: user._id,       // Keep _id for internal use
          id: user._id,        // FIXED: removed escaped underscore
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return null; // FIXED: Return null instead of throwing
    }
  },

  async refreshToken(oldToken) {
    try {
      const payload = jwt.verify(oldToken, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) {
        return null;
      }
      const token = signToken(user);
      return { 
        token, 
        user: {
          id: user._id,        // FIXED: removed escaped underscore
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
};
