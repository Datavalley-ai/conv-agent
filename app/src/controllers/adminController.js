// /app/src/controllers/adminController.js (Updated with Group Management)

const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const Group = require('../models/Group'); // <-- Import the new Group model
const logger = require('../utils/logger');
const crypto = require('crypto');

// --- INTERVIEW MANAGEMENT ---
exports.scheduleInterview = async (req, res, next) => {
    // ... (this function is correct and remains unchanged)
    try {
        const { candidateEmail, interviewType, jobRole, difficulty, sessionDeadline, durationMinutes } = req.body;
        const scheduledById = req.user.id;
        if (!candidateEmail || !interviewType || !jobRole) {
            return res.status(400).json({ message: 'candidateEmail, interviewType, and jobRole are required.' });
        }
        const candidate = await User.findOne({ email: candidateEmail });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate user with that email was not found.' });
        }
        const newSession = await InterviewSession.create({
            candidateId: candidate._id,
            scheduledBy: scheduledById,
            interviewType,
            jobRole,
            difficulty,
            sessionDeadline,
            durationMinutes,
            sessionBinding: crypto.randomUUID(),
            candidateIPAddress: 'scheduled',
        });
        logger.info(`Interview scheduled for candidate ${candidate._id} by admin ${scheduledById}`);
        res.status(201).json({
            message: 'Interview scheduled successfully.',
            session: newSession
        });
    } catch (error) {
        next(error);
    }
};

// --- USER MANAGEMENT ---
exports.getAllUsers = async (req, res, next) => { /* ... (unchanged) ... */ 
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};
exports.createUser = async (req, res, next) => { /* ... (unchanged) ... */ 
    try {
        const { firstName, lastName, email, password, role } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'firstName, lastName, email, and password are required.' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        const newUser = await User.create({
            firstName, lastName, email, password, role: role || 'candidate'
        });
        const userResponse = newUser.toObject();
        delete userResponse.password;
        res.status(201).json({
            message: 'User created successfully.',
            user: userResponse
        });
    } catch (error) {
        next(error);
    }
};
exports.updateUser = async (req, res, next) => { /* ... (unchanged) ... */ 
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        if (req.body.password) {
            user.password = req.body.password;
        }
        const updatedUser = await user.save();
        const userResponse = updatedUser.toObject();
        delete userResponse.password;
        res.status(200).json({
            message: 'User updated successfully.',
            user: userResponse
        });
    } catch (error) {
        next(error);
    }
};
exports.deleteUser = async (req, res, next) => { /* ... (unchanged) ... */ 
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        user.accountStatus = 'deactivated';
        await user.save();
        res.status(200).json({ message: 'User has been deactivated successfully.' });
    } catch (error) {
        next(error);
    }
};


// --- NEW: GROUP MANAGEMENT ---

/**
 * @desc    Create a new group
 * @route   POST /api/v1/admin/groups
 * @access  Private (Admin)
 */
exports.createGroup = async (req, res, next) => {
    try {
        const { name, description, members } = req.body;
        const createdBy = req.user.id;

        if (!name) {
            return res.status(400).json({ message: 'Group name is required.' });
        }

        const newGroup = await Group.create({
            name,
            description,
            createdBy,
            members: members || [] // Accept an initial list of members if provided
        });

        res.status(201).json({
            message: 'Group created successfully.',
            group: newGroup
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all groups
 * @route   GET /api/v1/admin/groups
 * @access  Private (Admin)
 */
exports.getAllGroups = async (req, res, next) => {
    try {
        // Populate 'members' to get user details, and 'createdBy' for admin details
        const groups = await Group.find()
            .populate('createdBy', 'firstName lastName email')
            .populate('members', 'firstName lastName email');
            
        res.status(200).json(groups);
    } catch (error) {
        next(error);
    }
};