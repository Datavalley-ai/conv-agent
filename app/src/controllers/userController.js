// /app/src/controllers/userController.js

const User = require('../models/User');

/**
 * @desc    Get current user's profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/me
 * @access  Private
 */
// In userController.js, replace the old updateUserProfile function

exports.updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update only the fields provided in the request body
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.professionalTitle = req.body.professionalTitle || user.professionalTitle;
        user.portfolioUrl = req.body.portfolioUrl || user.portfolioUrl;
        user.bio = req.body.bio || user.bio;
        
        const updatedUser = await user.save();

        res.status(200).json(updatedUser); // Send back the full, updated user object

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Change user password
 * @route   PUT /api/v1/users/me/password
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide both current and new passwords.' });
        }

        // We need to fetch the user with the password field included
        const user = await User.findById(req.user.id).select('+password');

        // Check if the current password is correct
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }
        
        // Set and save the new password (the pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully.' });

    } catch (error) {
        next(error);
    }
};
