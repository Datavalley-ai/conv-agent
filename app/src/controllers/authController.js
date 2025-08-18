// /app/src/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, name) => {
    return jwt.sign({ id, name }, process.env.JWT_SECRET, {
        expiresIn: '12h',
    });
};

exports.register = async (req, res, next) => {
    try {
        // Now expecting separate firstName and lastName
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Create the new user with the correct fields, removing the name-splitting logic
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password,
        });

        const token = generateToken(newUser._id, newUser.firstName);

        res.status(201).json({
            token,
            user: { id: newUser._id, name: newUser.firstName, email: newUser.email },
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
        
        const token = generateToken(user._id, user.firstName);

        res.status(200).json({
            token,
            user: { id: user._id, name: user.firstName, email: user.email },
        });

    } catch (error) {
        next(error);
    }
};