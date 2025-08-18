// /app/src/controllers/authController.js (Updated)

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Updated to include 'role' in the JWT payload
const generateToken = (id, name, role) => {
    return jwt.sign({ id, name, role }, process.env.JWT_SECRET, {
        expiresIn: '12h',
    });
};

exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password,
        });

        // Pass the new user's default role ('candidate') to the token
        const token = generateToken(newUser._id, newUser.firstName, newUser.role);

        // Also return the role in the response body for consistency
        res.status(201).json({
            token,
            user: { id: newUser._id, name: newUser.firstName, email: newUser.email, role: newUser.role },
        });

    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password.' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        
        // --- THIS IS THE FIX ---
        // 1. Pass the user's role to the token generation function.
        const token = generateToken(user._id, user.firstName, user.role);

        res.status(200).json({
            token,
            // 2. Add the user's role to the response object.
            user: { id: user._id, name: user.firstName, email: user.email, role: user.role },
        });
        // --- END OF FIX ---

    } catch (error) {
        next(error);
    }
};